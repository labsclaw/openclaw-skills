# Offline contract checks for the real five consumers. No real keys or network.
$ErrorActionPreference = 'Stop'
$fixtureRoot = Join-Path ([System.IO.Path]::GetTempPath()) ('opencode-consumers-' + [guid]::NewGuid())
$previousConfig = $env:OPENCLAW_CONFIG_PATH
New-Item -ItemType Directory -Path (Join-Path $fixtureRoot 'logs') -Force | Out-Null
try {
    $env:OPENCLAW_CONFIG_PATH = Join-Path $fixtureRoot 'openclaw.json'
    @{
        models = @{ providers = @{ opencode = @{ models = @(@{ id='missing-free'; name='Missing' }) } } }
        agents = @{ defaults = @{ models = @{ 'opencode/missing-free' = @{ alias='missing' } }; model = @{primary='opencode/missing-free'; fallbacks=@('opencode/missing-free')} } }
    } | ConvertTo-Json -Depth 12 | Set-Content $env:OPENCLAW_CONFIG_PATH
    'OPENROUTER_API_KEY=fixture', 'KILOCODE_API_KEY=fixture', 'NVIDIA_API_KEY=fixture' | Set-Content (Join-Path $fixtureRoot '.env')
    $fixtureCatalogJson = @{status='catalog_only'; error=$null; total=1; free=1; models=@(@{id='present-free';name='Present'})} | ConvertTo-Json -Depth 5 -Compress
    function node {
        if ($script:failCli) { $global:LASTEXITCODE = 1; return '{"status":"unavailable"}' }
        $global:LASTEXITCODE = 0
        return $fixtureCatalogJson
    }
    function Invoke-RestMethod {
        param($Uri, $Headers, $Method, $TimeoutSec)
        if ($Uri -match 'opencode') { throw 'Unexpected hosted OpenCode request' }
        return @{data=@(@{id='other'; name='Other'; pricing=@{prompt='0'}; isFree=$true; owned_by='nvidia'})}
    }
    $count = 0
    foreach ($script:failCli in @($false, $true)) {
        foreach ($consumer in @('list-free-models.ps1','sync-config.ps1','compare-config.ps1','build-model-map.ps1','report-final.ps1')) {
            $params = @{}
            if ($consumer -in @('sync-config.ps1','report-final.ps1')) { $params.Json = $true }
            $records = @(& { & (Join-Path $PSScriptRoot $consumer) @params } *>&1)
            $consumerErrors = @($records | Where-Object { $_ -is [System.Management.Automation.ErrorRecord] })
            if ($consumerErrors.Count) { throw "$consumer errors: $($consumerErrors -join ', ')" }
            $output = $records | Out-String
            if ($output -match 'Unexpected hosted OpenCode request') { throw "Hosted request: $consumer" }
            if ($output -match '(?m)^\s+[X!-] opencode/missing-free') { throw "False removal: $consumer" }
            if ($consumer -eq 'sync-config.ps1') {
                $reportFile = Get-ChildItem (Join-Path $fixtureRoot 'logs') -Filter 'sync-config-*.json' | Sort-Object LastWriteTime -Descending | Select-Object -First 1
                $report = Get-Content $reportFile.FullName -Raw | ConvertFrom-Json
                if ($report.dead.provider -contains 'opencode') { throw 'OpenCode classified dead' }
                if ($report.unverified -notcontains 'opencode/missing-free') { throw 'Missing unverified model' }
            }
            $count++
        }
    }
    Write-Output "PASS: $count consumer cases, CLI success/failure; no OpenCode key, no hosted requests, no false removals."
} finally {
    $env:OPENCLAW_CONFIG_PATH = $previousConfig
    # Retain fixture outputs for inspection; no broad filesystem cleanup.
    Write-Output "Fixture: $fixtureRoot"
}
