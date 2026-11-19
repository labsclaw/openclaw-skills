"""Item 4, Chromium real e entradas públicas locais. Sem LLM/judge.
python -B scripts/test_environment.py --receipt NOVO.json
"""
import argparse
import ast
import copy
import contextlib
import hashlib
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import io
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import threading
from unittest.mock import patch
import environment_runner as ER
import agent_loop as AL
import recipe as R
import battery_pilot as BP


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--receipt',required=True)
    args=parser.parse_args();dest=Path(args.receipt)
    if dest.exists():raise FileExistsError(dest)
    def fingerprints():
        return {name:hashlib.sha256(Path(__file__).with_name(name).read_bytes()).hexdigest() for name in
            ('environment_runner.py','agent_loop.py','recipe.py','battery_pilot.py','test_environment.py')}
    sources_before=fingerprints()
    cases=[]
    def add(name, condition, **detail):
        cases.append(dict(name=name,passed=bool(condition),**detail))
    class Handler(BaseHTTPRequestHandler):
        def log_message(self,*args):pass
        def do_GET(self):
            self.send_response(200);self.send_header('Content-Type','text/html');self.end_headers()
            self.wfile.write(b'<html><body><h1>READY</h1><label for="name">Name</label><input id="name"><button id="save" onclick="document.getElementById(\'status\').textContent=\'SAVED\'">Save</button><p id="status">IDLE</p><input id="file" type="file"></body></html>')
    server=ThreadingHTTPServer(('127.0.0.1',0),Handler)
    threading.Thread(target=server.serve_forever,daemon=True).start()
    url=f'http://127.0.0.1:{server.server_port}/'
    try:
        # Perfis preservados para inspeção; evitar remoção recursiva de arquivos
        # Chromium ainda em flush no Windows. Fora do checkout/manifesto.
        with contextlib.nullcontext(tempfile.mkdtemp(prefix='a029-environment-')) as tmp:
            root=Path(tmp)
            # Controle real: viewport disponível diferente não vira prova pelo nome maximize.
            from playwright.sync_api import sync_playwright
            with sync_playwright() as pw:
                browser=pw.chromium.launch();page=browser.new_page(viewport=dict(width=1100,height=700))
                observed=page.evaluate(ER.MEASURE)
                add('baseline_no_contract',observed['width']==1100 and observed['height']==700,observation=observed,
                    note='controle local, não observação de dimensões do Hermes')
                browser.close()
            with ER.Environment('run-A',root,headless=True) as env, env.bind():
                env.page.goto(url)
                env.page.evaluate("localStorage.setItem('old-run','A');document.cookie='old_run=A'")
                add('profile_A_markers_observed',env.page.evaluate("localStorage.getItem('old-run')")=='A' and bool(env.context.cookies()))
                actual=env.page.evaluate(ER.MEASURE)
                add('requested_and_measured',actual['width']==1280 and actual['height']==900,measurement=actual)
                env.harness('maximize()')
                add('maximize_not_source_of_proof',env.check('post-maximize')['width']==1280)
                # Transporte da operação nativa e snapshot real, sem bypass de resolver.
                value=AL.execute_batch([dict(action='type',id='name',value='contract')])
                add('native_action',not AL.execution_failed(value) and env.page.locator('#name').input_value()=='contract',result=value)
                add('snapshot',AL.snapshot()['url']==url)
                file=root/'upload.txt';file.write_text('public evidence',encoding='utf-8')
                upload=env.harness(f'upload_file("#file", {json.dumps(str(file))})')
                add('upload_transport',upload['rc']==0 and env.page.locator('#file').evaluate('(e)=>e.files[0].name')=='upload.txt')
                reload=env.harness('print(js("(() => { /* UB2_RELOAD_REQUEST */ location.reload(); return {requested:true}; })()"))')
                add('real_reload',reload['rc']==0 and env.page.evaluate("performance.getEntriesByType('navigation')[0].type")=='reload')
            first=json.loads((root/'run-A/environment.json').read_text())
            add('receipt_A_valid',ER.environment_passed(first,'run-A'),receipt=first)
            with ER.Environment('run-B',root,headless=True) as env:
                env.page.goto(url)
                storage=env.page.evaluate("({local:localStorage.getItem('old-run'),cookie:document.cookie})")
                add('new_profile_B_clean_same_origin',storage==dict(local=None,cookie=''),observed=storage)
            second=json.loads((root/'run-B/environment.json').read_text())
            add('receipt_B_distinct',ER.environment_passed(second,'run-B') and first['profile']['path']!=second['profile']['path'],receipt=second)
            before=hashlib.sha256((root/'run-A/environment.json').read_bytes()).hexdigest()
            try:
                with ER.Environment('run-A',root,headless=True):pass
                duplicate=False
            except FileExistsError:duplicate=True
            add('same_run_rejected_no_overwrite',duplicate and before==hashlib.sha256((root/'run-A/environment.json').read_bytes()).hexdigest())
            for name,mutate in [
                ('wrong_run',lambda r:r.update(runId='wrong')),
                ('wrong_width',lambda r:r['observations'][0].update(width=1200)),
                ('wrong_height',lambda r:r['observations'][0].update(height=800)),
                ('visual_mismatch',lambda r:r['observations'][0].update(visualWidth=1200)),
                ('old_profile',lambda r:r['profile'].update(createdExclusive=False)),
                ('nonempty_profile',lambda r:r['profile'].update(entriesBeforeLaunch=['old'])),
                ('command_wrong_profile',lambda r:r.update(browserCommandLine=[])),
                ('cookies_present',lambda r:r.update(initialCookies=[dict(name='old')])),
                ('maximize_only',lambda r:r.update(observations=[])),
                ('earlier_error',lambda r:r.update(errors=['failure'])),
                ('missing_requested',lambda r:r.pop('requested'))]:
                variant=copy.deepcopy(first);mutate(variant)
                add('gate_rejects_'+name,not ER.environment_passed(variant,'run-A'))
            with ER.Environment('wrong-live-size',root,headless=True) as env:
                env.page.set_viewport_size(dict(width=1000,height=700))
                result=env.harness("print('must-not-run')")
                add('live_mismatch_blocks_before_task',result['rc']==1 and 'must-not-run' not in result['out'],result=result)
                env.page.set_viewport_size(ER.VIEWPORT)
                retry=env.harness("print('must-not-retry')")
                add('failure_latch_blocks_retry',retry['rc']==1 and not retry['out'])
            negative=json.loads((root/'wrong-live-size/environment.json').read_text())
            add('mismatch_not_erased_by_restore',not negative['passed'] and bool(negative['errors']),receipt=negative)
            with patch('playwright.sync_api.BrowserType.launch_persistent_context',side_effect=RuntimeError('launch denied')):
                try:
                    with ER.Environment('launch-failed',root,headless=True):pass
                except RuntimeError:pass
            failed=json.loads((root/'launch-failed/environment.json').read_text())
            add('launch_failure_receipt',failed['passed'] is False and 'launch denied' in str(failed['errors']))
            for bad in ('../escape','a/b','', 'a'*121):
                try:ER.Environment(bad,root);ok=False
                except ValueError:ok=True
                add('invalid_run_'+repr(bad),ok)
            # Entrada CLI sem histórico privilegiado. Recipe normal com operação e verificação.
            recipe_path=root/'recipe.json'
            recipe_path.write_text(json.dumps(dict(native_ops=[dict(op='type',id='name',value='CLI')],notes=[])))
            for mode in ('recipe','single','batch'):
                forwarded=([str(recipe_path),'--url',url,'--verify','text_contains:READY','--marker','READY'] if mode=='recipe' else
                           ['--url',url,'--goal','observe only','--engine','opencode','--max-steps','0'])
                process=subprocess.run([sys.executable,'-B',ER.__file__,'--run-id','cli-'+mode,'--output',str(root),'--headless',mode,'--',*forwarded],
                    capture_output=True,text=True,encoding='utf-8',timeout=60)
                data=json.loads(process.stdout);receipt=json.loads((root/('cli-'+mode)/'environment.json').read_text())
                add('normal_CLI_'+mode,ER.environment_passed(receipt,'cli-'+mode) and
                    data['result']=='ENVIRONMENT-PASS' and process.returncode==(0 if mode=='recipe' else 1),
                    rc=process.returncode,stdout=data,environment=receipt,stderr=process.stderr,
                    note='single/batch zero ciclos, sem inferência; ambiente e navegação exercitados')
            # Worker real pelo subprocesso normal; não executar judge/bateria privada.
            audit=root/'harness.jsonl'
            process=subprocess.run([sys.executable,'-B',BP.__file__,'--executor-worker',str(recipe_path),url,str(audit),
                '--run-id','worker-run','--headless','--verify','text_contains:READY','--marker','READY'],capture_output=True,text=True,encoding='utf-8',timeout=60)
            receipt=json.loads((root/'environment/worker-run/environment.json').read_text())
            execution=json.loads(process.stdout)
            add('normal_battery_worker',process.returncode==0 and ER.environment_passed(receipt,'worker-run') and execution['result']=='RECIPE-DONE-VERIFIED',
                execution=execution,environment=receipt,stderr=process.stderr)
            rows=[json.loads(line) for line in audit.read_text().splitlines()]
            add('audit_initial_navigation_preserved',rows[0]['phase']=='initial_navigation' and all(row['rc']==0 for row in rows))
            with ER.Environment('headed-default',root) as env:
                env.page.goto(url)
                env.check('headed-page')
            headed=json.loads((root/'headed-default/environment.json').read_text())
            add('visible_default',ER.environment_passed(headed,'headed-default') and headed['headless'] is False,receipt=headed)
    except Exception as exc:
        import traceback
        add('unexpected_test_error',False,error=type(exc).__name__+': '+str(exc),traceback=traceback.format_exc())
    finally:
        server.shutdown();server.server_close()
    sources=fingerprints()
    add('sources_unchanged',sources_before==sources)
    result=dict(passed=sum(c['passed'] for c in cases),total=len(cases),cases=cases,sources=sources,
        sources_before=sources_before,sources_unchanged=sources_before==sources,
        scope='Chromium local real, headless, sem LLM/judge/Hermes; perfil novo é observado, não sandbox de rede')
    ER.write_new(dest,result)
    print(json.dumps(dict(passed=result['passed'],total=result['total'],receipt=str(dest))))
    return 0 if result['passed']==result['total'] else 1


if __name__=='__main__':raise SystemExit(main())
