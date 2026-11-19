"""A002: Chromium real, adapters públicos; sem provider ou judge.

python -B scripts/test_resolve_wait.py --receipt <novo-arquivo.json>
Requer playwright e seu Chromium. Transporte page.evaluate substitui apenas
browser-harness; não prova a integração do transporte Hermes.
"""
import argparse
import hashlib
import json
from pathlib import Path
import time
from unittest.mock import patch

from playwright.sync_api import sync_playwright
import agent_loop as AL
import recipe as R


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--receipt', required=True)
    args = parser.parse_args()
    receipt = Path(args.receipt)
    if receipt.exists():
        raise FileExistsError(receipt)
    observations = []
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        page = browser.new_page()

        def transport(code, timeout=90):
            # Both adapters send print(js(<JSON string>)). Evaluate that exact JS.
            js = json.loads(code[len('print(js('):-2])
            return dict(out=page.evaluate(js), err='', rc=0)

        def invoke(mode, actions):
            with patch.object(AL, 'harness', side_effect=transport), \
                    patch.object(R, 'harness', side_effect=transport):
                if mode == 'single':
                    return dict(results=[json.loads(AL.execute(actions[0]))])
                return (R if mode == 'recipe' else AL).execute_batch(actions)

        for mode in ('single', 'batch', 'recipe'):
            for scenario in ('immediate', 'enabled_by_timer', 'replaced_by_timer',
                             'absent', 'disabled', 'invisible'):
                page.set_content('''<button id="target" onclick="window.clicks++">Alvo</button>''')
                page.evaluate('''() => {
                  window.clicks = 0; window.ticks = 0; window.callbackRan = false;
                  window.heartbeat = setInterval(() => window.ticks++, 25);
                }''')
                page.evaluate('''scenario => {
                  const el = document.getElementById('target');
                  if (scenario === 'absent') el.remove();
                  if (scenario === 'invisible') el.style.display = 'none';
                  if (['disabled', 'enabled_by_timer', 'replaced_by_timer'].includes(scenario)) el.disabled = true;
                  if (scenario === 'enabled_by_timer') setTimeout(() => {
                    window.callbackRan = true; el.disabled = false;
                  }, 150);
                  if (scenario === 'replaced_by_timer') setTimeout(() => {
                    window.callbackRan = true;
                    el.outerHTML = '<button id="target" onclick="window.clicks++">Novo</button>';
                  }, 150);
                }''', scenario)
                start = time.monotonic()
                result = invoke(mode, [dict(action='click', id='target')])
                elapsed = (time.monotonic() - start) * 1000
                observed = page.evaluate('''() => ({clicks, ticks, callbackRan})''')
                page.evaluate('clearInterval(window.heartbeat)')
                success = scenario in ('immediate', 'enabled_by_timer', 'replaced_by_timer')
                passed = (observed['clicks'] == (1 if success else 0))
                passed &= bool(result['results'][0].get('ok')) == success
                if scenario != 'immediate':
                    passed &= observed['ticks'] >= 2
                if scenario.endswith('_by_timer'):
                    passed &= observed['callbackRan'] and elapsed < 1500
                if not success:
                    passed &= 2900 <= elapsed <= 3800
                observations.append(dict(mode=mode, scenario=scenario, elapsed_ms=round(elapsed, 2),
                                         observed=observed, result=result, passed=bool(passed)))
            if mode != 'single':
                page.set_content('<p>Sem alvo</p>')
                start = time.monotonic()
                result = invoke(mode, [dict(action='expect_blocked'), dict(action='click', id='missing'),
                                       dict(action='assert_text', value='Sem alvo')])
                elapsed = (time.monotonic() - start) * 1000
                passed = (700 <= elapsed <= 1600 and result['results'][1].get('expected')
                          and result['results'][2].get('ok') and result['stopped_at'] is None)
                observations.append(dict(mode=mode, scenario='expected_failure_800ms_continues',
                                         elapsed_ms=round(elapsed, 2), result=result, passed=bool(passed)))
        version = browser.version
        browser.close()
    data = dict(item='A002', browser=version, transport='Playwright page.evaluate, not Hermes',
                sources={name: hashlib.sha256(Path(__file__).with_name(name).read_bytes()).hexdigest()
                         for name in ('agent_loop.py', 'recipe.py', 'test_resolve_wait.py')},
                passed=sum(o['passed'] for o in observations), total=len(observations), cases=observations)
    with receipt.open('x', encoding='utf-8') as output:
        json.dump(data, output, ensure_ascii=False, indent=2)
    print(json.dumps(dict(receipt=str(receipt), passed=data['passed'], total=data['total'])))
    return 0 if data['passed'] == data['total'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
