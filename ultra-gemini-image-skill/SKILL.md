---
name: ultra-gemini-image-skill
description: "Generate images via Gemini web browser with CDP blob extraction, bypassing Chrome's broken blob:null download."
user-invocable: true
metadata:
  author: ClawLabs
  version: "1.0.0"
  domain: image-generation
  triggers:
    - gemini image
    - generate image gemini
    - gemini image browser
---

# Ultra Gemini Image Skill

Generate images from text prompts using Gemini's web interface via browser automation.

## Why This Skill Exists

The OpenClaw-managed Chrome saves image downloads as `blob:null/...` instead of actual files. The native download button is broken. This skill extracts images via CDP (Chrome DevTools Protocol) WebSocket, bypassing the bug entirely.

## Prerequisites

- Logged into gemini.google.com in the OpenClaw browser
- Node.js with `ws` package (`npm install ws`)

## Workflow

### Step 1: Open Gemini

```
browser action=open url=https://gemini.google.com
```

Verify login by checking for "Olá, [name]!" heading.

### Step 2: Select Image Mode

1. Click the "+" button (Envio e ferramentas)
2. Click "Criar imagem" in the menu
3. Input placeholder should change to "Descreva sua imagem"

### Step 3: Type Prompt and Submit

```
browser action=act kind=type ref=<textbox_ref> text="<your prompt>"
browser action=act kind=click ref=<send_button_ref>
```

### Step 4: Wait for Generation

Wait 10-20 seconds. Check for "Creating your image..." to disappear and image to appear.

### Step 5: Extract via CDP (NOT the download button)

**5a. Inject base64 into page JS context:**

```
browser action=act kind=evaluate fn=extractGeminiImage
```

**5b. Extract and save via CDP WebSocket:**

Use `scripts/extract-blob-image.js`:

```bash
node scripts/extract-blob-image.js --target-id <TARGET_ID> --output <PATH.png>
```

Or inline:

```bash
node -e "
const WebSocket = require('ws');
const fs = require('fs');
const ws = new WebSocket('ws://127.0.0.1:18800/devtools/page/<TARGET_ID>');
ws.on('open', () => {
  ws.send(JSON.stringify({id:1, method:'Runtime.evaluate',
    params:{expression:'window.__extractedImageB64', returnByValue:true}}));
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

### Step 6: Verify and Send

Verify PNG header (first 2 bytes: `89 50`). Send via `message` tool with `attachments`.

## Key Facts

- **Blob URL pattern**: `blob:https://gemini.google.com/<uuid>` — canvas extraction works on these
- **Image size**: Typically 1024x559 or 1024x1024, 1-2MB as PNG
- **CDP endpoint**: `ws://127.0.0.1:18800/devtools/page/<targetId>`
- **Timeout**: Generation takes 10-20s; image may take a few more seconds to fully load
- **Login persists**: gemini.google.com sessions carry over from the user's Chrome profile

## Troubleshooting

| Issue | Fix |
|---|---|
| Download saves as `blob:null/...` | Use CDP extraction (Step 5), not the download button |
| `NO_IMAGE` from evaluate | Wait longer, image may still be generating |
| CDP WebSocket connection fails | Verify targetId from `browser action=tabs` |
| Not logged in | Log in manually first; sessions persist |
| Image appears but canvas is blank | Some images use `<canvas>` directly — check for `canvas` elements too |
