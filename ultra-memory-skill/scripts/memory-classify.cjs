#!/usr/bin/env node
/**
 * memory-classify.cjs — SSC Router v4.0 Classification Gate
 * 
 * Automatically classifies raw text or session transcript logs into:
 * - ADR / Decision -> memory/segments/ (or decision section)
 * - Correction / Lesson -> memory/corrections.md & relevant segment
 * - Incident -> memory/segments/s003-heartbeat.md or s009-error-tracking.md
 * - ConfigChange -> memory/segments/s001-infra.md
 * 
 * Usage:
 *   node scripts/memory-classify.cjs --text "Decidimos adiar migracao para Q2" [--dry-run] [--commit]
 *   node scripts/memory-classify.cjs --file path/to/log.txt [--json]
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
const correctionsPath = path.join(memoryDir, 'corrections.md');

// Classification patterns
const PATTERNS = {
  ADR: [
    /decid(imos|iu|ido)|decisã|decision|adr|arquitetura|escolhemos|optamos/i
  ],
  LESSON: [
    /lição|licao|erro|correção|correcao|aprendizado|bug|falha|corrigido|fix/i
  ],
  INCIDENT: [
    /incidente|outage|down|timeout|alert storm|crash|500 error|falhou|broken/i
  ],
  CONFIG_CHANGE: [
    /config|configuração|configuracao|env|fallback|gateway|modelo|primary|model/i
  ]
};

function classifyText(text) {
  if (!text || typeof text !== 'string') {
    return { categories: ['GENERAL'], items: [] };
  }

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const classifications = [];
  const categoryCounts = { ADR: 0, LESSON: 0, INCIDENT: 0, CONFIG_CHANGE: 0 };

  for (const line of lines) {
    const itemCategories = [];

    for (const [cat, regexes] of Object.entries(PATTERNS)) {
      if (regexes.some(r => r.test(line))) {
        itemCategories.push(cat);
        categoryCounts[cat]++;
      }
    }

    if (itemCategories.length > 0) {
      classifications.push({
        line: line,
        categories: itemCategories
      });
    }
  }

  const primaryCategory = Object.keys(categoryCounts)
    .sort((a, b) => categoryCounts[b] - categoryCounts[a])[0] || 'GENERAL';

  return {
    primaryCategory: categoryCounts[primaryCategory] > 0 ? primaryCategory : 'GENERAL',
    categoryCounts,
    classifiedLines: classifications,
    totalLines: lines.length
  };
}

function commitClassification(analysis, options = {}) {
  const dateStr = new Date().toISOString().split('T')[0];
  const results = [];

  for (const item of analysis.classifiedLines) {
    if (item.categories.includes('LESSON')) {
      const entry = `- **[${dateStr}] [Auto-Classified Lesson]**: ${item.line}\n`;
      if (fs.existsSync(correctionsPath)) {
        fs.appendFileSync(correctionsPath, entry, 'utf8');
        results.push({ category: 'LESSON', target: 'memory/corrections.md', entry });
      }
    }
    
    if (item.categories.includes('ADR')) {
      const adrPath = path.join(memoryDir, 'daily', `${dateStr}.md`);
      const entry = `\n### [Auto-ADR ${dateStr}] Decision Captured\n- ${item.line}\n`;
      if (fs.existsSync(adrPath)) {
        fs.appendFileSync(adrPath, entry, 'utf8');
        results.push({ category: 'ADR', target: `memory/daily/${dateStr}.md`, entry });
      }
    }
  }
  return results;
}

// CLI Handler
if (require.main === module) {
  const args = process.argv.slice(2);
  let text = '';

  const textIdx = args.indexOf('--text');
  if (textIdx >= 0) {
    text = args[textIdx + 1] || '';
  }

  const fileIdx = args.indexOf('--file');
  if (fileIdx >= 0 && fs.existsSync(args[fileIdx + 1])) {
    text = fs.readFileSync(args[fileIdx + 1], 'utf8');
  }

  if (!text) {
    console.log('Usage: node scripts/memory-classify.cjs --text "your text to classify" [--commit] [--json]');
    process.exit(0);
  }

  const analysis = classifyText(text);
  const jsonFlag = args.includes('--json');
  const commitFlag = args.includes('--commit');

  if (commitFlag) {
    const committed = commitClassification(analysis);
    analysis.committed = committed;
  }

  if (jsonFlag) {
    console.log(JSON.stringify(analysis, null, 2));
  } else {
    console.log(`\n=== SSC Memory Classification Gate ===`);
    console.log(`Primary Category: ${analysis.primaryCategory}`);
    console.log(`Classified Lines: ${analysis.classifiedLines.length} / ${analysis.totalLines}`);
    console.log(`Counts: ADR=${analysis.categoryCounts.ADR}, LESSON=${analysis.categoryCounts.LESSON}, INCIDENT=${analysis.categoryCounts.INCIDENT}, CONFIG=${analysis.categoryCounts.CONFIG_CHANGE}\n`);
    for (const c of analysis.classifiedLines) {
      console.log(`  [${c.categories.join(', ')}] ${c.line}`);
    }
    if (commitFlag && analysis.committed) {
      console.log(`\nCommitted ${analysis.committed.length} entries to disk.`);
    }
  }
}

module.exports = { classifyText, commitClassification };
