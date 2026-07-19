# Ultra Browser Skill v5.1 — Test Suite 🧪

## Test Environment
- OS: Windows 11
- Browser: Chrome (via OpenClaw browser tool)
- Profile: user (existing Chrome sessions)

---

## 1. BASIC OPERATIONS

### 1.1 Browser Status
```json
{"action": "status"}
```
**Expected:** Browser available, profiles listed

### 1.2 List Tabs
```json
{"action": "tabs"}
```
**Expected:** Array of open tabs with IDs

### 1.3 Open Tab
```json
{"action": "open", "url": "https://example.com", "label": "test-1"}
```
**Expected:** Tab opens, label assigned

### 1.4 Close Tab
```json
{"action": "close", "targetId": "test-1"}
```
**Expected:** Tab closed

---

## 2. SNAPSHOT & READING

### 2.1 DOM Snapshot
```json
{"action": "snapshot", "targetId": "test-1", "refs": "aria"}
```
**Expected:** DOM tree with @e refs for interactive elements

### 2.2 Screenshot
```json
{"action": "screenshot", "targetId": "test-1"}
```
**Expected:** PNG screenshot of page

### 2.3 Annotated Screenshot
```json
{"action": "screenshot", "targetId": "test-1", "labels": true}
```
**Expected:** Screenshot with numbered interactive elements

---

## 3. ELEMENT INTERACTION

### 3.1 Click by Ref
```json
{"action": "act", "kind": "click", "ref": "e42", "targetId": "test-1"}
```
**Expected:** Element clicked, page state changes

### 3.2 Type Text
```json
{"action": "act", "kind": "type", "ref": "e42", "text": "Hello World", "targetId": "test-1"}
```
**Expected:** Text typed into input field

### 3.3 Fill Field
```json
{"action": "act", "kind": "fill", "ref": "e42", "text": "replaced text", "targetId": "test-1"}
```
**Expected:** Input field value replaced

### 3.4 Press Key
```json
{"action": "act", "kind": "press", "key": "Enter", "targetId": "test-1"}
```
**Expected:** Enter key pressed

### 3.5 Select Option
```json
{"action": "act", "kind": "select", "ref": "e42", "values": ["option1"], "targetId": "test-1"}
```
**Expected:** Dropdown option selected

### 3.6 Hover Element
```json
{"action": "act", "kind": "hover", "ref": "e42", "targetId": "test-1"}
```
**Expected:** Mouse hovers over element

### 3.7 Click Coordinates
```json
{"action": "act", "kind": "clickCoords", "x": 450, "y": 300, "targetId": "test-1"}
```
**Expected:** Click at pixel coordinates

---

## 4. JAVASCRIPT EXECUTION

### 4.1 Simple Evaluation
```json
{"action": "act", "kind": "evaluate", "fn": "document.title", "targetId": "test-1"}
```
**Expected:** Returns page title string

### 4.2 DOM Manipulation
```json
{"action": "act", "kind": "evaluate", "fn": "document.querySelectorAll('a').length", "targetId": "test-1"}
```
**Expected:** Returns number of links

### 4.3 Complex Script
```json
{"action": "act", "kind": "evaluate", "fn": "() => { const items = document.querySelectorAll('.item'); return Array.from(items).map(el => el.textContent); }", "targetId": "test-1"}
```
**Expected:** Returns array of text content

---

## 5. FILE OPERATIONS

### 5.1 Upload File
```json
{"action": "upload", "paths": ["C:\\test\\file.pdf"], "targetId": "test-1"}
```
**Expected:** File uploaded to file input

### 5.2 Console Logs
```json
{"action": "console", "targetId": "test-1"}
```
**Expected:** Console output captured

---

## 6. TAB MANAGEMENT

### 6.1 Open Multiple Tabs
```json
[
  {"action": "open", "url": "https://site1.com", "label": "site1"},
  {"action": "open", "url": "https://site2.com", "label": "site2"},
  {"action": "open", "url": "https://site3.com", "label": "site3"}
]
```
**Expected:** 3 tabs open with labels

### 6.2 Switch Between Tabs
```json
{"action": "focus", "targetId": "site1"}
```
**Expected:** Focus switches to site1 tab

### 6.3 Close Multiple Tabs
```json
[
  {"action": "close", "targetId": "site1"},
  {"action": "close", "targetId": "site2"},
  {"action": "close", "targetId": "site3"}
]
```
**Expected:** All 3 tabs closed

---

## 7. BATCH COMMANDS

### 7.1 Sequential Batch
```json
{
  "action": "batch",
  "commands": [
    {"action": "open", "url": "https://example.com", "label": "batch-test"},
    {"action": "snapshot", "targetId": "batch-test"},
    {"action": "screenshot", "targetId": "batch-test"},
    {"action": "close", "targetId": "batch-test"}
  ]
}
```
**Expected:** All 4 commands execute in sequence

### 7.2 Form Fill Batch
```json
{
  "action": "batch",
  "commands": [
    {"action": "open", "url": "https://example.com/form", "label": "form"},
    {"action": "snapshot", "targetId": "form", "refs": "aria"},
    {"action": "act", "kind": "fill", "ref": "e42", "text": "John Doe", "targetId": "form"},
    {"action": "act", "kind": "fill", "ref": "e43", "text": "john@example.com", "targetId": "form"},
    {"action": "act", "kind": "click", "ref": "e44", "targetId": "form"},
    {"action": "close", "targetId": "form"}
  ]
}
```
**Expected:** Form filled and submitted
