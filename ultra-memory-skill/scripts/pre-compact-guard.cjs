#!/usr/bin/env node
/**
 * pre-compact-guard.cjs — SSC Router v4.0 Pre-Compaction Guard
 * 
 * Captures volatile session state, active goals, hot memory, and key context
 * into memory/checkpoints/ before context window compaction or long tasks.
 * 
 * Usage:
 *   node scripts/pre-compact-guard.cjs [--name "pre-compaction-snapshot"] [--json]
 */

const fs = require('fs');
const path = require('path');

function findWorkspace() {
  if (process.env.OPENCLAW_WORKSPACE) return process.env.OPENCLAW_WORKSPACE;
  let dir = __dirname;
  for (let i = 0; i < 10; i++) {
    if (fs.existsSync(path.join(dir, 'memory')) && fs.existsSync(path.join(dir, 'scripts'))) return dir;
    dir = path.dirname(dir);
  }
  throw new Error('Cannot find OpenClaw workspace (looked for memory/ + scripts/ dirs)');
}
const workspaceDir = findWorkspace();
const memoryDir = path.join(workspaceDir, 'memory');
const checkpointDir = path.join(memoryDir, 'checkpoints');
const hotPath = path.join(memoryDir, 'hot.md');
const indexPath = path.join(memoryDir, 'index.json');

function createSnapshot(customName = '') {
  if (!fs.existsSync(checkpointDir)) {
    fs.mkdirSync(checkpointDir, { recursive: true });
  }

  const now = new Date();
  const timestampStr = now.toISOString().replace(/[:.]/g, '-');
  const dateStr = now.toISOString().split('T')[0];
  
  const snapshotName = customName 
    ? `${dateStr}-${customName.replace(/[^a-z0-9_-]/gi, '_')}`
    : `${dateStr}-pre-compact-${timestampStr}`;

  const targetPath = path.join(checkpointDir, `${snapshotName}.json`);

  // Gather state
  let hotContent = '';
  if (fs.existsSync(hotPath)) {
    hotContent = fs.readFileSync(hotPath, 'utf8');
  }

  let indexSummary = { segmentsCount: 0, dailyCount: 0 };
  if (fs.existsSync(indexPath)) {
    try {
      const idx = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
      indexSummary.segmentsCount = idx.segments ? idx.segments.length : 0;
      indexSummary.dailyCount = idx.daily ? idx.daily.length : 0;
      indexSummary.version = idx.version;
    } catch (e) {}
  }

  const dailyPath = path.join(memoryDir, 'daily', `${dateStr}.md`);
  let dailyContent = '';
  if (fs.existsSync(dailyPath)) {
    dailyContent = fs.readFileSync(dailyPath, 'utf8');
  }

  const snapshot = {
    name: snapshotName,
    created: now.toISOString(),
    hotMemory: hotContent,
    dailySummary: dailyContent.slice(0, 2000),
    indexSummary,
    meta: {
      platform: process.platform,
      nodeVersion: process.version
    }
  };

  fs.writeFileSync(targetPath, JSON.stringify(snapshot, null, 2), 'utf8');

  return {
    success: true,
    name: snapshotName,
    path: targetPath,
    size: fs.statSync(targetPath).size,
    timestamp: now.toISOString()
  };
}

// CLI Handler
if (require.main === module) {
  const args = process.argv.slice(2);
  let name = '';
  const nameIdx = args.indexOf('--name');
  if (nameIdx >= 0) {
    name = args[nameIdx + 1] || '';
  }

  const result = createSnapshot(name);
  const jsonFlag = args.includes('--json');

  if (jsonFlag) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`\n=== SSC Pre-Compaction Guard ===`);
    console.log(`Snapshot Created: ${result.name}`);
    console.log(`Path: ${result.path}`);
    console.log(`Size: ${result.size} bytes\n`);
  }
}

module.exports = { createSnapshot };
