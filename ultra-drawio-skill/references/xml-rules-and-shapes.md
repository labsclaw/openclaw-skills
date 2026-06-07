# XML Rules and Shapes Reference

> Load this reference when writing or debugging `mxGraph` XML structure.

## Minimal Valid Skeleton

```xml
<mxfile host="Electron" modified="" version="26.0.0">
  <diagram id="page-1" name="Page-1">
    <mxGraphModel dx="1422" dy="762" grid="1" gridSize="10" guides="1"
                  tooltips="1" connect="1" arrows="1" fold="1"
                  page="1" pageScale="1" pageWidth="1169" pageHeight="827"
                  math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        <!-- Your cells go here -->
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
```
**Rule**: ids `0` and `1` are ALWAYS required and must be the first two cells. Never reuse them.

## Vertex (Shapes)

Every vertex cell must have `vertex="1"` and an `mxGeometry` child:
```xml
<mxCell id="unique-id" value="Label"
        style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;"
        vertex="1" parent="1">
  <mxGeometry x="100" y="100" width="120" height="60" as="geometry" />
</mxCell>
```

## Edges (Connectors)

Standard edges require `source` and `target` attributes:
```xml
<mxCell id="edge-id" value=""
        style="edgeStyle=orthogonalEdgeStyle;html=1;"
        edge="1" source="source-id" target="target-id" parent="1">
  <mxGeometry relative="1" as="geometry" />
</mxCell>
```

### Floating Edges (Sequence Diagrams)

For Sequence diagram lifelines, do NOT use `source`/`target`. Use `sourcePoint` and `targetPoint` inside the geometry:

```xml
<mxCell id="lifA" value="" style="edgeStyle=none;dashed=1;endArrow=none;" edge="1" parent="1">
  <mxGeometry relative="1" as="geometry">
    <mxPoint x="140" y="160" as="sourcePoint" />
    <mxPoint x="140" y="700" as="targetPoint" />
  </mxGeometry>
</mxCell>
```

## Critical Rules
- Every cell `id` must be globally unique within the diagram page.
- Every cell's `parent` must reference an existing cell id.
- Use `html=1` in style when the label contains HTML (`<b>`, `<i>`, `<br>`).
- Escape XML special characters in labels: `&` => `&amp;`, `<` => `&lt;`, `>` => `&gt;`.

## Semantic Color Palette

| Purpose | fillColor | strokeColor |
|---|---|---|
| Primary / Info | `#dae8fc` | `#6c8ebf` |
| Success / Start | `#d5e8d4` | `#82b366` |
| Warning / Decision | `#fff2cc` | `#d6b656` |
| Error / End | `#f8cecc` | `#b85450` |
| Neutral | `#f5f5f5` | `#666666` |

## Common Style Strings

```text
# Rounded process box
rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;

# Decision diamond
rhombus;whiteSpace=wrap;html=1;fillColor=#fff2cc;strokeColor=#d6b656;

# Start/End terminal
ellipse;whiteSpace=wrap;html=1;fillColor=#d5e8d4;strokeColor=#82b366;

# Swimlane container (tier)
swimlane;startSize=30;fillColor=#dae8fc;strokeColor=#6c8ebf;fontStyle=1;

# ER relationship (crow's foot)
edgeStyle=entityRelationEdgeStyle;html=1;endArrow=ERmany;startArrow=ERone;
```
