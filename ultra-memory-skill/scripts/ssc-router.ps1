# SSC Router — Sparse Selective Cache
# Inspired by Memory Caching (arXiv 2602.24281)
#
# Usage: .\ssc-router.ps1 -Query "heartbeat alert storm RLA-207"
#        .\ssc-router.ps1 -Query "encoding UTF-8 windows"
#        .\ssc-router.ps1 -List
#        .\ssc-router.ps1 -Stats

param(
    [string]$Query = "",
    [switch]$List,
    [switch]$Stats,
    [int]$TopK = 0,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$memoryDir = $PSScriptRoot
$indexPath = Join-Path $memoryDir "index.json"

if (-not (Test-Path $indexPath)) {
    Write-Error "index.json not found at $indexPath"
    exit 1
}
$index = Get-Content $indexPath -Raw -Encoding UTF8 | ConvertFrom-Json

# --- Stats mode ---
if ($Stats) {
    Write-Host ""
    Write-Host "=== SSC Router Stats ===" -ForegroundColor Cyan
    Write-Host "Segments: $($index.segments.Count)"
    Write-Host "Max per query: $($index.config.maxSegmentsPerQuery)"
    Write-Host "Last maintenance: $($index.lastMaintenance)"
    Write-Host ""
    Write-Host "Segment access counts:" -ForegroundColor Yellow
    foreach ($seg in $index.segments) {
        $bar = "#" * [Math]::Min($seg.accessCount, 20)
        $sum = if ($seg.summary.Length -gt 35) { $seg.summary.Substring(0, 35) + "..." } else { $seg.summary }
        Write-Host ("  {0,-5} {1,-38} access={2,3}  weight={3}  {4}" -f $seg.id, $sum, $seg.accessCount, $seg.weight, $bar)
    }
    exit 0
}

# --- List mode ---
if ($List) {
    Write-Host ""
    Write-Host "=== SSC Segments ===" -ForegroundColor Cyan
    foreach ($seg in $index.segments) {
        Write-Host ""
        Write-Host "$($seg.id) - $($seg.summary)" -ForegroundColor Green
        Write-Host "  File: $($seg.file)"
        Write-Host "  Keywords: $($seg.keywords -join ', ')"
        Write-Host "  Tags: $($seg.tags -join ', ')"
        Write-Host "  Access: $($seg.accessCount) | Weight: $($seg.weight) | Checkpoint: $($seg.lastCheckpoint)"
    }
    exit 0
}

# --- Query mode ---
if (-not $Query) {
    Write-Host "Usage: .\ssc-router.ps1 -Query 'your search terms'" -ForegroundColor Yellow
    Write-Host "       .\ssc-router.ps1 -List" -ForegroundColor Yellow
    Write-Host "       .\ssc-router.ps1 -Stats" -ForegroundColor Yellow
    exit 0
}

$maxK = if ($TopK -gt 0) { $TopK } else { $index.config.maxSegmentsPerQuery }
$queryLower = $Query.ToLower()

# Score each segment
$scores = @()
foreach ($seg in $index.segments) {
    $keywordHits = 0
    $tagHits = 0
    $matchedKeywords = @()

    foreach ($kw in $seg.keywords) {
        if ($queryLower -match [regex]::Escape($kw.ToLower())) {
            $keywordHits++
            $matchedKeywords += $kw
        }
    }
    foreach ($tag in $seg.tags) {
        if ($queryLower -match [regex]::Escape($tag.ToLower())) {
            $tagHits++
        }
    }

    $score = ($keywordHits * 2) + $tagHits + ($seg.weight * 0.5)

    $scores += [PSCustomObject]@{
        Segment     = $seg
        Score       = [math]::Round($score, 2)
        KeywordHits = $keywordHits
        TagHits     = $tagHits
        MatchedKw   = $matchedKeywords
    }
}

$ranked = $scores | Sort-Object -Property Score -Descending | Select-Object -First $maxK
$relevant = $ranked | Where-Object { $_.Score -gt 0 }

if ($relevant.Count -eq 0) {
    Write-Host ""
    Write-Host "No matching segments found for: $Query" -ForegroundColor Red
    exit 0
}

Write-Host ""
Write-Host "=== SSC Results (query: $Query) ===" -ForegroundColor Cyan
Write-Host "Matched $($relevant.Count)/$($index.segments.Count) segments (top $maxK)"
Write-Host ""

foreach ($r in $relevant) {
    $seg = $r.Segment
    Write-Host "--- $($seg.id) - $($seg.summary) ---" -ForegroundColor Green
    Write-Host "  Score: $($r.Score) (keywords=$($r.KeywordHits), tags=$($r.TagHits), weight=$($seg.weight))"
    if ($r.MatchedKw.Count -gt 0) {
        Write-Host "  Matched: $($r.MatchedKw -join ', ')" -ForegroundColor DarkYellow
    }
    Write-Host ""

    $segPath = Join-Path $memoryDir $seg.file
    if (Test-Path $segPath) {
        Get-Content $segPath -Encoding UTF8
    } else {
        Write-Host "  [FILE NOT FOUND: $segPath]" -ForegroundColor Red
    }
    Write-Host ""
}

# --- Update accessCount ---
if (-not $DryRun) {
    $updated = $false
    foreach ($r in $relevant) {
        $seg = $r.Segment
        for ($i = 0; $i -lt $index.segments.Count; $i++) {
            if ($index.segments[$i].id -eq $seg.id) {
                $index.segments[$i].accessCount = $seg.accessCount + 1
                $index.segments[$i] | Add-Member -NotePropertyName "lastAccess" -NotePropertyValue (Get-Date -Format "yyyy-MM-ddTHH:mm:ss") -Force
                $updated = $true
                break
            }
        }
    }
    if ($updated) {
        $index | ConvertTo-Json -Depth 10 | Set-Content $indexPath -Encoding UTF8
        Write-Host "[accessCount updated]" -ForegroundColor DarkGray
    }
} else {
    Write-Host "[dry run - accessCount NOT updated]" -ForegroundColor Magenta
}
