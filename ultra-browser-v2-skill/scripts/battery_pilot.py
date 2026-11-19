#!/usr/bin/env python3
"""Validator externo v2.6a: três fixtures novas e recibos create-only.

Uso: python battery_pilot.py [--logs DIR] [--preflight-only]
Não lê estado privado do judge. O worker observa o harness original, sem
alterar decisões ou retornos do executor. --preflight-only não aceita bateria.
"""
import argparse
import ast
import contextlib
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import socket
import subprocess
import sys
import time
from datetime import datetime, timezone
from unittest.mock import patch
import uuid

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
BENCHMARK = Path.home() / ".openclaw/workspace/pocs/browser-benchmark-20261016"
FIXTURE = BENCHMARK / "fixture/server.py"
HARNESS_JUDGE = BENCHMARK / "harness/judge.py"
RECIPE = ROOT / "results/recipes/xt24ds7-recipe.json"
LOGS = ROOT / "results/v22-logs"
RECIPE_SHA256 = "5defc9c2bf86ec8357cc16c063d03bb18ce6554bfd7848ca18e1f409d971fd71"
VERIFY = "persisted:Plano WEB DEMO-024"
MARKER = "X-Testing"  # v2.6a criterio 1: marcador de identidade da fixture
CHECKS = frozenset(("runId", "seed", "filtered_second_page", "fields",
                    "requires_environment", "ordered_workflow", "upload",
                    "single_record", "single_mutation", "single_submit", "persisted_read"))


def utc_now():
    return datetime.now(timezone.utc).isoformat()


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def write_new(path, value, raw=False):
    """Colisão é erro. Nunca retomar/sobrescrever um recibo antigo."""
    with Path(path).open("x", encoding="utf-8", newline="\n") as stream:
        stream.write(value if raw else json.dumps(value, ensure_ascii=False, indent=2) + "\n")


def strict_json(text):
    def pairs(items):
        result = {}
        for key, value in items:
            if key in result:
                raise ValueError(f"Chave JSON duplicada: {key}")
            result[key] = value
        return result
    def invalid_constant(value):
        raise ValueError(f"Constante JSON inválida: {value}")
    return json.loads(text, object_pairs_hook=pairs, parse_constant=invalid_constant)


def command(args, timeout=600, input_text=None):
    started, tick = utc_now(), time.monotonic()
    try:
        proc = subprocess.run([str(a) for a in args], input=input_text, capture_output=True,
                              text=True, encoding="utf-8", errors="replace", timeout=timeout)
        out, err, rc = proc.stdout, proc.stderr, proc.returncode
    except subprocess.TimeoutExpired as exc:
        def decode(value):
            return value.decode("utf-8", errors="replace") if isinstance(value, bytes) else value or ""
        out, err, rc = decode(exc.stdout), decode(exc.stderr) + "\nTIMEOUT", 124
    return dict(startedAt=started, finishedAt=utc_now(), durationSeconds=time.monotonic()-tick,
                rc=rc, stdout=out, stderr=err)


def git(*args):
    result = command(["git", "-C", ROOT, *args], timeout=15)
    if result["rc"] != 0:
        raise RuntimeError(result["stderr"])
    return result["stdout"].strip()


def fingerprints():
    return {str(p.relative_to(ROOT)): sha256(p) for p in
            (HERE / "recipe.py", HERE / "agent_loop.py", HERE / "snapshot.js", Path(__file__), RECIPE)}


def provenance():
    executor = [str((HERE / name).relative_to(ROOT)).replace("\\", "/")
                for name in ("recipe.py", "agent_loop.py", "snapshot.js")]
    if git("diff", "HEAD", "--", *executor):
        raise RuntimeError("Executor difere de HEAD; requer outra bateria identificada")
    return dict(commit=git("rev-parse", "HEAD"),
                executorCommit=git("log", "-1", "--format=%H", "--", *executor),
                validatorBaseCommit=git("log", "-1", "--format=%H", "--",
                                        "ultra-browser-v2/scripts/battery_pilot.py"),
                validatorUncommitted=bool(git("diff", "HEAD", "--",
                                              "ultra-browser-v2/scripts/battery_pilot.py")),
                files=fingerprints())


def freeze_recipe(directory):
    """Usa bytes Git auditados, sem reescrever o checkout CRLF do Windows."""
    blob = subprocess.run(["git", "-C", str(ROOT), "show",
                           "ed963ec:results/recipes/xt24ds7-recipe.json"],
                          capture_output=True, timeout=15, check=True).stdout
    if hashlib.sha256(blob).hexdigest() != RECIPE_SHA256:
        raise ValueError("Objeto Git da recipe diverge do hash acordado")
    worktree = RECIPE.read_bytes()
    if worktree != blob and worktree.replace(b"\r\n", b"\n") != blob:
        raise ValueError("Recipe local difere da auditada além dos finais de linha")
    inputs = reserve_directory(directory, "inputs")
    frozen = inputs / RECIPE.name
    with frozen.open("xb") as stream:
        stream.write(blob)
    return frozen


def load_executor():
    sys.path.insert(0, str(HERE))
    spec = importlib.util.spec_from_file_location("battery_recipe", HERE / "recipe.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    import agent_loop
    return module, agent_loop


def generated_snippets(recipe_path, url):
    """Percorre geradores originais sem navegador, sleeps ou judge privado.

    Compila o Python real e coleta JS passado a js(), inclusive upload dinâmico.
    PASS sintético só percorre o ramo do verifier; nunca é usado no aceite.
    """
    recipe, loop = load_executor()
    python_snippets, js_snippets = [], []

    def fake_js(code):
        js_snippets.append(code)
        # v2.6a: snapshot sintetico SERIALIZADO COMO STRING JSON — o snapshot real
        # e uma IIFE que retorna texto JSON e recipe.snapshot() faz json.loads;
        # dict aqui sairia como repr Python de aspas simples e quebraria o dry-run.
        if "pageText" in code and "const acts =" not in code:
            return json.dumps(dict(url=url, title="X-Testing — laboratório T1",
                                   elements=[], pageText="X-Testing / laboratório · INFRAESTRUTURA DETERMINÍSTICA"))
        # v2.6a: pos-condicoes do executor sintetizadas como ok (regra vem ANTES de textContent)
        if "return {ok:" in code:
            return dict(ok=True, detail="synthetic-preflight")
        if "const acts = " in code:
            acts, _ = json.JSONDecoder().raw_decode(code.split("const acts = ", 1)[1])
            act = acts[0]
            row = dict(i=0, action=act["action"], ok=True)
            response = dict(results=[row], stopped_at=None)
            if act["action"] == "upload":
                row.pop("ok")
                row["pending"] = True
                response.update(terminal="upload", file=act["value"], selector="#upload")
            return json.dumps(response)
        if "textContent" in code:
            return "Anexado: fixture-evidence.txt · 32 bytes"
        if "PASS: persisted" in code:
            return "PASS: synthetic-preflight-only"
        return "{}"

    def fake_harness(code, timeout=90):
        python_snippets.append(code)
        compiled = compile(code, f"<generated-{len(python_snippets)}>", "exec")
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            exec(compiled, dict(js=fake_js, goto_url=lambda *_: None,
                                upload_file=lambda *_: None,
                                maximize=lambda: None))
        return dict(out=output.getvalue(), err="", rc=0)

    with patch.object(recipe, "harness", fake_harness), patch.object(loop, "harness", fake_harness), \
            patch("time.sleep", lambda *_: None):
        log = recipe.run_recipe(str(recipe_path), url, verify_spec=VERIFY, marker=MARKER)
    # P1: dry-run PRECISA percorrer a recipe inteira — RECIPE-FAIL/parcial com
    # snippets sintaticamente validos nao e preflight, e passed=true mentiroso.
    ops = json.loads(Path(recipe_path).read_text(encoding="utf-8"))["native_ops"]
    steps = log.get("steps") if isinstance(log, dict) else None
    pcs = (log.get("postconditions") or []) if isinstance(log, dict) else []
    kinds = {pc.get("kind") for pc in pcs}
    required = {"email_error_fresh", "attachment_fresh", "review_modal_exact"}
    identity = (log.get("identity") or {}) if isinstance(log, dict) else {}
    ok = (isinstance(steps, list) and len(steps) == len(ops)
          and log.get("result") in ("RECIPE-DONE", "RECIPE-DONE-VERIFIED")
          and required <= kinds
          and all(pc.get("ok") for pc in pcs if "ok" in pc)
          and identity.get("markerOk") is True
          and identity.get("url") == url.rstrip("/"))
    if not ok:
        raise ValueError(
            f"Dry-run incompleto: result={log.get('result') if isinstance(log, dict) else log!r} "
            f"steps={len(steps) if isinstance(steps, list) else steps} "
            f"kinds={sorted(kinds)} identity={identity}")
    return dict(python=python_snippets, javascript=js_snippets)


def preflight(recipe_path):
    if sha256(recipe_path) != RECIPE_SHA256:
        raise ValueError("Hash da recipe não corresponde ao acordo; não iniciar pilotos")
    for name in ("recipe.py", "agent_loop.py", "battery_pilot.py"):
        ast.parse((HERE / name).read_text(encoding="utf-8"), filename=name)
    snippets = generated_snippets(recipe_path, "http://127.0.0.1:8791/xt-web-form-01")
    # vm.Script só compila, não executa JS nem acessa navegador.
    check_js = """const fs=require('fs'),vm=require('vm');
const snippets=JSON.parse(fs.readFileSync(0,'utf8'));
for(let i=0;i<snippets.length;i++) new vm.Script(snippets[i],{filename:`generated-${i}.js`});
console.log(JSON.stringify({compiled:snippets.length}));"""
    result = command(["node", "-e", check_js], timeout=30,
                     input_text=json.dumps(snippets["javascript"]))
    if result["rc"] != 0:
        raise RuntimeError("Sintaxe JS gerada inválida: " + result["stderr"])
    return dict(passed=True, recipeSha256=sha256(recipe_path),
                pythonCompiled=len(snippets["python"]),
                javascriptCompiled=len(snippets["javascript"]), generated=snippets)


def executor_worker(recipe_path, url, audit_path, marker=""):
    """Observa chamadas originais; barreira externa no primeiro goto falho.

    O validator interrompe o worker antes do primeiro passo nesse caso, sem
    recuperação, segunda navegação ou alteração de recipe.py/agent_loop.py.
    """
    recipe, loop = load_executor()
    calls = 0
    with Path(audit_path).open("x", encoding="utf-8", buffering=1) as audit:
        def observe(original, owner):
            def wrapped(code, timeout=90):
                nonlocal calls
                calls += 1
                entry = dict(index=calls, owner=owner, startedAt=utc_now(),
                             phase="initial_navigation" if calls == 1 and code.startswith("goto_url(")
                             else "harness", code=code)
                tick = time.monotonic()
                try:
                    result = original(code, timeout=timeout)
                    entry.update(result)
                except Exception as exc:
                    entry.update(rc=None, error=f"{type(exc).__name__}: {exc}")
                    raise
                finally:
                    entry.update(finishedAt=utc_now(), durationSeconds=time.monotonic()-tick)
                    audit.write(json.dumps(entry, ensure_ascii=False) + "\n")
                if entry["phase"] == "initial_navigation" and result.get("rc") != 0:
                    raise RuntimeError(f"Preflight de navegação inicial rc={result.get('rc')}")
                return result
            return wrapped
        with patch.object(recipe, "harness", observe(recipe.harness, "recipe")), \
                patch.object(loop, "harness", observe(loop.harness, "verifier")):
            sys.argv = [str(HERE / "recipe.py"), "run", str(recipe_path), "--url", url,
                        "--verify", VERIFY] + (["--marker", marker] if marker else [])
            recipe.main()


def normalized_op(op):
    result = dict(op)
    result["action"] = result.pop("op", None) or result.get("action")
    if result.get("id"):
        result.pop("label", None)
    return result


def gate(run_id, execution, judge, recipe, audit, recipe_rc=0, judge_rc=0):
    """Fail-closed. Upload confirmado é categoria própria, não ok:true."""
    failures = []
    def require(condition, reason):
        if not condition:
            failures.append(reason)
    require(type(recipe_rc) is int and recipe_rc == 0, "recipe process rc != 0")
    require(type(judge_rc) is int and judge_rc == 0, "judge process rc != 0")
    require(judge.get("runId") == run_id, "judge runId divergente")
    require(judge.get("pass_") is True, "judge pass_ != true")
    checks = judge.get("checks")
    require(isinstance(checks, dict) and set(checks) == CHECKS and
            all(v is True for v in checks.values()), "judge não fechou os 11 checks booleanos")
    require(execution.get("result") == "RECIPE-DONE-VERIFIED", "resultado não verificado")
    require(execution.get("verifier") == "PASS", "verifier != PASS")
    require(bool(audit) and audit[0].get("phase") == "initial_navigation" and
            type(audit[0].get("rc")) is int and audit[0]["rc"] == 0,
            "rc inicial ausente ou diferente de zero")
    # v2.6a criterio 1: identidade observada pelo executor (URL == pedida, marcador ok)
    identity = execution.get("identity") if isinstance(execution, dict) else None
    require(isinstance(identity, dict) and identity.get("url") == execution.get("url") and
            identity.get("markerOk") is True, "identidade inicial ausente ou invalida")
    require(bool(audit) and all(type(a.get("rc")) is int and a["rc"] == 0 and
                              "error" not in a for a in audit), "falha em chamada do harness")
    steps, ops = execution.get("steps"), recipe["native_ops"]
    require(isinstance(steps, list) and len(steps) == len(ops) == 22,
            "esperados exatamente 22 passos, sem falha/retry oculto")
    ordinary, uploads = 0, 0
    for index, step in enumerate(steps if isinstance(steps, list) else []):
        if not isinstance(step, dict):
            require(False, f"passo {index} inválido")
            continue
        op = step.get("op")
        require(type(step.get("i")) is int and step["i"] == index and index < len(ops) and
                op == normalized_op(ops[index]), f"ordem/op divergente no passo {index}")
        ex = step.get("exec")
        rows = ex.get("results") if isinstance(ex, dict) else None
        if not isinstance(rows, list) or len(rows) != 1 or not isinstance(rows[0], dict):
            require(False, f"resultado estruturado ausente no passo {index}")
            continue
        row = rows[0]
        require(type(row.get("i")) is int and row["i"] == 0 and isinstance(op, dict) and
                row.get("action") == op.get("action") and "error" not in row,
                f"retorno inconsistente no passo {index}")
        if isinstance(op, dict) and op.get("action") == "upload":
            confirmed = (ex.get("terminal") == "upload" and ex.get("stopped_at") == 0 and
                         row.get("pending") is True and row.get("ok") is None and
                         step.get("upload", "").strip() ==
                         "upload-ok ATT=Anexado: fixture-evidence.txt · 32 bytes" and
                         isinstance(checks, dict) and checks.get("upload") is True)
            require(confirmed, f"upload terminal não confirmado no passo {index}")
            uploads += int(confirmed)
        else:
            good = (row.get("ok") is True and not row.get("pending") and
                    ex.get("terminal") is None and ex.get("stopped_at") is None and
                    not ex.get("reason"))
            require(good, f"passo {index} sem ok:true")
            ordinary += int(good)
    require(ordinary == 21 and uploads == 1, "exigidos 21 ok:true + 1 upload confirmado")
    return dict(passed=not failures, failures=failures, ordinaryOk=ordinary,
                confirmedUploads=uploads, checks=checks)


def reserve_directory(parent, name):
    path = Path(parent) / name
    path.mkdir(parents=False, exist_ok=False)
    return path


def free_port():
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


def wait_ready(process, log, run_id, port, timeout=15):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if process.poll() is not None:
            raise RuntimeError("Fixture encerrou antes do ready; consultar fixture.stderr.txt")
        lines = log.read_text(encoding="utf-8").splitlines()
        if lines:
            ready = strict_json(lines[0])
            if ready.get("ready") is True and ready.get("runId") == run_id and \
                    ready.get("origin") == f"http://127.0.0.1:{port}":
                return ready
            raise RuntimeError("Identidade da fixture divergente")
        time.sleep(0.1)
    raise TimeoutError("Fixture sem ready em 15s")


def run_pilot(batch_dir, run_id, source, recipe_path):
    directory = reserve_directory(batch_dir, run_id)
    port = free_port()
    url = f"http://127.0.0.1:{port}/xt-web-form-01"
    receipt = dict(schema="battery-v2.6a", runId=run_id, url=url, startedAt=utc_now(),
                   recipeSha256=sha256(recipe_path), provenance=source, verifierSpec=VERIFY)
    write_new(directory / "started.json", receipt)
    tick, fixture = time.monotonic(), None
    try:
        if fingerprints() != source["files"] or sha256(recipe_path) != RECIPE_SHA256:
            raise RuntimeError("Fontes mudaram entre pilotos; iniciar outra bateria")
        with (directory / "fixture.stdout.txt").open("x", encoding="utf-8") as out, \
                (directory / "fixture.stderr.txt").open("x", encoding="utf-8") as err:
            fixture = subprocess.Popen([sys.executable, "-u", str(FIXTURE), "--run", run_id,
                                        "--port", str(port), "--ttl", "1800", "--mode", "benchmark"],
                                       stdout=out, stderr=err,
                                       creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0)
            receipt["fixture"] = wait_ready(fixture, directory / "fixture.stdout.txt", run_id, port)
            execution_process = command([sys.executable, Path(__file__), "--executor-worker",
                                         str(recipe_path), url, directory / "harness.jsonl",
                                         "--marker", MARKER])
            write_new(directory / "recipe.json", execution_process.pop("stdout"), raw=True)
            write_new(directory / "recipe.stderr.txt", execution_process.pop("stderr"), raw=True)
            receipt["executionProcess"] = execution_process
            # Somente o judge separado acessa ground truth, depois do executor.
            judge_process = command([sys.executable, HARNESS_JUDGE, "--run", run_id], timeout=120)
            write_new(directory / "judge.json", judge_process.pop("stdout"), raw=True)
            write_new(directory / "judge.stderr.txt", judge_process.pop("stderr"), raw=True)
            receipt["judgeProcess"] = judge_process
            execution = strict_json((directory / "recipe.json").read_text(encoding="utf-8"))
            if isinstance(execution, dict):
                receipt["legacyWouldPass"] = "DONE" in str(execution.get("result"))
                receipt["executorResult"] = execution.get("result")
                receipt["executorVerifier"] = execution.get("verifier")
            judge = strict_json((directory / "judge.json").read_text(encoding="utf-8"))
            audit = [strict_json(line) for line in
                     (directory / "harness.jsonl").read_text(encoding="utf-8").splitlines()]
            if not isinstance(execution, dict) or not isinstance(judge, dict):
                raise ValueError("Saída JSON não é objeto")
            receipt["gate"] = gate(run_id, execution, judge,
                                   strict_json(recipe_path.read_text(encoding="utf-8")), audit,
                                   execution_process["rc"], judge_process["rc"])
            receipt["initialNavigation"] = audit[0] if audit else None
            receipt["judge"] = judge
    except Exception as exc:
        receipt["gate"] = dict(passed=False, failures=[f"{type(exc).__name__}: {exc}"])
    finally:
        if fixture is not None:
            if fixture.poll() is None:
                fixture.terminate()
                try:
                    fixture.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    fixture.kill()
                    fixture.wait(timeout=5)
            receipt["fixtureExitCode"] = fixture.returncode
        receipt["finishedAt"] = utc_now()
        receipt["durationSeconds"] = time.monotonic()-tick
        receipt["sourcesUnchanged"] = (fingerprints() == source["files"] and
                                        sha256(recipe_path) == RECIPE_SHA256)
        if not receipt["sourcesUnchanged"]:
            receipt["gate"]["passed"] = False
            receipt["gate"]["failures"].append("Fontes alteradas durante execução")
        receipt["artifacts"] = {p.name: sha256(p) for p in directory.iterdir() if p.is_file()}
        write_new(directory / "receipt.json", receipt)
    return receipt


def battery_passed(receipts):
    return len(receipts) == 3 and len({r["runId"] for r in receipts}) == 3 and \
        all(r.get("gate", {}).get("passed") is True for r in receipts)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--logs", type=Path, default=LOGS)
    parser.add_argument("--preflight-only", action="store_true")
    parser.add_argument("--executor-worker", nargs=3, metavar=("RECIPE", "URL", "AUDIT"),
                        help=argparse.SUPPRESS)
    parser.add_argument("--marker", default="",
                        help="marcador de identidade da pagina exigido antes de agir")
    args = parser.parse_args()
    if args.executor_worker:
        executor_worker(*args.executor_worker, marker=args.marker)
        return 0
    args.logs.mkdir(parents=True, exist_ok=True)
    batch_id = "battery-" + datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S") + "-" + uuid.uuid4().hex[:8]
    directory = reserve_directory(args.logs, batch_id)
    summary = dict(batchId=batch_id, startedAt=utc_now(), preflightOnly=args.preflight_only,
                   pilots=[], passed=False)
    print(f"Bateria: {directory}", flush=True)
    try:
        source = provenance()
        summary["provenance"] = source
        recipe_path = freeze_recipe(directory)
        summary["recipeSha256"] = sha256(recipe_path)
        summary["recipeInput"] = "inputs/" + recipe_path.name
        result = preflight(recipe_path)
        write_new(directory / "preflight.json", result)
        print(f"Preflight PASS: {result['pythonCompiled']} Python / "
              f"{result['javascriptCompiled']} JS; recipe {result['recipeSha256']}", flush=True)
        if args.preflight_only:
            summary["preflightPassed"] = True
        else:
            for n in range(1, 4):
                run_id = f"{batch_id}-p{n}"
                print(f"PILOTO {n}: {run_id}", flush=True)
                receipt = run_pilot(directory, run_id, source, recipe_path)
                summary["pilots"].append(dict(runId=run_id, gate=receipt["gate"],
                                             receipt=f"{run_id}/receipt.json"))
                print(json.dumps(summary["pilots"][-1], ensure_ascii=False), flush=True)
                if not receipt["gate"]["passed"] and receipt.get("legacyWouldPass"):
                    print("ATENÇÃO: gate novo reprovou run que DONE antigo aceitaria. "
                          "Preservar evidência; não afrouxar o gate.", flush=True)
            summary["passed"] = battery_passed(summary["pilots"])
        if fingerprints() != source["files"] or sha256(recipe_path) != RECIPE_SHA256:
            raise RuntimeError("Fontes alteradas após preflight/bateria")
    except Exception as exc:
        summary.update(passed=False, error=f"{type(exc).__name__}: {exc}")
        print(summary["error"], file=sys.stderr, flush=True)
    finally:
        summary["finishedAt"] = utc_now()
        write_new(directory / "summary.json", summary)
    # Preflight isolado é diagnóstico explícito, não aceite de bateria.
    success = (summary.get("preflightPassed") is True if args.preflight_only else summary["passed"] is True)
    return 0 if success and "error" not in summary else 1


if __name__ == "__main__":
    raise SystemExit(main())
