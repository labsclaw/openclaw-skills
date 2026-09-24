#!/usr/bin/env node
/**
 * download-grok-image.js — Download Grok-generated image via mediaId API
 *
 * Grok serves images through:
 *   https://api.x.com/2/grok/attachment.json?mediaId=<ID>
 *
 * This script downloads the image using browser session cookies.
 *
 * Usage:
 *   node download-grok-image.js --media-id <ID> --output <PATH> --cookies <COOKIE_STRING>
 *
 * The cookie string should be extracted from the browser via:
 *   browser action=act kind=evaluate fn=() => document.cookie
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const mediaIdIdx = args.indexOf('--media-id');
const outputIdx = args.indexOf('--output');
const cookiesIdx = args.indexOf('--cookies');

if (mediaIdIdx === -1 || outputIdx === -1) {
  console.error('Usage: node download-grok-image.js --media-id <ID> --output <PATH> [--cookies <STRING>]');
  process.exit(1);
}

const mediaId = args[mediaIdIdx + 1];
const outputPath = path.resolve(args[outputIdx + 1]);
const cookies = cookiesIdx !== -1 ? args[cookiesIdx + 1] : '';

if (!mediaId) {
  console.error('Error: --media-id is required');
  process.exit(1);
}

const url = `https://api.x.com/2/grok/attachment.json?mediaId=${mediaId}`;

const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
  'Referer': 'https://x.com/',
};

if (cookies) {
  headers['Cookie'] = cookies;
}

console.log(`Downloading image with mediaId: ${mediaId}`);

https.get(url, { headers }, (res) => {
  if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
    console.log(`Redirect: ${res.headers.location}`);
  }

  if (res.statusCode !== 200) {
    console.error(`HTTP ${res.statusCode}: ${res.statusMessage}`);
    if (res.statusCode === 401 || res.statusCode === 403) {
      console.error('Auth required. Extract cookies from browser first:');
      console.error('  browser action=act kind=evaluate fn=() => document.cookie');
    }
    process.exit(1);
  }

  const chunks = [];
  res.on('data', (c) => chunks.push(c));
  res.on('end', () => {
    const buf = Buffer.concat(chunks);
    fs.writeFileSync(outputPath, buf);

    const isPng = buf.length > 2 && buf[0] === 0x89 && buf[1] === 0x50;
    const isJpeg = buf.length > 2 && buf[0] === 0xff && buf[1] === 0xd8;
    const isWebp = buf.length > 12 && buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50;

    console.log(`Saved: ${outputPath}`);
    console.log(`Size: ${buf.length} bytes`);
    console.log(`Format: ${isPng ? 'PNG ✅' : isJpeg ? 'JPEG ✅' : isWebp ? 'WebP ✅' : 'Unknown ⚠️'}`);
  });
}).on('error', (e) => {
  console.error('Request error:', e.message);
  process.exit(1);
});
