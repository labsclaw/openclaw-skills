# Content Scraper & Readability Engine

High-performance text and article extraction from web pages.

## Architecture
- Singleton Browser Pool lifecycle
- DOM distillation using Mozilla Readability pattern
- Anti-detection headers and viewport randomization

## Workflow
1. Navigate with wait-until: 'domcontentloaded'
2. Extract text/markdown structure
3. Fallback to CDP screenshot if CAPTCHA or Cloudflare challenge detected
