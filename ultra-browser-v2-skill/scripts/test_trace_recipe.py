"""A008: loops reais com decisões fixas, CLI extract e replay local Chromium."""
import argparse
import copy
import hashlib
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import threading
import traceback
from unittest.mock import patch
import agent_loop as AL
import environment_runner as ER
import recipe as R


def main():
    ap=argparse.ArgumentParser();ap.add_argument('--receipt',required=True);args=ap.parse_args();dest=Path(args.receipt)
    if dest.exists():raise FileExistsError(dest)
    names=('trace_recipe.py','recipe.py','agent_loop.py','test_trace_recipe.py')
    fingerprint=lambda:{n:hashlib.sha256(Path(__file__).with_name(n).read_bytes()).hexdigest() for n in names}
    before=fingerprint();cases=[];tmp=Path(tempfile.mkdtemp(prefix='a008-'))
    artifacts=dest.parent/(dest.stem+'-inputs');artifacts.mkdir(exist_ok=False)
    def add(name,passed,**detail):cases.append(dict(name=name,passed=bool(passed),**detail))
    class Handler(BaseHTTPRequestHandler):
        def log_message(self,*args):pass
        def do_GET(self):
            self.send_response(200);self.send_header('Content-Type','text/html');self.end_headers()
            self.wfile.write(b'''<html><body><h1>READY A008</h1><input id="name"><select id="kind"><option>A</option><option>B</option></select><section id="scope"><button id="save" onclick="localStorage.setItem('saved',JSON.stringify({name:document.getElementById('name').value,kind:document.getElementById('kind').value}))">Save: draft</button></section><button id="disabled" disabled>Blocked</button></body></html>''')
    server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start()
    url=f'http://127.0.0.1:{server.server_port}/'
    actions=[dict(action='type',id='name',value='A008'),dict(action='select',id='kind',value='B'),
             dict(action='click',id='save',label='Save: draft',scope=dict(id='scope'),role='button'),
             dict(action='wait',value='0'),dict(action='navigate',value=url+'next')]
    try:
        recipes={}
        for mode in ('single','batch'):
            replies=([json.dumps(a) for a in actions]+[json.dumps(dict(action='done'))] if mode=='single' else
                     [json.dumps(actions[:4]+[dict(action='click',id='NEVER')]),json.dumps(actions[4:]+[dict(action='click',id='NEVER')]),json.dumps([dict(action='done')])])
            iterator=iter(replies)
            with ER.Environment('producer-'+mode,tmp,headless=True) as env,env.bind(),patch.object(AL,'ask_model',side_effect=lambda *a,**k:next(iterator)),patch.object(AL,'human_pause',lambda:None):
                kwargs=dict(url=url,goal='record deterministic public actions',model='no-provider-called',verify_spec='text_contains:READY',record=False,engine='opencode')
                trace=AL.run(max_steps=8,**kwargs) if mode=='single' else AL.run_batch(max_cycles=5,**kwargs)
                saved=env.page.evaluate("JSON.parse(localStorage.getItem('saved'))")
            add('real_producer_'+mode,'DONE-VERIFIED' in str(trace['result']) and saved==dict(name='A008',kind='B'),trace=trace)
            source=artifacts/('observed-'+mode+'.json');ER.write_new(source,trace)
            process=subprocess.run([sys.executable,'-B',R.__file__,'extract',str(source)],capture_output=True,text=True,encoding='utf-8',timeout=20)
            candidate=json.loads(process.stdout);recipes[mode]=candidate
            ER.write_new(artifacts/('recipe-'+mode+'.json'),candidate)
            add('normal_extract_CLI_'+mode,process.returncode==0 and len(candidate['native_ops'])==len(actions),candidate=candidate,stderr=process.stderr)
            add('provenance_'+mode,candidate['provenance']['source']['sha256']==hashlib.sha256(source.read_bytes()).hexdigest() and
                candidate['provenance']['source']['format']==mode and len(candidate['provenance']['operations'])==5)
            add('verification_separate_'+mode,bool(candidate['verification']['observations']) and all(op['op'] not in ('done','assert_text','verify') for op in candidate['native_ops']))
            with ER.Environment('replay-'+mode,tmp,headless=True) as env,env.bind():
                replay=R.run_recipe(str(artifacts/('recipe-'+mode+'.json')),url,verify_spec='text_contains:READY',marker='READY')
                saved=env.page.evaluate("JSON.parse(localStorage.getItem('saved'))")
            add('normal_replay_'+mode,replay['result']=='RECIPE-DONE-VERIFIED' and saved==dict(name='A008',kind='B'),result=replay)
        add('single_batch_equivalent',recipes['single']['native_ops']==recipes['batch']['native_ops'])
        add('colon_scope_role_preserved',recipes['single']['native_ops'][2]==dict(op='click',id='save',label='Save: draft',scope=dict(id='scope'),role='button'))
        add('unexecuted_suffix_excluded',all(op.get('id')!='NEVER' for op in recipes['batch']['native_ops']) and any('suffix' in e['reason'] for e in recipes['batch']['provenance']['excluded']))
        # Sintéticos de fronteira, explicitamente separados da prova Chromium.
        act=dict(action='type',id='name',value='X')
        def extract(document,name):
            p=tmp/(name+'.json');ER.write_new(p,document);return R.extract_recipe(str(p))
        base=dict(steps=[dict(parsed=act,exec=dict(i=0,action='type',ok=True,_rc=0))])
        for name,change in [
            ('rc_failed',lambda d:d['steps'][0]['exec'].update(_rc=7)),
            ('no_exec',lambda d:d['steps'][0].pop('exec')),
            ('failed',lambda d:d['steps'][0]['exec'].update(ok=False)),
            ('mismatch',lambda d:d['steps'][0]['exec'].update(action='click')),
            ('bad_index',lambda d:d['steps'][0]['exec'].update(i=1)),
            ('missing_identity',lambda d:(d['steps'][0]['parsed'].pop('id'),d['steps'][0]['parsed'].update(element=3))),
            ('invalid_exec_json',lambda d:d['steps'][0].update(exec='{broken'))]:
            doc=copy.deepcopy(base);change(doc);candidate=extract(doc,name)
            add('synthetic_'+name,not candidate['native_ops'] and bool(candidate['provenance']['excluded']))
        for action in ('upload','navigate','reload','wait'):
            row=dict(i=0,action=action,pending=True);planned=dict(action=action,id='file',value='input.txt' if action=='upload' else url)
            terminal=dict(terminal=action,results=[row],stopped_at=0,_rc=0,file='input.txt')
            doc=dict(mode='batch',cycles=[dict(plan=[planned],exec=terminal)])
            add('terminal_pending_'+action,not extract(doc,'pending-'+action)['native_ops'])
            doc['cycles'][0].update(host=dict(action=action,completed=True,rc=0,url=url),upload='upload-ok')
            add('terminal_confirmed_'+action,len(extract(doc,'confirmed-'+action)['native_ops'])==1)
        negative=dict(mode='batch',cycles=[dict(plan=[dict(action='expect_blocked'),dict(action='click',id='disabled'),dict(action='assert_text',value='error')],
             exec=dict(results=[dict(i=0,action='expect_blocked'),dict(i=1,action='click',blocked=True,expected=True),dict(i=2,action='assert_text',ok=True)],stopped_at=None,_rc=0))])
        got=extract(negative,'negative')
        add('expected_negative_preserved',got['native_ops']==[dict(op='click',id='disabled',_expect_fail=True)] and len(got['verification']['observations'])==2)
        negative_path=artifacts/'recipe-negative.json';ER.write_new(negative_path,got)
        with ER.Environment('replay-negative',tmp,headless=True) as env,env.bind():
            negative_replay=R.run_recipe(str(negative_path),url,verify_spec='text_contains:READY')
        add('expected_negative_replay',negative_replay['result']=='RECIPE-DONE-VERIFIED' and any(p['kind']=='expected_blocked' for p in negative_replay['postconditions']),result=negative_replay)
        absent=copy.deepcopy(base);absent['steps'][0]['parsed']=dict(action='click',id='absent',_expect_fail=True)
        absent['steps'][0]['exec']=json.dumps(dict(i=0,error='element not found (waited)',expected=True,_rc=0))
        add('expected_absence_extracted',extract(absent,'absence')['native_ops']==[dict(op='click',id='absent',_expect_fail=True)])
        tag=copy.deepcopy(base);tag['steps'][0]['parsed']=dict(action='click',tag='button');tag['steps'][0]['exec'].update(action='click',id='save')
        add('tag_only_preserved',extract(tag,'tag')['native_ops']==[dict(op='click',tag='button')])
        def pointer(obj,path):
            for part in path.strip('/').split('/') if path else []:obj=obj[int(part)] if isinstance(obj,list) else obj[part]
            return obj
        for mode in ('single','batch'):
            doc=json.loads((artifacts/('observed-'+mode+'.json')).read_text())
            valid=True
            for p in recipes[mode]['provenance']['operations']:
                raw=pointer(doc,p['execution_source']);decoded=json.loads(raw) if p['execution_encoding']=='json-string' else raw
                valid=valid and isinstance(pointer(decoded,p['execution_pointer']),dict)
            add('provenance_pointers_resolve_'+mode,valid)
        nested=dict(action='click',scope=dict(selector='[id=scope]'),id='save')
        add('nested_runtime_parsers',AL.parse_action(json.dumps(nested))==nested and AL.parse_plan(json.dumps([nested]))==[nested])
        for name,doc in [('mixed',dict(steps=base['steps'],cycles=[dict(plan=[])])),('duplicate_json','{"steps":[],"steps":[]}')]:
            p=tmp/(name+'.json');p.write_text(doc if isinstance(doc,str) else json.dumps(doc))
            try:R.extract_recipe(str(p));rejected=False
            except ValueError:rejected=True
            add('reject_'+name,rejected)
    except Exception as exc:add('unexpected_error',False,error=repr(exc),traceback=traceback.format_exc())
    finally:server.shutdown();server.server_close()
    after=fingerprint();add('sources_unchanged',before==after)
    data=dict(passed=sum(c['passed'] for c in cases),total=len(cases),cases=cases,sources_before=before,sources=after,sources_unchanged=before==after,
              scope='loops/Chromium/CLI/replay reais; decisões determinísticas substituem somente LLM; casos sintéticos rotulados; sem judge/provider')
    ER.write_new(dest,data);print(json.dumps(dict(receipt=str(dest),passed=data['passed'],total=data['total'])))
    return 0 if data['passed']==data['total'] else 1


if __name__=='__main__':raise SystemExit(main())
