"""Casos de fronteira A001, Chromium real; recibo create-only."""
import argparse
import hashlib
import json
from pathlib import Path
import tempfile
from unittest.mock import Mock, patch

from playwright.sync_api import sync_playwright
import agent_loop as AL
import recipe as R
from test_semantic_target import HTML, condition


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--receipt',required=True)
    dest=Path(parser.parse_args().receipt)
    if dest.exists(): raise FileExistsError(dest)
    rows=[]
    with sync_playwright() as pw:
        browser=pw.chromium.launch(); page=browser.new_page()
        def transport(code,timeout=90):
            if code.startswith('goto_url('): return dict(out='',err='',rc=0)
            return dict(out=page.evaluate(json.loads(code[len('print(js('):-2])),err='',rc=0)
        with patch.object(AL,'harness',side_effect=transport),patch.object(R,'harness',side_effect=transport):
            for scenario in ('both_scopes','duplicate_id_scoped','labelledby','shadow_scope',
                             'ambiguity_during_wait','stale_during_wait','ambiguity_after_click',
                             'recipe_no_replay_no_repair_no_verifier','scope_missing_no_downgrade',
                             'predicate_missing_target_no_downgrade'):
                page.set_content(HTML);page.evaluate('window.hits=[]')
                action=dict(action='click',role='button',name='Salvar',scope=dict(id='right'),postcondition=condition())
                if scenario=='both_scopes':
                    left=dict(action,scope=dict(id='left'),postcondition=condition('left'))
                    result=AL.execute_batch([left,action])
                    passed=page.evaluate('window.hits')==['left','right'] and all(r['effect']['verified'] for r in result['results'])
                else:
                    if scenario=='duplicate_id_scoped':
                        page.evaluate("document.querySelectorAll('button').forEach(e=>e.id='same')")
                        action['id']='same'
                    if scenario=='labelledby':
                        page.evaluate("() => {document.body.insertAdjacentHTML('beforeend','<span id=label>Confirmar</span>');document.getElementById('save-right').setAttribute('aria-labelledby','label');}")
                        action['name']='Confirmar'
                    if scenario=='shadow_scope':
                        page.evaluate('''() => {
                          const h=document.createElement('div');document.body.append(h);
                          h.attachShadow({mode:'open'}).innerHTML=`<section id="nested"><button onclick="window.hits.push('shadow');document.getElementById('status').textContent='right'">Salvar</button></section>`;
                        }''')
                        action['scope']=dict(id='nested')
                    if scenario=='ambiguity_during_wait':
                        page.evaluate('''() => {
                          const b=document.getElementById('save-right');b.disabled=true;
                          setTimeout(()=>{const c=b.cloneNode(true);c.id='other';b.parentElement.append(c);b.disabled=false;},50);
                        }''')
                    if scenario=='stale_during_wait':
                        page.evaluate('''() => {
                          const b=document.getElementById('save-right');b.disabled=true;b.onclick=()=>{window.hits.push('right');};
                          setTimeout(()=>document.getElementById('status').textContent='right',50);
                          setTimeout(()=>b.disabled=false,100);
                        }''')
                    if scenario=='ambiguity_after_click':
                        page.evaluate('''() => {document.getElementById('save-right').onclick=()=>{
                          window.hits.push('right');setTimeout(()=>document.getElementById('status').insertAdjacentHTML('afterend','<output id=status>right</output>'),50);
                        };}''')
                    if scenario in ('recipe_no_replay_no_repair_no_verifier','scope_missing_no_downgrade','predicate_missing_target_no_downgrade'):
                        if scenario=='scope_missing_no_downgrade':
                            page.evaluate("document.getElementById('save-right').remove()")
                        elif scenario=='predicate_missing_target_no_downgrade':
                            action=dict(action='click',id='missing',postcondition=condition(),_expect_fail=True)
                        else:
                            page.evaluate('''() => {document.getElementById('save-right').onclick=()=>{window.hits.push('right');};}''')
                        dispatcher=Mock(side_effect=AssertionError('repair must not run'))
                        verifier=Mock(side_effect=AssertionError('verifier must not run'))
                        with tempfile.TemporaryDirectory() as tmp,patch.object(AL,'verify',verifier):
                            op=dict(action);op['op']=op.pop('action')
                            p=Path(tmp)/'recipe.json';p.write_text(json.dumps(dict(native_ops=[op])),encoding='utf-8')
                            result=R.run_recipe(str(p),'about:blank',verify_spec='persisted:unused',fallback_jev=True,repair_dispatcher=dispatcher)
                        passed=(len(result['steps'])==1 and page.evaluate('window.hits')==([] if scenario in ('scope_missing_no_downgrade','predicate_missing_target_no_downgrade') else ['right']) and
                                result['result'].startswith('RECIPE-FAIL') and not dispatcher.called and not verifier.called)
                    else:
                        result=AL.execute_batch([action,dict(action='assert_text',value='Salvar')])
                        hits=page.evaluate('window.hits')
                        if scenario=='ambiguity_during_wait':
                            passed=hits==[] and result.get('reason')=='identity invalid' and len(result['results'])==1
                        elif scenario in ('stale_during_wait','ambiguity_after_click'):
                            passed=hits==['right'] and result.get('reason')=='postcondition failed' and len(result['results'])==1
                        else:
                            passed=hits==(['shadow'] if scenario=='shadow_scope' else ['right']) and result['results'][0].get('effect',{}).get('verified') is True
                rows.append(dict(scenario=scenario,passed=bool(passed),result=result,hits=page.evaluate('window.hits')))
        version=browser.version;browser.close()
    data=dict(browser=version,passed=sum(r['passed'] for r in rows),total=len(rows),cases=rows,
              sources={n:hashlib.sha256(Path(__file__).with_name(n).read_bytes()).hexdigest() for n in ('agent_loop.py','recipe.py','test_semantic_target.py','test_semantic_boundaries.py')})
    with dest.open('x',encoding='utf-8') as f:json.dump(data,f,ensure_ascii=False,indent=2)
    print(json.dumps(dict(receipt=str(dest),passed=data['passed'],total=data['total'])))
    return 0 if data['passed']==data['total'] else 1


if __name__=='__main__':raise SystemExit(main())
