<#
.SYNOPSIS
    Build script for {ModuleName}. Bootstraps dependencies and runs build tasks.
.PARAMETER Task
    The task to execute. If omitted, installs build dependencies (bootstrap).
#>
[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [ValidateSet('Analyze', 'Test', 'Build', 'CI', 'Clean')]
    [string]$Task
)

$ErrorActionPreference = 'Stop'

$moduleName = '{ModuleName}'
$buildDir = Join-Path $PSScriptRoot 'build' $moduleName
$sourceFiles = @(
    '{ModuleName}.psd1'
    '{ModuleName}.psm1'
    'Public'
    'Private'
)

function Install-BuildDependency {
    $modules = @(
        @{ Name = 'Pester';            MinimumVersion = '5.0.0' }
        @{ Name = 'PSScriptAnalyzer';  MinimumVersion = '1.21.0' }
    )

    foreach ($mod in $modules) {
        $installed = Get-Module -ListAvailable -Name $mod.Name |
            Where-Object { $_.Version -ge [version]$mod.MinimumVersion } |
            Sort-Object Version -Descending |
            Select-Object -First 1

        if ($installed) {
            Write-Host "  [OK] $($mod.Name) $($installed.Version)" -ForegroundColor Green
        } else {
            Write-Host "  Installing $($mod.Name) >= $($mod.MinimumVersion)..." -ForegroundColor Yellow
            Install-Module -Name $mod.Name -MinimumVersion $mod.MinimumVersion -Scope CurrentUser -Force -SkipPublisherCheck
            Write-Host "  [OK] $($mod.Name) installed" -ForegroundColor Green
        }
    }
}

function Invoke-Analyze {
    Write-Host "`n=== PSScriptAnalyzer ===" -ForegroundColor Cyan
    $results = Invoke-ScriptAnalyzer -Path $PSScriptRoot -Recurse -Settings (Join-Path $PSScriptRoot 'PSScriptAnalyzerSettings.psd1')

    if ($results) {
        $results | Format-Table -AutoSize
        throw "PSScriptAnalyzer found $($results.Count) issue(s)."
    }
    Write-Host "  No issues found." -ForegroundColor Green
}

function Invoke-Test {
    Write-Host "`n=== Pester Tests ===" -ForegroundColor Cyan
    $config = New-PesterConfiguration
    $config.Run.Path = Join-Path $PSScriptRoot 'Tests'
    $config.Output.Verbosity = 'Detailed'
    $config.Run.Exit = $true
    Invoke-Pester -Configuration $config
}

function Invoke-Build {
    Write-Host "`n=== Build Module ===" -ForegroundColor Cyan
    if (Test-Path $buildDir) { Remove-Item $buildDir -Recurse -Force }
    New-Item -Path $buildDir -ItemType Directory -Force | Out-Null

    foreach ($item in $sourceFiles) {
        $source = Join-Path $PSScriptRoot $item
        if (Test-Path $source) {
            $dest = Join-Path $buildDir $item
            if ((Get-Item $source).PSIsContainer) {
                Copy-Item -Path $source -Destination $dest -Recurse -Force
            } else {
                Copy-Item -Path $source -Destination $dest -Force
            }
        }
    }
    Write-Host "  Module staged to: $buildDir" -ForegroundColor Green
    Test-ModuleManifest -Path (Join-Path $buildDir "$moduleName.psd1") | Format-List Name, Version, Description
}

function Invoke-Clean {
    Write-Host "`n=== Clean ===" -ForegroundColor Cyan
    $buildRoot = Join-Path $PSScriptRoot 'build'
    if (Test-Path $buildRoot) {
        Remove-Item $buildRoot -Recurse -Force
        Write-Host "  Removed $buildRoot" -ForegroundColor Green
    } else {
        Write-Host "  Nothing to clean." -ForegroundColor DarkGray
    }
}

# Main
Write-Host "{ModuleName} Build Script" -ForegroundColor Cyan
Write-Host "Task: $(if ($Task) { $Task } else { 'Bootstrap' })`n"

Write-Host "=== Dependencies ===" -ForegroundColor Cyan
Install-BuildDependency

if (-not $Task) { Write-Host "`nBootstrap complete." -ForegroundColor Green; return }

switch ($Task) {
    'Analyze' { Invoke-Analyze }
    'Test'    { Invoke-Test }
    'Build'   { Invoke-Build }
    'Clean'   { Invoke-Clean }
    'CI'      { Invoke-Analyze; Invoke-Test; Invoke-Build }
}

Write-Host "`nTask '$Task' completed." -ForegroundColor Green
