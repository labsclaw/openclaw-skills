# Design and Layout Reference

> Load this reference for layout maths, aesthetics, accessibility, and AWS icons.

## Coordinate Math and Margins

When placing elements inside background frames (swimlanes/grouping boxes):
- **Rule**: Internal elements must have at least **30px margin** from the frame boundary.
- **Rule**: Account for rounded corners (`rounded=1`).

**Coordinate Calculation:**
```text
Frame: y=20, height=400 -> range is y=20 to y=420
Internal element top: frame y + 30 (e.g., y=50)
Internal element bottom: frame y + height - 30 (e.g., max y=390)
```

## Text Widths and Fonts

- For English text, allow ~10-15px per character.
- **For Japanese text**, allow **30-40px per character**. Insufficient width causes ugly line breaks.
- Set global font size appropriately for slides. Example Quarto slide setup:
  ```xml
  <mxGraphModel defaultFontFamily="Noto Sans" ...>
  ```
- Use `1.5x` standard font size (around 18px) for PDF/slide readability.

## Arrow Connections to Text Labels

For plain text elements (`style="text;..."`), `exitX`/`exitY` attributes often fail. Use explicit coordinates:

```xml
<mxCell id="arrow" style="..." edge="1" parent="1">
  <mxGeometry relative="1" as="geometry">
    <mxPoint x="1279" y="500" as="sourcePoint"/>
    <mxPoint x="119" y="500" as="targetPoint"/>
    <Array as="points">
      <mxPoint x="1279" y="560"/>
      <mxPoint x="119" y="560"/>
    </Array>
  </mxGeometry>
</mxCell>
```

## edgeLabel Offset Adjustment

To distance text labels from the arrow lines themselves, adjust the `offset` attribute:

```xml
<!-- Place above arrow (negative value) -->
<mxPoint x="0" y="-40" as="offset"/>

<!-- Place below arrow (positive value) -->
<mxPoint x="0" y="40" as="offset"/>
```

## Layering

- **Title**: Always place the title cell at the top of the file (e.g., `id=2`).
- **Arrows (Back Layer)**: Always place arrow XML definitions *right after the title*, before the shapes. This ensures arrows are drawn *behind* the boxes, preventing them from penetrating solid shapes.

## AWS Icons

To use the latest official AWS icons, utilize the included script to find the correct `style` string:

```bash
python scripts/find_aws_icon.py lambda
```
The script will return the correct `mxgraph.aws4.*` style string to apply to your `mxCell`.

## General Principles

- **Clarity over complexity**: If a diagram is too dense, split it into multiple pages (multiple `<diagram>` tags within `<mxfile>`).
- **Background**: Ensure `<mxGraphModel>` has no background color (remove `background="#ffffff"`) so the PNG export is transparent.
