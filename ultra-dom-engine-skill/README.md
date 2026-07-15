# ultra-dom-engine — Quick Reference

## Inject (one-time per page)

```javascript
// Read inject-dom-engine.js and inject via evaluate
const code = fs.readFileSync('openclaw-skills/ultra-dom-engine-skill/inject-dom-engine.js', 'utf8');
// → browser act:evaluate with the code
```

## Get DOM Context

```javascript
// browser act:evaluate
(() => JSON.stringify(window.getInteractiveContext({ injectTrackers: true })))()
```

Returns: `{ interactiveElements: { buttons, inputs, links, ... }, scrollInfo: { ... } }`

## Execute Actions

```javascript
// browser act:evaluate
(() => JSON.stringify(window.executeActions([
  { agenticPurposeId: "abc12345", actionType: "type", value: "hello" },
  { agenticPurposeId: "def67890", actionType: "click" }
])))()
```

## Smart Scroll

```javascript
// browser act:evaluate
(() => JSON.stringify(window.scrollToNewContent()))()
```

## Workflow

1. Inject dom-engine → `inject-dom-engine.js`
2. Get context → `getInteractiveContext()`
3. Map `agenticPurposeId` to element purposes
4. Execute → `executeActions([{ agenticPurposeId, actionType, value }])`
5. Scroll if needed → `scrollToNewContent()`
6. Re-snapshot or re-getContext for verification
