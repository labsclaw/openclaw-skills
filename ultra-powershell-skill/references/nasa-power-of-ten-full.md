# NASA Power of Ten — PowerShell Edition

The NASA/JPL Power of Ten rules, adapted for PowerShell. Originally from
"The Power of Ten – Rules for Developing Safety Critical Code" (NASA/JPL).

---

## Rule 1: Keep Control Flow Simple

Avoid `goto`, `switch` fall-through, and deep nesting.

**PowerShell:**
- Prefer guard clauses over nested `if` statements
- Use `continue` / `break` explicitly in loops
- Avoid `try/catch` blocks that cover too much code
- Avoid implicit pipeline behavior where explicit loops are clearer

```powershell
# Good
if (-not $InputObject) { throw "InputObject is required." }

# Avoid
if ($condition) {
    if ($other) {
        if ($more) {
            # deep nesting
        }
    }
}
```

---

## Rule 2: Bound All Loops

Every loop must have a fixed upper bound. Prevent infinite loops.

**PowerShell:**
- For `while ($true)` — always include max iteration count
- For Graph API pagination — always set `$maxPages`
- For retry loops — always set max retries + backoff strategy

```powershell
$maxRetries = 5
$retryCount = 0
do {
    try {
        $result = Invoke-RestMethod @params -ErrorAction Stop
        break
    } catch {
        $retryCount++
        if ($retryCount -ge $maxRetries) { throw "Max retries exceeded." }
        Start-Sleep -Seconds [math]::Pow(2, $retryCount)
    }
} while ($true)
```

---

## Rule 3: Initialize All Variables Before Use

**PowerShell:**
- `$array = @()` before adding items
- `Set-StrictMode -Version Latest` catches uninitialized variable access
- Declare variables near where they are used

```powershell
Set-StrictMode -Version Latest
$result = @()
```

---

## Rule 4: Keep Functions Small

A function should fit on one screen. One clear purpose.

**PowerShell:**
- Split into helpers: `Get-GraphPage`, `Invoke-GraphRequestWithRetry`
- Each function should have: one purpose, focused parameter set, minimal nesting, explicit output

---

## Rule 5: Use Assertions and Validation

**PowerShell:**
- `[ValidateNotNullOrEmpty()]` on mandatory parameters
- `[ValidateSet()]` for limited options
- `[ValidateRange()]` for numeric constraints
- Guard clauses at function entry

```powershell
if (-not $PolicyName) { throw "PolicyName cannot be empty." }
```

---

## Rule 6: Minimize Variable Scope

Declare variables at the smallest scope possible.

**PowerShell:**
- Avoid `$global:`, `$script:` unless absolutely necessary
- No large top-level variable declarations
- Use `begin {}` for initialization in pipeline functions
- No hidden module state

---

## Rule 7: Check Every Return Value

**PowerShell:**
- Check HTTP status after API calls
- Test for null results
- Inspect error records
- Validate partial and batch failures
- Handle Graph throttling responses
- Check empty collections

```powershell
foreach ($item in $batchResponse.responses) {
    if ($item.status -lt 200 -or $item.status -gt 299) {
        throw "Batch request $($item.id) failed with status $($item.status)."
    }
}
```

---

## Rule 8: Avoid Dynamic Code

**PowerShell:**
- No `Invoke-Expression`
- No runtime-generated function names
- No excessive scriptblock magic
- No implicit positional parameters in production code

---

## Rule 9: Be Careful with Object Mutation

PowerShell objects are easy to mutate accidentally.

- Avoid modifying input objects unless documented
- Prefer creating new objects
- No surprise side effects

```powershell
# Prefer:
$output = [PSCustomObject]@{ Id = $Device.Id; Name = $Device.DisplayName }
```

---

## Rule 10: Treat Warnings as Defects

All code should pass `Invoke-ScriptAnalyzer` with zero warnings.

**Check for:**
- Unapproved verbs
- Unused variables
- Positional parameters
- Aliases in production code
- Missing `SupportsShouldProcess`
- Global variable usage
- Inconsistent casing
- Broad catches
- Null-comparison order issues
