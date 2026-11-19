#!/usr/bin/env python3
"""ultra-browser-v2 — agent loop: snapshot indexado -> decisao (1 acao JSON) -> exec -> verifier.

Motores de decisao (--engine):
  typesafe  — JEV (TypeSafe System One): Choice heads operation+target em 1 request (~0.5s). Tier 1. (default se TYPESAFE_API_KEY)
  opencode  — opencode CLI free models (mimo/big-pickle/deepseek): 25-55s/decisao. Tier 2.
Uso:
  python agent_loop.py --url http://... --goal "..." --engine typesafe
                     [--model opencode/mimo-v2.6-flash-free] [--max-steps 10]
                     [--verify "text_contains:OK:"] [--record]
"""
import argparse, json, os, re, subprocess, sys, time

HARNESS = os.environ.get(
    "BROWSER_HARNESS",
    r"C:\Users\ClawLabs\AppData\Local\hermes\installs\bde0425e6fa3eeac\environments"
    r"\19338042a70945f794a89da1de5408f4\venv\Scripts\browser-harness.exe")
OC_BIN = os.environ.get(
    "OPENCODE_BIN",
    r"C:\Users\ClawLabs\AppData\Roaming\npm\node_modules\opencode-ai\bin\opencode.exe")

SNAPSHOT_JS_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "snapshot.js")


def harness(code: str, timeout=90):
    """Executa bloco python no browser-harness (daemon persistente, Chrome real)."""
    try:
        p = subprocess.run([HARNESS], input=code, capture_output=True, text=True,
                           timeout=timeout, encoding="utf-8", errors="replace")
        return {"out": p.stdout, "err": p.stderr, "rc": p.returncode}
    except subprocess.TimeoutExpired as e:
        return {"out": (e.stdout or ""), "err": "TIMEOUT", "rc": 124}


def snapshot():
    """Snapshot atômico via snapshot.js."""
    with open(SNAPSHOT_JS_PATH, encoding="utf-8") as f:
        snap_js = f.read().strip()
        if snap_js.endswith(")()"):  # IIFE -> passar como expressao
            snap_js = snap_js[:-3]  # remove ")()" final... nao: mantenha; js() aceita IIFE
    # browser-harness js() aceita IIFE diretamente
    with open(SNAPSHOT_JS_PATH, encoding="utf-8") as f:
        expr = f.read()
    r = harness(f"print(js({json.dumps(expr)}))")
    if r["rc"] != 0:
        raise RuntimeError(f"snapshot failed: {(r['err'] or r['out'])[:200]}")
    return json.loads(r["out"].strip().splitlines()[-1])


def ask_model(model: str, prompt: str, timeout=150):
    """opencode CLI — MENSAGEM ANTES DE --file (yargs array pitfall)."""
    tmp = os.path.join(os.environ.get("TMPDIR", "."), f"ub2-{int(time.time()*1000)}.txt")
    with open(tmp, "w", encoding="utf-8") as f:
        f.write(prompt)
    try:
        p = subprocess.run([OC_BIN, "run", "--model", model,
                            "Follow the instructions in the attached prompt file exactly. Reply with ONLY the JSON object requested.",
                            "--file", tmp],
                           capture_output=True, text=True, timeout=timeout,
                           encoding="utf-8", errors="replace")
        return (p.stdout or "") + (p.stderr or "")
    except subprocess.TimeoutExpired:
        return ""
    finally:
        try: os.remove(tmp)
        except Exception: pass


def parse_action(reply: str):
    m = re.search(r"\{[^{}]*\"action\"[^{}]*\}", reply, re.S) or re.search(r"\{[\s\S]*?\}", reply)
    if not m:
        return None
    try:
        return json.loads(m.group(0))
    except Exception:
        return None


# ---------------- JEV / TypeSafe (tier 1) ----------------

TYPESAFE_URL = "https://api.typesafe.ai/v1/systemone"
JEV_OPS = {
    "click": "Activate a button, link, checkbox or toggle",
    "type": "Enter text into an empty or wrong input field",
    "select": "Choose an option from the select dropdown",
    "press": "Press a key (Enter) on the focused field to submit/advance",
    "upload": "Attach a file to the file input",
    "navigate": "Go to a URL or reload the current page",
    "wait": "Wait briefly (page loading or async update)",
    "done": "The goal is already complete on this page",
    "blocked": "The goal cannot be achieved with these elements",
}


def _load_env_file():
    """Ler TYPESAFE_API_KEY do .env do Hermes se nao estiver no ambiente."""
    key = os.environ.get("TYPESAFE_API_KEY")
    if key:
        return key
    for p in (os.path.join(os.environ.get("LOCALAPPDATA", ""), "hermes", ".env"),):
        try:
            with open(p, encoding="utf-8") as f:
                for line in f:
                    if line.startswith("TYPESAFE_API_KEY="):
                        return line.strip().split("=", 1)[1]
        except Exception:
            continue
    return None


def ask_jev(state_block: str, goal: str, els: list, text_helper=None, timeout=30, history=None):
    """Uma request JEV: operation + target heads especulativos (+ text via Noul-free helper).
    Retorna (act_dict, latency_s, usage)."""
    import urllib.request, urllib.error
    key = _load_env_file()
    if not key:
        raise RuntimeError("TYPESAFE_API_KEY ausente (env ou hermes/.env)")

    # v2.3.4 (padrao browser-use): injetar HISTORICO de acoes — sem ele o JEV e
    # stateless e re-executa a acao que ja satisfez parte do goal (ex.: abrir o form)
    if history:
        hist_lines = "\n".join(f"- {h}" for h in history[-12:])
        state_block = (state_block + f"\n\nActions already taken (do NOT repeat completed "
                        f"setup steps; advance to the NEXT unfinished part of the goal):\n{hist_lines}")

    table_lines = [f"[{e['idx']}]{'(H)' if not e.get('visible', True) else ''} {e['tag']}{'/' + e['role'] if e['role'] else ''} · {e['text']}"
                   for e in els]
    state = f"""Browser page goal: {goal}

{state_block}

Interactive elements (index · tag · state; (H)=hidden/not in current step yet — wait until its step is active):
""" + "\n".join(table_lines)

    # targets especulativos: so elementos visiveis
    criteria_target = {}
    for e in els:
        label = f"{e['tag']}{'(hidden)' if not e.get('visible', True) else ''} {e.get('id') or e.get('name') or ''}: {e['text'][:60]}".strip()
        criteria_target[str(e["idx"])] = label

    questions = {
        "operation": {
            "type": "choice",
            "instructions": "Which browser operation best advances the goal?",
            "criteria": JEV_OPS,
        },
        "target": {
            "type": "choice",
            "instructions": "Which element index should the operation apply to? (Speculative: answer for click/type/select cases.)",
            "criteria": criteria_target,
        },
    }

    body = json.dumps({"state": state, "model": "jev-latest", "questions": questions}).encode()
    req = urllib.request.Request(TYPESAFE_URL, data=body, headers={
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json"})
    t0 = time.time()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            d = json.loads(r.read())
    except urllib.error.HTTPError as e:
        body_txt = e.read()[:200]
        raise RuntimeError(f"Jev request failed: {e} {body_txt.decode(errors='replace')}")
    except Exception as e:
        raise RuntimeError(f"Jev request failed: {e}")
    lat = round(time.time() - t0, 2)

    op = d["answers"]["operation"]
    tgt = d["answers"]["target"]
    act = {
        "action": op["choice"],
        "element": int(tgt["choice"]) if str(tgt.get("choice", "0")).isdigit() else 0,
        "value": "",
        "reason": f"jev conf op={op.get('confidence')} tgt={tgt.get('confidence')}",
        "_probabilities": {"op": op.get("probabilities"), "tgt": tgt.get("probabilities")},
        "_usage": d.get("usage", {}),
    }
    # value para type/select: pedir ao text-helper (LLM) OU fixo pelo goal —
    # JEV nao gera texto; para forms com valores no goal, extrair aqui.
    if act["action"] in ("type", "select") and text_helper:
        act["value"] = text_helper(act, els)
    return act, lat, d.get("usage", {})


# ---------------- v2.4: value-model (LLM gerador de valores ao lado do JEV) ----------------
# Padrao A/B do plano M22 (OpenClaw): JEV decide op/target (barato, 0.3s),
# um LLM free gera os VALORES — inclusive o e-mail invalido proposital do goal,
# que fecha o check ordered_workflow. Implementado como text_helper alternativo.

VALUE_MODEL_PROMPT = """You generate ONLY the value to enter in a web form field. Reply with the value itself, no quotes, no explanation.

GOAL: {goal}
FIELD: tag={tag} id={id} current_text={text}
ACTIONS ALREADY TAKEN: {history}

Rules:
- EMAIL FIELDS: if the goal says to FIRST try an invalid e-mail to test validation, you MUST reply 'invalid-email@fixture' when no e-mail has been typed yet (check history). Only after an e-mail appears in history AND a validation error was shown, reply with the CORRECT e-mail from the goal.
- If an invalid e-mail was already tried (validation shown), reply with the CORRECT e-mail from the goal.
- For select fields, reply with the exact option text from the goal (accents optional).
- TITLE FIELDS: if the goal says to open review, go BACK and fix the title, you MUST reply with the REGISTRATION title (before 'Plano' in the goal, e.g. 'Plano WEB DEMO-024') when typing the title the FIRST time. Reply with the REVISED title (e.g. 'Plano WEB DEMO-024 revisado') ONLY after history shows 'review' AND 'back'/'Voltar' actions.
- Reply with the value ONLY."""


def make_value_model_fn(engine: str, model: str):
    """Retorna text_helper(act, els) que usa um LLM free p/ gerar valores."""
    def helper(act, els, step=1):
        el = els[int(act.get("element") or 1) - 1] if act.get("element") and els else {}
        prompt = VALUE_MODEL_PROMPT.format(
            goal=GOAL_HOLDER["goal"],
            tag=el.get("tag", ""),
            id=el.get("id") or el.get("name") or "",
            text=(el.get("text") or "")[:60],
            history="; ".join(GOAL_HOLDER["history"][-8:]) or "(none)",
        )
        try:
            if engine == "nvidia":
                reply, _u = ask_nvidia(model, prompt, timeout=180)
            elif engine == "opencode":
                reply = ask_model(model, prompt)
            elif engine == "amd":
                reply, _u = ask_amd(model, prompt, timeout=180)
            else:
                reply = ""
        except Exception:
            reply = ""
        reply = (reply or "").strip().strip('"').strip("'").splitlines()[0][:80] if reply else ""
        if reply:
            GOAL_HOLDER["history"].append(f"type {el.get('id') or el.get('name')}='{reply[:30]}'")
        return reply or goal_text_helper_fallback(act, els)
    return helper


GOAL_HOLDER = {"goal": "", "history": []}

EXEC_JS_TEMPLATE = """(() => {{
  const els = [];
  const walk = (root) => {{
    for (const n of root.querySelectorAll('*')) {{
      const tag = n.tagName.toLowerCase();
      if (['a','button','input','select','textarea'].includes(tag) || n.getAttribute('role') === 'button') els.push(n);
    }}
  }};
  walk(document);
  for (const host of document.querySelectorAll('*')) {{ if (host.shadowRoot) {{ try {{ walk(host.shadowRoot); }} catch(e){{}} }} }}
  const el = els[{idx} - 1];
  if (!el) return 'element not found';
  const a = {act};
  if (a.action === 'type') {{
    el.focus(); el.value = a.value || '';
    el.dispatchEvent(new Event('input', {{bubbles:true}}));
    el.dispatchEvent(new Event('change', {{bubbles:true}}));
    return 'typed ' + (a.value||'');
  }}
  if (a.action === 'select') {{
    const want = (a.value || '').toLowerCase().trim();
    let opt = Array.from(el.options).find(o => o.text.toLowerCase().trim() === want || o.value.toLowerCase().trim() === want);
    if (!opt) opt = Array.from(el.options).find(o => o.text.toLowerCase().includes(want));
    if (!opt) return 'option not found: ' + a.value;
    el.value = opt.value;
    el.dispatchEvent(new Event('change', {{bubbles:true}}));
    el.dispatchEvent(new Event('input', {{bubbles:true}}));
    return 'selected ' + opt.text + ' (value=' + opt.value + ')';
  }}
  el.click();
  return 'clicked ' + (el.innerText || el.getAttribute('aria-label') || '').slice(0, 40);
}})()"""


def execute(act: dict):
    # v2.3: modo single tambem usa o BATCH_JS (re-resolve por id/label + re-walk).
    # Se o executor devolver terminal (wait/navigate/upload), repassa como dict p/ o caller.
    res = execute_batch([act])
    if res.get("terminal"):
        return json.dumps(res, ensure_ascii=False)
    return json.dumps((res.get("results") or [{}])[0], ensure_ascii=False)


# ---------------- v2.3: BATCH com RE-RESOLVE, novas ops e negative asserts ----------------
# Fixes da T1-Xtesting (results/phase8b-xt-testing.md):
# 1. re-resolve: cada acao re-resolve o elemento NO MOMENTO da execucao por
#    {element (idx tentativa), id, label contains, tag} — nao indice congelado do snapshot
# 2. ops novas: upload(element|label, value=filepath via CDP SetFileInput), navigate(url),
#    wait(value=ms|selector), press(value=key), reload
# 3. negative asserts: assert_text_absent, expect_blocked (acao que DEVE falhar/422)
# 4. execucao por etapas: cada acao re-walka o DOM (re-render-safe); asserts de erro
#    de validacao deixam o lote continuar (estado esperado), erros inesperados param

BATCH_JS_TEMPLATE = """(() => {
  const acts = __ACTS__;
  const norm = (s) => (s || '').toString().toLowerCase().replace(/\\s+/g, ' ').trim();
  // v2.3.1 (pesquisa web): bid persistente — injeta data-ub2-idx em cada elemento
  // (padrao browser-use/simdrive stable_id: atributo sobrevive a re-render parcial)
  const collect = () => {
    const els = [];
    const walk = (root) => {
      for (const n of root.querySelectorAll('*')) {
        const tag = n.tagName.toLowerCase();
        if (['a','button','input','select','textarea'].includes(tag) || n.getAttribute('role') === 'button') {
          els.push(n);
          n.setAttribute('data-ub2-idx', String(els.length));
        }
      }
    };
    walk(document);
    for (const host of document.querySelectorAll('*')) {
      if (host.shadowRoot) { try { walk(host.shadowRoot); } catch(e){} }
    }
    return els;
  };
  const actionable = (el) => el && !el.disabled && (el.offsetParent !== null || el.getClientRects().length > 0);
  // resolve por bid (atributo) > id > label > posicao; com AUTO-WAIT (padrao Playwright:
  // re-resolve + espera actionable ate budget — mata stalls de re-render async)
  const resolve = (a, els) => {
    // v2.5.1: label com precedencia quando o op nao tem id/bid — clicks por texto
    // ("Criar plano DEMO-024") sao o que sobrevive a re-indexacao entre paginas
    if (!a.id && !a.bid && a.label) {
      const cands0 = collect();
      const want0 = norm(a.label);
      const m0 = cands0.find(e =>
        norm(e.innerText).includes(want0) ||
        norm(e.getAttribute && (e.getAttribute('aria-label') || '')).includes(want0));
      if (m0) return m0;
    }
    if (a.id) { const byId = document.getElementById(a.id); if (byId) return byId; }
    if (a.bid || a.element) {
      const sel = '[data-ub2-idx="' + (a.bid || a.element) + '"]';
      const byAttr = document.querySelector(sel) ||
        (() => { for (const h of document.querySelectorAll('*')) {
          if (h.shadowRoot) { try { const r = h.shadowRoot.querySelector(sel); if (r) return r; } catch(e){} } } return null; })();
      if (byAttr) return byAttr;
    }
    if (a.label) {
      const want = norm(a.label);
      const cands = collect();
      const m = cands.find(e =>
        norm(e.innerText).includes(want) ||
        norm(e.getAttribute && (e.getAttribute('aria-label') || '')).includes(want) ||
        norm(e.value).includes(want) ||
        norm(e.placeholder).includes(want) ||
        (e.tagName === 'A' && norm(e.href).includes(want)));
      if (m) return m;
      const idm = /\\b([A-Za-z][\\w-]*)\\b\\s*:\\s/.exec(a.label || '');
      if (idm) { const b = cands.find(e => e.id === idm[1]); if (b) return b; }
    }
    // v2.5.4: fallback por POSICAO so com a.element explicito — sem ele, nao achou = null
    return (a.element !== undefined && a.element !== null && els[a.element - 1]) || null;
  };
  const resolveWait = (a, els, budgetMs) => {
    const t0 = Date.now();
    let el = null;
    do {
      el = resolve(a, els);
      if (el && actionable(el)) return el;
      if (Date.now() - t0 >= (budgetMs || 3000)) break;
      const until = Date.now() + 120;
      while (Date.now() < until) {}
    } while (true);
    return (el && actionable(el)) ? el : null; // v2.4.4: nao devolver nao-actionable (modal fechado etc)
  };
  const results = [];
  for (let i = 0; i < acts.length; i++) {
    const a = acts[i];
    const els = collect(); // re-walk + re-injeta bids a cada acao (re-render-safe)
    if (a.action === 'assert_text') {
      const ok = (document.body ? document.body.innerText : '').includes(a.value || '');
      results.push({i, action: 'assert_text', ok, value: a.value});
      if (!ok) return JSON.stringify({results, stopped_at: i, reason: 'assert_text failed: ' + (a.value||'')});
      continue;
    }
    if (a.action === 'assert_text_absent') {
      const bad = (document.body ? document.body.innerText : '').includes(a.value || '');
      results.push({i, action: 'assert_text_absent', ok: !bad, value: a.value});
      if (bad) return JSON.stringify({results, stopped_at: i, reason: 'assert_text_absent: found ' + (a.value||'')});
      continue;
    }
    if (a.action === 'assert_field') {
      const el = resolve(a, els);
      const v = el && el.value !== undefined ? el.value : (el ? el.innerText : '');
      const ok = !!(v && v.includes(a.value || ''));
      results.push({i, action: 'assert_field', ok, value: a.value, got: String(v).slice(0,60)});
      if (!ok) return JSON.stringify({results, stopped_at: i, reason: 'assert_field failed (v=' + v + ')'});
      continue;
    }
    if (a.action === 'wait') {
      results.push({i, action: 'wait', value: a.value});
      return JSON.stringify({results, stopped_at: i, reason: 'wait', terminal: 'wait'});
    }
    if (a.action === 'navigate' || a.action === 'reload') {
      results.push({i, action: a.action, value: a.value});
      return JSON.stringify({results, stopped_at: i, reason: a.action, terminal: a.action, url: a.value || location.href});
    }
    if (a.action === 'expect_blocked') {
      results.push({i, action: 'expect_blocked', note: 'next failure is expected'});
      acts[i+1] = Object.assign({}, acts[i+1] || {}, {_expect_fail: true});
      continue;
    }
    if (a.action === 'done' || a.action === 'blocked') {
      results.push({i, action: a.action});
      return JSON.stringify({results, stopped_at: null, terminal: a.action});
    }
    const el = resolveWait(a, els, a._expect_fail ? 800 : 3000);
    if (!el) {
      results.push({i, error: 'element not found (waited)', element: a.element, label: a.label, bid: a.bid});
      if (a._expect_fail) { results[results.length-1].expected = true; continue; }
      return JSON.stringify({results, stopped_at: i, reason: 'element not found'});
    }
    if (el.disabled) {
      if (a._expect_fail) { results.push({i, action: a.action, blocked: true, expected: true}); continue; }
      results.push({i, error: 'element disabled (waited)'});
      return JSON.stringify({results, stopped_at: i, reason: 'element disabled'});
    }
    if (a.action === 'type') {
      el.focus(); el.value = a.value || '';
      el.dispatchEvent(new Event('input', {bubbles:true}));
      el.dispatchEvent(new Event('change', {bubbles:true}));
      results.push({i, action: 'type', ok: true, id: el.id, value: a.value});
      continue;
    }
    if (a.action === 'press') {
      el.focus();
      const k = (a.value || 'Enter');
      el.dispatchEvent(new KeyboardEvent('keydown', {key: k, bubbles: true}));
      el.dispatchEvent(new KeyboardEvent('keyup', {key: k, bubbles: true}));
      el.dispatchEvent(new KeyboardEvent('keypress', {key: k, bubbles: true}));
      results.push({i, action: 'press', ok: true, id: el.id, key: k});
      continue;
    }
    if (a.action === 'select') {
      const deacc = (s) => norm(s).normalize('NFD').replace(/[̀-ͯ]/g, '');
      const want = deacc(a.value);
      let opt = Array.from(el.options).find(o => deacc(o.text) === want || deacc(o.value) === want);
      if (!opt) opt = Array.from(el.options).find(o => deacc(o.text).includes(want));
      if (!opt) {
        results.push({i, error: 'option not found: ' + a.value});
        return JSON.stringify({results, stopped_at: i, reason: 'option not found'});
      }
      el.value = opt.value;
      el.dispatchEvent(new Event('change', {bubbles:true}));
      el.dispatchEvent(new Event('input', {bubbles:true}));
      results.push({i, action: 'select', ok: true, id: el.id, value: opt.text});
      continue;
    }
    if (a.action === 'upload') {
      results.push({i, action: 'upload', pending: true, id: el.id || a.label});
      return JSON.stringify({results, stopped_at: i, reason: 'upload', terminal: 'upload',
                             file: a.value, selector: el.id ? ('#'+el.id) : 'input[type=file]'});
    }
    if (a.action === 'click') {
      el.click();
      results.push({i, action: 'click', ok: true, id: el.id, text: (el.innerText||'').slice(0,40)});
      continue;
    }
    results.push({i, error: 'unknown action ' + a.action});
    return JSON.stringify({results, stopped_at: i, reason: 'unknown action'});
  }
  return JSON.stringify({results, stopped_at: null});
})()"""


def execute_batch(acts: list):
    """Executa uma lista de acoes em UM ciclo browser; retorna dict {results, stopped_at, ...}."""
    js_code = BATCH_JS_TEMPLATE.replace("__ACTS__", json.dumps(acts))
    r = harness(f"print(js({json.dumps(js_code)}))", timeout=90)
    out = (r["out"] or r["err"]).strip()
    try:
        line = out.splitlines()[-1]
        return json.loads(line)
    except Exception:
        return {"results": [], "stopped_at": None, "error": out[:300]}


def parse_plan(reply: str):
    """Extrai lista de acoes (JSON array) da resposta do modelo free."""
    m = re.search(r"\[[\s\S]*?\]", reply)
    if not m:
        return None
    try:
        plan = json.loads(m.group(0))
        return plan if isinstance(plan, list) and plan else None
    except Exception:
        return None


def ask_jev_plan(state_block: str, goal: str, els: list, text_helper=None,
                 n_heads=4, timeout=30):
    """JEV PLAN MODE (v2.2): N pares especulativos op_k/tgt_k em UMA request.
    TypeSafe docs: 'Adding questions barely changes the response time' — fan-out multi-passo."""
    import urllib.request, urllib.error
    key = _load_env_file()
    if not key:
        raise RuntimeError("TYPESAFE_API_KEY ausente (env ou hermes/.env)")

    table_lines = [f"[{e['idx']}]{'(H)' if not e.get('visible', True) else ''} {e['tag']}{'/' + e['role'] if e['role'] else ''} · {e['text']}"
                   for e in els]
    state = f"""Browser page goal: {goal}

{state_block}

Plan the next actions to complete the goal. Each op_k/tgt_k pair = one step, in order. Plan all remaining steps.

Interactive elements (index · tag · state; (H)=hidden/not in current step yet — wait until its step is active):
""" + "\n".join(table_lines)

    criteria_target = {}
    for e in els:
        label = f"{e['tag']}{'(hidden)' if not e.get('visible', True) else ''} {e.get('id') or e.get('name') or ''}: {e['text'][:60]}".strip()
        criteria_target[str(e["idx"])] = label

    questions = {}
    for k in range(1, n_heads + 1):
        questions[f"op{k}"] = {
            "type": "choice",
            "instructions": f"Step {k}: which operation? Use 'done' if the goal is complete by then, 'blocked' if impossible.",
            "criteria": JEV_OPS,
        }
        questions[f"tgt{k}"] = {
            "type": "choice",
            "instructions": f"Step {k}: which element index? (Speculative.)",
            "criteria": criteria_target,
        }

    body = json.dumps({"state": state, "model": "jev-latest", "questions": questions}).encode()
    req = urllib.request.Request(TYPESAFE_URL, data=body, headers={
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json"})
    t0 = time.time()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            d = json.loads(r.read())
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"Jev plan failed: {e} {e.read()[:200].decode(errors='replace')}")
    except Exception as e:
        raise RuntimeError(f"Jev plan failed: {e}")
    lat = round(time.time() - t0, 2)

    acts = []
    terminal = None
    for k in range(1, n_heads + 1):
        op = d["answers"].get(f"op{k}", {})
        tgt = d["answers"].get(f"tgt{k}", {})
        op_name = op.get("choice")
        if not op_name:
            break
        act = {"action": op_name,
               "element": int(tgt.get("choice", 0) or 0),
               "value": "",
               "reason": f"jev-plan step{k} conf op={op.get('confidence')} tgt={tgt.get('confidence')}"}
        if op_name in ("type", "select") and text_helper:
            act["value"] = text_helper(act, els, k)
        acts.append(act)
        if op_name in ("done", "blocked"):
            terminal = op_name
            break
    usage = d.get("usage", {})
    return acts, lat, usage, terminal


def verify(spec: str):
    """Verifier independente por CÓDIGO (inline JS — sem confiar no modelo).
    Formatos: text_contains:X | url_contains:X | title_contains:X | field_value:sel|expected
    Pipe dentro do arg: usar '||' como separador duplo se necessário."""
    kind, _, rest = spec.partition(":")
    arg = rest
    if kind == "text_contains":
        expr = (f"(() => (document.body ? document.body.innerText : '').includes({json.dumps(arg)}) "
                f"? 'PASS: text contains' : 'FAIL: text missing')()")
    elif kind == "url_contains":
        expr = f"(() => (location.href.includes({json.dumps(arg)}) ? 'PASS: url' : 'FAIL: url=' + location.href))()"
    elif kind == "title_contains":
        expr = f"(() => (document.title.includes({json.dumps(arg)}) ? 'PASS: title' : 'FAIL: title=' + document.title))()"
    elif kind == "field_value":
        sel, _, expected = rest.partition("|")
        expr = (f"(() => {{ const el = document.querySelector({json.dumps(sel)}); if (!el) return 'FAIL: no element'; "
                f"const v = el.value !== undefined ? el.value : el.innerText; "
                f"return (v === {json.dumps(expected)} || v.includes({json.dumps(expected)})) ? 'PASS: field=' + v : 'FAIL: field=' + v; }})()")
    elif kind == "persisted":
        # v2.4.6: recarrega a pagina e so passa se o texto aparecer APOS o reload
        # (persistencia de verdade — caso xt25sc: verify passava pre-reload)
        expr = (f"(() => (location.reload(), 'RELOADING'))()")
        r0 = harness(f"print(js({json.dumps(expr)}))")
        time.sleep(2.5)
        r1 = harness(f"print(js({json.dumps(f'(() => (document.body ? document.body.innerText : \'\').includes({json.dumps(arg)}) ? \'PASS: persisted\' : \'FAIL: not after reload\')()')}))")
        out = (r1["out"] or r1["err"]).strip()
        return "PASS" if "PASS" in out else f"FAIL ({out[:80]})"
    else:
        return "FAIL: unknown verifier"
    r = harness(f"print(js({json.dumps(expr)}))")
    out = (r["out"] or r["err"]).strip()
    return "PASS" if "PASS" in out else f"FAIL ({out[:80]})"


def human_pause(lo=0.3, hi=1.2):
    time.sleep(0.3 + (hi - lo) * 0.5)


NVIDIA_BASE = "https://integrate.api.nvidia.com/v1/chat/completions"
KILOCODE_BASE = "https://api.kilo.ai/api/gateway/chat/completions"
OPENROUTER_BASE = "https://openrouter.ai/api/v1/chat/completions"
AMD_BASE = "https://developer.amd.com.cn/radeon/api/v1/chat/completions"


def _load_amd_key():
    """AMD_RADEON_API_KEY do env ou .env do Hermes."""
    key = os.environ.get("AMD_RADEON_API_KEY")
    if key:
        return key
    try:
        p = os.path.join(os.environ.get("LOCALAPPDATA", ""), "hermes", ".env")
        with open(p, encoding="utf-8") as f:
            for line in f:
                if line.startswith("AMD_RADEON_API_KEY="):
                    return line.strip().split("=", 1)[1]
    except Exception:
        pass
    return None


def ask_amd(model: str, prompt: str, timeout=120):
    """AMD Radeon catalog (OpenAI-compatible). Retorna (texto, usage)."""
    import urllib.request, urllib.error
    key = _load_amd_key()
    if not key:
        raise RuntimeError("AMD_RADEON_API_KEY ausente")
    body = json.dumps({
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.1, "max_tokens": 800,
    }).encode()
    req = urllib.request.Request(AMD_BASE, data=body, headers={
        "Authorization": f"Bearer {key}",
        "Accept": "application/json",
        "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            d = json.loads(r.read())
            usage = d.get("usage", {})
            return d["choices"][0]["message"].get("content", "") or "", usage
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"amd-radeon {model} failed: {e} {e.read()[:200].decode(errors='replace')}")
    except Exception as e:
        raise RuntimeError(f"amd-radeon {model} failed: {e}")


def _load_openrouter_key():
    """OPENROUTER_API_KEY do env ou .env do Hermes."""
    key = os.environ.get("OPENROUTER_API_KEY")
    if key:
        return key
    try:
        p = os.path.join(os.environ.get("LOCALAPPDATA", ""), "hermes", ".env")
        with open(p, encoding="utf-8") as f:
            for line in f:
                if line.startswith("OPENROUTER_API_KEY="):
                    return line.strip().split("=", 1)[1]
    except Exception:
        pass
    return None


def ask_openrouter(model: str, prompt: str, timeout=120):
    """OpenRouter (OpenAI-compatible) — free models :free. Retorna (texto, usage)."""
    import urllib.request, urllib.error
    key = _load_openrouter_key()
    if not key:
        raise RuntimeError("OPENROUTER_API_KEY ausente")
    body = json.dumps({
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.1, "max_tokens": 800,
    }).encode()
    req = urllib.request.Request(OPENROUTER_BASE, data=body, headers={
        "Authorization": f"Bearer {key}",
        "Accept": "application/json",
        "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            d = json.loads(r.read())
            usage = d.get("usage", {})
            return d["choices"][0]["message"].get("content", "") or "", usage
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"openrouter {model} failed: {e} {e.read()[:200].decode(errors='replace')}")
    except Exception as e:
        raise RuntimeError(f"openrouter {model} failed: {e}")


def _load_kilocode_key():
    """KILOCODE_API_KEY do env ou .env do Hermes (a do pool pode estar expirada)."""
    key = os.environ.get("KILOCODE_API_KEY")
    if key:
        return key
    try:
        p = os.path.join(os.environ.get("LOCALAPPDATA", ""), "hermes", ".env")
        with open(p, encoding="utf-8") as f:
            for line in f:
                if line.startswith("KILOCODE_API_KEY="):
                    return line.strip().split("=", 1)[1]
    except Exception:
        pass
    return None


def ask_kilocode(model: str, prompt: str, timeout=120):
    """Kilo Gateway (OpenAI-compatible) — free models :free. Retorna (texto, usage)."""
    import urllib.request, urllib.error
    key = _load_kilocode_key()
    if not key:
        raise RuntimeError("KILOCODE_API_KEY ausente")
    body = json.dumps({
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.1, "max_tokens": 800, "stream": False,
    }).encode()
    req = urllib.request.Request(KILOCODE_BASE, data=body, headers={
        "Authorization": f"Bearer {key}",
        "Accept": "application/json",
        "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            d = json.loads(r.read())
            usage = d.get("usage", {})
            return d["choices"][0]["message"].get("content", "") or "", usage
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"kilocode {model} failed: {e} {e.read()[:200].decode(errors='replace')}")
    except Exception as e:
        raise RuntimeError(f"kilocode {model} failed: {e}")


def _load_nvidia_key():
    """NVIDIA_API_KEY do env, .env do Hermes, ou credential_pool do auth.json."""
    key = os.environ.get("NVIDIA_API_KEY")
    if key:
        return key
    try:
        p = os.path.join(os.environ.get("LOCALAPPDATA", ""), "hermes", ".env")
        with open(p, encoding="utf-8") as f:
            for line in f:
                if line.startswith("NVIDIA_API_KEY="):
                    return line.strip().split("=", 1)[1]
    except Exception:
        pass
    # credential pool do auth.json (formato do Hermes: pool[provider] = [item,...])
    try:
        p = os.path.join(os.environ.get("LOCALAPPDATA", ""), "hermes", "auth.json")
        with open(p, encoding="utf-8") as f:
            d = json.load(f)
        pool = d.get("credential_pool", {}).get("nvidia", [])
        for item in pool:
            if not isinstance(item, dict):
                continue
            for k in ("api_key", "access_token", "key", "token"):
                v = item.get(k)
                if isinstance(v, str) and v:
                    return v
    except Exception:
        pass
    return None


def ask_nvidia(model: str, prompt: str, timeout=90):
    """NIM (OpenAI-compatible) como motor free tier-2. Retorna texto da resposta."""
    import urllib.request, urllib.error
    key = _load_nvidia_key()
    if not key:
        raise RuntimeError("NVIDIA_API_KEY ausente")
    body = json.dumps({
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.1, "max_tokens": 800, "stream": False,
    }).encode()
    req = urllib.request.Request(NVIDIA_BASE, data=body, headers={
        "Authorization": f"Bearer {key}",
        "Accept": "application/json",
        "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            d = json.loads(r.read())
            usage = d.get("usage", {})
            return d["choices"][0]["message"].get("content", "") or "", usage
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"NIM {model} failed: {e} {e.read()[:200].decode(errors='replace')}")
    except Exception as e:
        raise RuntimeError(f"NIM {model} failed: {e}")


def run_batch(url, goal, model, max_cycles, verify_spec, record, engine="typesafe",
              text_helper=None, n_heads=4):
    """v2.2 BATCH MODE: 1 ciclo = snapshot -> plano multi-acao -> executa lote -> verifier."""
    log = {"url": url, "goal": goal, "model": model, "mode": "batch", "cycles": [], "result": None}
    rec_name = f"ub22-{int(time.time())}"
    pre = f'start_recording(name="{rec_name}", title="{goal[:40]}")\n' if record else ""
    harness(f'{pre}goto_url("{url}")\nimport time as _t\n_t.sleep(1.5)', timeout=90)

    for cycle in range(max_cycles):
        t0 = time.time()
        try:
            state = snapshot()
        except RuntimeError as e:
            log["cycles"].append({"error": str(e)})
            break
        els = state.get("elements", [])
        page_text = state.get("pageText", "")[:1500]
        state_block = (f"Current page: {state.get('title','')} ({state.get('url','')})\n"
                       f"Page text: {page_text}")
        entry = {"cycle": cycle, "n_elements": len(els)}

        if engine == "typesafe":
            try:
                plan, lat, usage, terminal = ask_jev_plan(state_block, goal, els,
                                                         text_helper, n_heads=n_heads)
            except RuntimeError as e:
                log["cycles"].append({"error": str(e)})
                break
            entry["latency_s"] = lat
            entry["usage"] = usage
            entry["plan"] = plan
        else:  # free engines: pedir array de acoes
            table = "\n".join(
                f"[{e['idx']}]{'(H)' if not e.get('visible', True) else ''} {e['tag']}{'/' + e['role'] if e['role'] else ''} · {e['text']}"
                for e in els)[:3000]
            prompt = f"""You are a browser agent. GOAL: {goal}

Current page: {state.get('title','')} ({state.get('url','')})
Page text (first 1500 chars): {page_text}

Interactive elements (index · tag · state; (H)=hidden/not in current step yet — wait until its step is active):
{table}

Reply with ONLY a JSON array of actions to execute IN ORDER, no markdown:
[{{"action": "select", "element": 1, "value": "...", "reason": "..."}},
 {{"action": "click", "element": 4, "id": "next", "label": "Continue"}},
 {{"action": "expect_blocked"}}, {{"action": "click", "label": "Continue with invalid email"}},
 {{"action": "assert_text_absent", "value": "Planos salvos"}},
 {{"action": "upload", "id": "file", "value": "fixture-evidence.txt"}},
 {{"action": "wait", "value": "1"}},
 {{"action": "navigate", "value": "http://..."}},
 {{"action": "reload"}},
 {{"action": "assert_text", "value": "expected success text"}},
 {{"action": "done", "reason": "..."}}]
Rules:
- Plan ALL remaining steps in one array (batch execution). Element indices refer to the CURRENT snapshot; after each step the page may re-render, so PREFER "id" or "label" (text of the element) over index when the element must survive re-renders.
- Use "expect_blocked" BEFORE an action that must fail validation (e.g. continue with invalid email), then correct the field and proceed.
- "upload" value = filename only; "navigate"/"reload" end the batch (the page changes); "wait" value = seconds.
- Fields already filled do NOT need to be re-typed.
- If genuinely impossible: [{{"action": "blocked", "reason": "..."}}]"""
            usage = {}
            try:
                if engine == "nvidia":
                    reply, usage = ask_nvidia(model, prompt, timeout=240)
                elif engine == "kilocode":
                    reply, usage = ask_kilocode(model, prompt, timeout=120)
                elif engine == "openrouter":
                    reply, usage = ask_openrouter(model, prompt, timeout=120)
                elif engine == "amd":
                    # GLM-5.3-Flash tem cold-start de ~70s+ na AMD; 300s cobre
                    reply, usage = ask_amd(model, prompt, timeout=300)
                else:
                    reply = ask_model(model, prompt)
            except RuntimeError as e:
                log["cycles"].append({"error": str(e)})
                break
            plan = parse_plan(reply)
            entry["latency_s"] = round(time.time() - t0, 1)
            entry["reply"] = reply[:300]
            entry["plan"] = plan
            if usage:
                entry["usage"] = usage

        if not plan:
            log["cycles"].append(entry)
            continue
        log["cycles"].append(entry)

        # extrair terminal (done/blocked) e asserts do plano
        terminal = None
        exec_acts = []
        for a in plan:
            if a.get("action") in ("done", "blocked"):
                terminal = a.get("action")
                break
            exec_acts.append(a)
        if exec_acts:
            batch_result = execute_batch(exec_acts)
            log["cycles"][-1]["exec"] = batch_result
            term = batch_result.get("terminal")
            # v2.3: terminais especiais do executor
            if term == "wait":
                try:
                    time.sleep(min(5, float(batch_result.get("value") or 1)))
                except Exception:
                    time.sleep(1)
                continue  # re-planejar pos espera
            if term in ("navigate", "reload"):
                dest = batch_result.get("url") or url
                harness(f'goto_url("{dest}")\nimport time as _t\n_t.sleep(1.5)', timeout=90)
                continue  # novo snapshot apos navegacao
            if term == "upload":
                # upload real via harness (CDP): file input + arquivo do goal
                file_label = batch_result.get("file") or "fixture-evidence.txt"
                fx = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                                  "..", "..", ".openclaw", "workspace", "pocs",
                                  "browser-benchmark-20261016", "fixtures", file_label)
                fx = os.path.normpath(fx)
                sel = batch_result.get("selector") or "input[type=file]"
                up = harness(
                    "import time as _t\n"
                    "try:\n"
                    f"    upload_file({json.dumps(sel)}, {json.dumps(fx)})\n"
                    "    _t.sleep(1)\n"
                    "    print('upload-ok')\n"
                    "except Exception as e:\n"
                    "    print('upload-fail', e)\n", timeout=90)
                up_out = up["out"] if isinstance(up, dict) else str(up)
                log["cycles"][-1]["upload"] = str(up_out)[:200]
                continue  # re-planejar apos upload
            # se o batch parou num assert falho -> re-planejar no proximo ciclo
            if batch_result.get("stopped_at") is not None and "assert" in str(
                    batch_result.get("reason", "")):
                continue
            # v2.3: falha de elemento/option NAO e assert — re-planejar (estado pode ter mudado)
            if batch_result.get("stopped_at") is not None:
                continue
        # terminal declarado OU asserts passaram: rodar o verifier independente
        if terminal == "blocked":
            log["result"] = "BLOCKED"
            break
        if terminal == "done" or (exec_acts and all(
                r.get("ok") for r in (batch_result or {}).get("results", [])
                if "ok" in r)):
            if verify_spec:
                ok = verify(verify_spec)
                log["cycles"].append({"verifier": verify_spec, "verdict": ok})
                if ok == "PASS":
                    log["result"] = "DONE-VERIFIED-BATCH"
                    break
                continue
            log["result"] = "DONE-BATCH"
            break
        human_pause()

    if record:
        harness("stop_recording()", timeout=60)
    return log


def run(url, goal, model, max_steps, verify_spec, record, engine="opencode", text_helper=None):
    log = {"url": url, "goal": goal, "model": model, "steps": [], "result": None}
    rec_name = f"ub2-{int(time.time())}"
    pre = f'start_recording(name="{rec_name}", title="{goal[:40]}")\n' if record else ""
    harness(f'{pre}goto_url("{url}")\nimport time as _t\n_t.sleep(1.5)', timeout=90)

    last_act = None
    same_count = 0
    prev_state_sig = None
    act_history = []  # v2.3.4: historico de acoes p/ o planejador (JEV stateless)
    for step in range(max_steps):
        t0 = time.time()
        try:
            state = snapshot()
        except RuntimeError as e:
            log["steps"].append({"error": str(e)})
            break

        els = state.get("elements", [])
        table = "\n".join(
            f"[{e['idx']}]{'(H)' if not e.get('visible', True) else ''} {e['tag']}{'/' + e['role'] if e['role'] else ''} · {e['text']}"
            for e in els)[:3000]
        page_text = state.get("pageText", "")[:1500]

        prompt = None
        if engine == "typesafe":
            state_block = (f"Current page: {state.get('title','')} ({state.get('url','')})\n"
                           f"Page text: {page_text}")
            try:
                act, jlat, usage = ask_jev(state_block, goal, els, text_helper,
                                           history=act_history)
                log["steps"].append({"step": step, "parsed": act, "latency_s": jlat,
                                     "engine": "jev", "usage": usage})
                reply = ""  # ja parseado
            except RuntimeError as e:
                log["steps"].append({"step": step, "error": str(e), "engine": "jev"})
                break
        else:
            prompt = f"""You are a browser agent. GOAL: {goal}

Current page: {state.get('title','')} ({state.get('url','')})
Page text (first 1500 chars): {page_text}

Interactive elements (index · tag · state; (H)=hidden/not in current step yet — wait until its step is active):
{table}

Reply with ONLY one JSON object, no markdown:
{{"action": "click|type|select|done|blocked", "element": <index>, "value": "<text if type/select>", "reason": "<short>"}}
Rules:
- If the goal mentions a label that does not exactly match an element, click the closest match instead of blocking.
- For 'select' elements use the option text.
- Fields already filled (value="...") do NOT need to be re-typed.
- If goal is complete, use "done" with the requested info in reason.
- If genuinely impossible, use "blocked"."""

        if engine == "opencode":
            reply = ask_model(model, prompt or "")
            act = parse_action(reply)
            log["steps"].append({"step": step, "parsed": act,
                                 "latency_s": round(time.time() - t0, 1),
                                 "reply": reply[:200]})
        elif engine in ("nvidia", "kilocode", "openrouter", "amd"):
            usage = {}
            try:
                if engine == "nvidia":
                    reply, usage = ask_nvidia(model, prompt or "", timeout=240)
                elif engine == "kilocode":
                    reply, usage = ask_kilocode(model, prompt or "", timeout=120)
                elif engine == "amd":
                    reply, usage = ask_amd(model, prompt or "", timeout=120)
                else:
                    reply, usage = ask_openrouter(model, prompt or "", timeout=120)
            except RuntimeError as e:
                log["steps"].append({"step": step, "error": str(e), "engine": engine})
                break
            act = parse_action(reply)
            entry = {"step": step, "parsed": act,
                     "latency_s": round(time.time() - t0, 1),
                     "reply": reply[:200]}
            if usage:
                entry["usage"] = usage
            log["steps"].append(entry)
        if not act:
            continue

        key = (act.get("action"), act.get("element"))
        # v2.3.3: loop-guard STATE-AWARE — repeticao so e loop se o snapshot NAO mudou.
        # (Padrao frontier: guard por ausencia de mudanca de estado, nao por repeticao.)
        state_sig = json.dumps([{k: e.get(k) for k in ("idx", "text", "value", "visible")}
                                for e in (els or [])], ensure_ascii=False)
        state_changed = state_sig != prev_state_sig
        prev_state_sig = state_sig
        same_count = same_count + 1 if (key == last_act and not state_changed) else 0
        last_act = key
        if same_count >= 2:
            # VERIFIER NO ABORT: o modelo pode ter completado sem perceber (caso real T4 deepseek).
            if verify_spec:
                ok = verify(verify_spec)
                log["steps"].append({"loop_guard": f"same action x3: {key}",
                                     "verifier_on_abort": verify_spec, "verdict": ok})
                log["result"] = "DONE-VERIFIED" if ok == "PASS" else "LOOP-ABORT"
            else:
                log["steps"].append({"loop_guard": f"same action x3: {key} -> abort"})
                log["result"] = "LOOP-ABORT"
            break

        if act["action"] == "done":
            if verify_spec:
                ok = verify(verify_spec)
                log["steps"].append({"verifier": verify_spec, "verdict": ok})
                if ok == "PASS":
                    log["result"] = "DONE-VERIFIED"
                    break
                continue  # verifier falhou: mais ate 3 ciclos (max_steps cobre)
            log["result"] = "DONE"
            break
        if act["action"] == "blocked":
            log["result"] = "BLOCKED"
            break

        # v2.3: enriquecer a acao com id/label do elemento do snapshot (re-resolve)
        try:
            el_ref = els[int(act.get("element") or 1) - 1]
            if el_ref.get("id"):
                act["id"] = el_ref["id"]
            act["label"] = (f"{el_ref.get('tag','')} {el_ref.get('id','')}: "
                            f"{el_ref.get('text','')}").strip()[:80]
        except Exception:
            pass

        exec_result = execute(act)
        log["steps"][-1]["exec"] = exec_result
        # v2.4.6: VERIFY-AFTER-EVERY-SAVE — o goal pede save UNICO; depois do 1o save
        # com sucesso, qualquer verify PASS = trabalho completo: PARAR na hora.
        # (Caso real xt25sc: agente continuou navegando pos-save e a fixture gritou
        # "A plan already exists" na 2a tentativa — trabalho INCOMPLETO apesar de 10/11.)
        try:
            exj0 = json.loads(exec_result) if isinstance(exec_result, str) else {}
            saved_now = (isinstance(exj0, dict) and (
                (exj0.get("action") == "click" and exj0.get("ok")
                 and "salvar" in str(act.get("label", "")).lower())
                or "saved" in str(exec_result)))
            if saved_now and verify_spec:
                ok = verify(verify_spec)
                log["steps"].append({"verifier_after_save": verify_spec, "verdict": ok})
                if ok == "PASS":
                    log["result"] = "DONE-VERIFIED"
                    break
        except Exception:
            pass
        # v2.4.5: popular historico p/ o proximo planejamento (aacao + alvo curto)
        try:
            exj = json.loads(exec_result) if isinstance(exec_result, str) else exec_result
            ok_flag = (exj or {}).get("ok")
            tgt = act.get("id") or act.get("label") or f"element {act.get('element')}"
            if ok_flag:
                act_history.append(f"{act.get('action')} '{tgt}'"
                                   + (f" value='{(act.get('value') or '')[:40]}'" if act.get("value") else ""))
            else:
                # v2.4.5: FALHAS tambem entram no historico — senao o planejador
                # re-tenta a mesma acao que falhou (ex.: save com modal fechado)
                reason = ((exj or {}).get("error")
                          or ((exj or {}).get("results") or [{}])[0].get("error")
                          or "unknown error") if isinstance(exj, dict) else str(exec_result)[:60]
                act_history.append(f"FAILED: {act.get('action')} '{tgt}' ({str(reason)[:60]}) — "
                                   f"this element is NOT actionable now; re-open the needed panel/step first "
                                   f"or pick a DIFFERENT element")
        except Exception:
            pass
        # v2.3: falha de execucao NAO e loop — deixar o modelo re-observar e re-planejar
        if "not found" in str(exec_result) or "disabled" in str(exec_result):
            human_pause()
            continue
        # v2.3.5: terminais upload/navigate/wait/reload no SINGLE mode tambem
        try:
            exj = json.loads(exec_result) if isinstance(exec_result, str) else {}
            if isinstance(exj, dict) and exj.get("terminal") == "upload":
                file_label = act.get("value") or exj.get("file") or "fixture-evidence.txt"
                fx = os.path.normpath(os.path.join(
                    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                    "..", "..", ".openclaw", "workspace", "pocs",
                    "browser-benchmark-20261016", "fixtures", file_label))
                sel = exj.get("selector") or ("#" + (act.get("id") or "upload") if act.get("id") else "input[type=file]")
                up = harness(
                    "import time as _t\n"
                    "try:\n"
                    f"    upload_file({json.dumps(sel)}, {json.dumps(fx)})\n"
                    "    _t.sleep(1)\n"
                    "    print('upload-ok')\n"
                    "except Exception as e:\n"
                    "    print('upload-fail', e)\n", timeout=90)
                up_out = up["out"] if isinstance(up, dict) else str(up)
                log["steps"][-1]["upload"] = str(up_out)[:200]
                act_history.append(f"upload '{file_label}' -> {str(up_out)[:40]}")
                human_pause()
                continue
            if isinstance(exj, dict) and exj.get("terminal") in ("navigate", "reload"):
                dest = exj.get("url") or url
                harness(f'goto_url("{dest}")\nimport time as _t\n_t.sleep(1.5)', timeout=90)
                log["steps"][-1]["nav"] = dest
                human_pause()
                continue
            if isinstance(exj, dict) and exj.get("terminal") == "wait":
                try:
                    time.sleep(min(5, float(exj.get("value") or 1)))
                except Exception:
                    time.sleep(1)
                human_pause()
                continue
        except Exception:
            pass
        human_pause()

    if record:
        harness("stop_recording()", timeout=60)
    return log


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", required=True)
    ap.add_argument("--goal", required=True)
    ap.add_argument("--engine", choices=["typesafe", "opencode", "nvidia", "kilocode", "openrouter", "amd"], default=None,
                    help="typesafe = JEV tier 1; opencode = free tier 2 (key expirada 2026-10-19); nvidia = NIM free-tier; kilocode = Kilo :free; openrouter = OpenRouter :free; amd = AMD Radeon catalog")
    ap.add_argument("--mode", choices=["single", "batch"], default="single",
                    help="single = 1 acao por ciclo (v2.1); batch = plano multi-acao + asserts por ciclo (v2.2, padrao OpenGCUA)")
    ap.add_argument("--model", default="opencode/mimo-v2.6-flash-free",
                    help="modelo do tier 2 (opencode)")
    ap.add_argument("--max-steps", type=int, default=10,
                    help="single: max ciclos; batch: max ciclos de replanejamento")
    ap.add_argument("--n-heads", type=int, default=4,
                    help="batch+typesafe: quantos passos especulativos por request JEV")
    ap.add_argument("--verify", default="")
    ap.add_argument("--record", action="store_true")
    ap.add_argument("--value-model", default="",
                    help="v2.4: engine/modelo LLM free que gera os valores (ex.: nvidia/deepseek-ai/deepseek-v4.1-flash)")
    args = ap.parse_args()

    engine = args.engine or ("typesafe" if _load_env_file() else "opencode")

    def goal_text_helper(act, els, step=1):
        # T4 padrao: name=..., email=...
        m = re.search(r"name=([^,]+),\s*email=([^\s,]+)", args.goal)
        el = els[int(act.get("element") or 1) - 1] if act.get("element") and els else {}
        if m:
            if el.get("id") == "name" or "name" in (el.get("text") or ""):
                return m.group(1)
            if el.get("id") == "email":
                return m.group(2)
        # T1 X-testing: valores derivados do goal pelos ids/selects conhecidos da fixture
        gid = el.get("id") or ""
        gtxt = (el.get("text") or "")
        g = args.goal
        if gid == "channel" or "Canal" in gtxt:
            return "WEB"
        if gid == "status" or "Status" in gtxt:
            return "Em análise"
        if gid == "type" or ("Integra" in gtxt):
            return "Integração"
        if gid == "priority" or "prioridade" in gtxt.lower():
            return "Alta"
        if gid == "environment" or "Homologa" in gtxt:
            return "Homologação sintética"
        if gid == "email" or "e-mail" in gtxt.lower() or "qa@example" in gtxt.lower():
            mm = re.search(r"corrija para ([\w.@-]+)", g)
            if mm:
                return mm.group(1).rstrip(".;,!")
            mm = re.search(r"e-mail de fixture invalido[^,]*\s([\w.@-]+)", g)
            if mm:
                return mm.group(1).rstrip(".;,!")
        if gid == "responsible" or "respons" in gtxt.lower():
            mm = re.search(r"respons[aá]vel ([\w ]+?)\.|respons[aá]vel ([\w ]+?)\b", g)
            if mm:
                return (mm.group(1) or mm.group(2) or "").strip().rstrip(".;,!")
        if gid == "title" or "t[ií]tulo" in gtxt.lower() or gid == "plan-title":
            # titulo final pedido no goal
            mm = re.search(r"t[ií]tulo para (Plano[^.;]+)", g)
            if mm:
                return mm.group(1).strip()
            # senao: titulo de cadastro do plano (antes do "Plano ... revisado")
            mm = re.search(r"cadastre um plano de teste", g)
            if mm:
                return "Plano WEB DEMO-024"
        if gid.startswith("title") or (gid == "" and el.get("tag") == "input" and "T[ií]tulo" in gtxt):
            # title1 (cadastro) ou title2 (correcao no review): usar o titulo revisado se
            # o goal pede revisao, senao o de cadastro
            mm = re.search(r"t[ií]tulo para (Plano[^.;]+)", g)
            if mm:
                return mm.group(1).strip()
            return "Plano WEB DEMO-024"
        if gid == "search" or "busca" in gtxt.lower() or "filtro" in gtxt.lower():
            return ""
        if el.get("tag") == "select":
            ms = re.search(r"plan=(\w+)", args.goal)
            if ms:
                return ms.group(1)
        return ""

    # v2.4: value-model (LLM gerador de valores) com fallback no helper regex
    goal_text_helper_fallback = goal_text_helper

    if args.value_model:
        vengine, vmodel = args.value_model.split("/", 1)
        GOAL_HOLDER["goal"] = args.goal
        GOAL_HOLDER["history"] = []
        value_fn = make_value_model_fn(vengine, vmodel)
        common = dict(engine=engine, text_helper=value_fn)
        log_extra = f"value-model={args.value_model}"
    else:
        common = dict(engine=engine,
                      text_helper=goal_text_helper if engine == "typesafe" else None)
        log_extra = ""

    if args.mode == "batch":
        result = run_batch(args.url, args.goal, args.model, args.max_steps, args.verify,
                           args.record, n_heads=args.n_heads, **common)
    else:
        result = run(args.url, args.goal, args.model, args.max_steps, args.verify,
                     args.record, **common)
    if log_extra:
        result["value_model"] = log_extra
    print(json.dumps(result, ensure_ascii=False, indent=1))
    sys.exit(0 if "DONE" in str(result.get("result")) else 1)
