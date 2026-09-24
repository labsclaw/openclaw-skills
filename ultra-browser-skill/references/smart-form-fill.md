# Smart Form Fill Reference

Direct JavaScript DOM injection for dynamic SPAs (React, Vue, Angular, Svelte).

## Framework Detection
Detect framework fibers via in-page JavaScript evaluation:
```javascript
const isReact = !!document.querySelector('[data-reactroot], #root [class*="react"]');
```

## React Input Value Dispatch
```javascript
function setReactValue(input, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}
```
