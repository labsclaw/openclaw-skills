#!/usr/bin/env node

/**
 * grok-image.js — Grok Image Generator
 * 
 * Uses the X.com Grok conversation to generate images via browser automation.
 * Extracts the generated image and saves it locally.
 *
 * Usage:
 *   node grok-image.js --prompt "A dramatic scene of books being destroyed..."
 *   node grok-image.js --prompt "Scene description" --output image.jpg
 *   node grok-image.js --prompt "Scene" --extract-only --image-url https://pbs.twimg.com/media/...
 *
 * Steps:
 *   1. Opens Grok conversation on X.com
 *   2. Sends the image generation prompt
 *   3. Waits for the image to be generated
 *   4. Extracts the image (screenshot, CDN URL, or canvas toDataURL)
 *   5. Saves locally
 */

const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

chromium.use(StealthPlugin());

const DEFAULT_SETTINGS = {
  profile: 'openclaw',
  headed: true,
  timeout: 120000, // 2 min — Grok image gen can be slow
};

// ─── Prompt Templates ───────────────────────────────────────────

const STYLE_HINTS = `
Style tips for best results:
- Be descriptive: "photorealistic", "cinematic", "dark", "dramatic lighting"
- Include composition: "wide shot", "close-up", "aerial view"
- Specify atmosphere: "dark amber lighting", "dystopian", "futuristic"
- Describe elements: colors, textures, objects, scale
- Grok understands Portuguese and English prompts
`;

// ─── Utility ────────────────────────────────────────────────────

function random(min, max) {
  return Math.random() * (max - min) + min;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function downloadFile(url, outputPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(outputPath);
    const proto = url.startsWith('https') ? https : http;
    proto.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, response => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        // Follow redirect
        file.close();
        fs.unlinkSync(outputPath);
        return resolve(downloadFile(response.headers.location, outputPath));
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        const stats = fs.statSync(outputPath);
        if (stats.size < 1000) {
          reject(new Error(`Downloaded file too small: ${stats.size} bytes — likely corrupted`));
        } else {
          resolve(outputPath);
        }
      });
    }).on('error', err => {
      file.close();
      fs.unlinkSync(outputPath);
      reject(err);
    });
  });
}

// ─── Image Extraction Methods ───────────────────────────────────

/**
 * Method 1: Screenshot — most reliable, works with any image display
 */
async function extractByScreenshot(page, outputPath) {
  console.log('  📸 Method 1: Screenshot...');
  await page.screenshot({ path: outputPath, fullPage: false });
  const stats = fs.statSync(outputPath);
  if (stats.size < 5000) {
    throw new Error(`Screenshot too small (${stats.size} bytes) — image may not be visible`);
  }
  console.log(`  ✅ Screenshot saved: ${outputPath} (${stats.size} bytes)`);
  return outputPath;
}

/**
 * Method 2: CDN URL — if the image was already posted to X CDN
 */
async function extractByCDNUrl(page) {
  console.log('  🔗 Method 2: CDN URL extraction...');
  // Poll for CDN URL — Grok image appears in DOM first, then CDN URL populates
  for (let attempt = 0; attempt < 20; attempt++) {
    const url = await page.evaluate(() => {
      // Look in Grok conversation for any image with twimg CDN URL
      const imgs = document.querySelectorAll('img');
      for (const img of imgs) {
        if (img.src && img.src.includes('pbs.twimg.com') && img.naturalWidth > 100) {
          return img.src;
        }
      }
      return null;
    });
    if (url) {
      console.log(`  ✅ CDN URL found: ${url}`);
      return { method: 'cdn', url };
    }
    await sleep(2000);
  }
  console.log('  ⏭️  No CDN URL found');
  return null;
}

/**
 * Method 3: Canvas toDataURL — for blob images without CDN URL
 */
async function extractByCanvas(page) {
  console.log('  🎨 Method 3: Canvas extraction...');
  const dataUrl = await page.evaluate(() => {
    // Try media carousel first
    let img = document.querySelector('[data-testid="mediaCarousel"] img, [data-testid="tweetPhoto"] img, div[role="dialog"] img[src*="blob:"]');
    if (!img) {
      // Fallback: any large image in main content
      const allImages = document.querySelectorAll('img');
      for (const im of allImages) {
        if (im.naturalWidth > 200 && im.src.startsWith('blob:')) {
          img = im;
          break;
        }
      }
    }
    if (!img) return null;

    const c = document.createElement('canvas');
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    if (c.width === 0) return null;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0);
    return c.toDataURL('image/jpeg', 0.95);
  });

  if (dataUrl) {
    console.log(`  ✅ Canvas extraction successful (${Math.round(dataUrl.length * 0.75 / 1024)} KB)`);
    return { method: 'canvas', dataUrl };
  }
  console.log('  ⏭️  No blob/canvas image found');
  return null;
}

// ─── Core Grok Image Flow ───────────────────────────────────────

async function generateImage(page, prompt) {
  console.log(`\n🤖 Sending prompt to Grok: "${prompt.substring(0, 80)}..."`);

  // Navigate to Grok
  await page.goto('https://x.com/i/grok', {
    waitUntil: 'domcontentloaded',
    timeout: DEFAULT_SETTINGS.timeout,
  });

  // Wait for page to settle
  await sleep(5000);

  // Dismiss any overlays/popups (Grok promo, etc.)
  await page.keyboard.press('Escape').catch(() => {});
  await sleep(500);

  // Look for the Grok input area
  // X.com Grok uses a contenteditable div or textarea
  const inputSelectors = [
    '[data-testid="grok-input"]',
    '[contenteditable="true"]',
    'textarea[placeholder*="Ask"]',
    'div[role="textbox"]',
    '.ProseMirror',  // X uses ProseMirror
  ];

  let inputElement = null;
  for (const sel of inputSelectors) {
    inputElement = await page.$(sel);
    if (inputElement) {
      console.log(`  Found input via: ${sel}`);
      break;
    }
  }

  if (!inputElement) {
    // Fallback: try to find the Grok input by looking for the "New conversation" or existing chat
    const newChatBtn = await page.$('a[href*="/i/grok?conversation=new"], a[href*="/i/grok"]');
    if (newChatBtn) {
      await newChatBtn.click();
      await sleep(3000);
      // Retry finding input
      for (const sel of inputSelectors) {
        inputElement = await page.$(sel);
        if (inputElement) break;
      }
    }
  }

  if (!inputElement) {
    throw new Error('Could not find Grok input area on the page');
  }

  // Click the input
  await inputElement.click({ force: true }).catch(() => inputElement.click());
  await sleep(500);

  // Type the prompt with human-like delay
  await page.keyboard.type(prompt, { delay: random(30, 70) });
  await sleep(500);

  // Submit (Enter)
  await page.keyboard.press('Enter');
  console.log('  ⏳ Waiting for Grok to generate image...');

  // Initial wait for Grok to start processing (15s)
  await sleep(15000);

  // Poll for image to appear in DOM
  // Once visible, the <img> element will have the CDN URL in its src
  let imageFound = false;
  for (let attempt = 0; attempt < 30; attempt++) {
    const hasImage = await page.evaluate(() => {
      const imgs = document.querySelectorAll('img');
      for (const img of imgs) {
        if (img.naturalWidth > 200 && img.offsetParent !== null) {
          if (img.closest('[data-testid="GrokConversation"]') ||
              img.closest('main') ||
              img.closest('[role="region"]')) {
            return true;
          }
        }
      }
      return false;
    });

    if (hasImage) {
      imageFound = true;
      console.log('  ✅ Image detected in DOM!');
      break;
    }

    console.log(`  ⏳ Waiting... (${(attempt + 1) * 5}s)`);
    await sleep(5000);
  }

  if (!imageFound) {
    throw new Error('Grok did not generate an image within timeout');
  }

  // Extra settling time for CDN upload
  await sleep(5000);

  console.log('  📸 Capturing image...');
}

async function extractImage(page, outputPath, cdnUrl = null) {
  // Method 1: Network-captured CDN URL (most reliable, no DOM needed)
  if (cdnUrl) {
    console.log(`  🔗 Method 1: Network-captured CDN URL...`);
    console.log(`  💾 Downloading from CDN: ${cdnUrl}`);
    await downloadFile(cdnUrl, outputPath);
    const stats = fs.statSync(outputPath);
    if (stats.size > 5000) {
      console.log(`  ✅ Image saved: ${outputPath} (${stats.size} bytes)`);
      return outputPath;
    }
    console.log(`  ⏭️  CDN download too small (${stats.size} bytes), trying DOM methods`);
  }

  // Method 2: DOM-based CDN URL
  const cdnResult = await extractByCDNUrl(page);
  if (cdnResult) {
    console.log(`  💾 Downloading from CDN...`);
    await downloadFile(cdnResult.url, outputPath);
    const stats = fs.statSync(outputPath);
    console.log(`  ✅ Image saved: ${outputPath} (${stats.size} bytes)`);
    return outputPath;
  }

  // Method 3: Canvas
  const canvasResult = await extractByCanvas(page);
  if (canvasResult) {
    const base64Data = canvasResult.dataUrl.replace(/^data:image\/\w+;base64,/, '');
    fs.writeFileSync(outputPath, base64Data, 'base64');
    const stats = fs.statSync(outputPath);
    if (stats.size < 5000) {
      fs.unlinkSync(outputPath);
      throw new Error(`Canvas image too small (${stats.size} bytes) — corrupted`);
    }
    console.log(`  ✅ Image saved: ${outputPath} (${stats.size} bytes)`);
    return outputPath;
  }

  // Method 1: Screenshot (last resort but most reliable)
  console.log('  ⚠️  CDN and Canvas failed, falling back to screenshot...');
  await extractByScreenshot(page, outputPath);
  return outputPath;
}

// ─── Main ───────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const promptIndex = args.indexOf('--prompt');
  const outputIndex = args.indexOf('--output');
  const profileIndex = args.indexOf('--profile');

  const prompt = promptIndex >= 0 ? args.slice(promptIndex + 1).find(a => !a.startsWith('--')) : null;
  const output = outputIndex >= 0 ? args[outputIndex + 1] : 'grok-image.jpg';
  const profile = profileIndex >= 0 ? args[profileIndex + 1] : DEFAULT_SETTINGS.profile;

  if (!prompt) {
    console.error('Usage:');
    console.error('  node grok-image.js --prompt "Your image description" [--output image.jpg] [--profile openclaw]');
    console.error(STYLE_HINTS);
    process.exit(1);
  }

  console.log('\n╔══════════════════════════════════════╗');
  console.log('║  🎨 Grok Image Generator             ║');
  console.log('╚══════════════════════════════════════╝\n');
  console.log(`Profile: ${profile}`);
  console.log(`Output: ${output}`);
  console.log(`Prompt: ${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}\n`);

  const resolvedOutput = path.resolve(output);

  // Launch browser
  console.log('🚀 Launching browser...');
  const userDataDir = process.env.USERPROFILE
    ? `${process.env.USERPROFILE}/.openclaw/browser/${profile}/user-data`
    : `${process.env.HOME || ''}/.openclaw/browser/${profile}/user-data`;

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-dev-shm-usage',
    ],
    viewport: { width: 1280, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    timeout: DEFAULT_SETTINGS.timeout,
  });

  const page = context.pages()[0] || await context.newPage();

  try {
    // Check login
    console.log('🔐 Checking login status...');
    await page.goto('https://x.com/home', { waitUntil: 'domcontentloaded', timeout: DEFAULT_SETTINGS.timeout });
    await sleep(3000);

    const loginCheck = await page.evaluate(() => {
      const loginBtn = document.querySelector('[data-testid="loginButton"]');
      return loginBtn ? 'login_required' : 'logged_in';
    });

    if (loginCheck !== 'logged_in') {
      console.log('❌ Not logged in. Please log in manually first.');
      process.exit(1);
    }
    console.log('✅ Logged in\n');

    // Generate image via Grok
    const genResult = await generateImage(page, prompt);

    // Extract and save
    await extractImage(page, resolvedOutput, genResult.cdnUrl);

    console.log('\n╔══════════════════════════════════════╗');
    console.log(`║  ✅ Image saved to: ${resolvedOutput}`);
    console.log(`║  📎 Use stealth-post.js to tweet it`);
    console.log('╚══════════════════════════════════════╝\n');

    console.log('RESULT_JSON:' + JSON.stringify({
      success: true,
      outputPath: resolvedOutput,
      prompt,
    }));

  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    console.log('RESULT_JSON:' + JSON.stringify({
      success: false,
      error: error.message,
    }));
    process.exit(1);
  } finally {
    console.log('\n🔒 Closing browser...');
    await context.close();
  }
}

main().catch(console.error);
