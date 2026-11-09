#!/usr/bin/env node
/**
 * ssc-memory-lint.cjs — Memory Integrity Linter for SSC
 *
 * Turns the "fail closed" discipline into an executable check.
 * Validates index.json + segment files against integrity rules that the
 * router cannot enforce at query time (it only scores; it does not audit).
 *
 * Checks:
 *   E1  duplicate segment id
 *   E2  segment file referenced but missing on disk
 *   E3  same file referenced by two entries
 *   E4  supersededBy points to an id that does not exist
 *   E5  supersedes / supersededBy not reciprocal
 *   E6  confidence value outside the allowed enum
 *   E7  certified confidence without certifiedBy/certifiedAt
 *   W1  segment has no confidence field (legacy, not yet certified)
 *   W2  accessCount > 0 but no lastUsedIn receipts (usage with no trace)
 *   W3  correctionCount > 0 while confidence is "certified" (stale certification)
 *   W4  segment older than 90 days and still tier HOT (staleness)
 *
 * Usage:
 *   node scripts/ssc-memory-lint.cjs                  # warn mode (default)
 *   node scripts/ssc-memory-lint.cjs --strict         # errors only, exit 1 on error
 *   node scripts/ssc-memory-lint.cjs --json           # machine-readable
 *   node scripts/ssc-memory-lint.cjs --index <path>   # explicit index.json
 *
 * Exit codes: 0 = clean or warnings-only, 1 = errors found (strict) or parse failure.
 */

const fs = require('fs');
const path = require('path');

const CONFIDENCE_ENUM = ['certified', 'observed', 'inferred'];
const STALE_DAYS = 90;

/**
 * Find the workspace by walking up and collecting every memory/index.json.
 * Pick the one with the MOST segments — an empty or stub index higher up the
 * tree must never shadow the real one. A 0-segment index would otherwise make
 * the linter report "Clean", which is a false negative (fail-open) and defeats
 * the purpose of the tool.
 */
function findWorkspace(startDir) {
  const candidates = [];
  let dir = startDir;
  for (let i = 0; i < 8; i++) {
    const indexPath = path.join(dir, 'memory', 'index.json');
    if (fs.existsSync(indexPath)) {
      let count = -1;
      try {
        const parsed = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
        count = Array.isArray(parsed.segments) ? parsed.segments.length : 0;
      } catch {
        count = -1;
      }
      candidates.push({ dir, count });
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.count - a.count);
  return candidates[0].dir;
}

function resolvePaths(opts) {
  if (opts.index) {
    const indexPath = path.resolve(opts.index);
    return { indexPath, workspaceDir: path.dirname(path.dirname(indexPath)) };
  }
  const workspaceDir =
    process.env.OPENCLAW_WORKSPACE || findWorkspace(__dirname);
  if (!workspaceDir) {
    throw new Error(
      'Could not locate workspace (no memory/index.json found upward from script). Set OPENCLAW_WORKSPACE.'
    );
  }
  return {
    indexPath: path.join(workspaceDir, 'memory', 'index.json'),
    workspaceDir,
  };
}

function daysSince(iso) {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.now() - t) / 86400000);
}

/**
 * Lint an index object. Pure function — no I/O, so it is testable.
 * @param {object} index  parsed index.json
 * @param {(relPath: string) => boolean} fileExists  resolver for segment files
 * @returns {{errors: object[], warnings: object[], stats: object}}
 */
function lintIndex(index, fileExists) {
  const errors = [];
  const warnings = [];

  const segments = Array.isArray(index.segments) ? index.segments : [];
  const byId = new Map();
  const byFile = new Map();

  for (const seg of segments) {
    // E1 duplicate id
    if (byId.has(seg.id)) {
      errors.push({
        code: 'E1',
        id: seg.id,
        message: `duplicate segment id "${seg.id}"`,
      });
    } else {
      byId.set(seg.id, seg);
    }

    // E2 missing file
    if (!seg.file) {
      errors.push({
        code: 'E2',
        id: seg.id,
        message: `segment "${seg.id}" has no file field`,
      });
    } else if (!fileExists(seg.file)) {
      errors.push({
        code: 'E2',
        id: seg.id,
        message: `segment "${seg.id}" references missing file "${seg.file}"`,
      });
    }

    // E3 duplicate file reference
    if (seg.file) {
      if (byFile.has(seg.file)) {
        errors.push({
          code: 'E3',
          id: seg.id,
          message: `file "${seg.file}" referenced by both "${byFile.get(seg.file)}" and "${seg.id}"`,
        });
      } else {
        byFile.set(seg.file, seg.id);
      }
    }

    // E6 confidence enum
    if (seg.confidence !== undefined && !CONFIDENCE_ENUM.includes(seg.confidence)) {
      errors.push({
        code: 'E6',
        id: seg.id,
        message: `confidence "${seg.confidence}" not in [${CONFIDENCE_ENUM.join(', ')}]`,
      });
    }

    // E7 certified without attestation
    if (seg.confidence === 'certified' && !seg.certifiedBy) {
      errors.push({
        code: 'E7',
        id: seg.id,
        message: 'confidence "certified" requires certifiedBy',
      });
    }
    if (seg.confidence === 'certified' && !seg.certifiedAt) {
      errors.push({
        code: 'E7',
        id: seg.id,
        message: 'confidence "certified" requires certifiedAt',
      });
    }

    // W1 no confidence field
    if (seg.confidence === undefined) {
      warnings.push({
        code: 'W1',
        id: seg.id,
        message: 'no confidence field (legacy entry — treat as "inferred" until certified)',
      });
    }

    // W2 usage with no receipts
    if (
      typeof seg.accessCount === 'number' &&
      seg.accessCount > 0 &&
      (!Array.isArray(seg.lastUsedIn) || seg.lastUsedIn.length === 0)
    ) {
      warnings.push({
        code: 'W2',
        id: seg.id,
        message: `accessCount=${seg.accessCount} but no lastUsedIn receipts (usage with no trace)`,
      });
    }

    // W3 stale certification
    if (seg.confidence === 'certified' && (seg.correctionCount || 0) > 0) {
      warnings.push({
        code: 'W3',
        id: seg.id,
        message: `certified but correctionCount=${seg.correctionCount} — certification may be stale, re-attest`,
      });
    }

    // W4 stale HOT
    const age = daysSince(seg.lastUpdated || seg.created);
    if (seg.tier === 'HOT' && age !== null && age > STALE_DAYS) {
      warnings.push({
        code: 'W4',
        id: seg.id,
        message: `tier HOT but last updated ${age} days ago (>${STALE_DAYS}) — demote or re-verify`,
      });
    }
  }

  // E4/E5 supersession integrity (second pass — needs full id set)
  for (const seg of segments) {
    if (Array.isArray(seg.supersedes)) {
      for (const target of seg.supersedes) {
        if (!byId.has(target)) {
          errors.push({
            code: 'E4',
            id: seg.id,
            message: `supersedes points to unknown id "${target}"`,
          });
        } else {
          const other = byId.get(target);
          const back = Array.isArray(other.supersededBy) ? other.supersededBy : [];
          if (!back.includes(seg.id)) {
            errors.push({
              code: 'E5',
              id: seg.id,
              message: `supersedes "${target}" but "${target}".supersededBy does not list "${seg.id}"`,
            });
          }
        }
      }
    }
    if (Array.isArray(seg.supersededBy)) {
      for (const target of seg.supersededBy) {
        if (!byId.has(target)) {
          errors.push({
            code: 'E4',
            id: seg.id,
            message: `supersededBy points to unknown id "${target}"`,
          });
        } else {
          const other = byId.get(target);
          const back = Array.isArray(other.supersedes) ? other.supersedes : [];
          if (!back.includes(seg.id)) {
            errors.push({
              code: 'E5',
              id: seg.id,
              message: `supersededBy "${target}" but "${target}".supersedes does not list "${seg.id}"`,
            });
          }
        }
      }
    }
  }

  const certified = segments.filter((s) => s.confidence === 'certified').length;
  const observed = segments.filter((s) => s.confidence === 'observed').length;
  const inferred = segments.filter((s) => s.confidence === 'inferred').length;
  const legacy = segments.filter((s) => s.confidence === undefined).length;

  return {
    errors,
    warnings,
    stats: {
      segments: segments.length,
      certified,
      observed,
      inferred,
      legacy,
      supersededPairs: segments.filter((s) => Array.isArray(s.supersedes)).length,
      errors: errors.length,
      warnings: warnings.length,
    },
  };
}

function main() {
  const argv = process.argv.slice(2);
  const strict = argv.includes('--strict');
  const asJson = argv.includes('--json');
  const idxFlag = argv.indexOf('--index');
  const indexOpt = idxFlag >= 0 ? argv[idxFlag + 1] : null;

  let paths;
  try {
    paths = resolvePaths({ index: indexOpt });
  } catch (err) {
    console.error(`ERROR: ${err.message}`);
    process.exit(1);
  }

  let index;
  try {
    index = JSON.parse(fs.readFileSync(paths.indexPath, 'utf8'));
  } catch (err) {
    console.error(`ERROR: cannot parse ${paths.indexPath}: ${err.message}`);
    process.exit(1);
  }

  const fileExists = (rel) => fs.existsSync(path.join(paths.workspaceDir, rel));
  const result = lintIndex(index, fileExists);

  // Fail closed: an index with zero segments is not "clean", it is unverified.
  // Reporting "Clean" here would hide a wrong path or a corrupted index.
  if (result.stats.segments === 0) {
    result.errors.push({
      code: 'E0',
      id: null,
      message: `index has 0 segments — refusing to report clean. Check the path (${paths.indexPath}) or rebuild the index.`,
    });
    result.stats.errors = result.errors.length;
  }

  if (asJson) {
    console.log(JSON.stringify({ indexPath: paths.indexPath, ...result }, null, 2));
  } else {
    console.log(`\n=== SSC Memory Lint — ${paths.indexPath} ===`);
    console.log(
      `Segments: ${result.stats.segments} | certified: ${result.stats.certified} | observed: ${result.stats.observed} | inferred: ${result.stats.inferred} | legacy: ${result.stats.legacy}`
    );
    if (result.errors.length) {
      console.log(`\nErrors (${result.errors.length}):`);
      for (const e of result.errors) console.log(`  [${e.code}] ${e.message}`);
    }
    if (result.warnings.length) {
      console.log(`\nWarnings (${result.warnings.length}):`);
      for (const w of result.warnings.slice(0, 25)) console.log(`  [${w.code}] ${w.message}`);
      if (result.warnings.length > 25) {
        console.log(`  ... and ${result.warnings.length - 25} more`);
      }
    }
    if (!result.errors.length && !result.warnings.length) {
      console.log('\nClean — no integrity issues found.');
    } else if (!result.errors.length) {
      console.log('\nNo blocking errors. Warnings above are advisory; address them before trusting decisions built on these segments.');
    }
    console.log('');
  }

  if (strict && result.errors.length > 0) process.exit(1);
  process.exit(0);
}

if (require.main === module) main();

module.exports = { lintIndex, CONFIDENCE_ENUM, STALE_DAYS };
