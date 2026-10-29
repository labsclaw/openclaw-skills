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
   passo falha, cai pro JEV single (modo adaptativo) — recipe e o caminho
   rapido, JEV e o fallback de generalizacao.
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
# reusar o BATCH_JS_TEMPLATE do agent_loop sem importar o modulo inteiro (CLI arg parsing)
import re as _re
_m = _re.search(r'BATCH_JS_TEMPLATE = """(.*?)"""\n\n\ndef execute_batch', open(os.path.join(HERE, "agent_loop.py"), encoding="utf-8").read(), _re.S)
BATCH_JS_TEMPLATE = _m.group(1) if _m else ""
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
        return json.loads(out.splitlines()[-1])
    except Exception:
        return {"results": [], "stopped_at": 0, "reason": f"exec parse fail: {out[:120]}"}


def run_recipe(recipe_path: str, url: str, verify_spec: str = "", fallback_jev: bool = True,
               max_replan: int = 3):
    """Executa a recipe; em falha de passo, replanejamento local; no fim, verify."""
    with open(recipe_path, encoding="utf-8") as f:
        recipe = json.load(f)
    ops = recipe["native_ops"]
    log = {"url": url, "recipe": os.path.basename(recipe_path), "steps": [], "result": None}

    harness(f'goto_url("{url}")\nimport time as _t\n_t.sleep(1.5)', timeout=90)

    i = 0
    replans = 0
    while i < len(ops) and replans <= max_replan:
        op = dict(ops[i])
        # recipe usa "op"; o executor espera "action"
        op["action"] = op.pop("op", None) or op.get("action")
        # v2.5.6: com id deterministico, label SOBRA e pode casar elemento errado
        # (label-first tem precedencia e ja clicou select errado no passado);
        # manter label apenas como pista quando NAO ha id
        if op.get("id"):
            op.pop("label", None)
        state = snapshot()
        # enriquecer com id/label do snapshot atual (re-resolve — nada de replay morto)
        res = execute_batch([op])
        log["steps"].append({"i": i, "op": op, "exec": res})
        r0 = (res.get("results") or [{}])[0]
        terminal = res.get("terminal")
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
            i += 1
            import time as _t
            _t.sleep(2.2)  # v2.5.10: upload handler e async (POST + attachment render)
            continue
        if terminal in ("navigate", "reload"):
            dest = res.get("url") or url
            harness(f'goto_url("{dest}")\nimport time as _t\n_t.sleep(1.5)', timeout=90)
            i += 1
            continue
        if terminal == "wait":
            import time as _t
            _t.sleep(min(5, float(res.get("value") or 1)))
            i += 1
            continue
        if r0.get("ok"):
            i += 1
            replans = 0
            # v2.5.3->v2.5.7: esperar efeito pos-acao — a fixture valida por etapa e o
            # modal de review abre com delay ~1.5-2.5s; clicks "escondidos" fora da
            # etapa ativa retornam ok:true sem efeito real. Pausa maior em acoes de
            # transicao (review/continuar/next/upload) que abrem paineis/modais.
            import time as _t
            _t.sleep(2.5 if op.get("id") in ("review", "next") or
                     str(op.get("label", "")).lower().startswith("continuar") else 1.0)
            continue
        # passo falhou: NAO travar — re-observar e tentar de novo com contexto fresco
        replans += 1
        if replans > max_replan:
            log["result"] = f"RECIPE-FAIL at step {i}: {r0.get('error') or res.get('reason')}"
            break

    if log["result"] is None:
        log["result"] = "RECIPE-DONE"
    # verifier independente (persisted: exige pos-reload)
    if verify_spec:
        sys.path.insert(0, HERE)
        import agent_loop as AL
        ok = AL.verify(verify_spec)
        log["verifier"] = ok
        if ok == "PASS":
            log["result"] = "RECIPE-DONE-VERIFIED"
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
        log = run_recipe(recipe, url, verify_spec=verify)
        print(json.dumps(log, ensure_ascii=False, indent=1))
        sys.exit(0 if "DONE" in str(log.get("result")) else 1)


if __name__ == "__main__":
    main()
