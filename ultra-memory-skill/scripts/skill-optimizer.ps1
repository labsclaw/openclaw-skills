# Skill Optimizer - Free-Tier Edition
# Inspired by rohitg00/pro-workflow and Microsoft SkillOpt
#
# Pipeline: rollout -> reflect -> aggregate -> select -> update -> evaluate -> gate
#
# Usage: .\skill-optimizer.ps1 -SkillPath "path/to/SKILL.md" -CorrectionsPath "path/to/corrections.md"

param(
    [string]$SkillPath,
    [string]$CorrectionsPath = "memory\corrections.md",
    [string]$SemanticPath = "memory\semantic-patterns.json",
    [int]$MaxAdds = 3,
    [int]$MaxDeletes = 2,
    [int]$MaxReplaces = 3,
    [int]$Epochs = 2,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$workspaceDir = if ($env:OPENCLAW_WORKSPACE) { $env:OPENCLAW_WORKSPACE } else { Join-Path $env:USERPROFILE ".openclaw\workspace" }
$memoryDir = Join-Path $workspaceDir "memory"
$rejectionBuffer = @()

# --- Helpers ---
function Write-Step($msg) { Write-Host "`n>> $msg" -ForegroundColor Cyan }
function Write-Ok($msg) { Write-Host "   [OK] $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "   [!] $msg" -ForegroundColor Yellow }
function Write-Fail($msg) { Write-Host "   [X] $msg" -ForegroundColor Red }

# --- Stage 1: Rollout (Extract Corrections) ---
Write-Step "Stage 1: Rollout - Extracting corrections"

$correctionsFile = Join-Path $workspaceDir $CorrectionsPath
if (-not (Test-Path $correctionsFile)) {
    Write-Fail "Corrections file not found: $correctionsFile"
    exit 1
}

$corrections = Get-Content $correctionsFile -Raw -Encoding UTF8
$correctionEntries = [regex]::Matches($corrections, '^- \*\*\d{4}-\d{2}-\d{2}\*\*.*$', [System.Text.RegularExpressions.RegexOptions]::Multiline)

Write-Ok "Found $($correctionEntries.Count) correction entries"

# --- Stage 2: Reflect (Analyze & Propose Patches) ---
Write-Step "Stage 2: Reflect - Analyzing corrections for patterns"

$categories = @{}
foreach ($entry in $correctionEntries) {
    $category = if ($entry.Value -match 'category.*?:\s*(\w+)') { $Matches[1] } else { "uncategorized" }
    if (-not $categories.ContainsKey($category)) {
        $categories[$category] = @()
    }
    $categories[$category] += $entry.Value
}

Write-Ok "Categories found: $($categories.Keys -join ', ')"

$patches = @()

foreach ($cat in $categories.Keys) {
    if ($categories[$cat].Count -ge 3) {
        $patches += @{
            type = "add"
            anchor = "## Patterns (3x+)"
            content = "- [ ] $cat - pattern from $($categories[$cat].Count) corrections"
            confidence = 0.8
            reason = "Repeated pattern: $($categories[$cat].Count) corrections in $cat"
        }
    }
}

$semanticFile = Join-Path $workspaceDir $SemanticPath
if (Test-Path $semanticFile) {
    $semantic = Get-Content $semanticFile -Raw -Encoding UTF8 | ConvertFrom-Json
    foreach ($pattern in $semantic.patterns.PSObject.Properties) {
        $value = $pattern.Value
        if ($value.applications -eq 0 -and $value.confidence -lt 0.5) {
            $patches += @{
                type = "delete"
                patternId = $pattern.Name
                content = $value.pattern
                confidence = 0.7
                reason = "Low confidence ($($value.confidence)) and never applied"
            }
        }
    }
}

Write-Ok "Patches proposed: $($patches.Count)"

# --- Stage 3: Aggregate (Merge Patches) ---
Write-Step "Stage 3: Aggregate - Merging patches"

$uniquePatches = @()
$seen = @{}
foreach ($patch in $patches) {
    $key = "$($patch.type):$($patch.content)"
    if (-not $seen.ContainsKey($key)) {
        $seen[$key] = $true
        $uniquePatches += $patch
    }
}

Write-Ok "Unique patches: $($uniquePatches.Count)"

# --- Stage 4: Select (Apply Budget Limits) ---
Write-Step "Stage 4: Select - Applying budget limits"

$adds = @($uniquePatches | Where-Object { $_.type -eq "add" })
$adds = $adds[0..([Math]::Max(0, [Math]::Min($MaxAdds, $adds.Count) - 1))]
$deletes = @($uniquePatches | Where-Object { $_.type -eq "delete" })
$deletes = $deletes[0..([Math]::Max(0, [Math]::Min($MaxDeletes, $deletes.Count) - 1))]
$replaces = @($uniquePatches | Where-Object { $_.type -eq "replace" })
$replaces = $replaces[0..([Math]::Max(0, [Math]::Min($MaxReplaces, $replaces.Count) - 1))]

$selectedPatches = @()
$selectedPatches += $adds | Where-Object { $_ -ne $null }
$selectedPatches += $deletes | Where-Object { $_ -ne $null }
$selectedPatches += $replaces | Where-Object { $_ -ne $null }

Write-Ok ("Selected patches: " + $selectedPatches.Count)

# --- Stage 5: Update (Apply Patches) ---
Write-Step "Stage 5: Update - Applying patches to SKILL.md"

if ($DryRun) {
    Write-Warn "Dry run - patches NOT applied"
    foreach ($patch in $selectedPatches) {
        Write-Host "  [$($patch.type)] $($patch.content)" -ForegroundColor Yellow
    }
} else {
    if (-not $SkillPath) {
        Write-Warn "No SkillPath specified - patches not applied"
    } else {
        $skillContent = Get-Content $SkillPath -Raw -Encoding UTF8
        foreach ($patch in $selectedPatches) {
            if ($patch.type -eq "add" -and $skillContent -match [regex]::Escape($patch.anchor)) {
                $skillContent = $skillContent -replace ([regex]::Escape($patch.anchor)), "$($patch.anchor)`n$($patch.content)"
                Write-Ok "Added patch"
            }
        }
        $skillContent | Set-Content $SkillPath -Encoding UTF8
        Write-Ok "SKILL.md updated"
    }
}

# --- Stage 6: Evaluate (Score Candidate) ---
Write-Step "Stage 6: Evaluate - Scoring improvement"

$scoreBefore = $correctionEntries.Count
$scoreAfter = $scoreBefore + $selectedPatches.Count
$improvement = if ($scoreBefore -gt 0) { [math]::Round(($selectedPatches.Count / $scoreBefore) * 100, 1) } else { 0 }

Write-Ok "Score: $scoreBefore -> $scoreAfter (+$improvement%)"

# --- Stage 7: Gate (Accept/Reject) ---
Write-Step "Stage 7: Gate - Decision"

if ($selectedPatches.Count -gt 0) {
    Write-Ok ("ACCEPTED - " + $selectedPatches.Count + " patches applied")
    
    $historyFile = Join-Path $memoryDir "optimization-history.json"
    $history = if (Test-Path $historyFile) {
        Get-Content $historyFile -Raw -Encoding UTF8 | ConvertFrom-Json
    } else {
        @{ runs = @() }
    }
    
    $run = @{
        timestamp = (Get-Date -Format "yyyy-MM-ddTHH:mm:ss")
        patches = $selectedPatches.Count
        scoreBefore = $scoreBefore
        scoreAfter = $scoreAfter
        improvement = "$improvement%"
    }
    $history.runs += $run
    $history | ConvertTo-Json -Depth 10 | Set-Content $historyFile -Encoding UTF8
    Write-Ok "Run logged to optimization-history.json"
} else {
    Write-Warn "NO PATCHES - Nothing to optimize"
}

# --- Summary ---
Write-Host ""
Write-Host "=== Skill Optimizer Summary ===" -ForegroundColor Cyan
Write-Host "Corrections analyzed: $($correctionEntries.Count)"
Write-Host "Patches proposed: $($patches.Count)"
Write-Host "Patches selected: $($selectedPatches.Count)"
Write-Host "Improvement: +$improvement%"
$status = if ($selectedPatches.Count -gt 0) { "APPLIED" } else { "NO CHANGE" }
Write-Host "Status: $status"
