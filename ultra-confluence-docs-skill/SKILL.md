---
name: ultra-confluence-docs-skill
description: >-
  Generate ADRs, runbooks, architecture docs, KT handoffs. Trigger: ADR,
  runbook, architecture decision, knowledge transfer, write docs, doc template.
---

# Ultra Confluence Docs

Production-grade documentation templates. Generates ADRs, runbooks, architecture docs, KT handoffs.

## When to Use

- Creating Architecture Decision Records (ADRs)
- Writing operational runbooks with rollback
- Documenting system architecture
- Producing knowledge transfer handoffs
- Writing technical specifications

## When NOT to Use

- Code implementation → `coding-agent`
- Ticket management
- Quick notes → plain markdown

## Documentation Types

### 1. ADR (Architecture Decision Record)
**Template:** `templates/adr-template.md`  
**Naming:** `docs/adr/ADR-XXX-{description}.md`
1. Assign next sequential number
2. Fill all sections (especially "Context" + "Consequences")
3. Set status: "Proposed" → "Accepted"/"Superseded"

### 2. Runbook
**Template:** `templates/runbook-template.md`  
**Naming:** `docs/runbooks/{operation}-runbook.md`
1. List prerequisites with checkboxes
2. Write imperative steps with expected output
3. Include failure paths for every step
4. Add rollback section
5. Test on staging

### 3. Architecture Document
**Template:** `templates/architecture-template.md`  
**Naming:** `docs/architecture/{system}-architecture.md`
1. Overview + goals
2. Architecture diagram (ASCII or Excalidraw link)
3. Each component: purpose, location, dependencies
4. Security, performance, monitoring

### 4. Knowledge Transfer (KT)
**Template:** `templates/kt-template.md`  
**Naming:** `docs/KT-{TICKET}-{topic}.md`
1. Write while context is fresh
2. Include "Gotchas" section
3. Reference tickets + ADRs
4. Keep "Future Work" honest

## Scripted Helpers

### `scripts/new-adr.sh`
```bash
bash scripts/new-adr.sh "Title"
# Outputs: docs/adr/ADR-XXX-title.md
```

### `scripts/new-runbook.sh`
```bash
bash scripts/new-runbook.sh "operation-name"
# Outputs: docs/runbooks/operation-name-runbook.md
```

### `scripts/new-kt.sh`
```bash
bash scripts/new-kt.sh "TICKET-123" "Topic Name"
# Outputs: docs/KT-TICKET-123-topic-name.md
```

## Output Locations

| Doc Type | Location | Pattern |
|----------|----------|---------|
| ADRs | `docs/adr/` | `ADR-XXX-{desc}.md` |
| Runbooks | `docs/runbooks/` | `{op}-runbook.md` |
| Architecture | `docs/architecture/` | `{system}-architecture.md` |
| KT Docs | `docs/` | `KT-{TICKET}-{topic}.md` |
| Technical Docs | `docs/technical/` | `{desc}.md` |

## Quality Checklist

- [ ] Clear, descriptive title
- [ ] Proper heading hierarchy (H1 > H2 > H3)
- [ ] Code blocks with language tags
- [ ] Links to related docs
- [ ] Author + date included
- [ ] No sensitive data
- [ ] All placeholders replaced
- [ ] Reviewed by another person (ADRs/architecture)

## Anti-Patterns

- **Skipping "Context" in ADRs.** Future readers won't understand why.
- **Runbooks without failure paths.** Document what to do when steps fail.
- **Architecture docs without diagrams.** Include ASCII at minimum.
- **KT docs written weeks later.** Write while work is fresh.
- **Over-documenting.** Focus: decisions, tradeoffs, gotchas.

## License

Apache-2.0.