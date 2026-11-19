"""Ambiente local contratual, sem daemon ou perfil preexistente.

python environment_runner.py --run-id ID --output DIR [--headless] recipe -- ...
Modos: recipe, single, batch. Argumentos depois de -- vão à entrada original.
Playwright + Chromium instalados são dependências explícitas; não há fallback.
"""
import argparse
import contextlib
from datetime import datetime, timezone
import io
import json
from pathlib import Path
import re
import sys
import traceback
from unittest.mock import patch

VIEWPORT = dict(width=1280, height=900)
MEASURE = """() => ({width:innerWidth,height:innerHeight,
 visualWidth:visualViewport.width,visualHeight:visualViewport.height,
 scale:visualViewport.scale,dpr:devicePixelRatio,url:location.href})"""


def write_new(path, value):
    with Path(path).open('x', encoding='utf-8', newline='\n') as stream:
        json.dump(value, stream, indent=2, ensure_ascii=False)
        stream.write('\n')


def environment_passed(receipt, run_id):
    """Não aceitar só passed:true, maximize ou identidade de outro run."""
    try:
        checks = receipt['observations']
        profile = receipt['profile']
        command = receipt['browserCommandLine']
        return (receipt['schema'] == 'browser-environment-v1'
                and receipt['runId'] == run_id and receipt['passed'] is True
                and receipt['requested'] == dict(viewport=VIEWPORT, freshProfile=True)
                and profile['createdExclusive'] is True and profile['entriesBeforeLaunch'] == []
                and profile['runId'] == run_id
                and command.count('--user-data-dir=' + profile['path']) == 1
                and receipt['initialCookies'] == [] and len(checks) >= 2
                and all(c['width'] == 1280 and c['height'] == 900
                        and c['visualWidth'] == 1280 and c['visualHeight'] == 900
                        and c['scale'] == 1 for c in checks)
                and not receipt.get('errors'))
    except (KeyError, TypeError, AttributeError):
        return False


class Environment:
    """Um dono, um perfil novo, um run. Não é sandbox de Python/rede."""
    def __init__(self, run_id, output, headless=False):
        if not isinstance(run_id, str) or not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9._-]{0,119}', run_id):
            raise ValueError('runId inválido')
        self.run_id, self.output, self.headless = run_id, Path(output), headless
        self.directory = self.output / run_id
        self.profile = self.directory / 'profile'
        self.receipt = dict(schema='browser-environment-v1', runId=run_id,
            startedAt=datetime.now(timezone.utc).isoformat(),
            requested=dict(viewport=dict(VIEWPORT), freshProfile=True),
            headless=headless, observations=[], errors=[], passed=False)
        self.pw = self.context = self.page = None
        self.capture = None

    def __enter__(self):
        self.output.mkdir(parents=True, exist_ok=True)
        # mkdir exclusif bloqueia replay e também symlink/diretório preexistente.
        self.directory.mkdir(exist_ok=False)
        try:
            self.profile.mkdir(exist_ok=False)
            self.receipt['profile'] = dict(path=str(self.profile.resolve()), runId=self.run_id,
                createdExclusive=True, entriesBeforeLaunch=list(self.profile.iterdir()))
            from playwright.sync_api import sync_playwright
            self.pw = sync_playwright().start()
            self.context = self.pw.chromium.launch_persistent_context(
                str(self.profile.resolve()), headless=self.headless, viewport=dict(VIEWPORT),
                device_scale_factor=1, args=['--enable-automation'], timeout=30000)
            self.context.set_default_timeout(10000)
            self.context.set_default_navigation_timeout(30000)
            self.page = self.context.pages[0]
            session = self.context.new_cdp_session(self.page)
            try:
                self.receipt['browserCommandLine'] = session.send('Browser.getBrowserCommandLine')['arguments']
                self.receipt['browserVersion'] = session.send('Browser.getVersion')
            finally:
                session.detach()
            self.receipt['initialCookies'] = self.context.cookies()
            if self.receipt['initialCookies']:
                raise RuntimeError('Perfil novo contém cookies iniciais')
            expected = '--user-data-dir=' + str(self.profile.resolve())
            if self.receipt['browserCommandLine'].count(expected) != 1:
                raise RuntimeError('Identidade de perfil não confirmada pelo Chromium')
            self.check('before-task')
            from capture_evidence import Capture
            self.capture = Capture(self.run_id, self.directory / 'capture',
                lambda: self.page.screenshot(type='png', full_page=False, timeout=10000))
            write_new(self.directory / 'environment-start.json', self.receipt)
            return self
        except BaseException as exc:
            self.__exit__(type(exc), exc, exc.__traceback__)
            raise

    def check(self, phase):
        measurement = self.page.evaluate(MEASURE)
        measurement.update(phase=phase, observedAt=datetime.now(timezone.utc).isoformat())
        self.receipt['observations'].append(measurement)
        if (measurement['width'], measurement['height'], measurement['visualWidth'],
            measurement['visualHeight'], measurement['scale']) != (1280, 900, 1280, 900, 1):
            raise RuntimeError('Viewport contratual divergente: ' + json.dumps(measurement))
        return measurement

    def js(self, code):
        # Reload do verifier é terminal real, não PASS sintético.
        if '/* UB2_RELOAD_REQUEST */' in code:
            self.page.reload(wait_until='load')
            return dict(requested=True)
        return self.page.evaluate(code)

    def harness(self, code, timeout=90):
        output = io.StringIO()
        try:
            if self.receipt['errors']:
                raise RuntimeError('Falha anterior de ambiente/host impede nova chamada')
            self.check('before-call')
            # Somente a API de host consumida pelos scripts atuais. Helpers não
            # implementados (ex. recording) levantam NameError, nunca sucesso falso.
            with contextlib.redirect_stdout(output):
                exec(compile(code, '<environment-host>', 'exec'), dict(
                    js=self.js, goto_url=lambda url: self.page.goto(url, wait_until='load',
                        timeout=min(timeout * 1000, 30000)),
                    upload_file=lambda selector, filename: self.page.locator(selector).set_input_files(filename),
                    maximize=lambda: None))
            self.check('after-call')
            phase = ('after-reload' if 'UB2_RELOAD_REQUEST' in code else
                     'after-navigation' if 'goto_url(' in code else
                     'after-upload' if 'upload_file(' in code else
                     'after-native' if 'const acts = ' in code else 'after-host-call')
            if not self.capture.frame(phase):
                raise RuntimeError('capture evidence failed')
            return dict(out=output.getvalue(), err='', rc=0)
        except Exception as exc:
            if self.capture is not None and not self.capture.finished:
                self.capture.frame('host-failure')
            self.receipt['errors'].append(type(exc).__name__ + ': ' + str(exc))
            return dict(out=output.getvalue(), err=traceback.format_exc(), rc=1)

    @contextlib.contextmanager
    def bind(self):
        import recipe
        import agent_loop
        from capture_evidence import CURRENT
        token = CURRENT.set(self.capture)
        try:
            with patch.object(recipe, 'harness', self.harness), patch.object(agent_loop, 'harness', self.harness):
                yield
        finally:
            CURRENT.reset(token)

    def __exit__(self, kind, error, tb):
        try:
            if error:
                self.receipt['errors'].append(type(error).__name__ + ': ' + str(error))
            if self.page is not None:
                try:
                    self.check('after-task')
                except Exception as exc:
                    self.receipt['errors'].append(type(exc).__name__ + ': ' + str(exc))
        finally:
            if self.capture is not None:
                if not self.capture.finished:
                    self.capture.frame('environment-final')
                self.receipt['capture'] = self.capture.finish()
                if not self.receipt['capture']['passed']:
                    self.receipt['errors'].append('capture evidence failed')
            try:
                if self.context is not None:
                    self.context.close()
            except Exception as exc:
                self.receipt['errors'].append('close: ' + str(exc))
            finally:
                if self.pw is not None:
                    self.pw.stop()
                self.receipt['finishedAt'] = datetime.now(timezone.utc).isoformat()
                self.receipt['passed'] = not self.receipt['errors']
                self.receipt['passed'] = environment_passed(self.receipt, self.run_id)
                write_new(self.directory / 'environment.json', self.receipt)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--run-id', required=True)
    parser.add_argument('--output', required=True, type=Path)
    parser.add_argument('--headless', action='store_true', help='somente testes sem janela visível')
    parser.add_argument('mode', choices=['recipe', 'single', 'batch'])
    parser.add_argument('args', nargs=argparse.REMAINDER)
    args = parser.parse_args()
    forwarded = args.args[1:] if args.args[:1] == ['--'] else args.args
    result = dict(result='ENVIRONMENT-FAIL', runId=args.run_id)
    code = 1
    try:
        with Environment(args.run_id, args.output, args.headless) as env, env.bind():
            import recipe
            import agent_loop
            mode_args = (['run'] + forwarded if args.mode == 'recipe' else
                         forwarded + ['--mode', args.mode])
            with patch.object(sys, 'argv', [args.mode] + mode_args):
                stream = io.StringIO()
                with contextlib.redirect_stdout(stream):
                    try:
                        (recipe.main if args.mode == 'recipe' else agent_loop.main)()
                        code = 0
                    except SystemExit as exc:
                        code = exc.code if type(exc.code) is int else 1
                result['taskStdout'] = stream.getvalue()
        result.update(result='ENVIRONMENT-PASS' if env.receipt['passed'] else 'ENVIRONMENT-FAIL',
                      environment=str(env.directory / 'environment.json'), taskExitCode=code)
        return_code = code if env.receipt['passed'] else 1
    except Exception as exc:
        result['error'] = type(exc).__name__ + ': ' + str(exc)
        return_code = 1
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return return_code


if __name__ == '__main__':
    raise SystemExit(main())
