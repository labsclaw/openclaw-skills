#!/usr/bin/env python3
"""Bateria de piloto oficial do recipe mode (Skill Recorder pattern).

3 execucoes da MESMA recipe em fixtures novas, sem regravar — o teste de
generalizacao pedido no veredito do skill-recorder. Cada execucao:
  fixture nova (runId proprio) -> recipe.py run -> verify persisted -> judge.
"""
import json
import os
import subprocess
import sys
import time

FIXTURE = r"C:/Users/ClawLabs/.openclaw/workspace/pocs/browser-benchmark-20261016/fixture/server.py"
HARNESS_JUDGE = r"C:/Users/ClawLabs/.openclaw/workspace/pocs/browser-benchmark-20261016/harness/judge.py"
RECIPE = r"C:/Users/ClawLabs/browser-eval/results/recipes/xt24ds7-recipe.json"
LOGS = r"C:/Users/ClawLabs/browser-eval/results/v22-logs"
PORTS = (8791, 8792, 8793)


def sh(cmd, cwd=None, timeout=600, env=None):
    p = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout,
                       encoding="utf-8", errors="replace", cwd=cwd, env=env)
    return p.stdout or "", p.returncode


def main():
    results = []
    for n, port in enumerate(PORTS, 1):
        run_id = f"hermes-battery-p{n}-{int(time.time())}"
        print(f"=== BATTERY PILOT {n} (porta {port}, run {run_id}) ===", flush=True)
        # fixture nova (mata listener antigo da porta)
        sh(["powershell", "-Command",
            f"Get-NetTCPConnection -LocalPort {port} -State Listen -ErrorAction SilentlyContinue | "
            "Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force }"])
        time.sleep(1)
        fixture = subprocess.Popen(
            ["python", FIXTURE, "--run", run_id, "--port", str(port), "--ttl", "2700",
             "--mode", "benchmark"],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        time.sleep(3)

        # recipe run (foreground, log completo em arquivo)
        out, rc = sh(["python", os.path.join(os.path.dirname(os.path.abspath(__file__)), "recipe.py"),
                      "run", RECIPE, "--url", f"http://127.0.0.1:{port}/xt-web-form-01",
                      "--verify", "persisted:Plano WEB DEMO-024"],
                     timeout=600)
        with open(os.path.join(LOGS, f"battery-p{n}.json"), "w", encoding="utf-8") as f:
            f.write(out)
        try:
            d = json.loads(out[out.find("{"):])
        except Exception:
            d = {"result": "PARSE-FAIL"}
        # judge
        jout, _ = sh(["python", HARNESS_JUDGE, "--run", run_id], timeout=120)
        with open(os.path.join(LOGS, f"battery-p{n}-judge.json"), "w", encoding="utf-8") as f:
            f.write(jout)
        try:
            j = json.loads(jout)
        except Exception:
            j = {"checks": {}, "events": []}
        cks = j.get("checks", {})
        ok = sum(1 for v in cks.values() if v)
        evs = j.get("events", [])
        print(f"  recipe: {d.get('result')} (exit {rc}) | verifier: {d.get('verifier')}")
        print(f"  judge: {ok}/11 | mutation: {j.get('mutationCount')} | submits: {j.get('submitAttempts')} "
              f"| saved: {'saved' in evs} | persisted: {'persisted_read' in evs}")
        results.append((n, d.get("result"), d.get("verifier"), ok, "saved" in evs, "persisted_read" in evs))
        fixture.terminate()
        time.sleep(1)

    print("\n=== RESUMO BATERIA ===")
    for n, res, ver, ok, saved, pers in results:
        print(f"  p{n}: {res} | verifier={ver} | judge={ok}/11 | saved={saved} | persisted={pers}")
    sys.exit(0 if all(r[1] and "DONE" in str(r[1]) for r in results) else 1)


if __name__ == "__main__":
    main()
