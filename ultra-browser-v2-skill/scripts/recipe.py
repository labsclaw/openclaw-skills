#!/usr/bin/env python3
"""v2.5: Recipe mode — compilado de um trace de sucesso (padrao Skill Recorder).

A leitura do microsoft/skill-recorder: gravar UMA demonstracao e compilar num
procedimento REUTILIZAVEL, preferindo ferramentas nativas a replay de cliques.
Nosso equivalente na navegacao LLM+JEV: um run DONE-VERIFIED deixa um trace
JSON (parsed + exec por passo). Este modulo:

1. extract_recipe(): compila o trace num "intent + steps" estruturado, com
   FERRAMENTAS NATIVAS (select/click/type por id/label, upload, reload) —
   nao coordenadas nem indices congelados (o executor ja re-resolve por
   id/label/bid com auto-wait — padrao Playwright que ja vence re-render).
2. run_recipe(): executa a recipe em qualquer outra pagina DA MESMA CLASSE
   (parametros re-basculados: goal de novo, valores re-extraidos). Se um
   passo recuperavel falha, pode usar reparo local LLM+JEV opt-in (Entrega 3).
   O resultado assistido e separado e NAO passa no gate nativo.
3. O validator do piloto: 3 execucoes em fixtures novas SEM regravar.

Uso:
  python recipe.py extract <trace.json> > recipe.json
  python recipe.py run <recipe.json> --url http://... [--fallback-jev]
"""
import base64
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
HARNESS = (r"C:\Users\ClawLabs\AppData\Local\hermes\installs"
           r"\bde0425e6fa3eeac\environments\19338042a70945f794a89da1de5408f4"
           r"\venv\Scripts\browser-harness.exe")


def harness(code, timeout=90):
    p = subprocess.run([HARNESS], input=code, capture_output=True, text=True,
                       timeout=timeout, encoding="utf-8", errors="replace")
    return {"out": p.stdout, "err": p.stderr, "rc": p.returncode}


# ---------------- 1. EXTRACT: trace -> recipe ----------------

def extract_recipe(trace_path: str, goal: str = ""):
    """Compila um trace de agente (agent_loop log JSON) em recipe estruturada."""
    with open(trace_path, encoding="utf-8") as f:
        txt = f.read()
    d = json.loads(txt[txt.find("{"):])
    steps = d.get("steps", []) or d.get("cycles", [])
    recipe = {
        "version": "2.5",
        "intent": goal or d.get("goal", ""),
        "source_trace": trace_path,
        "native_ops": [],
        "notes": [],
    }
    for s in steps:
        p = s.get("parsed") or {}
        act = p.get("action")
        if not act or act in ("done", "blocked"):
            continue
        ex = s.get("exec")
        exj = {}
        try:
            exj = json.loads(ex) if isinstance(ex, str) else (ex or {})
        except Exception:
            exj = {}
        # so passos que EXECUTARAM ok (o trace de sucesso e o roteiro)
        if isinstance(exj, dict) and exj.get("results"):
            r0 = (exj["results"] or [{}])[0]
            if not (r0.get("ok") or r0.get("action") == "upload"):
                continue
        # v2.5.1: label LIMPO — o trace grava "tag id: text"; pro resolve por texto
        # interessa so o TEXTO visivel do elemento (ex.: "Criar plano DEMO-024")
        raw_label = (p.get("label") or "")
        clean = raw_label.split(":", 1)[1].strip() if ":" in raw_label else raw_label
        op = {
            "op": act,
            "id": p.get("id") or exj.get("id") or "",
            "label": clean[:80],
            "value": p.get("value", ""),
        }
        # upload: o terminal traz o arquivo; reload/navigate: op nativa
        if act == "upload":
            op["value"] = exj.get("file") or op["value"] or "fixture-evidence.txt"
        recipe["native_ops"].append(op)
        # corte de ruido pos-save (padrao Skill Recorder: o procedimento termina
        # na acao-chave; o "vagueio" do agente apos o save NAO e procedimento).
        if (act == "click" and (exj.get("id") == "save" or
                                "salvar" in str((exj.get("text") or "")).lower())
                and isinstance(exj, dict)):
            recipe["notes"].append(f"cut after save at op {len(recipe['native_ops'])} "
                                   f"(post-save wandering removed: "
                                   f"{len(steps)} trace steps -> recipe ends here)")
            break
    return recipe


# ---------------- 2. RUN: recipe -> execucao adaptativa ----------------

BATCH_JS = open(os.path.join(HERE, "agent_loop.py"), encoding="utf-8").read()
# Reusar o literal avaliado, nao o texto Python com escapes duplicados.
# AST nao executa o modulo nem carrega provider/CLI do agente.
import re as _re
import ast as _ast
BATCH_JS_TEMPLATE = next((_ast.literal_eval(n.value) for n in _ast.parse(BATCH_JS).body
                          if isinstance(n, _ast.Assign) and any(
                              isinstance(t, _ast.Name) and t.id == "BATCH_JS_TEMPLATE"
                              for t in n.targets)), "")
if not BATCH_JS_TEMPLATE:
    raise RuntimeError("BATCH_JS_TEMPLATE nao encontrado no agent_loop.py")


def snapshot():
    snap_js = open(os.path.join(HERE, "snapshot.js"), encoding="utf-8").read()
    r = harness(f"print(js({json.dumps(snap_js)}))")
    if r["rc"] != 0:
        raise RuntimeError(f"snapshot failed: {(r['err'] or r['out'])[:200]}")
    return json.loads(r["out"].strip().splitlines()[-1])


def execute_batch(acts):
    js = BATCH_JS_TEMPLATE.replace("__ACTS__", json.dumps(acts))
    r = harness(f"print(js({json.dumps(js)}))")
    out = (r["out"] or r["err"]).strip()
    try:
        result = json.loads(out.splitlines()[-1])
        if not isinstance(result, dict):
            raise ValueError("batch sem objeto")
        result["_rc"] = r["rc"]  # rc técnico jamais vira gatilho de reparo
        return result
    except Exception:
        return {"results": [], "stopped_at": 0, "_rc": r["rc"],
                "reason": f"exec parse fail: {out[:500]}", "_error": "protocolo batch"}


# ---------------- 2b. pos-condicoes OBSERVADAS (v2.6a Entrega 2) ----------------
# Host-side poll do efeito real na pagina. Timeout = FALHA FATAL (criterio 4):
# nao ha verifier posterior que apague; ver bloco final do run_recipe.

EMAIL_RE = _re.compile(r"^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$")

# criterio 2: modal ABERTO + titulo EXATO do resumo (1a revisao: original;
# 2a: revisado). includes(titulo_original) aceitaria os dois — por isso ===.
TITLE_DT_JS = """(() => {
  const m = document.getElementById('modal');
  const s = document.getElementById('summary');
  let got = null;
  if (s) {
    const dt = Array.from(s.querySelectorAll('dt'))
      .find(d => /^(title|t[ií]tulo)$/i.test((d.textContent || '').trim()));
    const dd = dt ? dt.nextElementSibling : null;
    got = dd ? (dd.textContent || '').trim() : null;
  }
  return {ok: !!(m && m.open) && got === __EXPECTED__,
          detail: 'open=' + !!(m && m.open) + ' got=' + JSON.stringify(got)};
})()"""

# criterio 3: erro FRESCO (mudou DEPOIS deste Continuar) E de validacao de
# email — 'Failed to fetch' (mesmo #error) nao confirma o efeito exigido.
ERROR_JS = """(() => {
  const e = document.getElementById('error');
  const now = e ? (e.textContent || '').trim() : '';
  const ok = now !== '' && now !== __PREV__
    && /e-?mail/i.test(now) && /v[aá]lido/i.test(now);
  return {ok: ok, detail: JSON.stringify(now)};
})()"""

# anexo: extrai o campo NOME do registro 'Anexado: <nome> · <n> bytes' e compara
# por IGUALDADE EXATA com o arquivo esperado — substring aceitaria '.bak' ou
# 'not-fixture-evidence.txt' (falsos positivos da r2, PARECER-r2).
ATTACH_JS = """(() => {
  const a = document.getElementById('attachment');
  const now = a ? (a.textContent || '').trim() : '';
  const m = /^Anexado: (.+?) · \\d+ bytes$/.exec(now);
  const ok = now !== '' && now !== __PREV__ && m !== null && m[1] === __FILE__;
  return {ok: ok, detail: JSON.stringify(now)};
})()"""


ATT_TEXT_EXPR = ("(() => ((document.getElementById('attachment') || {}).textContent || '').trim())()")
ERR_TEXT_EXPR = ("(() => ((document.getElementById('error') || {}).textContent || '').trim())()")


def read_js(expr_js, timeout=30):
    """Leitura ESTRUTURADA de texto da pagina: distingue sucesso-vazio de erro.

    Retorna {ok, value, rc, error?}. ok=True exige rc==0, protocolo VAL valido
    e valor string (o tipo esperado de texto de UI). None vira falha explicita —
    nunca 'fallback para vazio' (P2 da revisao da Entrega 2).
    """
    code = ("import json as _j\n"
            "try:\n"
            f"    print('VAL ' + _j.dumps(js({json.dumps(expr_js)})))\n"
            "except Exception as e:\n"
            "    print('VALERR ' + repr(e))")
    r = harness(code, timeout=timeout)
    rc = r.get("rc")
    if rc != 0:
        return {"ok": False, "value": None, "rc": rc, "error": "harness rc!=0"}
    for line in (r.get("out") or "").splitlines():
        if line.startswith("VALERR"):
            return {"ok": False, "value": None, "rc": rc, "error": line[7:].strip()}
        if line.startswith("VAL "):
            try:
                val = json.loads(line[4:])
            except Exception:
                return {"ok": False, "value": None, "rc": rc, "error": "VAL invalido"}
            if not isinstance(val, str):
                return {"ok": False, "value": None, "rc": rc,
                        "error": f"tipo inesperado {type(val).__name__}"}
            return {"ok": True, "value": val, "rc": rc}
    return {"ok": False, "value": None, "rc": rc, "error": "sem saida VAL"}


def await_effect(cond_js, timeout_s=8.0, interval=0.2):
    """Poll host-side ate ok=True. Timeout devolve ok=False — NUNCA sucesso."""
    code = ("import time as _t, json as _j\n"
            "ok = False\n"
            "last = None\n"
            f"deadline = _t.monotonic() + {float(timeout_s)}\n"
            "while True:\n"
            "    try:\n"
            f"        last = js({json.dumps(cond_js)})\n"
            "        ok = isinstance(last, dict) and last.get('ok') is True\n"
            "    except Exception as e:\n"
            "        ok = False\n"
            "        last = {'error': str(e)}\n"
            "    if ok or (isinstance(last, dict) and 'error' in last) or _t.monotonic() >= deadline:\n"
            "        break\n"
            f"    _t.sleep({float(interval)})\n"
            "print('AWAIT ' + _j.dumps({'ok': ok, 'last': last}))")
    r = harness(code, timeout=int(timeout_s) + 30)
    out = (r.get("out") or "") + (r.get("err") or "")
    rc = r.get("rc")
    if rc != 0:
        # rc!=0 invalida QUALQUER 'ok' impresso — saida so vale com rc 0 (P2)
        parsed = {"ok": False, "last": out.strip()[-200:], "rc": rc,
                  "error": "harness rc!=0"}
        for line in out.splitlines():
            if line.startswith("AWAIT "):
                try:
                    parsed["last"] = json.loads(line[6:]).get("last")
                except Exception:
                    pass
        return parsed
    for line in out.splitlines():
        if line.startswith("AWAIT "):
            try:
                parsed = json.loads(line[6:])
            except Exception:
                return {"ok": False, "last": out.strip()[-200:], "rc": rc,
                        "error": "AWAIT malformado"}
            if not isinstance(parsed, dict) or not isinstance(parsed.get("last"), dict):
                return {"ok": False, "rc": rc, "error": "envelope AWAIT invalido"}
            if "error" in parsed["last"]:
                return {"ok": False, "rc": rc, "error": "leitura do efeito falhou",
                        "last": parsed["last"]}
            parsed["rc"] = rc
            parsed["ok"] = parsed.get("ok") is True  # exato: True de JSON, nao truthy
            return parsed
    return {"ok": False, "last": out.strip()[-200:], "rc": rc, "error": "sem linha AWAIT"}


def expected_title(ops, upto):
    """Ultimo titulo digitado antes do passo `upto` (title1 copia; title2 revisa)."""
    val = ""
    for o in ops[:upto]:
        if o.get("op") == "type" and str(o.get("id", "")).startswith("title"):
            val = o.get("value") or val
    return val


def checkpoint_condition(ops, i, prev):
    """Mesmo predicado E2; conserva a baseline original durante TODO reparo."""
    op = ops[i]
    if op.get("id") == "review":
        return TITLE_DT_JS.replace("__EXPECTED__", json.dumps(expected_title(ops, i)))
    if "error" in prev:
        return ERROR_JS.replace("__PREV__", json.dumps(prev["error"]))
    if op.get("op") == "upload":
        return (ATTACH_JS.replace("__PREV__", json.dumps(prev["attachment"]))
                .replace("__FILE__", json.dumps(op["value"])))
    return None


def recover_checkpoint(log, ops, i, prev, trigger, reason, attempted, budget,
                       marker, model, dispatcher=None):
    """Reparo local limitado: não navega, não reinicia e não muda recipe/goal.

    Uma decisão consome uma tentativa do MESMO max_replan, inclusive bloqueio.
    Timeout sem predicado legível e side-effect incerto não admitem replay.
    """
    import time
    import agent_loop as AL
    cond = checkpoint_condition(ops, i, prev)
    original = ops[i]
    for attempt in range(budget):
        tick = time.monotonic()
        row = dict(step=i, trigger=trigger, motivo=reason, ops_propostas=[],
                   ops_executadas=[], efeito_observado=None, tempo=None,
                   tokens_entrada=None, tokens_saida=None, modelo=model,
                   provedor=AL.REPAIR_PROVIDER, calls=[], attempt=attempt + 1)
        log["repairs"].append(row)
        try:
            state = snapshot()
            if (not isinstance(state, dict) or not isinstance(state.get("elements"), list)
                    or str(state.get("url", "")).rstrip("/") != log["identity"]["url"]
                    or (marker and marker not in (str(state.get("title", "")) + "\n"
                                                 + str(state.get("pageText", ""))))):
                raise ValueError("identidade/observação inválida no reparo")
            # Efeito pode ter chegado após timeout. Comprovar antes de agir.
            if cond:
                observed = await_effect(cond, 0)
                row["efeito_observado"] = observed
                if observed.get("rc") != 0 or observed.get("error"):
                    raise ValueError("erro técnico na observação")
                if observed.get("ok") is True:
                    row["status"] = "reconciled"
                    return True
            if attempted and (original.get("op") == "upload" or original.get("id") == "save"):
                row["status"] = "blocked_uncertain_side_effect"
                return False
            # Upload/save não são gerados pelo reparador; a ação original continua
            # no executor nativo. Recuperação incerta desses efeitos é só leitura.
            if original.get("op") not in ("click", "type", "select") or original.get("id") == "save":
                row["status"] = "unsupported_action"
                return False
            if attempted and not cond:
                row["status"] = "unprovable_effect"
                return False
            contract = dict(
                goal_local=f"Concluir somente o passo {i}: {json.dumps(original, ensure_ascii=False)}",
                snapshot_atual=state,
                historico_de_acoes_com_efeitos=[
                    dict(step=s["i"], op=s["op"], exec=s["exec"],
                         efeitos=[p for p in log["postconditions"] if p["step"] == s["i"]])
                    for s in log["steps"]],
                ponto_de_retomada=dict(step=i, baseline=prev, attempted=attempted),
                limites=dict(attempts_remaining=budget-attempt, max_ops=1,
                             allowed_actions=[original["op"]], value=original.get("value", ""),
                             navigate=False, replay_uncertain=False))
            row["contract"] = contract
            dispatch = dispatcher or AL.repair_single
            proposed = dispatch(contract, model=model, telemetry=row["calls"])
            row["ops_propostas"] = proposed
            if not proposed:
                row["status"] = "blocked"
                return False
            if not isinstance(proposed, list) or len(proposed) != 1:
                raise ValueError("somente uma op local por decisão")
            op = proposed[0]
            if (not isinstance(op, dict) or set(op) - {"action", "id", "label", "value"}
                    or op.get("action") != original["op"]
                    or op.get("value", "") != original.get("value", "")):
                raise ValueError("op fora do contrato local")
            # Re-resolve pelo id ou label EXATO e único; não aceitar índice/JS.
            targets = [e for e in state["elements"] if e.get("visible") is True and
                       (e.get("id") == op["id"] if op.get("id") else
                        bool(op.get("label")) and e.get("text") == op["label"])]
            if len(targets) != 1:
                raise ValueError("alvo ausente/ambíguo")
            # Releitura imediatamente anterior à ação: decide não é executar.
            fresh = snapshot()
            if (str(fresh.get("url", "")).rstrip("/") != log["identity"]["url"]
                    or (marker and marker not in str(fresh.get("title", "")) + "\n"
                        + str(fresh.get("pageText", "")))):
                raise ValueError("identidade mudou durante decisão")
            # Ignorar relógio/texto dinâmico; qualquer mudança na tabela de
            # elementos invalida a decisão e consome a tentativa, sem execução.
            if fresh.get("elements") != state["elements"]:
                row["status"] = "stale_decision"
                continue
            result = execute_batch([op])
            row["ops_executadas"].append(dict(op=op, exec=result))
            if result.get("_rc", 0) != 0 or result.get("_error"):
                raise ValueError("erro técnico executando reparo")
            first = (result.get("results") or [{}])[0]
            if first.get("ok") is not True:
                if result.get("reason") != "element not found":
                    raise ValueError("falha não recuperável executando reparo")
                row["status"] = "target_missing"
                continue
            attempted = True
            if cond:
                observed = await_effect(cond, 8)
                row["efeito_observado"] = observed
                if observed.get("rc") != 0 or observed.get("error"):
                    raise ValueError("erro técnico depois do reparo")
                if observed.get("ok") is True:
                    row["status"] = "completed"
                    return True
            else:
                after = snapshot()
                # Sem predicado E2, exige mudança observável, não só ok do clique.
                if (after.get("url", "").rstrip("/") != log["identity"]["url"]
                        or (marker and marker not in str(after.get("title", "")) +
                            "\n" + str(after.get("pageText", "")))):
                    raise ValueError("identidade mudou após reparo")
                row["efeito_observado"] = dict(before=state, after=after)
                if after != state:
                    row["status"] = "completed"
                    return True
            row["status"] = "effect_timeout"
        except Exception as exc:
            row["status"] = "failed_closed"
            row["error"] = type(exc).__name__ + ": " + str(exc)[:160]
            return False
        finally:
            row["tempo"] = time.monotonic() - tick
            for key in ("tokens_entrada", "tokens_saida"):
                vals = [c.get(key) for c in row["calls"]]
                row[key] = sum(vals) if vals and all(type(v) is int for v in vals) else None
    return False


def run_recipe(*args, **kwargs):
    """Entrada pública: finalize evidência antes de emitir resultado da tarefa."""
    from capture_evidence import CURRENT
    capture = CURRENT.get()
    try:
        log = _run_recipe(*args, **kwargs)
    except BaseException:
        if capture is not None and not capture.finished:
            capture.frame('recipe-exception')
            capture.finish()
        raise
    if capture is None:
        log['capture'] = dict(passed=False, state='unavailable',
                              reason='legacy transport without integrated capture')
    else:
        capture.frame('recipe-final')
        log['capture'] = capture.finish()
        if not log['capture']['passed']:
            log['taskResultBeforeEvidence'] = log.get('result')
            log['result'] = 'RECIPE-EVIDENCE-FAIL'
    return log


def _run_recipe(recipe_path: str, url: str, verify_spec: str = "", fallback_jev: bool = False,
               max_replan: int = 3, marker: str = "", repair_model="MiMo-V2.6-Flash",
               repair_dispatcher=None):
    """Executa a recipe; em falha de passo, replanejamento local; no fim, verify."""
    with open(recipe_path, encoding="utf-8") as f:
        recipe = json.load(f)
    ops = recipe["native_ops"]
    log = {"url": url, "recipe": os.path.basename(recipe_path), "steps": [],
           "result": None, "postconditions": [], "repairs": []}
    stop = False

    # v2.6a criterio 1: rc + identidade (URL + marcador) ANTES de qualquer acao.
    nav = harness(f'goto_url("{url}")\nmaximize()\nimport time as _t\n_t.sleep(1.5)', timeout=90)
    log["navigation"] = {"rc": nav.get("rc"), "url": url, "marker": marker or None}
    if nav.get("rc") != 0:
        # v2.6d: preservar a causa verbatim (cold-start defeito 5) — so rc
        # escondia o prompt do Chrome / erro real do harness
        log["navigation"]["out"] = str(nav.get("out") or "")[:500]
        log["navigation"]["err"] = str(nav.get("err") or "")[:500]
        log["result"] = f"RECIPE-FAIL initial navigation rc={nav.get('rc')}"
        return log
    try:
        state0 = snapshot()
    except Exception as e:
        log["result"] = f"RECIPE-FAIL snapshot after navigation: {e}"
        return log
    want = (url or "").rstrip("/")
    got_url = str(state0.get("url") or "").rstrip("/")
    if got_url != want:
        log["result"] = f"RECIPE-FAIL identity: url {got_url!r} != {want!r}"
        return log
    hay = str(state0.get("title") or "") + "\n" + str(state0.get("pageText") or "")[:4000]
    if marker and marker not in hay:
        log["result"] = f"RECIPE-FAIL identity: marker {marker!r} ausente na pagina"
        return log
    log["identity"] = {"url": got_url, "title": state0.get("title"),
                       "markerOk": (True if marker else None)}

    i = 0
    replans = 0
    while i < len(ops) and replans <= max_replan and not stop:
        op = dict(ops[i])
        # recipe usa "op"; o executor espera "action"
        op["action"] = op.pop("op", None) or op.get("action")
        # A001: id, label e escopo sao restricoes cumulativas; nao apagar pistas.
        try:
            state = snapshot()
        except Exception as exc:
            log["result"] = f"RECIPE-FAIL snapshot at step {i}: {type(exc).__name__}"
            break
        # enriquecer com id/label do snapshot atual (re-resolve — nada de replay morto)
        # v2.6a criterio 3: estado ANTES da acao — o efeito precisa ser FRESCO
        # (mudou DEPOIS deste clique). Baseline ILEGIVEL falha AQUI, antes da
        # acao: nunca vira '' (que faria texto antigo passar como novo — P2).
        prev = {}
        baseline = None
        if op.get("action") == "upload":
            baseline = ("attachment", read_js(ATT_TEXT_EXPR), "anexo")
        elif (op.get("action") == "click" and not op.get("id")
              and str(op.get("label", "")).lower().startswith("continuar")):
            last_email = ""
            for o in ops[:i]:
                if o.get("op") == "type" and o.get("id") == "email":
                    last_email = o.get("value") or last_email
            if last_email and not EMAIL_RE.match(last_email):
                baseline = ("error", read_js(ERR_TEXT_EXPR), "erro de email")
        if baseline is not None:
            bkind, bgot, bnome = baseline
            log["postconditions"].append({"step": i, "kind": f"baseline_{bkind}",
                                          "readable": bool(bgot.get("ok")),
                                          "value": bgot.get("value"), "rc": bgot.get("rc")})
            if not bgot.get("ok"):
                log["result"] = (f"RECIPE-FAIL baseline de {bnome} ilegivel antes do "
                                 f"passo {i}: {bgot.get('error')} (rc={bgot.get('rc')})")
                stop = True
                break
            prev[bkind] = bgot["value"]
        res = execute_batch([op])
        log["steps"].append({"i": i, "op": op, "exec": res})
        r0 = (res.get("results") or [{}])[0]
        terminal = res.get("terminal")
        # Identidade invalida e efeito falho sao fatais: nunca repetir escrita
        # nem chamar reparador removendo escopo ou verifier apagando a falha.
        if res.get("reason") in ("identity invalid", "postcondition failed"):
            log["result"] = f"RECIPE-FAIL {res['reason']} at step {i}: {r0.get('error') or r0.get('effect')}"
            break
        if res.get("_rc", 0) != 0 or res.get("_error"):
            log["result"] = f"RECIPE-FAIL harness at step {i}: rc={res.get('_rc')}"
            break

        def repair(trigger, reason, attempted):
            return fallback_jev and recover_checkpoint(
                log, ops, i, prev, trigger, reason, attempted, max_replan-replans,
                marker, repair_model, repair_dispatcher)
        if terminal == "upload":
            file_label = op.get("value") or res.get("file") or "fixture-evidence.txt"
            fx = os.path.normpath(os.path.join(
                HERE, "..", "..", "..", ".openclaw", "workspace", "pocs",
                "browser-benchmark-20261016", "fixtures", file_label))
            sel = res.get("selector") or ("#" + op["id"] if op.get("id") else "input[type=file]")
            # v2.5.8: esperar o input file estar ACTIONABLE (etapa ativa) — caso real
            # battery-p1: upload_file deu ok no input hidden e o POST nunca saiu
            # ("upload-ok" sem evento upload server-side; review 422 "Anexo obrigatorio")
            up = harness(
                "import time as _t\ntry:\n"
                f"    upload_file({json.dumps(sel)}, {json.dumps(fx)})\n"
                "    _t.sleep(0.3)\n"
                "    DQ, SQ = chr(34), chr(39)\n"
                "    js(SQ + '(() => {' + ' for (const el of document.querySelectorAll(' + DQ + 'input[type=file]' + DQ + ')) { el.dispatchEvent(new Event(' + DQ + 'change' + DQ + ', {bubbles: true})); } })()' + SQ)\n"
                "    _t.sleep(2)\n"
                "    att = js('(() => document.getElementById(' + chr(39) + 'attachment' + chr(39) + ').textContent)()')\n"
                "    print('upload-ok ATT=' + str(att))\n"
                "except Exception as e:\n    print('upload-fail', e)\n", timeout=90)
            log["steps"][-1]["upload"] = str(up["out"])[:120]
            if up.get("rc") != 0 or "upload-fail" in str(up.get("out")):
                log["result"] = f"RECIPE-FAIL upload técnico no passo {i}"
                stop = True
                break
            import time as _t
            _t.sleep(1.0)  # v2.5.10: upload handler e async (POST + attachment render)
            # v2.6a criterio 3: anexo FRESCO + confirmacao positiva do ARQUIVO
            aw = await_effect(
                ATTACH_JS.replace("__PREV__", json.dumps(prev.get("attachment")))
                         .replace("__FILE__", json.dumps(file_label)), 10)
            log["postconditions"].append({"step": i, "kind": "attachment_fresh",
                                          "ok": aw.get("ok"), "rc": aw.get("rc"),
                                          "detail": aw.get("last")})
            if not aw.get("ok"):
                if (aw.get("rc") == 0 and not aw.get("error")
                        and repair("effect_timeout", "attachment_fresh", True)):
                    i += 1
                    replans = 0
                    continue
                log["result"] = f"RECIPE-FAIL pos-condicao anexo no passo {i}: {aw.get('last')}"
                stop = True
                break
            i += 1
            continue
        if terminal in ("navigate", "reload"):
            dest = res.get("url") or url
            nav2 = harness(f'goto_url("{dest}")\nimport time as _t\n_t.sleep(1.5)', timeout=90)
            log["postconditions"].append({"step": i, "kind": "navigation",
                                          "url": dest, "rc": nav2.get("rc")})
            if nav2.get("rc") != 0:
                log["result"] = (f"RECIPE-FAIL navegacao/reload no passo {i} "
                                 f"rc={nav2.get('rc')}")
                stop = True
                break
            i += 1
            continue
        if terminal == "wait":
            import time as _t
            _t.sleep(min(5, float(res.get("value") or 1)))
            i += 1
            continue
        if r0.get("ok"):
            step_i = i
            # ok:true NAO prova efeito (clicks fora da etapa ativa retornam ok sem
            # efeito). v2.6a: onde ha transicao exigida, espera o EFEITO observado;
            # nos demais casos mantem a pausa fixa de sempre.
            import time as _t
            if op.get("id") == "review":
                # criterio 2: modal ABERTO + titulo EXATO (1a revisao: original;
                # 2a: revisado). includes(original) aceitaria os dois — por isso ===.
                exp = expected_title(ops, step_i)
                aw = await_effect(TITLE_DT_JS.replace("__EXPECTED__", json.dumps(exp)), 8)
                log["postconditions"].append({"step": step_i, "kind": "review_modal_exact",
                                              "expected": exp, "ok": aw.get("ok"),
                                              "rc": aw.get("rc"), "detail": aw.get("last")})
                if not aw.get("ok"):
                    if (aw.get("rc") == 0 and not aw.get("error")
                            and repair("effect_timeout", "review_modal_exact", True)):
                        i += 1
                        replans = 0
                        continue
                    log["result"] = (f"RECIPE-FAIL pos-condicao review no passo {step_i}: "
                                     f"{aw.get('last')}")
                    stop = True
                    break
            elif "error" in prev:
                # criterio 3: erro FRESCO apos o Continuar com email invalido
                aw = await_effect(
                    ERROR_JS.replace("__PREV__", json.dumps(prev.get("error"))), 6)
                log["postconditions"].append({"step": step_i, "kind": "email_error_fresh",
                                              "ok": aw.get("ok"), "rc": aw.get("rc"),
                                              "detail": aw.get("last")})
                if not aw.get("ok"):
                    if (aw.get("rc") == 0 and not aw.get("error")
                            and repair("effect_timeout", "email_error_fresh", True)):
                        i += 1
                        replans = 0
                        continue
                    log["result"] = (f"RECIPE-FAIL pos-condicao erro de email no passo "
                                     f"{step_i}: {aw.get('last')}")
                    stop = True
                    break
            else:
                _t.sleep(2.5 if op.get("id") in ("review", "next") or
                         str(op.get("label", "")).lower().startswith("continuar") else 1.0)
            i += 1
            replans = 0
            continue
        if fallback_jev:
            if (res.get("reason") == "element not found"
                    and repair("resolution_failure", res["reason"], False)):
                i += 1
                replans = 0
                continue
            log["result"] = f"RECIPE-FAIL at step {i}: reparo não concluiu o checkpoint"
            break
        # passo falhou: NAO travar — re-observar e tentar de novo com contexto fresco
        replans += 1
        if replans > max_replan:
            log["result"] = f"RECIPE-FAIL at step {i}: {r0.get('error') or res.get('reason')}"
            break

    if log["result"] is None:
        log["result"] = "RECIPE-DONE"
    # v2.6a criterio 4: PASS posterior NUNCA apaga falha anterior — verify so
    # roda quando nao houve falha (tambem evita reload em estado quebrado).
    if verify_spec and log["result"] == "RECIPE-DONE":
        sys.path.insert(0, HERE)
        import agent_loop as AL
        detail = {}
        ok = AL.verify(verify_spec, details=detail)
        log["verification_detail"] = detail
        log["verifier"] = ok
        if ok == "PASS":
            log["result"] = ("RECIPE-DONE-VERIFIED-ASSISTED" if log["repairs"]
                             else "RECIPE-DONE-VERIFIED")
        else:
            log["result"] = "RECIPE-FAIL verifier: " + str(ok)
    elif verify_spec:
        log["verifier"] = "SKIPPED (falha anterior — PASS nao poderia apagar)"
    return log


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    if sys.argv[1] == "extract":
        trace = sys.argv[2]
        goal = sys.argv[3] if len(sys.argv) > 3 else ""
        print(json.dumps(extract_recipe(trace, goal), ensure_ascii=False, indent=1))
    elif sys.argv[1] == "run":
        recipe = sys.argv[2]
        url = sys.argv[sys.argv.index("--url") + 1]
        verify = ""
        if "--verify" in sys.argv:
            verify = sys.argv[sys.argv.index("--verify") + 1]
        marker = ""
        if "--marker" in sys.argv:
            marker = sys.argv[sys.argv.index("--marker") + 1]
        repair_model = "MiMo-V2.6-Flash"
        if "--repair-model" in sys.argv:
            repair_model = sys.argv[sys.argv.index("--repair-model") + 1]
        log = run_recipe(recipe, url, verify_spec=verify, marker=marker,
                         fallback_jev="--fallback-jev" in sys.argv, repair_model=repair_model)
        print(json.dumps(log, ensure_ascii=False, indent=1))
        # exit estrito: so RECIPE-DONE-VERIFIED e 0 (substring DONE nao basta)
        sys.exit(0 if log.get("result") == "RECIPE-DONE-VERIFIED" else 1)


if __name__ == "__main__":
    main()
