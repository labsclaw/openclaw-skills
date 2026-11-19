"""Entrega 3: controles sintéticos, sem inferência, navegador ou judge privado.

Não substituem as fixtures reais de aceite do Hermes. Execute com python -B.
"""
import copy
import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import Mock, patch

import agent_loop as AL
import battery_pilot as BP
import recipe as R

ROOT = Path(__file__).resolve().parents[2]
URL = "http://127.0.0.1:8791/xt-web-form-01"
TITLE = "Plano WEB DEMO-024"


def state(target=True):
    return dict(url=URL, title="X-Testing sintético", pageText="X-Testing formulário",
                elements=([dict(idx=1, tag="button", role="", text="Revisar plano",
                                id="review-recovery", visible=True)] if target else []))


def operation():
    return dict(action="click", id="review-recovery", label="", value="")


def success():
    return dict(results=[dict(action="click", ok=True)], _rc=0)


def missing():
    return dict(results=[dict(error="element not found (waited)")],
                reason="element not found", _rc=0)


def observed(ok):
    return dict(ok=ok, rc=0, last=dict(ok=ok, detail="sintético"))


class RecoveryTests(unittest.TestCase):
    def drive(self, execute=None, dispatch=None, awaits=None, fallback=True,
              max_replan=3, snap=None, nav_rc=0, verify="persisted:test"):
        self.dispatch = dispatch or Mock(return_value=[operation()])
        self.execute = Mock(side_effect=execute or [missing(), success()])
        self.navs = []

        def harness(code, timeout=90):
            self.navs.append(code)
            return dict(out="", err="", rc=nav_rc)

        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "recipe.json"
            path.write_text(json.dumps(dict(native_ops=[
                dict(op="click", id="review", value="")])), encoding="utf-8")
            with patch.object(R, "harness", side_effect=harness), \
                    patch.object(R, "snapshot", side_effect=snap or (lambda: state())), \
                    patch.object(R, "execute_batch", self.execute), \
                    patch.object(R, "expected_title", return_value=TITLE), \
                    patch.object(R, "await_effect", side_effect=awaits or [observed(False), observed(True)]), \
                    patch.object(AL, "verify", return_value="PASS") as verifier, \
                    patch("time.sleep"):
                self.log = R.run_recipe(str(path), URL, marker="X-Testing", verify_spec=verify,
                                        fallback_jev=fallback, max_replan=max_replan,
                                        repair_dispatcher=self.dispatch)
                self.verify_calls = verifier.call_count
        return self.log

    def test_missing_target_repaired_in_existing_session(self):
        log = self.drive()
        self.assertEqual(log["result"], "RECIPE-DONE-VERIFIED-ASSISTED")
        self.assertEqual(len(self.navs), 1)
        self.assertTrue(self.navs[0].startswith("goto_url"))
        self.assertEqual(self.execute.call_args_list[1].args, ([operation()],))
        self.assertEqual(log["repairs"][0]["status"], "completed")
        self.assertIsNone(log["repairs"][0]["tokens_entrada"])
        self.assertEqual(log["repairs"][0]["contract"]["ponto_de_retomada"]["step"], 0)

    def test_missing_target_not_found_fails_no_assisted_success(self):
        log = self.drive(dispatch=Mock(return_value=[]))
        self.assertTrue(log["result"].startswith("RECIPE-FAIL"))
        self.assertEqual(self.execute.call_count, 1)
        self.assertEqual(self.verify_calls, 0)

    def test_clean_native_run_never_calls_dispatcher_even_opted_in(self):
        for fallback in (False, True):
            with self.subTest(fallback=fallback):
                log = self.drive(execute=[success()], awaits=[observed(True)], fallback=fallback)
                self.assertEqual(log["result"], "RECIPE-DONE-VERIFIED")
                self.assertEqual(log["repairs"], [])
                self.dispatch.assert_not_called()

    def test_transport_rc_never_dispatches_even_if_reason_says_missing(self):
        result = missing()
        result["_rc"] = 7
        log = self.drive(execute=[result])
        self.assertTrue(log["result"].startswith("RECIPE-FAIL harness"))
        self.dispatch.assert_not_called()
        self.assertEqual(self.verify_calls, 0)

    def test_initial_navigation_error_never_dispatches(self):
        self.drive(nav_rc=7)
        self.dispatch.assert_not_called()
        self.assertEqual(self.execute.call_count, 0)

    def test_effect_transport_never_dispatches(self):
        bad = dict(ok=False, rc=7, last={"ok": True})
        self.drive(execute=[success()], awaits=[bad])
        self.dispatch.assert_not_called()
        self.assertEqual(self.verify_calls, 0)

    def test_effect_read_error_never_dispatches(self):
        bad = dict(ok=False, rc=0, error="window closed", last={})
        self.drive(execute=[success()], awaits=[bad])
        self.dispatch.assert_not_called()

    def test_snapshot_error_never_dispatches(self):
        self.drive(snap=Mock(side_effect=RuntimeError("window closed")))
        self.dispatch.assert_not_called()
        self.assertEqual(self.execute.call_count, 0)

    def test_identity_invalid_never_dispatches(self):
        wrong = state()
        wrong["url"] = "http://wrong/"
        self.drive(snap=lambda: wrong)
        self.dispatch.assert_not_called()

    def test_late_effect_proves_completion_without_replay(self):
        log = self.drive(execute=[success()], awaits=[observed(False), observed(True)])
        self.dispatch.assert_not_called()
        self.assertEqual(self.execute.call_count, 1)
        self.assertEqual(log["repairs"][0]["status"], "reconciled")
        self.assertEqual(log["result"], "RECIPE-DONE-VERIFIED-ASSISTED")

    def test_shared_attempt_budget_not_doubled(self):
        log = self.drive(execute=[missing()] * 4, awaits=[observed(False)] * 3)
        self.assertEqual(self.dispatch.call_count, 3)
        self.assertEqual(self.execute.call_count, 4)  # initial + 3 retries, not 3+3
        self.assertEqual(len(log["repairs"]), 3)
        self.assertTrue(log["result"].startswith("RECIPE-FAIL"))

    def test_zero_budget_does_not_call_dispatcher(self):
        log = self.drive(max_replan=0)
        self.dispatch.assert_not_called()
        self.assertTrue(log["result"].startswith("RECIPE-FAIL"))

    def test_navigate_or_other_step_cannot_be_proposed(self):
        for op in (dict(action="navigate", value=URL),
                   dict(action="click", id="save", value="", element=1),
                   dict(action="click", id="review-recovery", value="invented")):
            with self.subTest(op=op):
                self.drive(dispatch=Mock(return_value=[op]))
                self.assertEqual(self.execute.call_count, 1)
                self.assertTrue(self.log["result"].startswith("RECIPE-FAIL"))

    def test_target_changes_while_deciding_consumes_same_budget(self):
        changed = state()
        changed["elements"][0]["id"] = "different"
        snapshots = [state(), state(), state(), changed, state(), changed, state(), changed]
        self.drive(snap=Mock(side_effect=snapshots), awaits=[observed(False)] * 3)
        self.assertEqual(self.execute.call_count, 1)
        self.assertEqual(self.dispatch.call_count, 3)

    def test_clock_only_change_does_not_invalidate_action(self):
        changed = state()
        changed["pageText"] += " 19:40:01"
        self.drive(snap=Mock(side_effect=[state(), state(), state(), changed]))
        self.assertEqual(self.log["result"], "RECIPE-DONE-VERIFIED-ASSISTED")

    def test_dispatch_error_fails_closed_without_provider_fallback(self):
        self.drive(dispatch=Mock(side_effect=RuntimeError("unavailable")))
        self.assertEqual(self.dispatch.call_count, 1)
        self.assertEqual(self.verify_calls, 0)
        self.assertTrue(self.log["result"].startswith("RECIPE-FAIL"))

    def test_cli_assisted_is_nonzero(self):
        with patch.object(sys, "argv", ["recipe.py", "run", "test", "--url", URL,
                                        "--fallback-jev"]), \
                patch.object(R, "run_recipe", return_value={"result": "RECIPE-DONE-VERIFIED-ASSISTED"}):
            with self.assertRaises(SystemExit) as exc:
                R.main()
            self.assertEqual(exc.exception.code, 1)

    def test_gate_still_rejects_assisted(self):
        # Todos os campos exceto result partem do recibo E2 aprovado real.
        base = ROOT / "results/v22-logs/battery-20261030T001750-58576874"
        receipt = json.loads(next(base.glob("*-p1/receipt.json")).read_text(encoding="utf-8"))
        execution = json.loads(next(base.glob("*-p1/recipe.json")).read_text(encoding="utf-8"))
        judge = json.loads(next(base.glob("*-p1/judge.json")).read_text(encoding="utf-8"))
        native_recipe = json.loads((ROOT / "results/recipes/xt24ds7-recipe.json").read_text(encoding="utf-8"))
        audit = [json.loads(line) for line in next(base.glob("*-p1/harness.jsonl")).read_text(encoding="utf-8").splitlines()]
        self.assertTrue(BP.gate(receipt["runId"], execution, judge, native_recipe, audit)["passed"])
        execution["result"] = "RECIPE-DONE-VERIFIED-ASSISTED"
        result = BP.gate(receipt["runId"], execution, judge, native_recipe, audit)
        self.assertFalse(result["passed"])
        self.assertEqual(result["failures"], ["resultado não verificado"])


class CheckpointSafetyTests(unittest.TestCase):
    def test_uncertain_save_or_upload_never_resent(self):
        for original, prev, cond in ((dict(op="upload", id="upload", value="fixture-evidence.txt"),
                                      {"attachment": ""}, "upload"),
                                     (dict(op="click", id="save", value=""), {}, None)):
            for arrived in (False, True):
                if cond is None and arrived:
                    continue
                with self.subTest(action=original, arrived=arrived):
                    log = dict(repairs=[], identity={"url": URL}, steps=[], postconditions=[])
                    dispatch, execute = Mock(), Mock()
                    with patch.object(R, "snapshot", return_value=state()), \
                            patch.object(R, "await_effect", return_value=observed(arrived)), \
                            patch.object(R, "execute_batch", execute):
                        ok = R.recover_checkpoint(log, [original], 0, prev, "effect_timeout",
                                                  "uncertain", True, 3, "X-Testing",
                                                  "MiMo-V2.6-Flash", dispatch)
                    self.assertEqual(ok, arrived)
                    execute.assert_not_called()
                    dispatch.assert_not_called()

    def test_original_baseline_is_preserved_in_repair_contract(self):
        original = dict(op="click", label="Continuar", value="")
        log = dict(repairs=[], identity={"url": URL}, steps=[], postconditions=[])
        prev = {"error": "original baseline"}
        dispatch = Mock(return_value=[])
        with patch.object(R, "snapshot", return_value=state()), \
                patch.object(R, "await_effect", return_value=observed(False)):
            R.recover_checkpoint(log, [original], 0, prev, "effect_timeout", "test", True,
                                 3, "X-Testing", "MiMo-V2.6-Flash", dispatch)
        self.assertEqual(dispatch.call_args.args[0]["ponto_de_retomada"]["baseline"], prev)


class DispatcherTests(unittest.TestCase):
    def contract(self):
        return dict(goal_local="Revisar plano", snapshot_atual=state(),
                    historico_de_acoes_com_efeitos=[], ponto_de_retomada={"step": 17},
                    limites={"max_ops": 1})

    def test_llm_and_jev_agree_with_measured_usage(self):
        telemetry = []
        with patch.object(AL, "ask_amd", return_value=(json.dumps(operation()),
                          {"prompt_tokens": 12, "completion_tokens": 4})), \
                patch.object(AL, "ask_jev", return_value=({"action": "click", "element": 1}, .1, {})), \
                patch.object(AL, "harness", side_effect=AssertionError("harness proibido")):
            ops = AL.repair_single(self.contract(), telemetry=telemetry)
        self.assertEqual(ops, [operation()])
        self.assertEqual(telemetry[0]["tokens_entrada"], 12)
        self.assertIsNone(telemetry[1]["tokens_entrada"])

    def test_provider_or_paid_model_rejected_before_request(self):
        for provider, model in (("openrouter", "MiMo-V2.6-Flash"), ("ana-radeon", "paid")):
            with patch.object(AL, "ask_amd") as request, self.assertRaises(ValueError):
                AL.repair_single(self.contract(), provider=provider, model=model)
            request.assert_not_called()

    def test_jev_disagreement_rejected(self):
        with patch.object(AL, "ask_amd", return_value=(json.dumps(operation()), {})), \
                patch.object(AL, "ask_jev", return_value=({"action": "navigate", "element": 1}, .1, {})), \
                self.assertRaises(ValueError):
            AL.repair_single(self.contract())

    def test_model_blocked_or_no_target_returns_no_ops(self):
        with patch.object(AL, "ask_amd", return_value=('{"action":"blocked"}', {})), \
                patch.object(AL, "ask_jev") as jev:
            self.assertEqual(AL.repair_single(self.contract()), [])
            c = self.contract()
            c["snapshot_atual"] = state(False)
            self.assertEqual(AL.repair_single(c), [])
            jev.assert_not_called()

    def test_hidden_or_ambiguous_target_rejected(self):
        for hidden in (False, True):
            c = self.contract()
            if hidden:
                c["snapshot_atual"]["elements"][0]["visible"] = False
            else:
                c["snapshot_atual"]["elements"].append(copy.deepcopy(c["snapshot_atual"]["elements"][0]))
            with patch.object(AL, "ask_amd", return_value=(json.dumps(operation()), {})), \
                    patch.object(AL, "ask_jev") as jev:
                if hidden:
                    self.assertEqual(AL.repair_single(c), [])
                else:
                    with self.assertRaises(ValueError):
                        AL.repair_single(c)
                jev.assert_not_called()


class AdapterTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        spec = importlib.util.spec_from_file_location("recovery_variants", ROOT / "fixtures/recovery_variants.py")
        cls.adapter = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(cls.adapter)

    def test_clean_is_byte_identical_and_sources_never_written(self):
        root = self.adapter.DEFAULT_ROOT
        before = {p.name: p.read_bytes() for p in root.iterdir() if p.is_file()}
        for scenario in self.adapter.SCENARIOS:
            payloads, manifest = self.adapter.assets(root, scenario)
            if scenario == "clean":
                for name, data in payloads.items():
                    self.assertEqual(data, before[name])
            self.assertEqual(manifest["scenario"], scenario)
        self.assertEqual(before, {p.name: p.read_bytes() for p in root.iterdir() if p.is_file()})

    def test_positive_renames_id_not_behavior(self):
        payloads, _ = self.adapter.assets(self.adapter.DEFAULT_ROOT, "rename-review")
        self.assertIn(b'id="review-recovery"', payloads["index.html"])
        self.assertNotIn(b'id="review"', payloads["index.html"])
        self.assertEqual(payloads["app.js"], (self.adapter.DEFAULT_ROOT / "app.js").read_bytes())

    def test_negative_removes_only_task_button_from_rendered_dom(self):
        source = (self.adapter.DEFAULT_ROOT / "app.js").read_bytes()
        payloads, _ = self.adapter.assets(self.adapter.DEFAULT_ROOT, "remove-task-access")
        self.assertEqual(payloads["app.js"], source.replace(
            b"td.append(button);tr.append(td);", b"if(row.id!=='DEMO-024')td.append(button);tr.append(td);"))
        self.assertIn(b"button.onclick=()=>start(row.id)", payloads["app.js"])

    def test_unknown_scenario_or_changed_source_refused(self):
        with self.assertRaises(ValueError):
            self.adapter.transform("index.html", b"unknown", "rename-review")
        with self.assertRaises(ValueError):
            self.adapter.transform("index.html", b"unknown", "mystery")


if __name__ == "__main__":
    unittest.main()
