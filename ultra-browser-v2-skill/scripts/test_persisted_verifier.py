"""A005: Chromium + HTTP públicos locais; sem judge ou inferência.

python -B scripts/test_persisted_verifier.py --receipt <novo.json> [--baseline]
"""
import argparse
import copy
import hashlib
import html
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import io
import json
from pathlib import Path
import threading
import time
import contextlib
import tempfile
from unittest.mock import patch
from playwright.sync_api import sync_playwright
import agent_loop as AL
import recipe as R

FILE = b'A005 public attachment\n'


def contract(url):
    return dict(version=1, url=url, timeout_ms=300, fields=dict(id='PLAN-001',runId='a005-test',
        title='Plano completo revisado',email='qa@example.test',type='Integração',
        priority='Alta',responsible='Equipe Alfa',requiresEnvironment='true',environment='Homologação sintética'),
        binding=dict(demand='DEMO-024'),attachment=dict(filename='evidence.txt',bytes=len(FILE),
        sha256=hashlib.sha256(FILE).hexdigest(),href='/api/attachment',download='evidence.txt'))


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--receipt',required=True);parser.add_argument('--baseline',action='store_true')
    args=parser.parse_args();dest=Path(args.receipt)
    if dest.exists():raise FileExistsError(dest)
    source_hash=hashlib.sha256(Path(AL.__file__).read_bytes()).hexdigest()
    control=dict(loads=0,scenario='good',cfg=None,downloads=0)
    class Handler(BaseHTTPRequestHandler):
        def log_message(self,*args):pass
        def do_GET(self):
            cfg=control['cfg'];s=control['scenario']
            if self.path=='/favicon.ico':self.send_response(204);self.end_headers();return
            if self.path=='/api/attachment':
                control['downloads']+=1;data=FILE if s!='download_content' else FILE+b'changed'
                if s=='download_same_size':data=bytes([FILE[0]^1])+FILE[1:]
                status=503 if s=='download_http_error' else 200
                self.send_response(status);self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data);return
            control['loads']+=1
            fields=copy.deepcopy(cfg['fields']);fields.update(cfg['binding'])
            metadata={k:cfg['attachment'][k] for k in ('filename','bytes','sha256')}
            if s.startswith('field:'):fields[s[6:]]+='-wrong'
            if s=='binding':fields['demand']='DEMO-025'
            if s.startswith('attachment:'):
                key=s.split(':',1)[1];metadata[key]=metadata[key]+1 if key=='bytes' else metadata[key]+'bad'
            if s=='attachment_extra':metadata['unexpected']='extra'
            if s=='attachment_bytes_type':metadata['bytes']=str(metadata['bytes'])
            if s=='attachment_missing_sha':metadata.pop('sha256')
            fields['attachment']=json.dumps(metadata,ensure_ascii=False)
            if s=='missing_field':fields.pop('email')
            if s=='extra_field':fields['unexpected']='extra'
            pairs=''.join('<dt>'+html.escape(k)+'</dt><dd>'+html.escape(str(v))+'</dd>' for k,v in fields.items())
            if s=='duplicate_field':pairs+='<dt>email</dt><dd>qa@example.test</dd>'
            if s=='orphan_dd':pairs+='<dd>unmapped field</dd>'
            dl='<dl>'+pairs+'</dl>'
            if s=='duplicate_record':dl+=dl
            if s=='missing_record':dl=''
            href=cfg['attachment']['href'] if s!='link_href' else '/wrong'
            if s=='external_link':href='https://invalid.example/attachment'
            download=cfg['attachment']['download'] if s!='link_download' else 'wrong.txt'
            link='<a href="'+html.escape(href)+'" download="'+download+'">Abrir anexo persistido</a>'
            if s=='duplicate_link':link+=link
            if s=='missing_link':link=''
            body=('<!doctype html><html><body><h1>'+cfg['fields']['title']+'</h1><div id="saved">'+dl+link+'</div></body></html>').encode()
            self.send_response(200);self.send_header('Content-Type','text/html; charset=utf-8');self.send_header('Cache-Control','no-store');self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body)
    server=ThreadingHTTPServer(('127.0.0.1',0),Handler)
    thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
    cfg=contract(f'http://127.0.0.1:{server.server_port}/');control['cfg']=cfg
    cases=[]
    try:
        with sync_playwright() as pw:
            browser=pw.chromium.launch();page=browser.new_page()
            def js(expr):
                if 'UB2_RELOAD_REQUEST' in expr:
                    page.reload(wait_until='load');return dict(requested=True)
                return page.evaluate(expr)
            def transport(code,timeout=90):
                if control['scenario']=='reload_not_done' and 'UB2_RELOAD_REQUEST' in code:
                    return dict(out='UB2VERIFY {"requested":true}',err='',rc=0)
                stream=io.StringIO()
                try:
                    with contextlib.redirect_stdout(stream):exec(code,dict(js=js,goto_url=lambda url:page.goto(url),maximize=lambda:None))
                    result=dict(out=stream.getvalue(),err='',rc=0)
                except Exception as exc:return dict(out=stream.getvalue(),err=str(exc),rc=1)
                if control['scenario']=='rc_nonzero':result.update(rc=7,err='PASS transport error')
                if control['scenario']=='malformed':result['out']='UB2VERIFY {bad PASS}'
                if control['scenario']=='duplicate_payload':result['out']+=result['out']
                return result
            scenarios=['good']+['field:'+k for k in cfg['fields']]+['binding','attachment:filename','attachment:bytes','attachment:sha256',
                       'link_href','link_download','download_content','download_http_error','missing_field','extra_field',
                       'duplicate_field','duplicate_record','missing_record','duplicate_link','missing_link','external_link',
                       'reload_not_done','rc_nonzero','malformed','duplicate_payload','download_same_size',
                       'attachment_extra','attachment_bytes_type','attachment_missing_sha','orphan_dd','good_no_environment','wrong_url']
            original_sleep=time.sleep
            for scenario in scenarios:
                cfg=contract(f'http://127.0.0.1:{server.server_port}/');control['cfg']=cfg
                if scenario=='good_no_environment':cfg['fields'].update(requiresEnvironment='false',environment='')
                control['scenario']='good';page.goto(cfg['url']);control['scenario']=scenario
                if scenario=='wrong_url':cfg=copy.deepcopy(cfg);cfg['url']+='different'
                count=control['loads'];downloads=control['downloads'];detail={}
                spec=('persisted:'+cfg['fields']['title'] if args.baseline else 'persisted_json:'+json.dumps(cfg,ensure_ascii=False))
                with patch.object(AL,'harness',side_effect=transport):
                    if args.baseline:
                        with patch('time.sleep',side_effect=lambda duration:original_sleep(min(duration,.05))):result=AL.verify(spec)
                    else:result=AL.verify(spec,details=detail)
                good=scenario in ('good','good_no_environment')
                passed=(result=='PASS')==good
                if not args.baseline and good:passed &= control['loads']>count and control['downloads']>downloads and detail.get('passed') is True
                cases.append(dict(scenario=scenario,passed=bool(passed),verdict=result,details=detail,reloads=control['loads']-count,downloads=control['downloads']-downloads))
            if not args.baseline:
                for mode in ('recipe-cli','single','batch'):
                    for good in (True,False):
                        cfg=contract(f'http://127.0.0.1:{server.server_port}/');control['cfg']=cfg
                        control['scenario']='good' if good else 'field:email'
                        spec='persisted_json:'+json.dumps(cfg,ensure_ascii=False)
                        with patch.object(AL,'harness',side_effect=transport),patch.object(R,'harness',side_effect=transport), \
                             patch.object(AL,'ask_model',return_value=json.dumps([dict(action='done')] if mode=='batch' else dict(action='done'))):
                            if mode=='recipe-cli':
                                with tempfile.TemporaryDirectory() as tmp:
                                    p=Path(tmp)/'empty.json';p.write_text('{"native_ops":[]}',encoding='utf-8')
                                    out=io.StringIO()
                                    with patch.object(R.sys,'argv',['recipe.py','run',str(p),'--url',cfg['url'],'--verify',spec]),contextlib.redirect_stdout(out):
                                        try:R.main();rc=0
                                        except SystemExit as exc:rc=exc.code
                                    log=json.loads(out.getvalue())
                                    passed=(rc==0)==good and bool(log.get('verification_detail',{}).get('passed'))==good
                            else:
                                kwargs=dict(url=cfg['url'],goal='Verify existing public fixture record',model='unused',verify_spec=spec,record=False,engine='opencode')
                                log=AL.run_batch(max_cycles=1,**kwargs) if mode=='batch' else AL.run(max_steps=1,**kwargs)
                                passed=str(log.get('result')).startswith('DONE-VERIFIED')==good
                                if not good:passed &= bool(log.get('failures'))
                        cases.append(dict(scenario='normal_entry_'+mode+'_'+('good' if good else 'mismatch'),passed=bool(passed),log=log))
            version=browser.version;browser.close()
    finally:server.shutdown();server.server_close();thread.join(timeout=2)
    sources=dict(agent_loop=source_hash,recipe=hashlib.sha256(Path(R.__file__).read_bytes()).hexdigest(),test=hashlib.sha256(Path(__file__).read_bytes()).hexdigest())
    module=Path(__file__).with_name('persisted_verifier.py')
    if module.exists():sources['persisted_verifier']=hashlib.sha256(module.read_bytes()).hexdigest()
    data=dict(item='A005',baseline=args.baseline,passed=sum(c['passed'] for c in cases),total=len(cases),browser=version,sources=sources,cases=cases,
              transport='Production verifier adapter over page.evaluate; reload request mapped to real page.reload. Not Hermes transport.')
    with dest.open('x',encoding='utf-8',newline='\n') as f:json.dump(data,f,ensure_ascii=False,indent=2);f.write('\n')
    print(json.dumps(dict(receipt=str(dest),passed=data['passed'],total=data['total'])))
    return 0 if data['passed']==data['total'] else 1


if __name__=='__main__':raise SystemExit(main())
