# SSC-CRAG — Sparse Selective Cache with Corrective RAG
# Wraps the SSC Router to add relevance validation before returning results.
#
# Inspired by Corrective RAG (CRAG) pattern from awesome-llm-apps.
# Reference: https://github.com/Shubhamsaboo/awesome-llm-apps/tree/main/rag_tutorials/corrective_rag
#
# Flow:
#   1. SSC Router retrieves candidate segments (existing logic)
#   2. CRAG validates each segment's content against the query (NEW)
#   3. Low-relevance segments are discarded
#   4. If no segment passes threshold, escalate to web search or broader search
#   5. Returns validated segments with confidence scores
#
# Usage:
#   .\ssc-crag.ps1 -Query "heartbeat alert storm"
#   .\ssc-crag.ps1 -Query "encoding UTF-8 windows" -Threshold 0.4
#   .\ssc-crag.ps1 -Query "pipeline monitoring" -Fallback
#   .\ssc-crag.ps1 -Stats

param(
    [string]$Query = "",
    [double]$Threshold = 0.3,      # Minimum relevance score to pass validation (0-1)
    [switch]$Fallback,              # If no segments pass, suggest broader search
    [switch]$Stats,
    [switch]$Verbose,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

# Resolve memory dir: prefer workspace/memory if it exists, else PSScriptRoot
$workspaceMem = Join-Path $env:USERPROFILE ".openclaw\workspace\memory"
if (Test-Path (Join-Path $workspaceMem "index.json")) {
    $memoryDir = $workspaceMem
} else {
    $memoryDir = $PSScriptRoot
}
$indexFile = Join-Path $memoryDir "index.json"

if (-not (Test-Path $indexFile)) {
    Write-Error "index.json not found at $memoryDir"
    exit 1
}

$index = Get-Content $indexFile -Raw -Encoding UTF8 | ConvertFrom-Json

if ($Stats) {
    Write-Host ""
    Write-Host "=== SSC-CRAG Stats ===" -ForegroundColor Cyan
    Write-Host "Segments: $($index.segments.Count)"
    Write-Host "Threshold: $Threshold"
    Write-Host "Last maintenance: $($index.lastMaintenance)"
    exit 0
}

if (-not $Query) {
    Write-Host "Usage: .\ssc-crag.ps1 -Query 'your search terms'" -ForegroundColor Yellow
    Write-Host "       .\ssc-crag.ps1 -Query 'search' -Threshold 0.4" -ForegroundColor Yellow
    Write-Host "       .\ssc-crag.ps1 -Query 'search' -Fallback" -ForegroundColor Yellow
    exit 0
}

$queryLower = $Query.ToLower()

# ============================================================
# PHASE 1: Retrieve candidates (same as SSC Router)
# ============================================================
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

    $retrievalScore = ($keywordHits * 2) + $tagHits + ($seg.weight * 0.5)

    $scores += [PSCustomObject]@{
        Segment       = $seg
        RetrievalScore = [math]::Round($retrievalScore, 2)
        KeywordHits   = $keywordHits
        TagHits       = $tagHits
        MatchedKw     = $matchedKeywords
        Validated     = $false
        RelevanceScore = 0.0
        RelevanceGrade = ""
        Confidence    = ""
    }
}

$ranked = $scores | Sort-Object -Property RetrievalScore -Descending
$candidates = $ranked | Where-Object { $_.RetrievalScore -gt 0 }

if ($candidates.Count -eq 0) {
    Write-Host ""
    Write-Host "No candidates found for: $Query" -ForegroundColor Red
    if ($Fallback) {
        Write-Host "SUGGESTION: Broaden search terms or check web search" -ForegroundColor Yellow
    }
    exit 0
}

# ============================================================
# PHASE 2: Validate relevance (CRAG step)
# ============================================================
# For each candidate, we analyze content-to-query relevance using:
# 1. Keyword density (what fraction of query terms appear in content)
# 2. Content length match (too short = no substance, too long = noise)
# 3. Summary alignment (does segment summary relate to query)
# 4. Access pattern (frequently accessed = likely important)

$queryTerms = $queryLower -split '\s+' | Where-Object { $_.Length -gt 2 }

$validated = @()
$discarded = @()

foreach ($c in $candidates) {
    $seg = $c.Segment
    $segPath = Join-Path $memoryDir $seg.file
    $content = ""
    
    if (Test-Path $segPath) {
        $content = (Get-Content $segPath -Raw -Encoding UTF8 -ErrorAction SilentlyContinue) -join "`n"
    }
    
    $contentLower = $content.ToLower()
    
    # --- Relevance Signal 1: Keyword Density ---
    # What fraction of query terms appear in the actual content?
    $contentHits = 0
    foreach ($term in $queryTerms) {
        if ($contentLower.Contains($term)) {
            $contentHits++
        }
    }
    $keywordDensity = if ($queryTerms.Count -gt 0) { $contentHits / $queryTerms.Count } else { 0 }
    
    # --- Relevance Signal 2: Summary Alignment ---
    # Does the segment summary contain query terms?
    $summaryLower = $seg.summary.ToLower()
    $summaryHits = 0
    foreach ($term in $queryTerms) {
        if ($summaryLower.Contains($term)) {
            $summaryHits++
        }
    }
    $summaryAlignment = if ($queryTerms.Count -gt 0) { $summaryHits / $queryTerms.Count } else { 0 }
    
    # --- Relevance Signal 3: Content Sufficiency ---
    # Is there enough content to be useful? (not just a stub)
    $contentLength = $content.Length
    $sufficiency = if ($contentLength -gt 500) { 1.0 }
                   elseif ($contentLength -gt 200) { 0.6 }
                   elseif ($contentLength -gt 50) { 0.3 }
                   else { 0.1 }
    
    # --- Relevance Signal 4: Matched Keywords Depth ---
    # How many of the matched keywords from Phase 1 actually appear in content?
    $depthHits = 0
    foreach ($kw in $c.MatchedKw) {
        if ($contentLower.Contains($kw.ToLower())) {
            $depthHits++
        }
    }
    $keywordDepth = if ($c.MatchedKw.Count -gt 0) { $depthHits / $c.MatchedKw.Count } else { 0 }
    
    # --- Composite Relevance Score (0-1) ---
    $relevanceScore = (
        ($keywordDensity * 0.35) +     # Do query terms appear in content?
        ($summaryAlignment * 0.25) +   # Does summary match the query?
        ($sufficiency * 0.15) +         # Is there enough substance?
        ($keywordDepth * 0.25)          # Do matched keywords actually appear?
    )
    
    $relevanceScore = [math]::Round($relevanceScore, 3)
    
    # --- Grade ---
    $grade = if ($relevanceScore -ge 0.7) { "HIGH" }
             elseif ($relevanceScore -ge 0.4) { "MEDIUM" }
             elseif ($relevanceScore -ge $Threshold) { "LOW-PASS" }
             else { "FAIL" }
    
    # --- Confidence ---
    $confidence = if ($relevanceScore -ge 0.6) { "HIGH" }
                  elseif ($relevanceScore -ge 0.3) { "MEDIUM" }
                  else { "LOW" }
    
    $c.RelevanceScore = $relevanceScore
    $c.RelevanceGrade = $grade
    $c.Confidence = $confidence
    $c.Validated = ($relevanceScore -ge $Threshold)
    
    if ($c.Validated) {
        $validated += $c
    } else {
        $discarded += $c
    }
}

# ============================================================
# PHASE 3: Report results
# ============================================================
Write-Host ""
Write-Host "=== SSC-CRAG Results ===" -ForegroundColor Cyan
Write-Host "Query: $Query"
Write-Host "Threshold: $Threshold"
Write-Host "Candidates: $($candidates.Count) → Validated: $($validated.Count) | Discarded: $($discarded.Count)"
Write-Host ""

if ($Verbose) {
    # Show discarded segments too
    foreach ($d in $discarded) {
        $seg = $d.Segment
        Write-Host "  DISCARDED: $($seg.id) ($($seg.summary))" -ForegroundColor DarkRed
        Write-Host "    Retrieval: $($d.RetrievalScore) | Relevance: $($d.RelevanceScore) ($($d.RelevanceGrade))"
        Write-Host "    Why: keyword_density=$(if ($queryTerms.Count -gt 0) { [math]::Round(($contentLower.Split(' ') | Where-Object { $queryTerms -contains $_ }).Count / $queryTerms.Count, 2) } else { 0 })"
        Write-Host ""
    }
}

if ($validated.Count -eq 0) {
    Write-Host "No segments passed relevance threshold ($Threshold)." -ForegroundColor Red
    if ($Fallback) {
        Write-Host ""
        Write-Host "=== FALLBACK: Broader Search ===" -ForegroundColor Yellow
        Write-Host "Suggestion: Try broader search terms or use web search" -ForegroundColor Yellow
        Write-Host "Query terms used: $($queryTerms -join ', ')" -ForegroundColor DarkGray
    }
    exit 0
}

Write-Host "=== Validated Segments ===" -ForegroundColor Green
Write-Host ""

foreach ($v in $validated) {
    $seg = $v.Segment
    $color = switch ($v.RelevanceGrade) {
        "HIGH"    { "Green" }
        "MEDIUM"  { "Yellow" }
        "LOW-PASS" { "DarkYellow" }
        default   { "Red" }
    }
    
    Write-Host "--- $($seg.id) - $($seg.summary) ---" -ForegroundColor $color
    Write-Host "  Retrieval: $($v.RetrievalScore) | Relevance: $($v.RelevanceScore) ($($v.RelevanceGrade)) | Confidence: $($v.Confidence)"
    if ($v.MatchedKw.Count -gt 0) {
        Write-Host "  Matched: $($v.MatchedKw -join ', ')" -ForegroundColor DarkYellow
    }
    Write-Host ""
    
    # Return content
    $segPath = Join-Path $memoryDir $seg.file
    if (Test-Path $segPath) {
        Get-Content $segPath -Encoding UTF8
    } else {
        Write-Host "  [FILE NOT FOUND: $segPath]" -ForegroundColor Red
    }
    Write-Host ""
}

# ============================================================
# PHASE 4: Update access counts (if not dry run)
# ============================================================
if (-not $DryRun) {
    $updated = $false
    foreach ($v in $validated) {
        $seg = $v.Segment
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
        $index | ConvertTo-Json -Depth 10 | Set-Content $indexFile -Encoding UTF8
        Write-Host "[accessCount updated for $($validated.Count) segments]" -ForegroundColor DarkGray
    }
} else {
    Write-Host "[dry run - accessCount NOT updated]" -ForegroundColor Magenta
}
