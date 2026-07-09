---
name: ultra-drawio-skill
description: >-
  Use when creating, editing, validating, or converting draw.io diagrams (.drawio, .xml).
  Trigger terms: diagram, flowchart, architecture, draw.io, UML, network topology, sequence diagram.
category: development
tags: [design, architecture, documentation]
---

# Ultra Draw.io Skill

Generate, edit, validate, and export draw.io (`.drawio`) XML diagrams.

## Setup

```bash
cp -r ultra-drawio-skill/ ~/.openclaw/skills/ultra-drawio-skill/
cd ~/.openclaw/skills/ultra-drawio-skill/scripts && npm install
```

Python 3 required for validation.

## When to Use / Don't Use

**Use:** new diagrams, editing `.drawio`, validating XML, exporting to PNG.
**Don't:** editing `.png` directly, Graphviz-style layout (unless explicitly asked).

## Workflow

1. **Understand** — diagram type, entities, relationships, output path.
2. **Template or fresh** — see [references/templates.md](references/templates.md); or use `mxGraphModel` skeleton (IDs `0`/`1` required).
3. **Generate XML** — build vertices/edges. Read [references/xml-rules-and-shapes.md](references/xml-rules-and-shapes.md) for floating edges, containers, swimlanes.
4. **Layout** — align shapes, semantic colors, 30px margins, prevent overlap. See [references/design-and-layout.md](references/design-and-layout.md).
5. **Validate** — `python scripts/validate-drawio.py <file.drawio>`
6. **Export** — `node scripts/drawio-to-png.mjs <input.drawio> [output.png]`

## Architecture

```
ultra-drawio-skill/
├── SKILL.md
├── references/
│   ├── xml-rules-and-shapes.md
│   ├── design-and-layout.md
│   └── templates.md
└── scripts/
    ├── drawio-to-png.mjs
    ├── validate-drawio.py
    └── find_aws_icon.py
```

## Tools & Examples

| Tool | Usage |
|------|-------|
| `read_file` | Read existing `.drawio` files |
| `write_to_file` | Save generated XML |
| `run_command` | Execute scripts |

```bash
python scripts/add-shape.py docs/arch.drawio "New Service" 700 380
python scripts/find_aws_icon.py "ec2"
```

## Best Practices

1. Multi-page diagrams (`<diagram>`) for complex systems.
2. Remove background color (`background="#ffffff"`) for dark-mode.
3. Always validate XML before handoff.

## Checklist

- [ ] `id=0` and `id=1` exist as first two cells
- [ ] No overlap (30px margin rule)
- [ ] Arrows in back layer (after Title)
- [ ] Passed `validate-drawio.py`

## References

- [XML Rules & Shapes](references/xml-rules-and-shapes.md)
- [Design & Layout](references/design-and-layout.md)
- [Templates](references/templates.md)

## License

Apache-2.0.
