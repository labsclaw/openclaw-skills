"""A025 diagnóstico: observação parcial, nunca ausência universal de rede.
python -B scripts/observe_network_a025.py --output NOVO_DIRETORIO
Sem inferência, judge, bloqueio de rede ou contato externo deliberado.
"""
import argparse
from datetime import datetime, timezone
import hashlib
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import threading
import traceback
import uuid
from urllib.parse import urlsplit
import environment_runner as ER
import recipe as R
import battery_pilot as BP


def now():return datetime.now(timezone.utc).isoformat()


def origin(url):
    u=urlsplit(url);return f'{u.scheme}://{u.netloc}'


class Observer:
    def __init__(self,env,path,allowed):
        self.events=[];self.errors=[];self.allowed=allowed;self.started=now()
        self.stream=Path(path).open('x',encoding='utf-8',buffering=1)
        def emit(source,kind,url,**extra):
            event=dict(observedAt=now(),source=source,kind=kind,url=url,
                       allowedOrigin=origin(url)==allowed,**extra)
            self.events.append(event);self.stream.write(json.dumps(event,ensure_ascii=False)+'\n')
        self.session=env.context.new_cdp_session(env.page)
        self.session.on('Network.requestWillBeSent',lambda p:emit('CDP-target','request',p['request']['url'],method=p['request']['method'],requestId=p['requestId']))
        self.session.on('Network.webSocketCreated',lambda p:emit('CDP-target','websocket',p['url']))
        self.session.send('Network.enable')
        self.handler=lambda request:emit('Playwright-context','request',request.url,method=request.method)
        self.context=env.context;self.context.on('request',self.handler)
    def finish(self):
        try:self.context.remove_listener('request',self.handler);self.session.detach()
        finally:self.stream.close()
        return dict(startedAt=self.started,finishedAt=now(),events=len(self.events),
            requests=sum(e['kind']=='request' for e in self.events),
            nonAllowedObserved=[e for e in self.events if not e['allowedOrigin']],errors=self.errors,
            coverage='target CDP + context HTTP request events after launch; not OS/DNS/browser-background/all-host')


def main():
    ap=argparse.ArgumentParser();ap.add_argument('--output',required=True,type=Path);args=ap.parse_args()
    out=args.output;out.mkdir(exist_ok=False)
    sources=[Path(__file__),Path(R.__file__),Path(ER.__file__),Path(BP.__file__),BP.FIXTURE]
    source_recipe=Path(__file__).resolve().parents[1]/'evidence/v26/results/recipes/xt24ds7-recipe.json'
    source_contract=BP.BENCHMARK/'TASK-CONTRACT-20261019.json'
    sources += [source_recipe,source_contract]
    hashes=lambda:{str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in sources}
    before=hashes();receipt=dict(schema='a025-observation-v1',startedAt=now(),verdict='not_verified',
        sourcesBefore=before,controls=[],task=None,limits=[
            'sensor attached after Chromium launch; startup not observed',
            'does not observe all browser background/DNS/UDP/host processes',
            'no inference/provider transport exercised',
            'historical runs cannot be reconstructed from this observation'])
    tmp=Path(tempfile.mkdtemp(prefix='a025-profile-'));fixture=None;servers=[]
    class Handler(BaseHTTPRequestHandler):
        def log_message(self,*args):pass
        def do_GET(self):
            self.send_response(200);self.send_header('Access-Control-Allow-Origin','*');self.end_headers();self.wfile.write(b'local sensor control')
    try:
        for _ in range(2):
            server=ThreadingHTTPServer(('127.0.0.1',0),Handler);servers.append(server)
            threading.Thread(target=server.serve_forever,daemon=True).start()
        local=[f'http://127.0.0.1:{s.server_port}' for s in servers]
        with ER.Environment('sensor-control',tmp,headless=True) as env:
            observer=Observer(env,out/'control-network.jsonl',local[0])
            try:
                env.page.goto(local[0]+'/')
                env.page.evaluate('(url)=>fetch(url).then(r=>r.text())',local[1]+'/calibration')
                env.page.wait_for_timeout(300)
            finally:summary=observer.finish()
        receipt['controls']=[dict(name='allowlisted_loopback_seen',passed=any(e['allowedOrigin'] for e in observer.events)),
                             dict(name='distinct_loopback_origin_seen',passed=any(e['url'].startswith(local[1]+'/calibration') and not e['allowedOrigin'] for e in observer.events))]
        receipt['calibration']=summary
        run_id='a025-'+uuid.uuid4().hex[:12];port=BP.free_port();url=f'http://127.0.0.1:{port}/xt-web-form-01'
        frozen=out/'recipe-input.json'
        with frozen.open('xb') as f:f.write(source_recipe.read_bytes())
        with (out/'task-contract.json').open('xb') as f:f.write(source_contract.read_bytes())
        with (out/'fixture.stdout.txt').open('x',encoding='utf-8') as stdout,(out/'fixture.stderr.txt').open('x',encoding='utf-8') as stderr:
            fixture=subprocess.Popen([sys.executable,'-u',str(BP.FIXTURE),'--run',run_id,'--port',str(port),'--ttl','120','--mode','benchmark'],
                stdout=stdout,stderr=stderr,creationflags=subprocess.CREATE_NO_WINDOW if os.name=='nt' else 0)
            ready=BP.wait_ready(fixture,out/'fixture.stdout.txt',run_id,port)
            with ER.Environment(run_id,tmp,headless=True) as env,env.bind():
                observer=Observer(env,out/'task-network.jsonl',origin(url))
                try:
                    log=R.run_recipe(str(frozen),url,verify_spec=BP.verifier_spec(run_id,url),marker='X-Testing')
                    env.page.wait_for_timeout(400)
                finally:task_summary=observer.finish()
                ER.write_new(out/'task-execution.json',log)
            receipt['task']=dict(runId=run_id,url=url,ready=ready,result=log['result'],
                executedSteps=len(log.get('steps',[])),inputOps=len(json.loads(frozen.read_text(encoding='utf-8'))['native_ops']),
                observation=task_summary,environmentPassed=env.receipt['passed'])
            receipt['sufficiency']=dict(sufficient=False,reasons=list(receipt['limits']))
            if log['result']!='RECIPE-DONE-VERIFIED':receipt['sufficiency']['reasons'].append('normal public recipe did not complete full contracted workflow')
    except Exception as exc:
        receipt['error']=type(exc).__name__+': '+str(exc);receipt['traceback']=traceback.format_exc()
    finally:
        if fixture is not None:
            if fixture.poll() is None:
                fixture.terminate()
                try:fixture.wait(timeout=5)
                except subprocess.TimeoutExpired:fixture.kill();fixture.wait(timeout=5)
            receipt['fixtureExitCode']=fixture.returncode
        for s in servers:s.shutdown();s.server_close()
        receipt['sourcesAfter']=hashes();receipt['sourcesUnchanged']=before==receipt['sourcesAfter'];receipt['finishedAt']=now()
        receipt['files']={str(p.relative_to(out)):hashlib.sha256(p.read_bytes()).hexdigest() for p in out.rglob('*') if p.is_file()}
        ER.write_new(out/'observation.json',receipt)
    print(json.dumps(dict(output=str(out),verdict=receipt['verdict'],controls=receipt['controls'],task=receipt['task'],error=receipt.get('error'))))
    return 1 if receipt.get('error') else 0  # diagnóstico executado não é aceite A025


if __name__=='__main__':raise SystemExit(main())
