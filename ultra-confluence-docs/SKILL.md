---
name: ultra-confluence-docs
description: >-
  Generate standardized technical documentation: Architecture Decision Records
  (ADRs), operational runbooks, system architecture docs, knowledge transfer
  documents, and technical specifications. Use when creating ADRs, writing
  runbooks, documenting architecture, or producing KT handoff docs.
  Trigger terms: ADR, architecture decision, runbook, architecture doc,
  knowledge transfer, KT, technical spec, documentation, doc template,
  write docs, create ADR, write runbook, document architecture.
---

# Ultra Confluence Docs

Production-grade documentation templates for technical teams. Generates
consistent, high-quality ADRs, runbooks, architecture documents, and
knowledge transfer handoffs.

---

## When This Skill Applies

- Creating Architecture Decision Records (ADRs)
- Writing operational runbooks with rollback procedures
- Documenting system architecture and component design
- Producing knowledge transfer (KT) documents for handoffs
- Writing technical specifications

## When NOT to Use

- Code implementation (use coding-agent or IDE)
- Ticket management (use project management tools)
- Quick notes or meeting minutes (use plain markdown)

---

## Documentation Types

### 1. ADR (Architecture Decision Record)

**Use for:** Capturing architectural decisions with context, rationale, and consequences.

**Template:** `templates/adr-template.md`

**Naming:** `docs/adr/ADR-XXX-{short-description}.md`

**Workflow:**
1. Assign next sequential number (check existing ADRs)
2. Fill all sections — especially "Context" and "Consequences"
3. Set status to "Proposed" initially
4. After review, update to "Accepted" or "Superseded"

### 2. Runbook

**Use for:** Step-by-step operational procedures with error handling and rollback.

**Template:** `templates/runbook-template.md`

**Naming:** `docs/runbooks/{operation-name}-runbook.md`

**Workflow:**
1. List all prerequisites with checkboxes
2. Write steps as imperative commands with expected output
3. Include failure paths for every step
4. Add rollback section before publishing
5. Test the runbook on a staging environment

### 3. Architecture Document

**Use for:** System/component design documentation with diagrams and analysis.

**Template:** `templates/architecture-template.md`

**Naming:** `docs/architecture/{system-name}-architecture.md`

**Workflow:**
1. Start with clear overview and goals
2. Draw architecture diagram (ASCII or link to Excalidraw/draw.io)
3. Document each component with purpose, location, dependencies
4. Cover security, performance, and monitoring

### 4. Knowledge Transfer (KT)

**Use for:** Handoff documents after completing significant work.

**Template:** `templates/kt-template.md`

**Naming:** `docs/KT-{ticket}-{topic}.md`

**Workflow:**
1. Write while the context is fresh (during or right after implementation)
2. Include "Gotchas" section — things that surprised you
3. Reference all related tickets and ADRs
4. Keep "Future Work" honest — what's actually next

---

## Scripted Helpers

### `scripts/new-adr.sh`

Creates a new ADR with the next available number:

```bash
# Usage: bash scripts/new-adr.sh "Title of the Decision"
# Outputs: docs/adr/ADR-XXX-title-of-the-decision.md
```

### `scripts/new-runbook.sh`

Creates a new runbook from template:

```bash
# Usage: bash scripts/new-runbook.sh "operation-name"
# Outputs: docs/runbooks/operation-name-runbook.md
```

### `scripts/new-kt.sh`

Creates a new KT document:

```bash
# Usage: bash scripts/new-kt.sh "TICKET-123" "Topic Name"
# Outputs: docs/KT-TICKET-123-topic-name.md
```

---

## Documentation Output Locations

| Doc Type       | Location                  | Naming Pattern                              |
|----------------|---------------------------|---------------------------------------------|
| ADRs           | `docs/adr/`               | `ADR-XXX-{description}.md`                  |
| Runbooks       | `docs/runbooks/`          | `{operation}-runbook.md`                    |
| Architecture   | `docs/architecture/`      | `{system}-architecture.md`                  |
| KT Docs        | `docs/`                   | `KT-{TICKET}-{topic}.md`                    |
| Technical Docs | `docs/technical/`         | `{description}.md`                          |

---

## Quality Checklist

Before publishing any documentation:

- [ ] Clear, descriptive title
- [ ] Proper heading hierarchy (H1 > H2 > H3)
- [ ] Code blocks with language tags
- [ ] Links to related documents (ADRs, tickets, runbooks)
- [ ] Author and date included
- [ ] No sensitive data (secrets, passwords, internal IPs)
- [ ] All placeholders replaced (no `{{TICKET_PREFIX}}` left)
- [ ] Reviewed by at least one other person (for ADRs and architecture docs)

---

## Anti-Patterns

- **Skipping "Context" in ADRs.** Without context, future readers won't understand why the decision was made.
- **Writing runbooks without failure paths.** If a step can fail, document what to do when it does.
- **Architecture docs without diagrams.** Text-only architecture docs are hard to parse. Include at least ASCII diagrams.
- **KT docs written from memory weeks later.** Write them while the work is fresh.
- **Over-documenting.** Don't document what's obvious. Focus on decisions, tradeoffs, and gotchas.

---

## Examples

See `examples/` for complete worked examples of each document type.
