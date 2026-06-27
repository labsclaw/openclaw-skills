# SSC Health Check — Memory Structure Monitor
# Runs daily to verify memory architecture integrity
# No LLM needed — pure filesystem operations

param(
    [switch]$Quiet
)

$ErrorActionPreference = "Stop"
$memoryDir = $PSScriptRoot
$indexPath = Join-Path $memoryDir "index.json"
$reportFile = Join-Path $memoryDir "health-last-report.md"

# --- Helpers ---
function Write-Status($msg, $color = "White") {
    if (-not $Quiet) { Write-Host $msg -ForegroundColor $color }
}

function Count-Files($path, $pattern = "*") {
    if (Test-Path $path) {
        (Get-ChildItem -Path $path -Filter $pattern -File -ErrorAction SilentlyContinue).Count
    } else { 0 }
}

function Get-DirSize($path) {
    if (Test-Path $path) {
        $bytes = (Get-ChildItem -Path $path -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
        if ($bytes -gt 1MB) { "{0:N2} MB" -f ($bytes / 1MB) }
        elseif ($bytes -gt 1KB) { "{0:N2} KB" -f ($bytes / 1KB) }
        else { "$bytes B" }
    } else { "N/A" }
}

# --- Load index ---
if (-not (Test-Path $indexPath)) {
    Write-Status "[CRITICAL] index.json not found!" "Red"
    exit 1
}
$index = Get-Content $indexPath -Raw -Encoding UTF8 | ConvertFrom-Json

# --- Collect metrics ---
$metrics = @{}
$issues = @()

# Segments
$segmentFiles = Count-Files (Join-Path $memoryDir "segments") "*.md"
$metrics["segments_files"] = $segmentFiles
$metrics["segments_indexed"] = $index.segments.Count
if ($segmentFiles -ne $index.segments.Count) {
    $issues += "index.json has $($index.segments.Count) segments but $segmentFiles .md files found"
}

# Segment health
$segmentHealth = @()
foreach ($seg in $index.segments) {
    $segPath = Join-Path $memoryDir $seg.file
    $exists = Test-Path $segPath
    $lastAccess = if ($seg.lastAccess) { $seg.lastAccess } else { "never" }
    $segmentHealth += [PSCustomObject]@{
        Id         = $seg.id
        File       = $seg.file
        Exists     = $exists
        Access     = $seg.accessCount
        Weight     = $seg.weight
        LastAccess = $lastAccess
    }
    if (-not $exists) {
        $issues += "Segment $($seg.id) references missing file: $($seg.file)"
    }
}
$metrics["segments_healthy"] = ($segmentHealth | Where-Object { $_.Exists }).Count

# Daily logs
$dailyDir = Join-Path $memoryDir "daily"
$dailyCount = Count-Files $dailyDir "*.md"
$metrics["daily_logs"] = $dailyCount
$metrics["daily_size"] = Get-DirSize $dailyDir

# Daily log age
if ($dailyCount -gt 0) {
    $dailyFiles = Get-ChildItem -Path $dailyDir -Filter "*.md" -File | Sort-Object Name
    $metrics["daily_oldest"] = $dailyFiles[0].Name
    $metrics["daily_newest"] = $dailyFiles[-1].Name
    
    $latestDate = $dailyFiles[-1].BaseName -replace "-\d{4}$", ""
    if ($latestDate -match "^\d{4}-\d{2}-\d{2}$") {
        $daysSince = ((Get-Date) - [datetime]::ParseExact($latestDate, "yyyy-MM-dd", $null)).Days
        if ($daysSince -gt 7) {
            $issues += "Latest daily log is $daysSince days old ($latestDate)"
        }
    }
}

# Checkpoints
$checkpointDir = Join-Path $memoryDir "checkpoints"
$checkpointCount = Count-Files $checkpointDir "*.md"
$metrics["checkpoints"] = $checkpointCount
$metrics["checkpoints_size"] = Get-DirSize $checkpointDir

# Fixes
$fixesDir = Join-Path $memoryDir "fixes"
$fixesCount = Count-Files $fixesDir "*.md"
$metrics["fixes"] = $fixesCount

# Total memory size
$metrics["total_size"] = Get-DirSize $memoryDir

# Index age
$lastMaintenance = $index.lastMaintenance
if ($lastMaintenance) {
    $daysSinceMaintenance = ((Get-Date) - [datetime]::Parse($lastMaintenance)).Days
    $metrics["last_maintenance_days"] = $daysSinceMaintenance
    if ($daysSinceMaintenance -gt 30) {
        $issues += "Last maintenance was $daysSinceMaintenance days ago"
    }
} else {
    $issues += "No lastMaintenance date recorded"
}

# --- Generate report ---
$date = Get-Date -Format "yyyy-MM-dd HH:mm"
$report = @"
# SSC Health Report - $date

## Summary
- Segments: $($metrics["segments_indexed"]) indexed, $($metrics["segments_healthy"]) healthy
- Daily logs: $($metrics["daily_logs"]) files ($($metrics["daily_size"]))
- Checkpoints: $($metrics["checkpoints"]) ($($metrics["checkpoints_size"]))
- Fixes: $($metrics["fixes"])
- Total size: $($metrics["total_size"])

## Segment Details
$($segmentHealth | Format-Table Id, Exists, Access, Weight, LastAccess -AutoSize | Out-String)

## Daily Logs
- Oldest: $($metrics["daily_oldest"])
- Newest: $($metrics["daily_newest"])

## Issues Found: $($issues.Count)
$($issues | ForEach-Object { "- $_" } | Out-String)
"@

if ($issues.Count -eq 0) {
    $report += "`nStatus: HEALTHY`n"
} else {
    $report += "`nStatus: ATTENTION NEEDED`n"
}

# Save report
$report | Set-Content $reportFile -Encoding UTF8
Write-Status "[OK] Report saved to $reportFile" "Green"

# Show summary
Write-Status ""
Write-Status "=== SSC Health Check ===" "Cyan"
Write-Status "Segments: $($metrics["segments_indexed"]) indexed, $($metrics["segments_healthy"]) healthy"
Write-Status "Daily logs: $($metrics["daily_logs"]) files ($($metrics["daily_size"]))"
Write-Status "Checkpoints: $($metrics["checkpoints"])"
Write-Status "Total size: $($metrics["total_size"])"

if ($issues.Count -gt 0) {
    Write-Status ""
    Write-Status "Issues ($($issues.Count)):" "Yellow"
    foreach ($issue in $issues) {
        Write-Status "  - $issue" "Yellow"
    }
    Write-Status ""
    Write-Status "Status: ATTENTION NEEDED" "Yellow"
} else {
    Write-Status ""
    Write-Status "Status: HEALTHY" "Green"
}
