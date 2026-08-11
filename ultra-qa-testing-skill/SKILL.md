---
name: ultra-qa-testing-skill
description: Automated web application testing with full traceability. Opens browser, executes test cases, records screen for audit, captures screenshots per step, and generates structured reports (pass/fail). Use when the user needs to "test this web app", "run QA tests", "automate browser tests", "execute test suite", or any task requiring structured web testing with audit evidence. Combines agent-browser automation with dogfood exploratory testing patterns.
allowed-tools: Bash(agent-browser:*), Bash(npx agent-browser:*)
---

# Ultra QA Testing Skill

Automated web application testing with full traceability, screen recording, and structured reporting.

## Contents

- Quick start
- Test case format
- Workflow
- Traceability system
- Report generation
- Paperclip integration
- Exploratory testing (dogfood mode)
- References

---

## Quick Start

```bash
# 1. Create test suite
mkdir -p test-output/screenshots test-output/videos

# 2. Run a test case
agent-browser --session qa run test-output/ test-cases/login.yaml

# 3. Run all test cases in a directory
agent-browser --session qa run-all test-output/ test-cases/

# 4. Generate report
agent-browser --session qa report test-output/
```

**Parameters (with defaults):**

| Parameter | Default | Example |
|-----------|---------|---------|
| Target URL | _(required)_ | `http://localhost:3000` |
| Session name | `qa-{timestamp}` | `--session qa-login` |
| Output directory | `./test-output/` | `Output dir: /tmp/qa` |
| Auth state | None | `--state auth.json` |

---

## Test Case Format (YAML)

Test cases define what to execute. Each file = one test scenario.

```yaml
# test-cases/login.yaml
name: "Login with valid credentials"
description: "Verify user can login with correct email/password"
target: "http://localhost:3000"
priority: "high"
timeout: 30

# Optional: authentication setup
auth:
  type: "form"
  url: "/login"
  email_selector: "#email"
  password_selector: "#password"
  submit_selector: "button[type=submit]"
  credentials:
    email: "test@example.com"
    password: "securepass123"

# Test steps
steps:
  - id: "step-1"
    action: "navigate"
    url: "/login"
    wait: "networkidle"
    screenshot: true
    description: "Navigate to login page"

  - id: "step-2"
    action: "fill"
    selector: "#email"
    value: "test@example.com"
    screenshot: true
    description: "Fill email field"

  - id: "step-3"
    action: "fill"
    selector: "#password"
    value: "securepass123"
    screenshot: true
    description: "Fill password field"

  - id: "step-4"
    action: "click"
    selector: "button[type=submit]"
    wait: "networkidle"
    screenshot: true
    description: "Click login button"

  - id: "step-5"
    action: "assert"
    type: "url"
    expected: "**/dashboard"
    screenshot: true
    description: "Verify redirect to dashboard"

  - id: "step-6"
    action: "assert"
    type: "text"
    selector: "h1"
    expected: "Welcome"
    screenshot: true
    description: "Verify welcome message"

# Expected result
expected:
  status: "pass"
  final_url: "**/dashboard"
  assertions:
    - type: "url"
      expected: "**/dashboard"
    - type: "text"
      selector: "h1"
      expected: "Welcome"
```

### Step Actions

| Action | Description | Required Fields |
|--------|-------------|-----------------|
| `navigate` | Go to URL | `url`, `wait` |
| `click` | Click element | `selector` or `ref` |
| `fill` | Clear and type | `selector`, `value` |
| `type` | Type without clear | `selector`, `value` |
| `select` | Select dropdown | `selector`, `value` |
| `wait` | Wait for condition | `type` (`element`, `text`, `url`, `networkidle`, `timeout`) |
| `assert` | Verify condition | `type`, `expected` |
| `screenshot` | Take screenshot | `annotate` (optional) |
| `scroll` | Scroll page | `direction`, `amount` |
| `hover` | Hover element | `selector` |
| `check` | Check checkbox | `selector` |
| `uncheck` | Uncheck checkbox | `selector` |

### Assert Types

| Type | Description | Example |
|------|-------------|---------|
| `url` | URL matches pattern | `expected: "**/dashboard"` |
| `text` | Element text matches | `selector: "h1"`, `expected: "Welcome"` |
| `element` | Element exists | `selector: ".success-message"` |
| `not_element` | Element does NOT exist | `selector: ".error"` |
| `count` | Element count matches | `selector: ".item"`, `expected: 5` |
| `attribute` | Attribute matches | `selector: "input"`, `attribute: "value"`, `expected: "test"` |
| `console` | No console errors | `expected: "no-errors"` |
| `network` | Network request status | `url: "**/api/data"`, `expected: 200` |

---

## Workflow

```
1. Initialize    Set up session, output dirs, report file
2. Load tests    Parse YAML test cases
3. Execute       Run each test case with recording + screenshots
4. Assert        Check expected results
5. Report        Generate structured report (JSON + Markdown)
6. Wrap up       Close session, archive results
```

### 1. Initialize

```bash
mkdir -p {OUTPUT_DIR}/screenshots {OUTPUT_DIR}/videos {OUTPUT_DIR}/reports
```

Start session:

```bash
agent-browser --session {SESSION} open {TARGET_URL}
agent-browser --session {SESSION} wait --load networkidle
```

If auth is needed:

```bash
agent-browser --session {SESSION} state save {OUTPUT_DIR}/auth-state.json
```

### 2. Load Tests

Read all YAML files from test directory:

```bash
ls {TEST_DIR}/*.yaml
```

Parse each file and validate structure.

### 3. Execute Test Case

For each test case:

```bash
# Start video recording
agent-browser --session {SESSION} record start {OUTPUT_DIR}/videos/{test-name}-recording.webm

# Execute steps
for step in steps:
  # Take screenshot before action (if screenshot: true)
  agent-browser --session {SESSION} screenshot {OUTPUT_DIR}/screenshots/{test-name}-{step-id}-before.png

  # Execute action
  agent-browser --session {SESSION} {action} {params}

  # Wait if specified
  agent-browser --session {SESSION} wait --load {wait_type}

  # Take screenshot after action (if screenshot: true)
  agent-browser --session {SESSION} screenshot {OUTPUT_DIR}/screenshots/{test-name}-{step-id}-after.png

# Stop recording
agent-browser --session {SESSION} record stop
```

### 4. Assert Results

After executing all steps, check assertions:

```bash
# URL assertion
agent-browser --session {SESSION} get url
# Compare with expected pattern

# Text assertion
agent-browser --session {SESSION} get text {selector}
# Compare with expected text

# Element assertion
agent-browser --session {SESSION} snapshot -i
# Check if element exists in snapshot

# Console assertion
agent-browser --session {SESSION} console
# Check for errors
```

### 5. Generate Report

Create structured report:

```bash
agent-browser --session {SESSION} report {OUTPUT_DIR}
```

Output files:
- `reports/results.json` — machine-readable results
- `reports/report.md` — human-readable report
- `reports/summary.html` — visual report with embedded screenshots

### 6. Wrap Up

```bash
agent-browser --session {SESSION} close
```

---

## Traceability System

Every test execution generates a complete audit trail:

### Per Test Case

```
test-output/
├── screenshots/
│   ├── {test-name}-step-1-before.png
│   ├── {test-name}-step-1-after.png
│   ├── {test-name}-step-2-before.png
│   ├── {test-name}-step-2-after.png
│   └── {test-name}-result.png
├── videos/
│   └── {test-name}-recording.webm
└── reports/
    └── results.json
```

### results.json Structure

```json
{
  "test_suite": "login-tests",
  "timestamp": "2026-08-10T10:15:00-03:00",
  "environment": {
    "url": "http://localhost:3000",
    "browser": "chrome-151.0.7922.77",
    "session": "qa-1691673300"
  },
  "results": [
    {
      "test_name": "login-valid-credentials",
      "status": "PASS",
      "duration_ms": 4523,
      "steps": [
        {
          "step_id": "step-1",
          "action": "navigate",
          "status": "PASS",
          "screenshot_before": "screenshots/login-step-1-before.png",
          "screenshot_after": "screenshots/login-step-1-after.png",
          "duration_ms": 1200
        },
        {
          "step_id": "step-5",
          "action": "assert",
          "type": "url",
          "expected": "**/dashboard",
          "actual": "http://localhost:3000/dashboard",
          "status": "PASS",
          "screenshot": "screenshots/login-step-5-after.png"
        }
      ],
      "video": "videos/login-recording.webm",
      "assertions_passed": 2,
      "assertions_failed": 0
    }
  ],
  "summary": {
    "total": 1,
    "passed": 1,
    "failed": 0,
    "skipped": 0,
    "duration_ms": 4523
  }
}
```

---

## Report Generation

### Markdown Report

```markdown
# Test Report — {date}

## Summary
| Metric | Value |
|--------|-------|
| Total Tests | 5 |
| Passed | 4 |
| Failed | 1 |
| Duration | 23.4s |

## Failed Tests

### TEST-003: Login with invalid password
- **Status:** ❌ FAIL
- **Duration:** 3.2s
- **Error:** Expected URL "**/dashboard" but got "**/login?error=invalid"

#### Steps
1. ✅ Navigate to /login (screenshot)
2. ✅ Fill email field (screenshot)
3. ✅ Fill password field (screenshot)
4. ✅ Click login button (screenshot)
5. ❌ Assert URL matches **/dashboard (screenshot)

#### Evidence
- Video: `videos/login-invalid-recording.webm`
- Screenshots: `screenshots/login-invalid-step-*.png`

## Passed Tests
- ✅ TEST-001: Login with valid credentials (4.5s)
- ✅ TEST-002: Login with empty fields (2.1s)
- ✅ TEST-004: Logout flow (5.3s)
- ✅ TEST-005: Password reset (8.3s)
```

### HTML Report

Generate with embedded screenshots and video players for visual audit.

---

## Paperclip Integration

When a test fails, optionally create a Paperclip issue:

```bash
# Auto-create issue on failure
curl -X POST http://localhost:3100/api/issues \
  -H "X-API-Key: {API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "TEST FAIL: {test_name}",
    "description": "Test failed at step {step_id}\n\nExpected: {expected}\nActual: {actual}\n\nScreenshots: {screenshots_path}\nVideo: {video_path}",
    "companyId": "{company_id}",
    "status": "todo",
    "priority": "high"
  }'
```

---

## Exploratory Testing (Dogfood Mode)

For unstructured exploration (no predefined test cases):

```bash
agent-browser --session {SESSION} dogfood {TARGET_URL} --output {OUTPUT_DIR}
```

This follows the dogfood workflow:

1. Initialize session
2. Authenticate if needed
3. Orient (initial screenshot + snapshot)
4. Explore systematically (navigation, forms, edge cases)
5. Document issues with repro evidence
6. Generate report

### Issue Documentation

When an issue is found during exploration:

```bash
# Start repro video BEFORE reproducing
agent-browser --session {SESSION} record start {OUTPUT_DIR}/videos/issue-{NNN}-repro.webm

# Walk through steps at human pace (sleep between actions)
agent-browser --session {SESSION} screenshot {OUTPUT_DIR}/screenshots/issue-{NNN}-step-1.png
sleep 1
# Perform action
sleep 1
agent-browser --session {SESSION} screenshot {OUTPUT_DIR}/screenshots/issue-{NNN}-step-2.png
sleep 2
# Capture broken state
agent-browser --session {SESSION} screenshot --annotate {OUTPUT_DIR}/screenshots/issue-{NNN}-result.png

# Stop video
agent-browser --session {SESSION} record stop
```

### Issue Taxonomy

| Severity | Description |
|----------|-------------|
| **Critical** | Data loss, security vulnerability, complete feature failure |
| **High** | Major feature broken, no workaround |
| **Medium** | Feature degraded, workaround exists |
| **Low** | Cosmetic, minor UX issue |
| **Info** | Enhancement suggestion |

---

## References

| Reference | Description |
|-----------|-------------|
| agent-browser core | Browser automation commands and patterns |
| agent-browser dogfood | Exploratory testing workflow |
| agent-browser video-recording | Video capture options and codecs |
| agent-browser authentication | Auth vault and credential management |
