#!/usr/bin/env python3
"""v2.4.6b: Gravador continuo estilo jev-ultrafast (render 1x com timestamps).

Screencast CDP (Page.startScreencast) nao entrega frames pela fila do daemon
nesta versao do browser-harness; usamos Page.captureScreenshot em polling
continuo (~6fps) - cada frame guarda o timestamp REAL de captura; o render
usa ffmpeg concat demuxer com duracao por frame = delta entre timestamps
=> velocidade 1x (mesmo padrao do render_demo.py do jev-ultrafast).
Captura o VIEWPORT da aba real do Chrome do usuario (a que o agente dirige).
"""
import base64, json, os, subprocess, sys, threading, time

HARNESS = r"C:\Users\ClawLabs\AppData\Local\hermes\installs\bde0425e6fa3eeac\environments\19338042a70945f794a89da1de5408f4\venv\Scripts\browser-harness.exe"
FFMPEG = r"C:\Users\ClawLabs\AppData\Local\hermes\tools\ffmpeg-9.0.1-win32-x64\bin\ffmpeg.exe"
OUTROOT = r"C:\Users\ClawLabs\browser-eval\recordings\screencast"

_SNAP = ("import json as _j, time as _t\n"
         "t0 = _t.time()\n"
         "shot = cdp('Page.captureScreenshot', _response_timeout=15, format='jpeg', quality=72)\n"
         "print('SHOT ' + _j.dumps({'data': shot.get('data'), 'lat': round(_t.time()-t0, 3), "
         "'ts': _t.time()}))\n")


def _harness(code, timeout=60):
    p = subprocess.run([HARNESS], input=code, capture_output=True, text=True,
                       timeout=timeout, encoding="utf-8", errors="replace")
    return p.stdout or ""


def capture_once():
    out = _harness(_SNAP, timeout=45)
    for line in out.splitlines():
        if line.startswith("SHOT "):
            d = json.loads(line[5:])
            if d.get("data"):
                return d["ts"], base64.b64decode(d["data"]), d.get("lat", 0)
    return None, None, None


def main():
    agent_cmd = sys.argv[1:]
    recdir = os.path.join(OUTROOT, "rec-%d" % int(time.time()))
    os.makedirs(recdir, exist_ok=True)
    print("gravando em:", recdir)

    frames = []
    stop = threading.Event()
    n = 0
    target_period = 0.16  # ~6fps

    def poller():
        nonlocal n
        while not stop.is_set():
            ts, data, lat = capture_once()
            if data:
                n += 1
                fn = "%05d.jpg" % n
                with open(os.path.join(recdir, fn), "wb") as f:
                    f.write(data)
                frames.append((n, ts or time.time(), fn))
            stop.wait(max(0.0, target_period - (lat or 0)))

    proc = subprocess.Popen(agent_cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                            text=True, encoding="utf-8", errors="replace")
    th = threading.Thread(target=poller, daemon=True)
    th.start()
    proc.wait()
    stop.set()
    th.join(timeout=30)
    print("agente rc=%s | frames capturados: %d" % (proc.returncode, n))

    with open(os.path.join(recdir, "manifest.jsonl"), "w", encoding="utf-8") as mf:
        for i, ts, fn in frames:
            mf.write(json.dumps({"i": i, "ts": ts, "file": fn}) + "\n")

    if len(frames) < 2:
        print("poucos frames; abortando render")
        return

    concat = os.path.join(recdir, "concat.txt")
    with open(concat, "w", encoding="utf-8") as f:
        for idx, (i, ts, fn) in enumerate(frames):
            nxt_ts = frames[idx + 1][1] if idx + 1 < len(frames) else ts + 1.2
            dur = max(0.04, float(nxt_ts) - float(ts))
            f.write("file '%s'\n" % fn)
            f.write("duration %.3f\n" % dur)
        f.write("file '%s'\n" % frames[-1][2])
    out_base = os.path.join(recdir, "run")
    for ext, codec, extra in (("webm", "libvpx-vp9", []),
                              ("mp4", "libx264", ["-pix_fmt", "yuv420p"])):
        out = out_base + "." + ext
        cmd = [FFMPEG, "-y", "-f", "concat", "-safe", "0", "-i", concat,
               "-vf", "scale=1280:-2,fps=30", "-c:v", codec] + extra + [out]
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=900)
        if r.returncode == 0:
            print("ok:", out, os.path.getsize(out) // 1024, "KB")
        else:
            print("ffmpeg", ext, "falhou:", (r.stderr or "")[-200:])
    print("VIDEO:", out_base + ".webm")


if __name__ == "__main__":
    main()
