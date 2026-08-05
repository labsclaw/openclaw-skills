#!/usr/bin/env node

/**
 * ultra-x-stealth-skill: Stealth Post Script
 * Posts tweets/threads on X.com with anti-detection and human behavior simulation.
 * Supports media/image upload via file chooser.
 *
 * Usage:
 *   node stealth-post.js --config thread.json
 *   node stealth-post.js --text "Hello world!"
 *   node stealth-post.js --text "Reply" --reply-to 1234567890
 *   node stealth-post.js --text "Check this" --media image.jpg
 */

const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');

// Apply stealth plugin
chromium.use(StealthPlugin());

// --- Configuration ---
const DEFAULT_SETTINGS = {
  minDelay: 180,        // 3 min between tweets
  maxDelay: 360,        // 6 min between tweets
  typingSpeed: 'normal', // slow, normal, fast
  headed: true,
  timeout: 60000,
  maxTweetsPerSession: 6,
  maxTweetsPerDay: 20,
};

const TYPING_SPEEDS = {
  slow: { min: 100, max: 200, pauseChance: 0.15, typoChance: 0.05 },
  normal: { min: 50, max: 120, pauseChance: 0.08, typoChance: 0.02 },
  fast: { min: 30, max: 70, pauseChance: 0.03, typoChance: 0.01 },
};

// --- Utility Functions ---

function random(min, max) {
  return Math.random() * (max - min) + min;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function randomDelay(minSec, maxSec) {
  return random(minSec * 1000, maxSec * 1000);
}

/**
 * Generate a Bezier curve path from start to end with random control points.
 */
function generateBezierPath(startX, startY, endX, endY, steps = 20) {
  const cp1x = startX + (endX - startX) * 0.25 + random(-30, 30);
  const cp1y = startY + (endY - startY) * 0.25 + random(-30, 30);
  const cp2x = startX + (endX - startX) * 0.75 + random(-30, 30);
  const cp2y = startY + (endY - startY) * 0.75 + random(-30, 30);

  const points = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = Math.pow(1-t, 3) * startX + 3 * Math.pow(1-t, 2) * t * cp1x +
              3 * (1-t) * t * t * cp2x + t * t * t * endX + random(-2, 2);
    const y = Math.pow(1-t, 3) * startY + 3 * Math.pow(1-t, 2) * t * cp1y +
              3 * (1-t) * t * t * cp2y + t * t * t * endY + random(-2, 2);
    points.push({ x: Math.round(x), y: Math.round(y) });
  }
  return points;
}

/**
 * Move mouse along a Bezier curve with natural timing.
 */
async function humanMouseMove(page, startX, startY, endX, endY) {
  const points = generateBezierPath(startX, startY, endX, endY);
  for (const point of points) {
    await page.mouse.move(point.x, point.y);
    await sleep(random(8, 25));
  }
}

/**
 * Click an element with human-like behavior: hover first, then click with delay.
 */
async function humanClick(page, selector, options = {}) {
  const element = await page.$(selector);
  if (!element) throw new Error(`Element not found: ${selector}`);

  const box = await element.boundingBox();
  if (!box) throw new Error(`Element not visible: ${selector}`);

  const clickX = box.x + random(box.width * 0.2, box.width * 0.8);
  const clickY = box.y + random(box.height * 0.2, box.height * 0.8);

  const startX = options.startX || 500;
  const startY = options.startY || 400;

  await humanMouseMove(page, startX, startY, clickX, clickY);
  await sleep(random(200, 600));
  await sleep(random(50, 150));
  await page.mouse.click(clickX, clickY);

  return { x: clickX, y: clickY };
}

/**
 * Type text with human-like behavior: variable speed, pauses, occasional typos.
 */
async function humanType(page, selector, text, speed = 'normal') {
  const config = TYPING_SPEEDS[speed] || TYPING_SPEEDS.normal;

  // Focus the element first for reliability
  const element = await page.$(selector);
  if (element) {
    await element.focus();
    await sleep(random(200, 500));
  }
  await page.click(selector);
  await sleep(random(300, 700));

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    // Occasional typo
    if (Math.random() < config.typoChance && char.match(/[a-z]/i)) {
      const wrongChar = String.fromCharCode(char.charCodeAt(0) + Math.floor(random(-2, 3)));
      if (wrongChar !== char) {
        await page.keyboard.type(wrongChar);
        await sleep(random(200, 500));
        await page.keyboard.press('Backspace');
        await sleep(random(100, 200));
      }
    }

    await page.keyboard.type(char);

    let delay = random(config.min, config.max);

    if (char === ' ' && Math.random() < config.pauseChance) {
      delay += random(100, 400);
    }
    if (char.match(/[.!?,;:]/) && Math.random() < config.pauseChance) {
      delay += random(200, 600);
    }
    if (char === '\n') {
      delay += random(300, 800);
    }

    await sleep(delay);
  }
}

/**
 * Scroll the page with realistic acceleration/deceleration.
 */
async function humanScroll(page, distance = 300) {
  await page.mouse.wheel(0, distance * 0.6);
  await sleep(random(80, 150));
  await page.mouse.wheel(0, distance * 0.3);
  await sleep(random(150, 300));
  await page.mouse.wheel(0, distance * 0.1);
  await sleep(random(100, 200));
}

/**
 * Wait for page to be ready with human-like delay.
 */
async function waitForPageReady(page, timeout = 30000) {
  // X.com has constant WebSocket polling - 'load' is sufficient
  await page.waitForLoadState('load', { timeout });
  await sleep(random(2000, 5000));
}

/**
 * Upload media file to the tweet compose area via file chooser.
 */
async function uploadMedia(page, mediaPath) {
  if (!mediaPath) return;

  const resolvedPath = path.resolve(mediaPath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Media file not found: ${resolvedPath}`);
  }

  const stats = fs.statSync(resolvedPath);
  if (stats.size < 1000) {
    throw new Error(`Media file too small (${stats.size} bytes) - likely corrupted`);
  }

  console.log(`  🖼️  Uploading media: ${resolvedPath} (${Math.round(stats.size / 1024)} KB)`);

  // X uses a file input that's triggered by the media button
  // The button has data-testid="fileInput" but we need to find it or the addMedia button

  // Approach 1: Set up file chooser listener, then click the media button
  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser', { timeout: 10000 }).catch(() => null),
    page.click('[data-testid="addMedia"]', { timeout: 5000 }).catch(() => {
      // Fallback: try the media button in reply compose
      return page.click('[data-testid="mediaUploadButton"]');
    }).catch(() => {
      // Another fallback: look for any file input
      return page.evaluate(() => {
        const btn = document.querySelector('input[type="file"]');
        if (btn) btn.click();
        else throw new Error('Media upload button not found');
      });
    }),
  ]);

  if (fileChooser) {
    await fileChooser.setFiles([resolvedPath]);
    console.log('  ⏳ Waiting for upload to complete...');
    // Wait for the preview to appear
    await sleep(3000);
    // Wait for any progress bars to disappear
    try {
      await page.waitForFunction(() => {
        const progressBars = document.querySelectorAll('[role="progressbar"]');
        return progressBars.length === 0;
      }, { timeout: 30000 });
    } catch {
      console.log('  ⚠️  Upload progress check timed out - continuing anyway');
    }
    console.log('  ✅ Media uploaded');
  } else if (await page.$('[data-testid="attachedMedia"]')) {
    // Media already appeared (somehow)
    console.log('  ✅ Media appears to be uploaded');
  } else {
    throw new Error('Could not trigger file chooser for media upload');
  }
}

// --- Core Posting Functions ---

/**
 * Check if user is logged in to X.com.
 */
async function checkLoginStatus(page) {
  try {
    const composeBox = await page.$('[data-testid="tweetTextarea_0"]');
    const homeTimeline = await page.$('[data-testid="primaryColumn"]');
    const loginPage = await page.$('[data-testid="loginButton"]');

    if (loginPage) return 'login_required';
    if (composeBox || homeTimeline) return 'logged_in';
    return 'unknown';
  } catch {
    return 'error';
  }
}

/**
 * Post a single tweet with optional media. Returns the status ID.
 */
async function postTweet(page, text, replyToStatusId = null, mediaPath = null) {
  // If replying, navigate to the parent tweet first
  if (replyToStatusId) {
    console.log(`  ↩️  Replying to status ${replyToStatusId}...`);
    await page.goto(`https://x.com/i/status/${replyToStatusId}`, {
      // Use 'load' not 'networkidle' - X.com has constant WebSocket connections
      waitUntil: 'load',
      timeout: DEFAULT_SETTINGS.timeout,
    });
    await waitForPageReady(page);

    // Handle "Show More" replies if visible
    try {
      const showMore = await page.$('[data-testid="showMoreReplies"]');
      if (showMore) {
        await showMore.click();
        await sleep(2000);
      }
    } catch { /* fine */ }
  } else {
    // Navigate to home for a new tweet
    await page.goto('https://x.com/home', {
      // Use 'load' not 'networkidle' - X.com has constant WebSocket connections
      waitUntil: 'load',
      timeout: DEFAULT_SETTINGS.timeout,
    });
    await waitForPageReady(page);
  }

  console.log(`  📝 Composing tweet (${text.length} chars, media: ${mediaPath || 'none'})...`);

  // Find and click the compose textarea
  const textareaSelector = '[data-testid="tweetTextarea_0"]';
  await page.waitForSelector(textareaSelector, { timeout: 10000 });

  await humanClick(page, textareaSelector);
  await sleep(random(500, 1000));

  // Upload media BEFORE typing (X places cursor after media upload sometimes)
  if (mediaPath) {
    await uploadMedia(page, mediaPath);
    await sleep(random(1000, 2000));
  }

  // Type the tweet content
  console.log(`  ⌨️  Typing with human behavior...`);
  await humanType(page, textareaSelector, text, DEFAULT_SETTINGS.typingSpeed);

  // Review delay
  await sleep(random(2000, 5000));

  // Find and click the post/reply button
  const postBtnSelector = replyToStatusId
    ? '[data-testid="tweetButtonInline"]'
    : '[data-testid="tweetButton"]';

  await page.waitForSelector(postBtnSelector, { timeout: 5000 });

  const isDisabled = await page.$eval(postBtnSelector, el => el.disabled);
  if (isDisabled) {
    throw new Error('Post button is disabled - tweet may be empty or too long');
  }

  console.log(`  🖱️  Clicking post button...`);
  await humanClick(page, postBtnSelector);

  // Wait for post to be submitted
  await sleep(random(2000, 4000));

  // Extract status ID
  let postedStatusId = null;
  try {
    const url = page.url();
    const match = url.match(/status\/(\d+)/);
    if (match) postedStatusId = match[1];
  } catch {
    // OK
  }

  console.log(`  ✅ Tweet posted (status: ${postedStatusId || 'unknown'})`);
  return postedStatusId;
}

/**
 * Post a thread (series of connected tweets).
 */
async function postThread(page, tweets, settings) {
  const results = [];
  let lastStatusId = null;

  for (let i = 0; i < tweets.length; i++) {
    const tweet = tweets[i];

    if (i >= settings.maxTweetsPerSession) {
      console.log(`\n⚠️  Session limit reached (${settings.maxTweetsPerSession} tweets). Stopping.`);
      break;
    }

    console.log(`\n━━━ Tweet ${i + 1}/${tweets.length} ━━━`);

    let replyTo = tweet.replyTo;
    if (replyTo === 'auto' && lastStatusId) {
      replyTo = lastStatusId;
    } else if (replyTo === 'auto') {
      replyTo = null;
    }

    try {
      const statusId = await postTweet(page, tweet.text, replyTo, tweet.media || null);
      lastStatusId = statusId || lastStatusId;
      results.push({ index: i, success: true, statusId });

      if (i < tweets.length - 1) {
        const delay = randomDelay(settings.minDelay, settings.maxDelay);
        console.log(`\n⏳ Waiting ${Math.round(delay / 1000)}s before next tweet...`);
        await sleep(delay);
      }
    } catch (error) {
      console.error(`  ❌ Failed: ${error.message}`);
      results.push({ index: i, success: false, error: error.message });

      if (error.message.includes('suspend') || error.message.includes('CAPTCHA') ||
          error.message.includes('verification')) {
        console.log(`\n🛑 Account safety issue detected. Stopping all posting.`);
        break;
      }
    }
  }

  return results;
}

// --- Main ---

async function main() {
  const args = process.argv.slice(2);

  const configIndex = args.indexOf('--config');
  const textIndex = args.indexOf('--text');
  const replyIndex = args.indexOf('--reply-to');
  const profileIndex = args.indexOf('--profile');
  const mediaIndex = args.indexOf('--media');

  const profile = profileIndex >= 0 ? args[profileIndex + 1] : 'openclaw';

  let config = null;

  if (configIndex >= 0) {
    const configPath = args[configIndex + 1];
    const fullPath = path.resolve(configPath);
    console.log(`📂 Loading config from: ${fullPath}`);
    config = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  } else if (textIndex >= 0) {
    const text = args[textIndex + 1];
    const replyTo = replyIndex >= 0 ? args[replyIndex + 1] : null;
    const media = mediaIndex >= 0 ? args[mediaIndex + 1] : null;
    config = {
      profile,
      tweets: [{ text, replyTo: replyTo || null, media }],
      settings: DEFAULT_SETTINGS,
    };
  } else {
    console.error('Usage:');
    console.error('  node stealth-post.js --config thread.json');
    console.error('  node stealth-post.js --text "Hello world!"');
    console.error('  node stealth-post.js --text "Reply" --reply-to 1234567890');
    console.error('  node stealth-post.js --text "With image" --media image.jpg');
    process.exit(1);
  }

  const settings = { ...DEFAULT_SETTINGS, ...config.settings };

  console.log('\n╔══════════════════════════════════════╗');
  console.log('║  🔒 Ultra X Stealth - Posting        ║');
  console.log('╚══════════════════════════════════════╝\n');
  console.log(`Profile: ${config.profile}`);
  console.log(`Tweets: ${config.tweets.length}`);
  console.log(`Typing: ${settings.typingSpeed}`);
  console.log(`Delay: ${settings.minDelay}-${settings.maxDelay}s between tweets`);
  console.log(`Headed: ${settings.headed}`);
  console.log('');

  const hour = new Date().getHours();
  if (hour < 8 || hour >= 22) {
    console.log(`⚠️  Current time: ${hour}:00 - outside safe posting window (08:00-22:00)`);
    console.log(`   Continuing anyway (user initiated)...\n`);
  }

  console.log('🚀 Launching stealth browser...');
  const userDataDir = process.env.USERPROFILE + `/.openclaw/browser/${config.profile}/user-data`;

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: !settings.headed,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-dev-shm-usage',
    ],
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    timeout: settings.timeout,
  });

  const page = context.pages()[0] || await context.newPage();

  try {
    console.log('🔐 Checking login status...');
    // Use 'load' not 'networkidle' - X.com has constant WebSocket connections
    await page.goto('https://x.com/home', { waitUntil: 'load', timeout: settings.timeout });
    await waitForPageReady(page);

    const loginStatus = await checkLoginStatus(page);
    if (loginStatus !== 'logged_in') {
      console.log(`❌ Not logged in (status: ${loginStatus})`);
      console.log('   Please log in manually first.');
      process.exit(1);
    }
    console.log('✅ Logged in\n');

    const results = await postThread(page, config.tweets, settings);

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log('\n╔══════════════════════════════════════╗');
    console.log(`║  📊 Results: ${successCount} posted, ${failCount} failed`);
    console.log('╚══════════════════════════════════════╝\n');

    console.log('RESULT_JSON:' + JSON.stringify({
      success: failCount === 0,
      posted: successCount,
      failed: failCount,
      results,
    }));

  } catch (error) {
    console.error(`\n❌ Fatal error: ${error.message}`);
    process.exit(1);
  } finally {
    await context.close();
  }
}

main().catch(console.error);
