# Research Loop - Free-Tier Edition
# Inspired by rohitg00/pro-workflow wiki-research-loop
#
# BFS research with convergence detection, kill-switch, and budget enforcement.
#
# Usage: .\research-loop.ps1 -Topic "agent memory" -MaxPages 3 -BudgetSeconds 300

param(
    [string]$Topic,
    [int]$MaxPages = 3,
    [int]$MaxDepth = 2,
    [int]$BudgetSeconds = 300,
    [string]$Fetcher = "web",
    [switch]$Force
)

$ErrorActionPreference = "Stop"
$workspaceDir = if ($env:OPENCLAW_WORKSPACE) { $env:OPENCLAW_WORKSPACE } else { Join-Path $env:USERPROFILE ".openclaw\workspace" }
$memoryDir = Join-Path $workspaceDir "memory"
$wikiDir = Join-Path $workspaceDir "wiki"
$stopFile = Join-Path $memoryDir "STOP"
$seedFile = Join-Path $memoryDir "research-seeds.json"
$startTime = Get-Date

# --- Helpers ---
function Write-Step($msg) { Write-Host "`n>> $msg" -ForegroundColor Cyan }
function Write-Ok($msg) { Write-Host "   [OK] $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "   [!] $msg" -ForegroundColor Yellow }
function Write-Fail($msg) { Write-Host "   [X] $msg" -ForegroundColor Red }

function Test-KillSwitch {
    if (Test-Path $stopFile) {
        Write-Warn "Kill-switch detected at $stopFile"
        Remove-Item $stopFile -Force -ErrorAction SilentlyContinue
        return $true
    }
    $elapsed = ((Get-Date) - $startTime).TotalSeconds
    if ($elapsed -gt $BudgetSeconds) {
        Write-Warn "Budget exhausted: $([math]::Round($elapsed, 0))s > ${BudgetSeconds}s"
        return $true
    }
    return $false
}

function Get-Seeds {
    if (Test-Path $seedFile) {
        return (Get-Content $seedFile -Raw -Encoding UTF8 | ConvertFrom-Json)
    }
    return @{ seeds = @() }
}

function Save-Seeds($seeds) {
    $seeds | ConvertTo-Json -Depth 10 | Set-Content $seedFile -Encoding UTF8
}

function Add-Seed($query, $depth, $parentId) {
    $seeds = Get-Seeds
    $seed = @{
        id = "seed-$(Get-Date -Format 'yyyyMMddHHmmss')"
        query = $query
        status = "pending"
        depth = $depth
        parentId = $parentId
        createdAt = (Get-Date -Format "o")
    }
    $seeds.seeds += $seed
    Save-Seeds $seeds
    return $seed
}

function Update-SeedStatus($seedId, $status) {
    $seeds = Get-Seeds
    for ($i = 0; $i -lt $seeds.seeds.Count; $i++) {
        if ($seeds.seeds[$i].id -eq $seedId) {
            $seeds.seeds[$i].status = $status
            break
        }
    }
    Save-Seeds $seeds
}

function Get-NextSeed {
    $seeds = Get-Seeds
    $pending = $seeds.seeds | Where-Object { $_.status -eq "pending" } | Sort-Object { $_.depth }
    return $pending | Select-Object -First 1
}

function Test-Convergence($recentPages) {
    if ($recentPages.Count -lt 3) { return $false }
    
    $allWords = @()
    foreach ($page in $recentPages) {
        $words = $page -split '\W+' | Where-Object { $_.Length -gt 3 }
        $allWords += $words
    }
    
    $uniqueWords = $allWords | Sort-Object -Unique
    $totalWords = $allWords.Count
    
    if ($totalWords -eq 0) { return $false }
    
    $uniqueRatio = $uniqueWords.Count / $totalWords
    return $uniqueRatio -lt 0.05
}

function Invoke-WebSearch($query) {
    $results = @()
    try {
        # Try DuckDuckGo first
        $encodedQuery = [System.Uri]::EscapeDataString($query)
        $url = "https://api.duckduckgo.com/?q=$encodedQuery&format=json&no_html=1"
        $response = Invoke-RestMethod -Uri $url -TimeoutSec 10
        
        if ($response.AbstractText) {
            $results += @{
                title = $query
                content = $response.AbstractText
                url = $response.AbstractURL
            }
        }
        
        foreach ($topic in $response.RelatedTopics | Where-Object { $_.Text } | Select-Object -First 3) {
            $results += @{
                title = $topic.Text.Substring(0, [Math]::Min(50, $topic.Text.Length))
                content = $topic.Text
                url = $topic.FirstURL
            }
        }
        
        # If no results, try Wikipedia API
        if ($results.Count -eq 0) {
            $wikiUrl = "https://en.wikipedia.org/api/rest_v1/page/summary/$([System.Uri]::EscapeDataString($query.Replace(' ', '_')))"
            try {
                $wikiResponse = Invoke-RestMethod -Uri $wikiUrl -TimeoutSec 10
                if ($wikiResponse.extract) {
                    $results += @{
                        title = $wikiResponse.title
                        content = $wikiResponse.extract
                        url = $wikiResponse.content_urls.desktop.page
                    }
                }
            } catch {
                # Wikipedia article not found, skip
            }
        }
    } catch {
        Write-Warn "Search failed: $($_.Exception.Message)"
    }
    return $results
}

function New-WikiPage($topic, $query, $content, $sources) {
    $slug = $query.ToLower() -replace '[^a-z0-9]+', '-' -replace '^-|-$', ''
    $pageDir = Join-Path $wikiDir "research"
    
    if (-not (Test-Path $pageDir)) {
        New-Item -ItemType Directory -Path $pageDir -Force | Out-Null
    }
    
    $pagePath = Join-Path $pageDir "$slug.md"
    
    $markdown = @"
# $query

> Auto-generated by research loop
> Topic: $topic
> Date: $(Get-Date -Format "yyyy-MM-dd")

## Sources

"@
    
    foreach ($source in $sources) {
        $markdown += "- [$($source.title)]($($source.url))`n"
    }
    
    $markdown += "`n## Content`n`n$($content -replace '`n', "`n`n")`n"
    
    $markdown | Set-Content $pagePath -Encoding UTF8
    Write-Ok "Created: $pagePath"
    
    return $pagePath
}

# --- Main Loop ---
Write-Step "Research Loop - Starting"
Write-Host "Topic: $Topic" -ForegroundColor White
Write-Host "Max pages: $MaxPages" -ForegroundColor White
Write-Host "Max depth: $MaxDepth" -ForegroundColor White
Write-Host "Budget: ${BudgetSeconds}s" -ForegroundColor White

# Add initial seed
if (-not $Topic) {
    Write-Fail "Topic is required"
    exit 1
}

$initialSeed = Add-Seed -Query $Topic -Depth 0 -parentId $null
Write-Ok "Initial seed added: $($initialSeed.id)"

$pagesWritten = 0
$convergeStreak = 0
$recentPages = @()

while ($pagesWritten -lt $MaxPages) {
    if (Test-KillSwitch) { break }
    
    $seed = Get-NextSeed
    if (-not $seed) {
        Write-Ok "No more pending seeds"
        break
    }
    
    if ($seed.depth -gt $MaxDepth) {
        Update-SeedStatus $seed.id "skipped"
        Write-Warn "Seed depth $($seed.depth) > max $MaxDepth"
        continue
    }
    
    Write-Step "Processing seed: $($seed.query)"
    Update-SeedStatus $seed.id "active"
    
    # Fetch sources
    $docs = Invoke-WebSearch -Query $seed.query
    
    if ($docs.Count -eq 0) {
        Update-SeedStatus $seed.id "failed"
        Write-Warn "No results found"
        continue
    }
    
    # Compile page
    $content = ""
    foreach ($doc in $docs) {
        $content += "$($doc.content)`n`n"
    }
    
    # Check convergence
    $recentPages += $content
    if ($recentPages.Count -gt 3) {
        $recentPages = $recentPages[-3..-1]
    }
    
    if (Test-Convergence -RecentPages $recentPages) {
        $convergeStreak++
        Write-Warn "Convergence streak: $convergeStreak/3"
        if ($convergeStreak -ge 3) {
            Write-Ok "Converged - stopping"
            Update-SeedStatus $seed.id "done"
            break
        }
    } else {
        $convergeStreak = 0
    }
    
    # Write page
    New-WikiPage -Topic $Topic -Query $seed.query -Content $content -Sources $docs
    Update-SeedStatus $seed.id "done"
    $pagesWritten++
    
    # Enqueue follow-ups (breadth-first)
    if ($seed.depth -lt $MaxDepth) {
        foreach ($doc in $docs | Select-Object -First 2) {
            if ($doc.title -and $doc.title.Length -gt 5) {
                Add-Seed -Query $doc.title -Depth ($seed.depth + 1) -parentId $seed.id | Out-Null
            }
        }
    }
    
    Write-Ok "Pages written: $pagesWritten/$MaxPages"
}

# --- Summary ---
$elapsed = ((Get-Date) - $startTime).TotalSeconds
Write-Host ""
Write-Host "=== Research Loop Summary ===" -ForegroundColor Cyan
Write-Host "Topic: $Topic"
Write-Host "Pages written: $pagesWritten"
Write-Host "Time: $([math]::Round($elapsed, 1))s / ${BudgetSeconds}s"
Write-Host "Status: $(if ($pagesWritten -ge $MaxPages) { 'COMPLETE' } elseif ($convergeStreak -ge 3) { 'CONVERGED' } else { 'HALTED' })"
