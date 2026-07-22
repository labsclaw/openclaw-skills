# SSC Router v4.0 — Hybrid BM25 & Layered Sparse Selective Cache
# Inspired by Memory Caching (arXiv 2602.24281) & Obsidian-Mind
#
# Tier 1: Segments (Curated Domain Knowledge) - Weight Multiplier x2.0
# Tier 2: Daily Logs (Raw Ephemeral Context) - Weight Multiplier x0.5
# BM25: Probabilistic Term Relevance Scoring
#
# Usage: .\ssc-router.ps1 -Query "heartbeat alert storm RLA-207"
#        .\ssc-router.ps1 -Query "awesome-llm-apps"
#        .\ssc-router.ps1 -List
#        .\ssc-router.ps1 -Stats

param(
    [string]$Query = "",
    [switch]$List,
    [switch]$Stats,
    [int]$TopK = 0,
    [switch]$DryRun,
    [switch]$Json
)

$ErrorActionPreference = "Stop"
$memoryDir = $PSScriptRoot
$workspaceDir = (Get-Item $memoryDir).Parent.FullName
$nodeRouterScript = Join-Path (Join-Path $workspaceDir "scripts") "ssc-router.cjs"

if (Test-Path $nodeRouterScript) {
    # Delegate to high-performance Node.js SSC Router v4.0 Engine
    $nodeArgs = @()
    if ($Stats) {
        $nodeArgs += "stats"
    } elseif ($List) {
        $nodeArgs += "list"
    } elseif ($Query) {
        $nodeArgs += "query"
        $nodeArgs += $Query
        if ($TopK -gt 0) { $nodeArgs += "--top=$TopK" }
        if ($Json) { $nodeArgs += "--json" }
        if ($DryRun) { $nodeArgs += "--dry-run" }
    } else {
        Write-Host "Usage: .\ssc-router.ps1 -Query 'your search terms' [-TopK 5] [-Json] [-DryRun]" -ForegroundColor Yellow
        Write-Host "       .\ssc-router.ps1 -List" -ForegroundColor Yellow
        Write-Host "       .\ssc-router.ps1 -Stats" -ForegroundColor Yellow
        exit 0
    }

    node $nodeRouterScript @nodeArgs
    exit 0
}

# Native PowerShell Fallback if Node.js script is missing
$indexPath = Join-Path $memoryDir "index.json"
if (-not (Test-Path $indexPath)) {
    Write-Error "index.json not found at $indexPath"
    exit 1
}

$index = Get-Content $indexPath -Raw -Encoding UTF8 | ConvertFrom-Json
$maxK = if ($TopK -gt 0) { $TopK } else { 5 }

if ($Stats) {
    Write-Host "=== SSC Router v4.0 Native Stats ===" -ForegroundColor Cyan
    Write-Host "Tier 1 Segments: $($index.segments.Count)"
    Write-Host "Tier 2 Daily Logs: $(if ($index.daily) { $index.daily.Count } else { 0 })"
    exit 0
}

if ($Query) {
    $queryLower = $Query.ToLower()
    $scores = @()
    
    foreach ($seg in $index.segments) {
        $hits = 0
        foreach ($kw in $seg.keywords) {
            if ($queryLower -match [regex]::Escape($kw.ToLower())) { $hits++ }
        }
        if ($hits -gt 0) {
            $scores += [PSCustomObject]@{ Entry = $seg; Tier = 1; Score = $hits * 2.0 }
        }
    }
    
    $ranked = $scores | Sort-Object Score -Descending | Select-Object -First $maxK
    foreach ($r in $ranked) {
        Write-Host "[Tier 1] $($r.Entry.id) - $($r.Entry.summary) (Score: $($r.Score))" -ForegroundColor Green
    }
}
