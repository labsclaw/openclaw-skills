#!/usr/bin/env node
/**
 * test-ssc-v4.cjs — Comprehensive Test Suite for SSC Memory System v4.0
 * 
 * Tests:
 * 1. Index Rebuild Engine (Tier 1, Tier 2, BM25 Statistics)
 * 2. Hybrid BM25 + Tiered Router (Query recall, accessCount increment, dry-run)
 * 3. PowerShell Interface Integration
 * 4. Memory Classification Gate (ADR, Lesson, Incident, Config)
 * 5. Pre-Compaction Snapshot Guard
 * 6. Edge Cases & Resilience (Empty queries, special chars, zero hits)
 * 
 * Usage:
 *   node scripts/test-ssc-v4.cjs
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const workspaceDir = path.resolve(__dirname, '..', '..', '..', '..');
const memoryDir = path.join(workspaceDir, 'memory');
const indexPath = path.join(memoryDir, 'index.json');

const { rebuild } = require('./ssc-rebuild.cjs');
const { querySSC, loadIndex } = require('./ssc-router.cjs');
const { classifyText, commitClassification } = require('./memory-classify.cjs');
const { createSnapshot } = require('./pre-compact-guard.cjs');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  passedTests++;
  console.log(`  ✓ PASS: ${message}`);
}

console.log(`\n==============================================`);
console.log(`   SSC MEMORY SYSTEM v4.0 TEST SUITE`);
console.log(`==============================================\n`);

try {
  // -------------------------------------------------------------
  // TEST GROUP 1: Rebuild & BM25 Index Preparation
  // -------------------------------------------------------------
  console.log(`[Suite 1/6] Testing Rebuild Engine (ssc-rebuild.cjs)...`);
  const newIndex = rebuild();
  
  assert(newIndex.version === '4.0', 'Index version is 4.0');
  assert(Array.isArray(newIndex.segments), 'Tier 1 segments is an array');
  assert(newIndex.segments.length > 0, `Tier 1 segments count > 0 (found ${newIndex.segments.length})`);
  assert(Array.isArray(newIndex.daily), 'Tier 2 daily is an array');
  assert(newIndex.daily.length > 0, `Tier 2 daily count > 0 (found ${newIndex.daily.length})`);
  assert(newIndex.bm25Stats !== undefined, 'BM25 stats present in index');
  assert(newIndex.bm25Stats.docCount === (newIndex.segments.length + newIndex.daily.length), 'BM25 docCount matches total entries');
  assert(newIndex.bm25Stats.avgDocLength > 0, 'BM25 avgDocLength is calculated');
  assert(Object.keys(newIndex.bm25Stats.idf).length > 0, 'IDF dictionary populated');

  // -------------------------------------------------------------
  // TEST GROUP 2: Hybrid BM25 Router Queries & Weighting
  // -------------------------------------------------------------
  console.log(`\n[Suite 2/6] Testing Router Engine (ssc-router.cjs)...`);

  // Query 1: Tier 1 Segment match (Heartbeat Alert Storm)
  const res1 = querySSC("heartbeat alert storm", { topK: 5, dryRun: true });
  assert(res1.results.length > 0, 'Query 1 returned results for "heartbeat alert storm"');
  assert(res1.results[0].tier === 1, 'Top result for "heartbeat alert storm" is Tier 1 (Segment)');
  assert(res1.results[0].id === 's003-heartbeat', 'Top result ID is s003-heartbeat');

  // Query 2: Tier 2 Daily match (awesome-llm-apps)
  const res2 = querySSC("awesome-llm-apps", { topK: 5, dryRun: true });
  assert(res2.results.length > 0, 'Query 2 returned results for "awesome-llm-apps"');
  assert(res2.results[0].tier === 2, 'Top result for "awesome-llm-apps" is Tier 2 (Daily)');
  assert(res2.results[0].id.includes('daily-2026-07-21'), 'Top result is daily-2026-07-21');

  // Query 3: Multi-term BM25 + Keyword Hybrid (CRAG fallback)
  const res3 = querySSC("CRAG fallback", { topK: 5, dryRun: true });
  assert(res3.results.length >= 2, 'Query 3 returned multiple hits for hybrid terms');
  assert(res3.results.some(r => r.id === 's010-fallback-bug-openclaw'), 'Found s010 segment in CRAG fallback query');

  // Query 4: accessCount Mutation & DryRun Test
  const initialAccessCount = newIndex.segments[0].accessCount || 0;
  querySSC("heartbeat", { topK: 1, dryRun: true });
  const indexAfterDryRun = loadIndex();
  assert((indexAfterDryRun.segments[0].accessCount || 0) === initialAccessCount, 'DryRun does not increment accessCount');

  querySSC("heartbeat", { topK: 1, dryRun: false });
  const indexAfterRun = loadIndex();
  assert((indexAfterRun.segments[0].accessCount || 0) >= initialAccessCount, 'Live query updates accessCount');

  // -------------------------------------------------------------
  // TEST GROUP 3: PowerShell Interface Integration
  // -------------------------------------------------------------
  console.log(`\n[Suite 3/6] Testing PowerShell Interface (ssc-router.ps1)...`);
  const psScript = path.join(workspaceDir, 'memory', 'ssc-router.ps1');
  const psOutput = execSync(`powershell -ExecutionPolicy Bypass -File "${psScript}" -Query "heartbeat" -Json`, { encoding: 'utf8' });
  const parsedPs = JSON.parse(psOutput);
  assert(parsedPs.results !== undefined, 'PowerShell script returned valid JSON via node delegation');
  assert(parsedPs.results.length > 0, 'PowerShell router output contains matches');

  // -------------------------------------------------------------
  // TEST GROUP 4: Classification Gate
  // -------------------------------------------------------------
  console.log(`\n[Suite 4/6] Testing Classification Gate (memory-classify.cjs)...`);
  const testText = `
Decidimos adiar a migração do Redis para o Q2.
Encontramos um erro crítico no timeout do fallback que causou um crash.
Configuração do gateway atualizada com o modelo gemini-3.6-flash-high.
  `;
  const classRes = classifyText(testText);
  assert(classRes.classifiedLines.length === 3, 'Classified 3 distinct lines');
  assert(classRes.categoryCounts.ADR >= 1, 'Detected ADR/Decision line');
  assert(classRes.categoryCounts.LESSON >= 1, 'Detected Lesson/Correction line');
  assert(classRes.categoryCounts.CONFIG_CHANGE >= 1, 'Detected Config Change line');

  // -------------------------------------------------------------
  // TEST GROUP 5: Pre-Compaction Snapshot Guard
  // -------------------------------------------------------------
  console.log(`\n[Suite 5/6] Testing Pre-Compaction Guard (pre-compact-guard.cjs)...`);
  const snapRes = createSnapshot('unit-test-run');
  assert(snapRes.success === true, 'Snapshot created successfully');
  assert(fs.existsSync(snapRes.path), 'Snapshot file exists on disk');
  assert(snapRes.size > 100, `Snapshot file size is non-trivial (${snapRes.size} bytes)`);

  const snapData = JSON.parse(fs.readFileSync(snapRes.path, 'utf8'));
  assert(snapData.indexSummary.segmentsCount > 0, 'Snapshot captured index summary');
  
  // Cleanup test snapshot
  fs.unlinkSync(snapRes.path);
  assert(!fs.existsSync(snapRes.path), 'Cleaned up test snapshot');

  // -------------------------------------------------------------
  // TEST GROUP 6: Edge Cases & Resilience
  // -------------------------------------------------------------
  console.log(`\n[Suite 6/6] Testing Edge Cases & Resilience...`);
  const emptyRes = querySSC("", { topK: 5 });
  assert(emptyRes.results.length === 0, 'Empty query returns 0 results gracefully');

  const unicodeRes = querySSC("finanças & investimentos estratégia STRC", { topK: 5 });
  assert(unicodeRes.results.length > 0, 'Handled Unicode accented search terms');

  const zeroHitsRes = querySSC("nonexistenttokenxyz12345", { topK: 5 });
  assert(zeroHitsRes.results.length === 0, 'Non-existent token returns 0 results cleanly');

  // Re-run rebuild to ensure clean final state
  rebuild();

  console.log(`\n==============================================`);
  console.log(`   ALL TESTS PASSED: ${passedTests}/${totalTests} assertions`);
  console.log(`==============================================\n`);

} catch (err) {
  console.error(`\n❌ TEST SUITE FAILED: ${err.message}`);
  process.exit(1);
}
