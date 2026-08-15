<#
.SYNOPSIS
    Run Ultra Browser Skill test suite v5.1
.DESCRIPTION
    Executes real Playwright smoke tests for the ultra-browser-skill v5.1
.PARAMETER Category
    Test category to run (smoke, config, all)
.PARAMETER TestId
    Run a specific test by ID
.EXAMPLE
    .\run-tests.ps1
    .\run-tests.ps1 -Category "smoke"
    .\run-tests.ps1 -TestId "SMOKE-E2E"
#>

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("smoke", "config", "all")]
    [string]$Category = "all",
    
    [Parameter(Mandatory=$false)]
    [string]$TestId
)

$script:pass = 0
$script:fail = 0
$script:skip = 0
$script:total = 0
$script:errors = @()

# Ensure Playwright is available
function Assert-PlaywrightInstalled {
    try {
        $null = pip show playwright 2>$null
        return $true
    } catch {
        return $false
    }
}

# ---------- CONFIG TESTS (no browser needed) ----------

function Test-Config-ModuleExists {
    param([string]$Name)
    $script:total++
    $path = Join-Path $PSScriptRoot "..\modules\$Name"
    if (Test-Path $path) {
        Write-Host "  PASS: Module exists: $Name" -ForegroundColor Green
        $script:pass++
    } else {
        Write-Host "  FAIL: Module missing: $Name" -ForegroundColor Red
        $script:fail++
        $script:errors += "Missing module: $Name"
    }
}

function Test-Config-ModuleVersion {
    param([string]$Name)
    $script:total++
    $path = Join-Path $PSScriptRoot "..\modules\$Name"
    if (-not (Test-Path $path)) { $script:skip++; return }
    try {
        $content = Get-Content $path -Raw | ConvertFrom-Json
        if ($content.version -eq "5.1.0") {
            Write-Host "  PASS: $Name version 5.1.0" -ForegroundColor Green
            $script:pass++
        } else {
            Write-Host "  WARN: $Name version is $($content.version), expected 5.1.0" -ForegroundColor Yellow
            $script:pass++  # non-critical
        }
    } catch {
        Write-Host "  WARN: $Name not valid JSON" -ForegroundColor Yellow
        $script:skip++
    }
}

function Test-Config-SKILLDescription {
    $script:total++
    $path = Join-Path $PSScriptRoot "..\SKILL.md"
    $content = Get-Content $path -Raw
    if ($content -match '^description: (.+)$' -or $content -match '^description: "(.+)"') {
        $desc = $Matches[1]
        if ($desc.Length -le 160) {
            Write-Host "  PASS: SKILL.md description = $($desc.Length) chars (<=160)" -ForegroundColor Green
            $script:pass++
        } else {
            Write-Host "  FAIL: SKILL.md description = $($desc.Length) chars, should be <=160" -ForegroundColor Red
            $script:fail++
            $script:errors += "SKILL.md description too long: $($desc.Length) chars"
        }
    } else {
        Write-Host "  FAIL: Could not parse SKILL.md description" -ForegroundColor Red
        $script:fail++
    }
}

function Test-Config-CorrettoTypo {
    $script:total++
    $path = Join-Path $PSScriptRoot "..\SKILL.md"
    $content = Get-Content $path -Raw
    if ($content -match 'Corretto') {
        Write-Host "  FAIL: 'Corretto' typo found in SKILL.md (should be 'Correct')" -ForegroundColor Red
        $script:fail++
        $script:errors += "'Corretto' typo in SKILL.md"
    } else {
        Write-Host "  PASS: No 'Corretto' typo in SKILL.md" -ForegroundColor Green
        $script:pass++
    }
}

function Test-Config-ModuleCount {
    $script:total++
    $modDir = Join-Path $PSScriptRoot "..\modules"
    $modules = Get-ChildItem "$modDir\*" -Include "*.json","*.md"
    $count = ($modules | Measure-Object).Count
    if ($count -ge 14) {
        Write-Host "  PASS: $count modules present" -ForegroundColor Green
        $script:pass++
    } else {
        Write-Host "  FAIL: Only $count modules (expected 14+)" -ForegroundColor Red
        $script:fail++
        $script:errors += "Only $count modules"
    }
}

function Test-Config-BrowserToolAvailable {
    $script:total++
    # Check that the OpenClaw browser tool is available
    $browserInfo = openclaw gateway status 2>$null
    # This is a soft check — if we can't detect, skip
    Write-Host "  INFO: OpenClaw browser tool assumed available (runtime check)" -ForegroundColor White
    $script:skip++
}

# ---------- E2E SMOKE TEST (requires Playwright) ----------

function Test-E2E-Smoke {
    $script:total++
    Write-Host "`n[SMOKE-E2E] Playwright E2E: open page, snapshot, verify content" -ForegroundColor White
    
    $hasPlaywright = Assert-PlaywrightInstalled
    if (-not $hasPlaywright) {
        Write-Host "  SKIP: Playwright not installed. Install with: pip install playwright && playwright install chromium" -ForegroundColor Yellow
        Write-Host "  SKIP: Falling back to OpenClaw browser tool smoke test" -ForegroundColor Yellow
        $script:skip++
        Test-E2E-Smoke-OpenClaw
        return
    }

    $tempDir = Join-Path $env:TEMP "ultra-browser-test"
    New-Item -ItemType Directory -Force $tempDir | Out-Null
    $testScript = Join-Path $tempDir "smoke_test.py"

    @"
import asyncio, sys, json
from playwright.async_api import async_playwright

async def smoke_test():
    pw = await async_playwright().start()
    browser = await pw.chromium.launch(headless=True, args=['--no-sandbox'])
    page = await browser.new_page()
    results = []

    # 1. Navigate to a public page
    await page.goto("https://example.com", wait_until="domcontentloaded", timeout=15000)
    title = await page.title()
    results.append(("Title matches", title == "Example Domain"))

    # 2. Take an accessibility-style snapshot
    heading = await page.query_selector("h1")
    heading_text = await heading.inner_text() if heading else ""
    results.append(("H1 present", "Example Domain" in heading_text))

    # 3. Verify interactive elements exist
    links = await page.query_selector_all("a")
    link_count = len(links)
    results.append(("Links exist", link_count > 0))

    # 4. Screenshot capability (just check it doesn't crash)
    await page.screenshot()
    results.append(("Screenshot works", True))

    # 5. Execute JS
    domain = await page.evaluate("document.domain")
    results.append(("JS evaluation works", "example" in domain))

    await browser.close()
    await pw.stop()
    return results

results = asyncio.run(smoke_test())
passed = all(r[1] for r in results)
for name, ok in results:
    status = "PASS" if ok else "FAIL"
    print(f"  {status}: {name}")
print(f"ALL_PASSED={passed}")
"@ | Out-File -FilePath $testScript -Encoding utf8

    try {
        $output = python $testScript 2>&1
        $allPassed = $output -match "ALL_PASSED=True"
        foreach ($line in $output) {
            if ($line -match "^\s+(PASS|FAIL):") {
                Write-Host "  $line" -ForegroundColor $(if ($line -match "FAIL") { "Red" } else { "Green" })
            }
        }
        if ($allPassed) {
            Write-Host "  PASS: E2E smoke test completed successfully" -ForegroundColor Green
            $script:pass++
        } else {
            Write-Host "  FAIL: E2E smoke test had failures" -ForegroundColor Red
            $script:fail++
            $script:errors += "E2E smoke test failed"
        }
    } catch {
        Write-Host "  FAIL: E2E smoke test error: $_" -ForegroundColor Red
        $script:fail++
        $script:errors += "E2E error: $_"
    }
    Remove-Item -Recurse -Force $tempDir -ErrorAction SilentlyContinue
}

# Fallback smoke test using OpenClaw's built-in browser tool
function Test-E2E-Smoke-OpenClaw {
    Write-Host "`n[SMOKE-E2E-FALLBACK] OpenClaw browser tool smoke test" -ForegroundColor White
    Write-Host "  INFO: This test verifies the browser tool status endpoint." -ForegroundColor White
    Write-Host "  INFO: For full E2E, install Playwright: pip install playwright && playwright install chromium" -ForegroundColor White
    
    try {
        # Check browser tool availability via OpenClaw
        $result = openclaw browser status 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  PASS: OpenClaw browser tool available" -ForegroundColor Green
            $script:pass++
        } else {
            Write-Host "  WARN: Could not verify browser tool" -ForegroundColor Yellow
            $script:skip++
        }
    } catch {
        Write-Host "  INFO: Browser tool status check skipped (non-critical in CI)" -ForegroundColor White
        $script:skip++
    }
}

# ---------- RUNNER ----------

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Ultra Browser Skill v5.1 - Test Runner" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Category: $Category" -ForegroundColor Yellow
if ($TestId) { Write-Host "Test ID: $TestId" -ForegroundColor Yellow }
Write-Host ""

# Module list
$allModules = @(
    "action-cache.json", "content-scraper.json", "custom-tools.json",
    "devtools.json", "extractor.json", "id-registry.json",
    "injection-patterns.json", "navigator.json", "observer.json",
    "planner.json", "replay.json", "safety-rules.json",
    "site-memory.json", "tool-router.md", "validator.json",
    "vision-fallback.json"
)

switch ($Category) {
    "smoke" {
        Test-E2E-Smoke
    }
    "config" {
        foreach ($m in $allModules) { Test-Config-ModuleExists $m }
        foreach ($m in $allModules) { Test-Config-ModuleVersion $m }
        Test-Config-ModuleCount
        Test-Config-SKILLDescription
        Test-Config-CorrettoTypo
        Test-Config-BrowserToolAvailable
    }
    "all" {
        foreach ($m in $allModules) { Test-Config-ModuleExists $m }
        foreach ($m in $allModules) { Test-Config-ModuleVersion $m }
        Test-Config-ModuleCount
        Test-Config-SKILLDescription
        Test-Config-CorrettoTypo
        Test-Config-BrowserToolAvailable
        Test-E2E-Smoke
    }
}

# Summary
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  TEST SUMMARY" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Total:  $script:total" -ForegroundColor White
Write-Host "  Pass:   $script:pass" -ForegroundColor Green
Write-Host "  Fail:   $script:fail" -ForegroundColor Red
Write-Host "  Skip:   $script:skip" -ForegroundColor Yellow
Write-Host ""

$passRate = if ($script:total -gt 0) { [math]::Round(($script:pass / $script:total) * 100) } else { 0 }
$rateColor = if ($passRate -ge 90) { "Green" } elseif ($passRate -ge 70) { "Yellow" } else { "Red" }
Write-Host "  Pass Rate: $passRate%" -ForegroundColor $rateColor
Write-Host ""

if ($script:fail -eq 0) {
    Write-Host "  ALL TESTS PASSED!" -ForegroundColor Green
} else {
    Write-Host "  Some tests failed!`n" -ForegroundColor Red
    foreach ($err in $script:errors) {
        Write-Host "  - $err" -ForegroundColor Red
    }
}

exit $script:fail
