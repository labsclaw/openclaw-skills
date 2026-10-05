---
name: ultra-grok-image-skill
description: "Generate images via Grok on X.com browser and extract via mediaId API URL."
license: Apache-2.0
user-invocable: true
metadata:
  author: ClawLabs
  version: "1.1.0"
  domain: image-generation
  triggers:
    - grok image
    - generate image grok
    - grok image browser
---

# Ultra Grok Image Skill

Generate images from text prompts using Grok on X.com via browser automation.

## Key Discovery

Grok images are served via a real API URL, not blob:

```
https://api.x.com/2/grok/attachment.json?mediaId=<MEDIA_ID>
```

The `mediaId` is in the DOM as a CSS `background-image` on a `<div>` element.

## Prerequisites

- Logged into X.com in the OpenClaw browser (session persists)
- Grok access available

## Workflow

### Step 1: Open Grok

```
browser action=open url=https://x.com/i/grok
```

### Step 2: Select Image Mode

Click "Create Images" button below the input.

### Step 3: Type Prompt and Submit

```
browser action=act kind=type ref=<textbox_ref> text="<prompt>"
browser action=act kind=press key=Enter ref=<textbox_ref>
```

### Step 4: Wait 15-30s

Image generation takes longer than text. Wait for the image to appear.

### Step 5: Extract mediaId

```javascript
// browser act evaluate
() => {
  const allDivs = document.querySelectorAll('div[style*="attachment.json"]');
  for (const div of allDivs) {
    const style = div.getAttribute('style') || '';
    const match = style.match(/mediaId=(\d+)/);
    if (match) return match[1];
  }
  return 'NO_MEDIA_ID';
}
```

### Step 6: Fetch Image from Browser Context

The browser is already authenticated with X.com. Fetch directly from the page — cookies are sent automatically.

**6a. Fetch and convert to base64 in page context:**

```javascript
// browser act evaluate
async () => {
  const mediaId = '<MEDIA_ID>';
  const url = 'https://api.x.com/2/grok/attachment.json?mediaId=' + mediaId;
  const resp = await fetch(url, { credentials: 'include' });
  const blob = await resp.blob();
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onloadend = () => {
      window.__grokImageB64 = reader.result.split(',')[1];
      resolve('OK len=' + window.__grokImageB64.length + ' type=' + blob.type);
    };
    reader.readAsDataURL(blob);
  });
}
```

**6b. Save via CDP WebSocket:**

```bash
node -e "
const WebSocket = require('ws');
const fs = require('fs');
const ws = new WebSocket('ws://127.0.0.1:18800/devtools/page/<TARGET_ID>');
ws.on('open', () => {
  ws.send(JSON.stringify({id:1, method:'Runtime.evaluate',
    params:{expression:'window.__grokImageB64', returnByValue:true}}));
});
ws.on('message', (data) => {
  const msg = JSON.parse(data);
  if (msg.id === 1) {
    const b64 = msg.result.result.value;
    const buf = Buffer.from(b64, 'base64');
    fs.writeFileSync('<OUTPUT_PATH>', buf);
    console.log('Saved: ' + buf.length + ' bytes');
    ws.close();
  }
});
"
```

Or reuse the Gemini skill script with a different variable name:

```bash
node ~/.openclaw/skills/ultra-gemini-image-skill/scripts/extract-blob-image.js --target-id <TARGET_ID> --output <PATH>
```

(Change `window.__extractedImageB64` to `window.__grokImageB64` in the script or use inline CDP above.)

### Step 7: Verify and Send

Check file size > 1KB, verify PNG/JPEG header. Send via `message` tool with attachments.

## Key Facts

- **API URL**: `https://api.x.com/2/grok/attachment.json?mediaId=<numeric_id>`
- **mediaId location**: CSS `background-image` on `<div>` in Grok response
- **Auth**: Browser session cookies are automatic — no manual cookie extraction needed
- **Image format**: Usually JPEG/PNG, ~1024x1024
- **Generation time**: 15-30s

## Grok vs Gemini Extraction

| Aspect | Grok | Gemini |
|--------|------|--------|
| Image URL | HTTP API (`attachment.json`) | Blob URL (`blob:https://...`) |
| Extraction | fetch from page context → CDP save | Canvas → base64 → CDP save |
| Auth | Automatic (browser session) | Not needed (blob is local) |
| Complexity | Low | Medium |

## Troubleshooting

| Issue | Fix |
|---|---|
| `NO_MEDIA_ID` | Wait longer, image still generating |
| fetch fails | Verify logged into X.com |
| Rate limit | Grok has daily limits, switch to Gemini |
| Low quality image | Check for higher-res mediaId |
