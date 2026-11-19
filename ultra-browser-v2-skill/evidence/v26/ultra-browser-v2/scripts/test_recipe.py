"""Negativos da Entrega 2 v2.6a (recipe.py) — pedido de revisao do Justus.

Cobre: baseline ilegivel (VALERR/rc/saida), await com rc!=0/timeout/malformado,
predicados de conteudo (erro de rede vs validacao, negacao de anexo, arquivo
divergente, texto antigo, modal fechado/prefixo), identidade inicial
(rc/URL/marker) e exit codes. Sem navegador: harness falsificado e predicados
JS avaliados em node com document forjado.
"""
import json
import subprocess
import sys
import unittest
from unittest.mock import patch

import recipe

WANT_URL = "http://127.0.0.1:8791/xt-web-form-01"
VALID_ERROR = "Informe um e-mail válido para continuar."
ATT_OK = "Anexado: fixture-evidence.txt \u00b7 32 bytes"
TITLE_OK = "Plano WEB DEMO-024"
TITLE_REV = "Plano WEB DEMO-024 revisado"


# ---------- 1. read_js: sucesso-vazio x erro (P2 baseline) ----------

class ReadJsTests(unittest.TestCase):
    def run_with(self, rc, out):
        with patch.object(recipe, "harness", lambda *a, **k: {"out": out, "err": "", "rc": rc}):
            return recipe.read_js("(() => 'x')()")

    def test_rc_nonzero_is_failure_even_with_val_line(self):
        got = self.run_with(7, 'VAL "texto"')
        self.assertFalse(got["ok"])
        self.assertEqual(got["rc"], 7)

    def test_valerr_is_failure(self):
        got = self.run_with(0, "VALERR ValueError('boom')")
        self.assertFalse(got["ok"])
        self.assertIn("boom", got["error"])

    def test_missing_output_is_failure(self):
        got = self.run_with(0, "outra saida qualquer")
        self.assertFalse(got["ok"])

    def test_invalid_json_payload_is_failure(self):
        got = self.run_with(0, "VAL {aspas simples}")
        self.assertFalse(got["ok"])

    def test_non_string_value_is_failure(self):
        got = self.run_with(0, "VAL {\"a\": 1}")
        self.assertFalse(got["ok"])

    def test_success_even_when_empty_string(self):
        got = self.run_with(0, 'VAL ""')
        self.assertTrue(got["ok"])
        self.assertEqual(got["value"], "")


# ---------- 2. await_effect: rc!=0 / timeout / malformado (P2) ----------

class AwaitEffectTests(unittest.TestCase):
    def run_with(self, rc, out):
        with patch.object(recipe, "harness", lambda *a, **k: {"out": out, "err": "", "rc": rc}):
            return recipe.await_effect("(() => ({ok: true}))()", timeout_s=0.1)

    def test_positive_output_with_nonzero_rc_is_failure(self):
        got = self.run_with(7, 'AWAIT {"ok": true, "last": {"ok": true}}')
        self.assertIs(got["ok"], False)
        self.assertEqual(got["rc"], 7)
        self.assertEqual(got["error"], "harness rc!=0")

    def test_missing_await_line_is_failure(self):
        got = self.run_with(0, "sem protocolo")
        self.assertFalse(got["ok"])

    def test_malformed_await_line_is_failure(self):
        got = self.run_with(0, "AWAIT {nao e json}")
        self.assertFalse(got["ok"])
        self.assertEqual(got["error"], "AWAIT malformado")

    def test_timeout_ok_false_is_failure(self):
        got = self.run_with(0, 'AWAIT {"ok": false, "last": {"ok": false}}')
        self.assertIs(got["ok"], False)

    def test_truthy_but_not_true_json_ok_is_failure(self):
        got = self.run_with(0, 'AWAIT {"ok": 1, "last": {}}')
        self.assertIs(got["ok"], False)

    def test_happy_path(self):
        got = self.run_with(0, 'AWAIT {"ok": true, "last": {"ok": true}}')
        self.assertIs(got["ok"], True)
        self.assertEqual(got["rc"], 0)


# ---------- 3. Predicados de conteudo avaliados em node (P2) ----------

NODE_STUB = """
const S = JSON.parse(process.argv[1]);
global.document = {
  getElementById(id) {
    if (id === 'modal') return {open: S.modalOpen === true};
    if (id === 'summary') return {querySelectorAll: () => (S.dts || [])};
    return {textContent: (S.texts && id in S.texts) ? S.texts[id] : ''};
  }
};
const r = EVAL_EXPR;
console.log(JSON.stringify(r));
"""


def eval_js(cond_js, state):
    program = NODE_STUB.replace("EVAL_EXPR", "(" + cond_js + ")")
    p = subprocess.run(["node", "-e", program, json.dumps(state)],
                       capture_output=True, text=True, timeout=30)
    assert p.returncode == 0, p.stderr
    return json.loads(p.stdout)


def dts_for(title_value):
    return [{"textContent": "title", "nextElementSibling": {"textContent": title_value}}]


class PredicateTests(unittest.TestCase):
    def test_email_error_requires_fresh_validation_message(self):
        cond = recipe.ERROR_JS.replace("__PREV__", json.dumps(""))
        ok = eval_js(cond, {"texts": {"error": VALID_ERROR}})["ok"]
        self.assertTrue(ok)

    def test_email_error_old_text_rejected(self):
        cond = recipe.ERROR_JS.replace("__PREV__", json.dumps(VALID_ERROR))
        ok = eval_js(cond, {"texts": {"error": VALID_ERROR}})["ok"]
        self.assertFalse(ok)

    def test_email_error_network_failure_rejected(self):
        cond = recipe.ERROR_JS.replace("__PREV__", json.dumps(""))
        ok = eval_js(cond, {"texts": {"error": "Failed to fetch"}})["ok"]
        self.assertFalse(ok)

    def test_email_error_empty_rejected(self):
        cond = recipe.ERROR_JS.replace("__PREV__", json.dumps(""))
        self.assertFalse(eval_js(cond, {"texts": {}})["ok"])

    def test_attachment_positive_confirmation_accepted(self):
        cond = (recipe.ATTACH_JS.replace("__PREV__", json.dumps(""))
                                .replace("__FILE__", json.dumps("fixture-evidence.txt")))
        self.assertTrue(eval_js(cond, {"texts": {"attachment": ATT_OK}})["ok"])

    def test_attachment_negation_rejected(self):
        cond = (recipe.ATTACH_JS.replace("__PREV__", json.dumps(""))
                                .replace("__FILE__", json.dumps("fixture-evidence.txt")))
        self.assertFalse(eval_js(cond, {"texts": {"attachment": "Não anexado"}})["ok"])

    def test_attachment_wrong_file_rejected(self):
        cond = (recipe.ATTACH_JS.replace("__PREV__", json.dumps(""))
                                .replace("__FILE__", json.dumps("fixture-evidence.txt")))
        self.assertFalse(
            eval_js(cond, {"texts": {"attachment": "Anexado: outro.txt · 9 bytes"}})["ok"])

    def test_attachment_substring_false_positives_rejected(self):
        # PARECER-r2: indexOf aceitava nome com sufixo, prefixo ou posicao posterior
        cond = (recipe.ATTACH_JS.replace("__PREV__", json.dumps(""))
                                .replace("__FILE__", json.dumps("fixture-evidence.txt")))
        for text in ("Anexado: fixture-evidence.txt.bak · 32 bytes",
                     "Anexado: not-fixture-evidence.txt · 32 bytes",
                     "Anexado: outro.txt · 32 bytes (original: fixture-evidence.txt)"):
            with self.subTest(text=text):
                self.assertFalse(eval_js(cond, {"texts": {"attachment": text}})["ok"])

    def test_attachment_old_text_rejected(self):
        cond = (recipe.ATTACH_JS.replace("__PREV__", json.dumps(ATT_OK))
                                .replace("__FILE__", json.dumps("fixture-evidence.txt")))
        self.assertFalse(eval_js(cond, {"texts": {"attachment": ATT_OK}})["ok"])

    def test_modal_open_with_exact_title_accepted(self):
        cond = recipe.TITLE_DT_JS.replace("__EXPECTED__", json.dumps(TITLE_OK))
        got = eval_js(cond, {"modalOpen": True, "dts": dts_for(TITLE_OK)})
        self.assertTrue(got["ok"])

    def test_modal_revised_title_against_original_rejected(self):
        # prefixo: 'Plano WEB DEMO-024' e prefixo de '... revisado' — includes passaria
        cond = recipe.TITLE_DT_JS.replace("__EXPECTED__", json.dumps(TITLE_OK))
        got = eval_js(cond, {"modalOpen": True, "dts": dts_for(TITLE_REV)})
        self.assertFalse(got["ok"])

    def test_modal_original_title_against_revised_rejected(self):
        cond = recipe.TITLE_DT_JS.replace("__EXPECTED__", json.dumps(TITLE_REV))
        got = eval_js(cond, {"modalOpen": True, "dts": dts_for(TITLE_OK)})
        self.assertFalse(got["ok"])

    def test_modal_closed_rejected_even_with_exact_title(self):
        cond = recipe.TITLE_DT_JS.replace("__EXPECTED__", json.dumps(TITLE_OK))
        got = eval_js(cond, {"modalOpen": False, "dts": dts_for(TITLE_OK)})
        self.assertFalse(got["ok"])


# ---------- 4. run_recipe: identidade, baseline, await rc, exit ----------

class RunRecipeTests(unittest.TestCase):
    RECIPE = r"C:/Users/ClawLabs/browser-eval/results/recipes/xt24ds7-recipe.json"

    def state(self, url=WANT_URL, title="X-Testing — laboratorio",
              pageText="X-Testing / laboratorio\nINFRAESTRUTURA"):
        return {"url": url, "title": title, "pageText": pageText}

    def drive(self, harness_fn=None, state=None, marker="", verify=""):
        """Roda run_recipe com snapshot/execute_batch/harness falsificados."""
        calls = {"execute": 0}
        state = state if state is not None else self.state()

        def fake_exec(acts):
            calls["execute"] += 1
            a = acts[0]
            if a["action"] == "upload":
                # espelha o executor real: upload e terminal, nao ok:true
                return {"results": [{"i": 0, "action": "upload", "pending": True}],
                        "stopped_at": 0, "terminal": "upload",
                        "file": a.get("value"), "selector": "#upload"}
            return {"results": [{"i": 0, "action": a["action"], "ok": True}],
                    "stopped_at": None}

        h = harness_fn or (lambda code, timeout=90: {"out": "", "err": "", "rc": 0})
        with patch.object(recipe, "harness", side_effect=lambda code, timeout=90: h(code, timeout)), \
                patch.object(recipe, "snapshot", return_value=state), \
                patch.object(recipe, "execute_batch", side_effect=fake_exec), \
                patch("time.sleep", lambda *_: None):
            log = recipe.run_recipe(self.RECIPE, WANT_URL, verify_spec=verify, marker=marker)
        return log, calls

    def test_navigation_rc_nonzero_fails_before_any_action(self):
        log, calls = self.drive(harness_fn=lambda code, timeout=90: (
            {"out": "", "err": "boom", "rc": 7} if code.startswith("goto_url(")
            else {"out": "", "err": "", "rc": 0}))
        self.assertTrue(str(log["result"]).startswith("RECIPE-FAIL initial navigation"))
        self.assertEqual(calls["execute"], 0)
        self.assertEqual(log["steps"], [])

    def test_url_identity_mismatch_fails(self):
        log, calls = self.drive(state=self.state(url="http://outra/"))
        self.assertIn("identity", log["result"])
        self.assertEqual(calls["execute"], 0)

    def test_marker_missing_fails(self):
        log, calls = self.drive(state=self.state(title="Pagina generica",
                                                 pageText="sem marcador"),
                                marker="X-Testing")
        self.assertIn("marker", log["result"])
        self.assertEqual(calls["execute"], 0)

    def test_unreadable_baseline_fails_before_action_and_skips_verifier(self):
        # VALERR em toda leitura: a baseline do erro (passo 8) falha ANTES do clique
        def h(code, timeout=90):
            if code.startswith("goto_url("):
                return {"out": "", "err": "", "rc": 0}
            if code.startswith("import json as _j"):
                return {"out": "VALERR ValueError('read failed')", "err": "", "rc": 0}
            return {"out": "", "err": "", "rc": 0}

        import agent_loop
        with patch.object(agent_loop, "verify", side_effect=AssertionError("verifier chamado")):
            log, calls = self.drive(harness_fn=h, verify="persisted:x")
        self.assertTrue(str(log["result"]).startswith("RECIPE-FAIL baseline"))
        self.assertEqual(calls["execute"], 8)  # passos 0..7 executados; 8 parou antes
        self.assertEqual(len(log["steps"]), 8)
        base = [pc for pc in log["postconditions"] if pc["kind"] == "baseline_error"]
        self.assertEqual(len(base), 1)
        self.assertFalse(base[0]["readable"])
        self.assertEqual(log.get("verifier"),
                         "SKIPPED (falha anterior \u2014 PASS nao poderia apagar)")

    def test_await_positive_with_nonzero_rc_fails_and_skips_verifier(self):
        # awaits na ordem: erro(8), anexo(16), review(17) — o 3o (review) com rc=7
        box = {"awaits": 0}

        def h(code, timeout=90):
            if code.startswith("goto_url("):
                return {"out": "", "err": "", "rc": 0}
            if code.startswith("import json as _j"):
                return {"out": 'VAL ""', "err": "", "rc": 0}
            if code.startswith("import time as _t, json as _j"):
                box["awaits"] += 1
                return {"out": 'AWAIT {"ok": true, "last": {"ok": true}}', "err": "",
                        "rc": 7 if box["awaits"] >= 3 else 0}
            return {"out": "", "err": "", "rc": 0}

        import agent_loop
        with patch.object(agent_loop, "verify", side_effect=AssertionError("verifier chamado")):
            log, calls = self.drive(harness_fn=h, verify="persisted:x")
        self.assertEqual(box["awaits"], 3)
        self.assertTrue(str(log["result"]).startswith("RECIPE-FAIL pos-condicao review"))
        self.assertEqual(log.get("verifier"),
                         "SKIPPED (falha anterior \u2014 PASS nao poderia apagar)")
        pc = [p for p in log["postconditions"] if p["kind"] == "review_modal_exact"][0]
        self.assertEqual(pc["rc"], 7)
        self.assertIs(pc["ok"], False)
        self.assertLess(calls["execute"], 22)

    def test_main_exit_codes_are_strict(self):
        argv = ["recipe.py", "run", self.RECIPE, "--url", WANT_URL]
        for result, expected in (("RECIPE-DONE-VERIFIED", 0),
                                  ("RECIPE-DONE", 1),
                                  ("RECIPE-FAIL x", 1),
                                  ("RECIPE-DONE-VERIFIED-lixo", 1)):
            with self.subTest(result=result), \
                    patch.object(recipe, "run_recipe", return_value={"result": result}), \
                    patch.object(sys, "argv", argv):
                with self.assertRaises(SystemExit) as cm:
                    recipe.main()
                self.assertEqual(cm.exception.code, expected)


if __name__ == "__main__":
    unittest.main()
