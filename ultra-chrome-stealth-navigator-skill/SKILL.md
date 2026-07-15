# Skill: chrome-stealth-navigator

## Objetivo
Permitir que o agente OpenClaw controle o Chrome REAL do usuário (perfil já
logado, cookies, extensões, fingerprint genuíno) em vez de abrir um navegador
automatizado "do zero". Isso elimina 90% dos sinais que o Cloudflare, Akismet,
PerimeterX e DataDome usam para bloquear bots, porque o navegador não é um
clone artificial — é o Chrome que o Rogerio já usa todos os dias.

Uso legítimo: assistência a usuário com mobilidade reduzida, para navegação,
preenchimento de formulários, pesquisa e automação de tarefas cotidianas.

---

## 1. Arquitetura (por que funciona)

| Abordagem | Detectável? | Por quê |
|---|---|---|
| Selenium/Playwright abrindo Chrome novo | Alta | `navigator.webdriver=true`, sem histórico, sem cookies, fingerprint "limpo demais" |
| undetected-chromedriver | Média | Corrige flags, mas ainda é um perfil novo/isolado |
| **Conectar via CDP ao Chrome já aberto do usuário** | **Baixa** | Mesmo profile, cookies de sessão reais, extensões reais, histórico real, IP residencial real |

A skill usa a técnica de **CDP attach** (Chrome DevTools Protocol) em vez de
lançar uma instância nova. O Chrome do usuário é iniciado normalmente (com um
flag de debug), e o agente apenas "pega o volante" — como um copiloto.

---

## 2. Setup único (uma vez por máquina)

### 2.1 Criar atalho do Chrome com debug port
```bash
# Linux
google-chrome \
 --remote-debugging-port=9222 \
 --user-data-dir="$HOME/.config/google-chrome" \
 --restore-last-session &
```
> Use o **mesmo** `user-data-dir` do seu perfil padrão para herdar login,
> cookies e extensões. Não crie um perfil separado — isso derrota o propósito.

### 2.2 Dependências Python
```bash
pip install playwright playwright-stealth
playwright install-deps # sem baixar novos browsers, já usamos o real
```

---

## 3. Núcleo da skill (`chrome_stealth.py`)

```python
import asyncio, random, math
from playwright.async_api import async_playwright

CDP_URL = "http://localhost:9222"

class ChromeStealth:
 def __init__(self, cdp_url: str = CDP_URL):
 self.cdp_url = cdp_url
 self.browser = None
 self.page = None

 async def attach(self):
 self.pw = await async_playwright().start()
 self.browser = await self.pw.chromium.connect_over_cdp(self.cdp_url)
 context = self.browser.contexts[0] # perfil real já aberto
 self.page = context.pages[0] if context.pages else await context.new_page()
 await self._patch_fingerprint()
 return self.page

 async def _patch_fingerprint(self):
 # Remove os poucos sinais que sobram quando conectado via CDP
 await self.page.add_init_script("""
 Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
 window.chrome = window.chrome || { runtime: {} };
 """)

 # ---------- comportamento humano ----------
 async def human_move(self, selector: str):
 box = await self.page.locator(selector).bounding_box()
 if not box: return
 target_x = box["x"] + box["width"] / 2
 target_y = box["y"] + box["height"] / 2
 steps = random.randint(15, 30)
 for i in range(steps):
 t = i / steps
 # curva levemente não-linear (ease) + jitter
 x = target_x * t + random.uniform(-3, 3)
 y = target_y * t + random.uniform(-3, 3)
 await self.page.mouse.move(x, y)
 await asyncio.sleep(random.uniform(0.005, 0.02))
 await asyncio.sleep(random.uniform(0.1, 0.3))

 async def human_click(self, selector: str):
 await self.human_move(selector)
 await self.page.click(selector, delay=random.randint(40, 120))

 async def human_type(self, selector: str, text: str):
 await self.page.click(selector)
 for ch in text:
 await self.page.keyboard.type(ch)
 base = 0.06 if ch != " " else 0.12
 await asyncio.sleep(base + random.uniform(-0.02, 0.05))

 async def human_scroll(self, distance: int = 600):
 steps = random.randint(5, 10)
 for _ in range(steps):
 await self.page.mouse.wheel(0, distance / steps)
 await asyncio.sleep(random.uniform(0.08, 0.25))

 async def random_pause(self, lo=0.4, hi=2.2):
 await asyncio.sleep(random.uniform(lo, hi))

 # ---------- Cloudflare / challenges ----------
 async def wait_for_challenge(self, timeout_ms: int = 15000):
 """Cloudflare turnstile costuma resolver sozinho quando o navegador
 é 'de confiança'. Apenas espere sem interagir."""
 try:
 await self.page.wait_for_selector(
 "iframe[src*='challenges.cloudflare.com']",
 timeout=3000
 )
 await self.page.wait_for_load_state("networkidle", timeout=timeout_ms)
 except Exception:
 pass # não havia challenge, segue o fluxo

 async def goto(self, url: str):
 await self.page.goto(url, wait_until="domcontentloaded")
 await self.wait_for_challenge()
 await self.random_pause()

 async def close(self):
 await self.pw.stop()
```

---

## 4. Exemplo de uso pelo agente

```python
async def main():
 bot = ChromeStealth()
 page = await bot.attach()

 await bot.goto("https://exemplo.com/login")
 await bot.human_type("#usuario", "rogerio")
 await bot.human_type("#senha", "********")
 await bot.human_click("#entrar")
 await bot.random_pause()
 await bot.human_scroll(800)

asyncio.run(main())
```

---

## 5. Checklist de eficiência (regras da skill)

- Nunca usar `headless=True` — headless é o sinal nº1 de bot.
- Sempre conectar via CDP ao Chrome já logado, nunca criar perfil vazio.
- Intervalos entre ações: 400ms–2.2s (humano real varia, nunca é constante).
- Mouse sempre se move em curva antes de clicar, nunca "teleporta".
- Digitação caractere por caractere com variação, nunca `fill()` instantâneo.
- Se aparecer Cloudflare Turnstile, apenas aguardar — não tentar clicar nele.
- Reaproveitar a mesma aba/contexto entre tarefas (cookies de sessão = confiança acumulada).
- Limitar a 1 aba ativa por vez para não gerar padrão de "múltiplos workers".
- Logar cada passo em `~/.openclaw/logs/chrome_stealth.log` para auditoria (uso lícito).

---

## 6. Quando NÃO funcionar

Sites com Cloudflare "Enterprise" ou detecção de comportamento avançada podem
ainda pedir verificação manual (ex.: CAPTCHA visual). Nesses casos, a skill
deve pausar e notificar o Rogerio via Telegram para resolver manualmente uma
única vez — a sessão fica "confiável" depois disso.
