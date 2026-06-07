---
name: ultra-drawio-skill
description: >-
  Use when creating, editing, validating, or converting draw.io diagrams (.drawio, .xml).
  Also use when the user asks for flowcharts, ER diagrams, sequence diagrams, UML,
  or cloud architecture visuals. Trigger terms: diagram, flowchart, architecture,
  draw.io, UML, network topology, sequence diagram.
category: development
tags:
  - design
  - architecture
  - documentation
---

# Ultra Draw.io Skill

The ultimate system for generating, editing, validating, and exporting draw.io (`.drawio`) XML diagrams. This skill combines structural validity with aesthetic design principles to produce professional, presentation-ready diagrams.

## Installation

```bash
cp -r ultra-drawio-skill/ ~/.openclaw/skills/ultra-drawio-skill/
```

## Setup

The `scripts/` folder contains export utilities. For Node.js-based rendering:
```bash
cd ~/.openclaw/skills/ultra-drawio-skill/scripts && npm install
```
(Python 3 is required to run the validation scripts.)

## When to Use This Skill

- Creating new diagrams (flowchart, architecture, UML, ER, sequence)
- Editing existing `.drawio` files to add shapes or connectors
- Validating the structural integrity of a draw.io XML file
- Exporting `.drawio` to PNG for embedding in Markdown/Quarto slides

## When NOT to Use This Skill

- Editing binary `.png` files directly (always edit the source `.drawio` file)
- Generating complex graph network visualizations that require automated layout algorithms like Graphviz (unless explicitly asked to use draw.io)

## How It Works

### Step 1: Understand the Request
Determine diagram type, entities, relationships, and the output path.

### Step 2: Use Templates or Start Fresh
- **Use a template**: Check [references/templates.md](references/templates.md) for quick-start XML.
- **Start fresh**: Use the basic `mxGraphModel` skeleton. **Rule:** IDs `0` and `1` are ALWAYS required as the root and main layer.

### Step 3: Generate mxGraph XML
Construct vertices and edges.
**Important**: Read [references/xml-rules-and-shapes.md](references/xml-rules-and-shapes.md) for sequence diagrams (floating edges) and container/swimlane logic.

### Step 4: Layout and Design Principles
Align shapes, choose semantic colors, and prevent overlap.
**Important**: Read [references/design-and-layout.md](references/design-and-layout.md) for 30px margin rules, Japanese text width, and AWS icon search.

### Step 5: Validate
Always validate generated diagrams:
```bash
python scripts/validate-drawio.py <path-to-file.drawio>
```

### Step 6: Export
If the user needs an image, use the Node.js export script (which embeds the XML inside the PNG):
```bash
node scripts/drawio-to-png.mjs <input.drawio> [output.png]
```

## Architecture

```
ultra-drawio-skill/
├── SKILL.md                          ← Core agent workflow
├── references/                       ← Deep context (load on demand)
│   ├── xml-rules-and-shapes.md       ← mxGraph XML & shape styles
│   ├── design-and-layout.md          ← Margins, coordinates, AWS icons
│   └── templates.md                  ← Quick-start snippets
└── scripts/                          ← Executable helpers
    ├── drawio-to-png.mjs             ← PNG export tool
    ├── validate-drawio.py            ← XML structure validator
    └── find_aws_icon.py              ← AWS icon search
```

## Allowed Tools

- `read_file` — to read existing `.drawio` files
- `write_to_file` — to save generated XML
- `run_command` — to execute Python validators and Node.js export scripts

## Usage / Examples

**Adding a shape safely**:
```bash
python scripts/add-shape.py docs/arch.drawio "New Service" 700 380
```

**Finding an AWS Icon**:
```bash
python scripts/find_aws_icon.py "ec2"
```

## Best Practices

1. **Progressive Disclosure**: Use multi-page diagrams (`<diagram>`) for complex systems.
2. **Transparency**: Remove background color (`background="#ffffff"`) for better dark-mode compatibility.
3. **Safety**: Always validate XML before handing off to the user.

## Reference

- [XML Rules & Shapes](references/xml-rules-and-shapes.md)
- [Design & Layout Guidelines](references/design-and-layout.md)
- [Templates](references/templates.md)

## Checklist

- [ ] `id=0` and `id=1` exist as the first two cells
- [ ] No internal elements overlap their background frames (30px margin)
- [ ] Arrows are placed in the back layer (right after Title)
- [ ] Passed `validate-drawio.py` check

## License

Apache-2.0. Synthesized from community agent-skills for OpenClaw.

## Contributing

Submit improvements by opening a PR against the `ultra-drawio-skill` directory in the main skills repository.

## About

This is an "Ultra" skill, compiled using the rigor of `ultra-create-skill`. It combines the best of the Copilot `draw-io-diagram-generator`, `drawio` node scripts, and `agent-toolkit` design guidelines into a single, cohesive workflow.
