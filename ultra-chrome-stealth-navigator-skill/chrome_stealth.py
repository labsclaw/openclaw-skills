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
