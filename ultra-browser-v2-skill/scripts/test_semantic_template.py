"""A001: equivalencia real de nomes/escapes nos adapters. Recibos imutaveis."""
import argparse
import hashlib
import json
from pathlib import Path
from unittest.mock import patch
from playwright.sync_api import sync_playwright
import agent_loop as AL
import recipe as R
from test_semantic_target import HTML, condition


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--receipt',required=True)
    dest=Path(parser.parse_args().receipt)
    if dest.exists():raise FileExistsError(dest)
    cases=[]
    with sync_playwright() as pw:
        browser=pw.chromium.launch();page=browser.new_page()
        def transport(code,timeout=90):
            return dict(out=page.evaluate(json.loads(code[len('print(js('):-2])),err='',rc=0)
        with patch.object(AL,'harness',side_effect=transport),patch.object(R,'harness',side_effect=transport):
            for mode in ('single','batch','recipe'):
                for scenario in ('spaces','labelledby_multiple'):
                    page.set_content(HTML);page.evaluate('window.hits=[]')
                    if scenario=='spaces':
                        page.evaluate("document.getElementById('save-right').textContent='Salvar agora'")
                        name='  SALVAR   agora '
                    else:
                        page.evaluate('''() => {
                          document.body.insertAdjacentHTML('beforeend','<span id=first>Salvar</span><span id=second>agora</span>');
                          document.getElementById('save-right').setAttribute('aria-labelledby','first second');
                        }''')
                        name='Salvar agora'
                    act=dict(action='click',scope=dict(id='right'),role='button',name=name,
                             postcondition=condition(),_expect_fail=True)
                    result=(dict(results=[json.loads(AL.execute(act))]) if mode=='single' else
                            (R if mode=='recipe' else AL).execute_batch([act]))
                    row=result['results'][0]
                    passed=page.evaluate('window.hits')==['right'] and row.get('effect',{}).get('verified') is True
                    cases.append(dict(mode=mode,scenario=scenario,passed=passed,result=result))
        browser.close()
    data=dict(template_equal=AL.BATCH_JS_TEMPLATE==R.BATCH_JS_TEMPLATE,
              passed=sum(c['passed'] for c in cases),total=len(cases),cases=cases,
              sources={n:hashlib.sha256(Path(__file__).with_name(n).read_bytes()).hexdigest()
                       for n in ('agent_loop.py','recipe.py','test_semantic_template.py')})
    with dest.open('x',encoding='utf-8') as f:json.dump(data,f,ensure_ascii=False,indent=2)
    print(json.dumps(dict(receipt=str(dest),passed=data['passed'],total=data['total'],template_equal=data['template_equal'])))
    return 0 if data['passed']==data['total'] and data['template_equal'] else 1


if __name__=='__main__':raise SystemExit(main())
