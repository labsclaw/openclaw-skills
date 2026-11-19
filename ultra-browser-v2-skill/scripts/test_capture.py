"""A006: arquivos reais, Chromium e entradas normais; sem LLM/judge."""
import argparse
import copy
import contextlib
import hashlib
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import io
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import threading
import traceback
from unittest.mock import patch
import capture_evidence as CE
import environment_runner as ER
import recipe as R
import battery_pilot as BP


def main():
    ap=argparse.ArgumentParser();ap.add_argument('--receipt',required=True);args=ap.parse_args();dest=Path(args.receipt)
    if dest.exists():raise FileExistsError(dest)
    names=('capture_evidence.py','environment_runner.py','recipe.py','battery_pilot.py','test_capture.py')
    fingerprint=lambda:{n:hashlib.sha256(Path(__file__).with_name(n).read_bytes()).hexdigest() for n in names}
    before=fingerprint();cases=[]
    def add(name,passed,**detail):cases.append(dict(name=name,passed=bool(passed),**detail))
    class Handler(BaseHTTPRequestHandler):
        def log_message(self,*args):pass
        def do_GET(self):
            self.send_response(200);self.send_header('Content-Type','text/html');self.end_headers()
            self.wfile.write(b'<html><body><h1>READY A006</h1><label for="name">Name</label><input id="name"><button id="save" onclick="document.getElementById(\'status\').textContent=\'SAVED\'">Save</button><p id="status">IDLE</p></body></html>')
    server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start()
    url=f'http://127.0.0.1:{server.server_port}/';tmp=Path(tempfile.mkdtemp(prefix='a006-'))
    try:
        recipe=tmp/'recipe.json';recipe.write_text(json.dumps(dict(native_ops=[dict(op='type',id='name',value='A006'),dict(op='click',id='save')],notes=[])))
        for mode in ('cli','worker'):
            run='a006-'+mode
            argv=([sys.executable,'-B',ER.__file__,'--run-id',run,'--output',str(tmp),'--headless','recipe','--',str(recipe),'--url',url,'--verify','text_contains:SAVED','--marker','READY'] if mode=='cli' else
                  [sys.executable,'-B',BP.__file__,'--executor-worker',str(recipe),url,str(tmp/'audit.jsonl'),'--run-id',run,'--headless','--verify','text_contains:SAVED','--marker','READY'])
            p=subprocess.run(argv,capture_output=True,text=True,encoding='utf-8',timeout=60)
            output=json.loads(p.stdout);log=json.loads(output['taskStdout']) if mode=='cli' else output
            root=(tmp/run if mode=='cli' else tmp/'environment'/run)/'capture'
            report=json.loads((root/'capture.json').read_text())
            add('normal_'+mode,p.returncode==0 and log['result']=='RECIPE-DONE-VERIFIED' and log['capture']==report and not CE.verify_files(report,root,run),
                rc=p.returncode,execution=log,report=report,stderr=p.stderr)
            add('frames_cover_'+mode,{'after-navigation','after-native','recipe-final'} <= {f['phase'] for f in report['frames']})
            # Copiar apenas evidência pública criada por este teste, não perfil.
            artifacts=dest.parent/(dest.stem+'-files-'+mode);shutil.copytree(root,artifacts)
            add('committed_file_support_'+mode,not CE.verify_files(report,artifacts,run),path=str(artifacts))
            if mode=='cli':good_report=report;good_root=root
        with ER.Environment('reload',tmp,headless=True) as env,env.bind():
            env.harness('goto_url('+json.dumps(url)+')')
            result=env.harness('print(js("(() => { /* UB2_RELOAD_REQUEST */ location.reload(); return {requested:true}; })()"))')
            add('reload_real',result['rc']==0 and env.page.evaluate("performance.getEntriesByType('navigation')[0].type")=='reload')
        reload_report=env.receipt['capture']
        add('reload_frame',not CE.verify_files(reload_report,env.capture.directory,'reload') and any(f['phase']=='after-reload' for f in reload_report['frames']))
        for scenario in ('screenshot_exception','empty_png','invalid_png','write_collision','receipt_collision','final_failure'):
            with ER.Environment(scenario,tmp,headless=True) as env,env.bind():
                original=env.capture.screenshot
                if scenario=='write_collision':(env.capture.directory/'00001.png').write_bytes(b'preexisting')
                if scenario=='receipt_collision':(env.capture.directory/'capture.json').write_bytes(b'preexisting receipt')
                if scenario=='final_failure':
                    frame=env.capture.frame
                    def failing_final(phase):
                        if phase=='recipe-final':
                            with patch.object(env.capture,'screenshot',side_effect=OSError('final capture failed')):return frame(phase)
                        return frame(phase)
                    context=patch.object(env.capture,'frame',failing_final)
                elif scenario=='screenshot_exception':context=patch.object(env.capture,'screenshot',side_effect=OSError('capture denied'))
                elif scenario=='empty_png':context=patch.object(env.capture,'screenshot',return_value=b'')
                elif scenario=='invalid_png':context=patch.object(env.capture,'screenshot',return_value=b'not PNG')
                else:context=contextlib.nullcontext()
                with context:log=R.run_recipe(str(recipe),url,verify_spec='text_contains:SAVED',marker='READY')
                add(scenario,log['result']=='RECIPE-EVIDENCE-FAIL' and log['capture']['passed'] is False and bool(log['capture']['errors']),execution=log)
            add(scenario+'_not_green',env.receipt['passed'] is False)
            if scenario=='receipt_collision':
                add('receipt_not_overwritten',(env.capture.directory/'capture.json').read_bytes()==b'preexisting receipt')
        with ER.Environment('recipe-exception',tmp,headless=True) as env,env.bind():
            with patch.object(R,'_run_recipe',side_effect=ValueError('test task exception')):
                try:R.run_recipe(str(recipe),url);raised=False
                except ValueError:raised=True
            add('recipe_exception_preserved',raised and env.capture.finished and (env.capture.directory/'capture.json').exists())
        with ER.Environment('previous-task-failure',tmp,headless=True) as env,env.bind():
            with patch.object(R,'_run_recipe',return_value=dict(result='RECIPE-FAIL earlier')):
                log=R.run_recipe(str(recipe),url)
            add('capture_does_not_erase_task_failure',log['result']=='RECIPE-FAIL earlier' and log['capture']['passed'] is True)
        for scenario in ('missing_file','tampered','empty_frames','wrong_run','forged_pass'):
            directory=tmp/('mutate-'+scenario);shutil.copytree(good_root,directory);report=copy.deepcopy(good_report)
            path=directory/report['frames'][0]['file']
            if scenario=='missing_file':path.unlink()
            elif scenario=='tampered':path.write_bytes(path.read_bytes()+b'bad')
            elif scenario=='empty_frames':report['frames']=[]
            elif scenario=='wrong_run':report['runId']='other'
            else:report['errors']=['capture failed'];report['passed']=True
            add('gate_'+scenario,bool(CE.verify_files(report,directory,'a006-cli')))
        report=copy.deepcopy(good_report);report['frames'][0]['file']='../escape.png'
        add('gate_path_escape',bool(CE.verify_files(report,good_root,'a006-cli')))
        # Fora do backend integrado, não inventar capture PASS.
        with patch.object(R,'_run_recipe',return_value=dict(result='RECIPE-DONE-VERIFIED')):
            legacy=R.run_recipe('unused',url)
        add('legacy_explicit_unavailable',legacy['capture']['passed'] is False and legacy['capture']['state']=='unavailable')
    except Exception as exc:add('unexpected_error',False,error=repr(exc),traceback=traceback.format_exc())
    finally:server.shutdown();server.server_close()
    after=fingerprint();add('sources_unchanged',before==after)
    data=dict(passed=sum(c['passed'] for c in cases),total=len(cases),cases=cases,sources_before=before,sources=after,sources_unchanged=before==after,
              scope='Chromium local headless, sem LLM/judge/Hermes; arquivos PNG são frames, não vídeo')
    ER.write_new(dest,data);print(json.dumps(dict(receipt=str(dest),passed=data['passed'],total=data['total'])))
    return 0 if data['passed']==data['total'] else 1


if __name__=='__main__':raise SystemExit(main())
