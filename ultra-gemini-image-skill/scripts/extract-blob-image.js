#!/usr/bin/env node
/**
 * extract-blob-image.js — Extract blob image from browser via CDP WebSocket
 *
 * The OpenClaw Chrome saves downloads as blob:null/... instead of real files.
 * This script connects to the browser's CDP endpoint, reads the base64 data
 * injected by the evaluate step (window.__extractedImageB64), and saves it
 * as a real PNG/JPEG file.
 *
 * Usage:
 *   node extract-blob-image.js --target-id <TARGET_ID> --output <PATH>
 *
 * Steps before running:
 *   1. Open the page with the blob image in the browser
 *   2. Run the evaluate script to inject base64 into window.__extractedImageB64
 *   3. Run this script with the targetId from step 1
 *
 * The evaluate script to run first:
 *   () => {
 *     const imgs = document.querySelectorAll('img');
 *     for (const img of imgs) {
 *       if (img.naturalWidth > 200 && img.src && img.src.startsWith('blob:')) {
 *         const canvas = document.createElement('canvas');
 *         canvas.width = img.naturalWidth;
 *         canvas.height = img.naturalHeight;
 *         const ctx = canvas.getContext('2d');
 *         ctx.drawImage(img, 0, 0);
 *         const dataUrl = canvas.toDataURL('image/png');
 *         window.__extractedImageB64 = dataUrl.split(',')[1];
 *         return 'OK len=' + window.__extractedImageB64.length;
 *       }
 *     }
 *     return 'NO_IMAGE';
 *   }
 */

const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

// Parse args
const args = process.argv.slice(2);
const targetIdIdx = args.indexOf('--target-id');
const outputIdx = args.indexOf('--output');

if (targetIdIdx === -1 || outputIdx === -1) {
  console.error('Usage: node extract-blob-image.js --target-id <TARGET_ID> --output <PATH>');
  process.exit(1);
}

const targetId = args[targetIdIdx + 1];
const outputPath = path.resolve(args[outputIdx + 1]);

if (!targetId || !outputPath) {
  console.error('Error: --target-id and --output are required');
  process.exit(1);
}

const CDP_URL = `ws://127.0.0.1:18800/devtools/page/${targetId}`;

console.log(`Connecting to CDP: ${CDP_URL}`);

const ws = new WebSocket(CDP_URL);

ws.on('open', () => {
  console.log('Connected. Reading base64 from window.__extractedImageB64...');
  ws.send(JSON.stringify({
    id: 1,
    method: 'Runtime.evaluate',
    params: {
      expression: 'window.__extractedImageB64',
      returnByValue: true
    }
  }));
});

ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());

  if (msg.id === 1) {
    const b64 = msg.result?.result?.value;

    if (!b64) {
      console.error('Error: window.__extractedImageB64 is empty or undefined');
      console.error('Did you run the evaluate script first?');
      ws.close();
      process.exit(1);
    }

    console.log(`Base64 length: ${b64.length} chars`);

    const buf = Buffer.from(b64, 'base64');
    fs.writeFileSync(outputPath, buf);

    // Verify PNG header
    const isPng = buf.length > 2 && buf[0] === 0x89 && buf[1] === 0x50;
    const isJpeg = buf.length > 2 && buf[0] === 0xff && buf[1] === 0xd8;

    console.log(`Saved: ${outputPath}`);
    console.log(`Size: ${buf.length} bytes`);
    console.log(`Format: ${isPng ? 'PNG ✅' : isJpeg ? 'JPEG ✅' : 'Unknown (check file)'}`);

    ws.close();
  }
});

ws.on('error', (err) => {
  console.error('CDP connection error:', err.message);
  console.error('Check that the browser is running and the targetId is correct.');
  console.error('Run "browser action=tabs" to see available targets.');
  process.exit(1);
});

// Timeout after 10s
setTimeout(() => {
  console.error('Timeout: CDP response took too long');
  ws.close();
  process.exit(1);
}, 10000);
