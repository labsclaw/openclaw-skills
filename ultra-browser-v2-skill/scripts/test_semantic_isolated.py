"""Reexecuta o teste A001 imutavel com documento novo entre cenarios.

set_content reutiliza Window/timers; goto about:blank elimina callbacks antigos.
"""
import argparse
import hashlib
import json
from pathlib import Path
import sys
import tempfile
from unittest.mock import patch
from playwright.sync_api import Page, sync_playwright
import test_semantic_target as original


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--receipt',required=True)
    dest=Path(parser.parse_args().receipt)
    if dest.exists():raise FileExistsError(dest)
    with sync_playwright() as pw:
        browser=pw.chromium.launch();page=browser.new_page()
        page.set_content('<output id=status>first</output>')
        page.evaluate("setTimeout(()=>document.getElementById('status').textContent='leaked',100)")
        page.set_content('<output id=status>idle</output>');page.wait_for_timeout(180)
        reused=page.locator('#status').text_content()
        page.evaluate("setTimeout(()=>document.getElementById('status').textContent='leaked',100)")
        page.goto('about:blank');page.set_content('<output id=status>idle</output>');page.wait_for_timeout(180)
        fresh=page.locator('#status').text_content();browser.close()
    reproducer=dict(reused_window_value=reused,new_document_value=fresh,confirmed=reused=='leaked' and fresh=='idle')
    native=Page.set_content
    def isolated(self,*args,**kwargs):
        self.goto('about:blank')
        assert self.evaluate("typeof window.hits === 'undefined'"),'old window survived navigation'
        return native(self,*args,**kwargs)
    with tempfile.TemporaryDirectory() as tmp:
        inner=Path(tmp)/'run.json'
        with patch.object(Page,'set_content',isolated),patch.object(sys,'argv',['test_semantic_target.py','--receipt',str(inner)]):
            rc=original.main()
        data=json.loads(inner.read_text(encoding='utf-8'))
    data['isolation_reproducer']=reproducer
    data['wrapper_sha256']=hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
    data['original_test_unchanged']=hashlib.sha256(Path(original.__file__).read_bytes()).hexdigest()
    data['isolation']='new about:blank document before each set_content; original A001 test untouched'
    with dest.open('x',encoding='utf-8',newline='\n') as f:json.dump(data,f,ensure_ascii=False,indent=2);f.write('\n')
    print(json.dumps(dict(receipt=str(dest),passed=data['passed'],total=data['total'],isolation_confirmed=reproducer['confirmed'])))
    return rc if reproducer['confirmed'] else 1


if __name__=='__main__':raise SystemExit(main())
