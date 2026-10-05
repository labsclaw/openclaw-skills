# Skill library benchmarks

This document records external design evidence for the LabsClaw organizational
skill library. It is a source ledger, not an adoption roadmap.

## Decision

LabsClaw will improve its OpenClaw skill supply chain using externally observed
patterns. It will not adopt Manus, depend on Manus, or target Manus compatibility.

## Sources

### Manus Skills

- Source: https://manus.im/docs/features/skills
- Checked: 2026-10-04
- Relevant evidence:
  - progressive disclosure separates metadata, instructions, and resources;
  - community skills should be reviewed before activation;
  - successful workflows can be captured as reusable skills;
  - skills describe operating procedures while MCP supplies data and tools.
- Rejected for this project:
  - Manus adoption;
  - Manus packaging compatibility;
  - Manus-specific invocation or distribution.

### LiveKit Agent Skills

- Source: https://github.com/livekit/agent-skills
- Commit reviewed: `5d7488b118c279812b89e73a9bee8474d1fe00a1`
- License: MIT
- Checked: 2026-10-04
- Relevant evidence:
  - one job per skill, with explicit handoffs to adjacent skills;
  - descriptions are the routing interface and must be evaluated as a set;
  - conceptual procedures outlive copied API surfaces and version tables;
  - current facts come from live documentation, CLI help, or source;
  - structural validation is cheap enough for every pull request;
  - trigger evaluations need realistic positive and near-miss cases;
  - output evaluations compare work with and without a skill;
  - evaluation fixtures must be credential-free and unable to spend cloud resources;
  - content hashes are more reliable than manually maintained skill versions.
- Rejected for this project:
  - Claude-specific evaluation commands as the only harness;
  - LiveKit plugin packaging;
  - automatic public distribution before LabsClaw chooses a repository license.

### Agent Skills format

- Source: https://agentskills.io
- Relationship: both repositories identify this as their common file format.
- Use here: structural interoperability baseline only. OpenClaw governance and
  security rules remain authoritative for LabsClaw.

## Revalidation

Re-check documentation after 30 days and repository design evidence after 90
days, or earlier when either project changes its skill format or evaluation model.
