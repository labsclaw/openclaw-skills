# Templates Reference

> Load this reference when starting a new diagram of a specific type.

## Flowchart Basic Loop

```xml
<!-- Start node -->
<mxCell id="start" value="Start" style="ellipse;whiteSpace=wrap;html=1;fillColor=#d5e8d4;strokeColor=#82b366;" vertex="1" parent="1">
  <mxGeometry x="500" y="80" width="120" height="60" as="geometry" />
</mxCell>

<!-- Process -->
<mxCell id="p1" value="Process Step" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;" vertex="1" parent="1">
  <mxGeometry x="500" y="200" width="120" height="60" as="geometry" />
</mxCell>

<!-- Decision -->
<mxCell id="d1" value="Condition?" style="rhombus;whiteSpace=wrap;html=1;fillColor=#fff2cc;strokeColor=#d6b656;" vertex="1" parent="1">
  <mxGeometry x="460" y="320" width="200" height="100" as="geometry" />
</mxCell>

<!-- Arrow: start to p1 -->
<mxCell id="e1" value="" style="edgeStyle=orthogonalEdgeStyle;html=1;" edge="1" source="start" target="p1" parent="1">
  <mxGeometry relative="1" as="geometry" />
</mxCell>
```

## Architecture (Swimlanes / Tiers)

Use swimlane containers for each tier. Children coordinates are *relative* to the swimlane.

```xml
<!-- Tier swimlane -->
<mxCell id="tier1" value="Client Layer" style="swimlane;startSize=30;fillColor=#dae8fc;strokeColor=#6c8ebf;fontStyle=1;" vertex="1" parent="1">
  <mxGeometry x="60" y="100" width="1050" height="130" as="geometry" />
</mxCell>

<!-- Service inside tier (parent="tier1", coords relative to tier1) -->
<mxCell id="webapp" value="Web App" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;" vertex="1" parent="tier1">
  <mxGeometry x="80" y="40" width="120" height="60" as="geometry" />
</mxCell>
```

## Sequence Diagram

Use floating edges (lifelines) and activation boxes.

```xml
<!-- Actor -->
<mxCell id="actorA" value="Client" style="shape=mxgraph.uml.actor;whiteSpace=wrap;html=1;" vertex="1" parent="1">
  <mxGeometry x="110" y="80" width="60" height="80" as="geometry" />
</mxCell>

<!-- Lifeline — floating edge -->
<mxCell id="lifA" value="" style="edgeStyle=none;dashed=1;endArrow=none;" edge="1" parent="1">
  <mxGeometry relative="1" as="geometry">
    <mxPoint x="140" y="160" as="sourcePoint" />
    <mxPoint x="140" y="700" as="targetPoint" />
  </mxGeometry>
</mxCell>

<!-- Activation box -->
<mxCell id="actA1" value="" style="fillColor=#dae8fc;strokeColor=#6c8ebf;" vertex="1" parent="1">
  <mxGeometry x="130" y="220" width="20" height="180" as="geometry" />
</mxCell>

<!-- Synchronous message -->
<mxCell id="msg1" value="POST /orders" style="edgeStyle=elbowEdgeStyle;elbow=vertical;html=1;endArrow=block;endFill=1;" edge="1" source="actA1" target="actorB" parent="1">
  <mxGeometry relative="1" as="geometry" />
</mxCell>
```
