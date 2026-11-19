"""A005: controles sintéticos de callers/gate/preflight, sem judge privado."""
import argparse
import ast
import copy
import hashlib
import json
from pathlib import Path
import tempfile
import unicodedata
from unittest.mock import Mock, patch
import agent_loop as AL
import battery_pilot as BP
import recipe as R
import persisted_verifier as PV
from test_persisted_verifier import contract


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--receipt',required=True)
    dest=Path(parser.parse_args().receipt)
    if dest.exists():raise FileExistsError(dest)
    cases=[];url='http://127.0.0.1:8791/xt-web-form-01'
    state=dict(url=url,title='X-Testing',pageText='X-Testing',elements=[dict(idx=1,tag='button',id='go',text='Go',visible=True,role='')])
    for mode in ('single','batch'):
        for scenario in ('good','expected_negative','execution_error','executor_rc','initial_navigation',
                         'navigation','upload_rc','upload_message','host_exception','verifier_fail','snapshot_error','after_save_fail'):
            act=dict(action='click',id='go')
            if scenario=='navigation':act=dict(action='navigate',value=url)
            if scenario.startswith('upload') or scenario=='host_exception':act=dict(action='upload',id='upload',value='evidence.txt')
            if scenario=='after_save_fail':act=dict(action='click',id='save',label='Salvar')
            replies=iter([json.dumps([act] if mode=='batch' else act),json.dumps([dict(action='done')] if mode=='batch' else dict(action='done'))])
            calls=dict(nav=0)
            def harness(code,timeout=90):
                if code.startswith('print(js('):
                    row=dict(i=0,action=act['action'],ok=True);result=dict(results=[row],stopped_at=None)
                    if scenario=='execution_error':row.update(ok=False,error='action failed');result.update(stopped_at=0,reason='failure')
                    if scenario=='expected_negative':row.update(ok=False,error='expected negative',expected=True)
                    if act['action'] in ('navigate','upload'):
                        row.pop('ok');result.update(terminal=act['action'],stopped_at=0,url=url)
                        if act['action']=='upload':row['pending']=True
                    return dict(out=json.dumps(result),err='',rc=7 if scenario=='executor_rc' else 0)
                if code.startswith('goto_url('):
                    calls['nav']+=1
                    rc=7 if scenario=='initial_navigation' or (scenario=='navigation' and calls['nav']>1) else 0
                    return dict(out='',err='navigation failed' if rc else '',rc=rc)
                if 'upload_file(' in code:
                    if scenario=='host_exception':raise TimeoutError('host timeout')
                    return dict(out='upload-fail broken' if scenario=='upload_message' else 'upload-ok',err='',rc=7 if scenario=='upload_rc' else 0)
                return dict(out='',err='',rc=0)
            verifier=Mock(side_effect=['FAIL: mismatch','PASS'] if scenario in ('verifier_fail','after_save_fail') else ['PASS','PASS'])
            with patch.object(AL,'harness',side_effect=harness),patch.object(AL,'ask_model',side_effect=lambda *a,**k:next(replies)), \
                 patch.object(AL,'snapshot',side_effect=RuntimeError('snapshot failed') if scenario=='snapshot_error' else lambda:copy.deepcopy(state)), \
                 patch.object(AL,'verify',verifier),patch.object(AL,'human_pause'):
                kwargs=dict(url=url,goal='synthetic controls only',model='unused',max_steps=3,verify_spec='persisted_json:{}',record=False,engine='opencode')
                if mode=='batch':kwargs['max_cycles']=kwargs.pop('max_steps')
                log=AL.run_batch(**kwargs) if mode=='batch' else AL.run(**kwargs)
            success=scenario in ('good','expected_negative')
            passed=str(log.get('result','')).startswith('DONE-VERIFIED') if success else not str(log.get('result','')).startswith('DONE')
            if not success and scenario!='snapshot_error':passed &= bool(log.get('failures'))
            expected_calls=1 if success or scenario in ('verifier_fail','after_save_fail') else 0
            passed &= verifier.call_count==expected_calls
            cases.append(dict(mode=mode,scenario=scenario,passed=bool(passed),verifierCalls=verifier.call_count,log=log))
    # Recipe: falha anterior nao dispara um verifier que responderia PASS.
    with tempfile.TemporaryDirectory() as tmp:
        p=Path(tmp)/'r.json';p.write_text(json.dumps(dict(native_ops=[dict(op='click',id='go')])),encoding='utf-8')
        verifier=Mock(return_value='PASS')
        with patch.object(R,'harness',return_value=dict(out='',err='',rc=0)),patch.object(R,'snapshot',return_value=state), \
             patch.object(R,'execute_batch',return_value=dict(results=[dict(ok=False,error='prior failure')],reason='postcondition failed')),patch.object(AL,'verify',verifier):
            log=R.run_recipe(str(p),url,verify_spec='persisted_json:{}')
        cases.append(dict(scenario='recipe_prior_failure',passed=log['result'].startswith('RECIPE-FAIL') and not verifier.called,log=log))
    # Contract validation rejects omissions, duplicates and weak legacy fallback.
    cfg=contract(url)
    invalids=[dict(cfg,fields={}),dict(cfg,binding={}),dict(cfg,attachment={}),dict(cfg,version=True),dict(cfg,timeout_ms=-1)]
    for i,bad in enumerate(invalids):
        try:PV.load_contract(json.dumps(bad));passed=False
        except (ValueError,TypeError):passed=True
        cases.append(dict(scenario='invalid_contract_'+str(i),passed=passed))
    with patch.object(AL,'harness',side_effect=AssertionError('legacy must not navigate')):
        cases.append(dict(scenario='legacy_persisted_fails_closed',passed=AL.verify('persisted:title').startswith('FAIL')))
    log={}
    with patch.object(AL,'verify',side_effect=RuntimeError('technical verifier error')) as verifier:
        first=AL.verify_for_run('unused',log);second=AL.verify_for_run('unused',log)
        cases.append(dict(scenario='verifier_exception_sticky',passed=first.startswith('FAIL') and second.startswith('FAIL') and verifier.call_count==1,log=log))
    cases.append(dict(scenario='executor_boolean_rc_rejected',passed=AL.execution_failed(dict(ok=True,_rc=False))))
    try:PV.load_contract('{"version":1,"version":1}');passed=False
    except ValueError:passed=True
    cases.append(dict(scenario='duplicate_contract_keys_rejected',passed=passed))
    # Gate independently still requires judge identity, pass_ and all eleven checks.
    ops=[dict(op='click',id='go') for _ in range(21)]+[dict(op='upload',id='upload',value='fixture-evidence.txt')]
    execution=dict(url=url,result='RECIPE-DONE-VERIFIED',verifier='PASS',identity=dict(url=url,markerOk=True),steps=[])
    for i,op in enumerate(ops):
        action=BP.normalized_op(op);row=dict(i=0,action=action['action'],ok=True);ex=dict(results=[row],stopped_at=None)
        step=dict(i=i,op=action,exec=ex)
        if i==21:
            row.pop('ok');row['pending']=True;ex.update(terminal='upload',stopped_at=0)
            step['upload']='upload-ok ATT=Anexado: fixture-evidence.txt · 32 bytes'
        execution['steps'].append(step)
    judge=dict(runId='synthetic',pass_=True,checks={k:True for k in BP.CHECKS})
    audit=[dict(phase='initial_navigation',rc=0)]
    variants=[('judge_complete',judge,True),('judge_missing',{},False),('judge_wrong_run',dict(judge,runId='other'),False),('judge_failed',dict(judge,pass_=False),False)]
    variants += [('judge_check_'+key,dict(judge,checks=dict(judge['checks'],**{key:False})),False) for key in BP.CHECKS]
    for name,j,expected in variants:
        result=BP.gate('synthetic',execution,j,dict(native_ops=ops),audit)
        cases.append(dict(scenario=name,passed=result['passed'] is expected,result=result))
    # Public recipe input copied to temporary, never rewriting original evidence.
    original=Path(__file__).resolve().parents[1]/'evidence/v26/results/recipes/xt24ds7-recipe.json'
    ops_public=json.loads(original.read_text(encoding='utf-8'))['native_ops']
    expected=json.loads(BP.verifier_spec('public-test',url).partition(':')[2])
    norm=lambda value:''.join(c for c in unicodedata.normalize('NFD',value.casefold()) if unicodedata.category(c)!='Mn')
    mapping=dict(email='email',type='type',priority='priority',responsible='responsible',environment='environment',title='title2')
    source_values={k:next(o['value'] for o in reversed(ops_public) if o.get('id')==op_id and o.get('op') in ('type','select')) for k,op_id in mapping.items()}
    public_file=BP.BENCHMARK/'fixtures/fixture-evidence.txt';public_bytes=public_file.read_bytes()
    cases.append(dict(scenario='battery_contract_matches_public_inputs',passed=all(norm(expected['fields'][k])==norm(v) for k,v in source_values.items()) and
                      expected['attachment']['bytes']==len(public_bytes) and expected['attachment']['sha256']==hashlib.sha256(public_bytes).hexdigest(),
                      publicRecipeSha256=hashlib.sha256(original.read_bytes()).hexdigest(),publicAttachmentSha256=hashlib.sha256(public_bytes).hexdigest(),source_values=source_values))
    with tempfile.TemporaryDirectory() as tmp:
        frozen=Path(tmp)/'recipe.json';frozen.write_bytes(original.read_bytes().replace(b'\r\n',b'\n'))
        preflight=BP.preflight(frozen)
        snippets=preflight['generated']['javascript']
        cases.append(dict(scenario='preflight_real_verifier_snippets',passed=preflight['passed'] and any('UB2_PERSIST_OBSERVE' in s for s in snippets),
                          javascriptCompiled=preflight['javascriptCompiled'],pythonCompiled=preflight['pythonCompiled']))
    sources={n:hashlib.sha256(Path(__file__).with_name(n).read_bytes()).hexdigest() for n in ('agent_loop.py','recipe.py','battery_pilot.py','persisted_verifier.py','test_persisted_guards.py')}
    data=dict(passed=sum(bool(c['passed']) for c in cases),total=len(cases),sources=sources,cases=cases,note='Synthetic caller/gate/preflight controls, not benchmark/judge execution')
    with dest.open('x',encoding='utf-8',newline='\n') as f:json.dump(data,f,ensure_ascii=False,indent=2);f.write('\n')
    print(json.dumps(dict(receipt=str(dest),passed=data['passed'],total=data['total'])))
    return 0 if data['passed']==data['total'] else 1


if __name__=='__main__':raise SystemExit(main())
