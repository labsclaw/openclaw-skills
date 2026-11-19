"""Regressões do validator, sem navegador nem consulta ao judge privado."""
import copy
from pathlib import Path
import subprocess
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

import battery_pilot as battery


def committed_json(path):
    return battery.strict_json(subprocess.check_output(
        ["git", "-C", str(battery.ROOT), "show", f"ed963ec:{path}"], text=True, encoding="utf-8"))


def battery_sample_url():
    return "http://127.0.0.1:8791/xt-web-form-01"


class GateTests(unittest.TestCase):
    def setUp(self):
        self.execution = committed_json("results/v22-logs/battery-p1.json")
        self.judge = committed_json("results/v22-logs/battery-p1-judge.json")
        self.recipe = committed_json("results/recipes/xt24ds7-recipe.json")
        # Histórico não contém rc inicial. Este audit é explicitamente sintético.
        self.audit = [dict(index=1, phase="initial_navigation", rc=0)]
        # Histórico também não contém identidade (v2.6a) — sintética, como o audit.
        self.execution["identity"] = dict(url=self.execution["url"], markerOk=True)
        self.run_id = self.judge["runId"]

    def evaluate(self, **kw):
        return battery.gate(self.run_id, self.execution, self.judge, self.recipe, self.audit, **kw)

    def test_known_trace_plus_synthetic_navigation_accepts_21_and_terminal(self):
        result = self.evaluate()
        self.assertTrue(result["passed"], result)
        self.assertEqual((result["ordinaryOk"], result["confirmedUploads"]), (21, 1))
        self.assertNotIn("ok", self.execution["steps"][16]["exec"]["results"][0])

    def test_each_judge_check_is_required_strictly(self):
        for key in battery.CHECKS:
            for value in (False, 1, "true", None):
                with self.subTest(key=key, value=value):
                    original = self.judge["checks"][key]
                    self.judge["checks"][key] = value
                    self.assertFalse(self.evaluate()["passed"])
                    self.judge["checks"][key] = original

    def test_missing_extra_or_renamed_check_rejected(self):
        for transform in (lambda d: d.pop("fields"), lambda d: d.update(extra=True),
                          lambda d: d.update(renamed=d.pop("fields"))):
            saved = copy.deepcopy(self.judge)
            transform(self.judge["checks"])
            self.assertFalse(self.evaluate()["passed"])
            self.judge = saved

    def test_false_or_truthy_pass_and_wrong_run_rejected(self):
        for key, value in (("pass_", False), ("pass_", 1), ("pass_", "true"), ("runId", "other")):
            saved = copy.deepcopy(self.judge)
            self.judge[key] = value
            self.assertFalse(self.evaluate()["passed"])
            self.judge = saved

    def test_done_substring_and_wrong_verifier_rejected(self):
        for key, value in (("result", "RECIPE-DONE"), ("result", "FAIL-DONE"),
                           ("verifier", "PASS: text"), ("verifier", True)):
            saved = copy.deepcopy(self.execution)
            self.execution[key] = value
            self.assertFalse(self.evaluate()["passed"])
            self.execution = saved

    def test_nonzero_process_codes_rejected_even_when_done(self):
        for kw in (dict(recipe_rc=1), dict(judge_rc=1), dict(recipe_rc=124), dict(judge_rc=False)):
            self.assertFalse(self.evaluate(**kw)["passed"])

    def test_missing_or_failed_navigation_and_later_harness_error(self):
        for audit in ([], [dict(phase="initial_navigation", rc=1)],
                      [dict(phase="initial_navigation", rc=False)], [dict(rc=0)],
                      self.audit + [dict(rc=1)]):
            with self.subTest(audit=audit):
                self.assertFalse(battery.gate(self.run_id, self.execution, self.judge,
                                              self.recipe, audit)["passed"])

    def test_failed_step_cannot_be_erased_by_final_pass(self):
        for value in (False, 1, "true", None):
            self.execution["steps"][0]["exec"]["results"][0]["ok"] = value
            self.assertFalse(self.evaluate()["passed"])

    def test_pending_upload_requires_terminal_and_confirmation(self):
        original = copy.deepcopy(self.execution)
        for mutation in (lambda s: s.pop("upload"), lambda s: s.update(upload="upload-ok"),
                         lambda s: s["exec"].pop("terminal"),
                         lambda s: s["exec"]["results"][0].update(ok=True),
                         lambda s: s["exec"]["results"][0].update(ok=False),
                         lambda s: s["exec"]["results"][0].update(pending=False)):
            mutation(self.execution["steps"][16])
            self.assertFalse(self.evaluate()["passed"])
            self.execution = copy.deepcopy(original)

    def test_missing_reordered_extra_retry_or_malformed_step_rejected(self):
        original = copy.deepcopy(self.execution)
        for mutation in (lambda s: s.pop(), lambda s: s.reverse(),
                         lambda s: s.append(copy.deepcopy(s[-1])),
                         lambda s: s[0].update(exec={}), lambda s: s[0].update(i=True),
                         lambda s: s[0].update(op={"action": "done"})):
            mutation(self.execution["steps"])
            self.assertFalse(self.evaluate()["passed"])
            self.execution = copy.deepcopy(original)

    def test_preflight_rejects_failed_or_partial_dry_run(self):
        """P1: RECIPE-FAIL/parcials com snippets validos nao viram passed=true."""
        with tempfile.TemporaryDirectory() as tmp:
            frozen = battery.freeze_recipe(Path(tmp))
            recipe, loop = battery.load_executor()
            for bad in ({"result": "RECIPE-FAIL snapshot x", "steps": []},
                        {"result": "RECIPE-DONE", "steps": []},
                        {"result": "RECIPE-FAIL pos-condicao", "steps": [{}] * 22}):
                with self.subTest(bad=bad["result"]), \
                        patch.object(recipe, "run_recipe", return_value=bad), \
                        patch.object(battery, "load_executor", return_value=(recipe, loop)):
                    with self.assertRaises(ValueError):
                        battery.generated_snippets(frozen, battery_sample_url())

    def test_preflight_full_walks_all_steps_without_browser(self):
        """Preflight completo percorre os 22 passos + 4 pos-condicoes exigidas."""
        with tempfile.TemporaryDirectory() as tmp:
            frozen = battery.freeze_recipe(Path(tmp))
            result = battery.preflight(frozen)
        self.assertTrue(result["passed"])
        # limiares conservadores: o percurso completo gera bem mais que o parcial
        # (2 py/1 js) do P1; nao fixar o numero historico de 48
        self.assertGreaterEqual(result["pythonCompiled"], 10)
        self.assertGreaterEqual(result["javascriptCompiled"], 5)

    def test_identity_missing_or_wrong_rejected(self):
        for identity in (None, {}, dict(url="outra", markerOk=True),
                         dict(url=self.execution["url"], markerOk=None),
                         dict(url=self.execution["url"], markerOk=False)):
            with self.subTest(identity=identity):
                saved = copy.deepcopy(self.execution)
                if identity is None:
                    self.execution.pop("identity", None)
                else:
                    self.execution["identity"] = identity
                self.assertFalse(self.evaluate()["passed"])
                self.execution = saved

    def test_exactly_three_unique_passed_runs(self):
        receipts = [dict(runId=f"p{n}", gate=dict(passed=True)) for n in range(3)]
        self.assertTrue(battery.battery_passed(receipts))
        self.assertFalse(battery.battery_passed([]))
        self.assertFalse(battery.battery_passed(receipts[:2]))
        self.assertFalse(battery.battery_passed(receipts + [receipts[0]]))
        receipts[-1]["runId"] = receipts[0]["runId"]
        self.assertFalse(battery.battery_passed(receipts))
        receipts[-1]["runId"] = "p2"
        receipts[-1]["gate"]["passed"] = False
        self.assertFalse(battery.battery_passed(receipts))


class PreflightAndStorageTests(unittest.TestCase):
    def test_duplicate_keys_non_json_and_nonfinite_rejected(self):
        for text in ('{"pass_":false,"pass_":true}', '{"x":NaN}', 'noise {}', ''):
            with self.subTest(text=text), self.assertRaises(ValueError):
                battery.strict_json(text)

    def test_create_only_directory_and_file_preserve_original_bytes(self):
        with tempfile.TemporaryDirectory() as tmp:
            folder = battery.reserve_directory(tmp, "run")
            battery.write_new(folder / "receipt.json", {"original": True})
            before = (folder / "receipt.json").read_bytes()
            with self.assertRaises(FileExistsError):
                battery.reserve_directory(tmp, "run")
            with self.assertRaises(FileExistsError):
                battery.write_new(folder / "receipt.json", {"overwritten": True})
            self.assertEqual(before, (folder / "receipt.json").read_bytes())

    def test_frozen_input_is_exact_git_bytes_without_touching_checkout(self):
        before = battery.sha256(battery.RECIPE)
        with tempfile.TemporaryDirectory() as tmp:
            frozen = battery.freeze_recipe(Path(tmp))
            self.assertEqual(battery.sha256(frozen), battery.RECIPE_SHA256)
        self.assertEqual(before, battery.sha256(battery.RECIPE))

    def test_generated_python_syntax_failure_detected(self):
        with tempfile.TemporaryDirectory() as tmp:
            frozen = battery.freeze_recipe(Path(tmp))
            recipe, loop = battery.load_executor()
            def broken(*args, **kw):
                recipe.harness("print('unterminated)")
            with patch.object(recipe, "run_recipe", broken), \
                    patch.object(battery, "load_executor", return_value=(recipe, loop)):
                with self.assertRaises(SyntaxError):
                    battery.generated_snippets(frozen, "http://127.0.0.1:8791/xt-web-form-01")

    def test_generated_js_syntax_failure_detected(self):
        with tempfile.TemporaryDirectory() as tmp:
            frozen = battery.freeze_recipe(Path(tmp))
            with patch.object(battery, "generated_snippets", return_value={
                    "python": [], "javascript": ["(() => { const broken = ; })()"]}):
                with self.assertRaisesRegex(RuntimeError, "Sintaxe JS"):
                    battery.preflight(frozen)

    def test_timeout_keeps_partial_output_and_nonzero_rc(self):
        expired = subprocess.TimeoutExpired("fixture", 1, output=b"partial", stderr=b"detail")
        with patch.object(subprocess, "run", side_effect=expired):
            result = battery.command(["unused"])
        self.assertEqual(result["rc"], 124)
        self.assertEqual(result["stdout"], "partial")
        self.assertIn("detail", result["stderr"])

    def test_initial_navigation_barrier_prevents_first_action_and_keeps_actual_rc(self):
        actions = []
        recipe = SimpleNamespace(harness=lambda *a, **kw: dict(rc=7, out="", err="navigation failed"))
        loop = SimpleNamespace(harness=lambda *a, **kw: None)
        def original_cli():
            recipe.harness('goto_url("http://127.0.0.1:1/")')
            actions.append("must not run")
        recipe.main = original_cli
        with tempfile.TemporaryDirectory() as tmp:
            audit = Path(tmp) / "audit.jsonl"
            with patch.object(battery, "load_executor", return_value=(recipe, loop)), \
                    patch.object(battery.sys, "argv", []):
                with self.assertRaisesRegex(RuntimeError, "navegação inicial rc=7"):
                    battery.executor_worker("recipe.json", "http://127.0.0.1:1/", audit)
            self.assertEqual(battery.strict_json(audit.read_text())["rc"], 7)
        self.assertEqual(actions, [])


if __name__ == "__main__":
    unittest.main()
