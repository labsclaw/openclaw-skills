"""A001: python -B scripts/test_semantic_target.py --receipt <arquivo-novo.json>.

Chromium real; adapters de produção, substituindo apenas o transporte Hermes.
Sem inferência, judge ou navegação externa. Recibos create-only.
"""
import argparse
import hashlib
import json
from pathlib import Path
import tempfile
import time
from unittest.mock import patch

from playwright.sync_api import sync_playwright
import agent_loop as AL
import recipe as R


HTML = '''<section id="left" role="region" aria-label="Origem">
<button id="save-left" onclick="window.hits.push('left'); setTimeout(()=>document.getElementById('status').textContent='left',50)">Salvar</button></section>
<section id="right" role="region" aria-label="Destino">
<button id="save-right" onclick="window.hits.push('right'); setTimeout(()=>document.getElementById('status').textContent='right',50)">Salvar</button></section>
<output id="status">idle</output>'''


def condition(value='right'):
    return dict(target=dict(id='status'), property='text', equals=value, timeout_ms=300)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--receipt', required=True)
    dest = Path(parser.parse_args().receipt)
    if dest.exists():
        raise FileExistsError(dest)
    cases = []
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        page = browser.new_page()

        def transport(code, timeout=90):
            if code.startswith('goto_url('):
                return dict(out='', err='', rc=0)
            js = json.loads(code[len('print(js('):-2])
            return dict(out=page.evaluate(js), err='', rc=0)

        def invoke(mode, acts):
            with patch.object(AL, 'harness', side_effect=transport), \
                    patch.object(R, 'harness', side_effect=transport):
                if mode == 'single':
                    return dict(results=[json.loads(AL.execute(acts[0]))])
                if mode == 'recipe-run':
                    with tempfile.TemporaryDirectory() as tmp:
                        file = Path(tmp)/'recipe.json'
                        ops = [dict(op=a['action'], **{k:v for k,v in a.items() if k!='action'}) for a in acts]
                        file.write_text(json.dumps(dict(native_ops=ops)), encoding='utf-8')
                        return R.run_recipe(str(file), 'about:blank', max_replan=0)
                return (R if mode == 'recipe-adapter' else AL).execute_batch(acts)

        for mode in ('single', 'batch', 'recipe-adapter', 'recipe-run'):
            for scenario in ('scope_id', 'scope_semantic', 'scope_missing', 'scope_ambiguous',
                             'global_ambiguous', 'local_ambiguous', 'hidden_duplicate',
                             'id_label_conflict', 'wrong_role', 'exact_not_partial',
                             'effect_wrong', 'effect_stale', 'effect_async', 'effect_missing',
                             'effect_ambiguous', 'legacy_dispatch_unverified', 'aria_name',
                             'labelled_control', 'bad_scope', 'bad_postcondition'):
                page.set_content(HTML)
                page.evaluate('window.hits=[]')
                act = dict(action='click', name='Salvar', role='button', scope=dict(id='right'),
                           postcondition=condition(), _expect_fail=True)
                expected_hits = ['right']
                expect_success = scenario in ('scope_id', 'scope_semantic', 'effect_async', 'aria_name', 'labelled_control')
                if scenario == 'scope_semantic': act['scope'] = dict(role='region', name='Destino')
                if scenario == 'scope_missing': act['scope'] = dict(id='missing')
                if scenario == 'scope_ambiguous':
                    act['scope'] = dict(role='region')
                if scenario == 'global_ambiguous':
                    act.pop('scope'); act['element'] = 1
                if scenario in ('local_ambiguous', 'hidden_duplicate'):
                    page.evaluate('''hidden => {
                      const copy=document.getElementById('save-right').cloneNode(true);
                      copy.id='other'; if(hidden) copy.style.display='none';
                      document.getElementById('right').append(copy);
                    }''', scenario == 'hidden_duplicate')
                if scenario == 'id_label_conflict':
                    act.update(id='save-right', label='Excluir'); act.pop('name')
                if scenario == 'wrong_role': act['role']='link'
                if scenario == 'exact_not_partial': act['name']='Sal'
                if scenario == 'effect_wrong': act['postcondition']=condition('wrong')
                if scenario == 'effect_stale':
                    page.evaluate("document.getElementById('status').textContent='right'")
                if scenario == 'effect_missing':
                    page.evaluate("() => {document.getElementById('save-right').onclick=()=>window.hits.push('right');}")
                if scenario == 'effect_ambiguous':
                    page.evaluate("document.getElementById('status').insertAdjacentHTML('afterend','<output id=status>idle</output>')")
                if scenario == 'legacy_dispatch_unverified':
                    act=dict(action='click', id='save-right')
                if scenario == 'aria_name':
                    page.evaluate("document.getElementById('save-right').setAttribute('aria-label','Confirmar')")
                    act['name']='Confirmar'
                if scenario == 'labelled_control':
                    page.evaluate("document.getElementById('right').innerHTML='<label for=field>Nome</label><input id=field>'")
                    act=dict(action='type', scope=dict(id='right'), role='textbox', name='Nome', value='Oi',
                             postcondition=dict(target=dict(id='field'), property='value', equals='Oi', timeout_ms=300))
                    expected_hits=[]
                if scenario == 'bad_scope': act['scope']={}
                if scenario == 'bad_postcondition': act['postcondition']=dict(property='javascript')
                tick=time.monotonic()
                result=invoke(mode, [act] if mode=='single' else [act, dict(action='assert_text',value='Salvar')])
                if mode == 'recipe-run':
                    first=(result.get('steps') or [{}])[0].get('exec',{}).get('results',[{}])[0]
                else: first=(result.get('results') or [{}])[0]
                hits=page.evaluate('window.hits')
                effect=first.get('effect') or {}
                if scenario == 'legacy_dispatch_unverified':
                    passed=hits==['right'] and effect.get('verified') is False
                elif expect_success:
                    passed=hits==expected_hits and first.get('ok') is True and effect.get('verified') is True
                elif scenario in ('effect_wrong','effect_stale','effect_missing'):
                    passed=hits==['right'] and first.get('ok') is False and effect.get('verified') is False
                    if mode=='recipe-run':
                        passed &= len(result['steps'])==1 and result['result'].startswith('RECIPE-FAIL')
                    elif mode!='single':
                        passed &= result.get('stopped_at')==0 and len(result['results'])==1
                else:
                    passed=hits==[] and bool(first.get('error'))
                cases.append(dict(mode=mode,scenario=scenario,passed=bool(passed),hits=hits,
                                  elapsed_ms=round((time.monotonic()-tick)*1000,2),result=result))
        version=browser.version
        browser.close()
    data=dict(item='A001',browser=version,transport='Playwright page.evaluate; navigation stub for run_recipe',
              sources={name:hashlib.sha256(Path(__file__).with_name(name).read_bytes()).hexdigest()
                       for name in ('agent_loop.py','recipe.py','test_semantic_target.py')},
              passed=sum(c['passed'] for c in cases),total=len(cases),cases=cases)
    with dest.open('x',encoding='utf-8') as f: json.dump(data,f,ensure_ascii=False,indent=2)
    print(json.dumps(dict(receipt=str(dest),passed=data['passed'],total=data['total'])))
    return 0 if data['passed']==data['total'] else 1


if __name__=='__main__':
    raise SystemExit(main())
