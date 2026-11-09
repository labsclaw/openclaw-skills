#!/usr/bin/env node
'use strict';
// Optional, read-only evidence gate. Retrieval scores are deliberately not inputs.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const hash = data => createHash('sha256').update(data).digest('hex');
const nonempty = x => typeof x === 'string' && x.trim().length > 0;
const strings = x => Array.isArray(x) && x.every(nonempty);
function gate(request, claims, root) {
  const issues = [], evidence = [];
  if (!request || !nonempty(request.entity) || !strings(request.facets) || !request.facets.length ||
      !Number.isFinite(Date.parse(request.at)) || !Array.isArray(claims)) {
    return { status: 'invalid', issues: ['invalid_request_or_corpus'], evidence: [], missing: [] };
  }
  const at = Date.parse(request.at);
  const maxAgeDays = request.maxAgeDays ?? 90;
  if (!Number.isFinite(maxAgeDays) || maxAgeDays < 0) return { status: 'invalid', issues: ['invalid_max_age'], evidence: [], missing: [] };
  const entities = new Set(claims.filter(c => c && (c.entity === request.entity ||
    (Array.isArray(c.aliases) && c.aliases.includes(request.entity)))).map(c => c.entity));
  if (entities.size > 1) return { status: 'conflict', issues: ['ambiguous_entity'], evidence: [], missing: request.facets };
  const entity = [...entities][0] ?? request.entity;
  const scoped = claims.filter(c => c && c.entity === entity && request.facets.includes(c.facet));
  const byId = new Map();
  for (const c of scoped) {
    if (!nonempty(c.id) || byId.has(c.id)) issues.push('duplicate_or_missing_id');
    byId.set(c.id, c);
  }
  const replaced = new Set(), visiting = new Set(), visited = new Set();
  function visit(c) {
    if (visiting.has(c.id)) { issues.push('supersession_cycle'); return; }
    if (visited.has(c.id)) return;
    visiting.add(c.id);
    if (c.supersedes !== undefined && !strings(c.supersedes)) issues.push('invalid_supersedes');
    for (const id of (strings(c.supersedes) ? c.supersedes : [])) {
      const old = byId.get(id);
      if (!old || old.facet !== c.facet) { issues.push('dangling_or_cross_facet_supersession'); continue; }
      // Even an expired successor must not resurrect an obsolete decision.
      replaced.add(id); visit(old);
    }
    visiting.delete(c.id); visited.add(c.id);
  }
  scoped.forEach(visit);
  let rootReal;
  try { rootReal = fs.realpathSync(root); } catch { issues.push('invalid_root'); }
  for (const c of scoped) {
    if (replaced.has(c.id) || c.status === 'superseded') continue;
    if (c.status === 'contested') { issues.push('contested_fact'); continue; }
    if (c.status !== 'active' || !nonempty(c.value)) { issues.push('invalid_fact'); continue; }
    if (!['observed', 'certified'].includes(c.confidence)) { issues.push('unverified_fact'); continue; }
    if (c.confidence === 'certified' && (!nonempty(c.certifiedBy) ||
        !Number.isFinite(Date.parse(c.certifiedAt)) || Date.parse(c.certifiedAt) > at ||
        !Number.isInteger(c.correctionCount) || c.correctionCount !== 0)) {
      issues.push('invalid_attestation'); continue;
    }
    const verified = Date.parse(c.verifiedAt);
    if (!Number.isFinite(verified) || verified > at || at - verified > maxAgeDays * 86400000 ||
        (c.validUntil !== undefined && (!Number.isFinite(Date.parse(c.validUntil)) || Date.parse(c.validUntil) <= at))) {
      issues.push('stale_or_invalid_date'); continue;
    }
    try {
      if (!rootReal || !c.source || !nonempty(c.source.file) || !nonempty(c.source.quote) ||
          !nonempty(c.source.sha256) || path.isAbsolute(c.source.file)) throw Error();
      const file = fs.realpathSync(path.resolve(rootReal, c.source.file));
      const relative = path.relative(rootReal, file);
      if (relative.startsWith('..') || path.isAbsolute(relative)) throw Error();
      const bytes = fs.readFileSync(file), content = bytes.toString('utf8');
      if (hash(bytes) !== c.source.sha256 || !content.includes(c.source.quote)) throw Error();
      evidence.push({ id: c.id, entity, facet: c.facet, value: c.value, confidence: c.confidence,
        verifiedAt: c.verifiedAt, source: { ...c.source, line: content.slice(0, content.indexOf(c.source.quote)).split('\n').length } });
    } catch { issues.push('source_missing_changed_or_outside_root'); }
  }
  const missing = [...new Set(request.facets)].filter(f => !evidence.some(e => e.facet === f));
  const conflicts = request.facets.filter(f => new Set(evidence.filter(e => e.facet === f).map(e => e.value)).size > 1);
  const conflict = conflicts.length || issues.some(i => ['contested_fact', 'supersession_cycle', 'duplicate_or_missing_id'].includes(i));
  const status = conflict ? 'conflict' : issues.length || missing.length ? (scoped.length ? 'partial' : 'missing') : 'sufficient';
  return { status, entity, missing, conflicts, issues: [...new Set(issues)], evidence,
    receipt: { evaluatedAt: request.at, requestSha256: hash(JSON.stringify(request)), corpusSha256: hash(JSON.stringify(claims)) } };
}
if (require.main === module) {
  try {
    const [requestFile, claimsFile, root] = process.argv.slice(2);
    if (!requestFile || !claimsFile || !root) throw Error('Usage: ssc-evidence.cjs request.json claims.json workspace');
    const result = gate(JSON.parse(fs.readFileSync(requestFile)), JSON.parse(fs.readFileSync(claimsFile)), root);
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.status === 'sufficient' ? 0 : 2;
  } catch (e) { console.error(e.message); process.exitCode = 1; }
}
module.exports = { gate, hash };
