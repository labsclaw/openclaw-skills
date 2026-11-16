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
            if ($consumer -in @('sync-config.ps1','build-model-map.ps1','report-final.ps1')) {
                if (-not @($records | Where-Object { $_ -is [System.Management.Automation.WarningRecord] }).Count) { throw "Missing heuristic warning: $consumer" }
                $pattern = switch ($consumer) {
                    'sync-config.ps1' { 'sync-config-*.json' }
                    'build-model-map.ps1' { 'model-capability-map.json' }
                    'report-final.ps1' { 'model-report-*.json' }
                }
                $scoreFile = Get-ChildItem (Join-Path $fixtureRoot 'logs') -Filter $pattern | Sort-Object LastWriteTime -Descending | Select-Object -First 1
                $scoreDoc = Get-Content $scoreFile.FullName -Raw | ConvertFrom-Json
                if ($scoreDoc.score_evidence.kind -ne 'legacy_heuristic' -or $scoreDoc.score_evidence.benchmark_verified -ne $false -or $scoreDoc.score_evidence.web_researched -ne $false) { throw "Misleading evidence: $consumer" }
                if ($consumer -eq 'sync-config.ps1' -and $scoreDoc.candidate_scope -ne 'new_models_only_not_full_catalog_ranking') { throw 'Missing candidate scope' }
            }
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
    # Normal routing entrypoint: a better role fit must beat a larger Q score.
    $mapPath = Join-Path $fixtureRoot 'logs/model-capability-map.json'
    $testMap = Get-Content $mapPath -Raw | ConvertFrom-Json
    $preferred = $testMap.models[0]
    $preferred.canonical_id = 'preferred-fit'
    $preferred.quality_score = 60
    foreach ($prop in $preferred.role_fits.PSObject.Properties) { $preferred.role_fits.($prop.Name) = 0.99 }
    $other = $preferred | ConvertTo-Json -Depth 30 | ConvertFrom-Json
    $other.canonical_id = 'higher-heuristic-only'
    $other.quality_score = 95
    foreach ($prop in $other.role_fits.PSObject.Properties) { $other.role_fits.($prop.Name) = 0.1 }
    $testMap.models = @($other, $preferred)
    $testMap | ConvertTo-Json -Depth 30 | Set-Content $mapPath
    $routeRecords = @(& { & (Join-Path $PSScriptRoot 'plan-routing.ps1') -MapFile $mapPath -Json } *>&1)
    if (@($routeRecords | Where-Object { $_ -is [System.Management.Automation.ErrorRecord] }).Count) { throw "Routing errors: $($routeRecords -join ', ')" }
    $routeFile = Get-ChildItem (Join-Path $fixtureRoot 'logs') -Filter 'routing-plan-*.json' | Select-Object -First 1
    $route = Get-Content $routeFile.FullName -Raw | ConvertFrom-Json
    if ($route.plan_status -ne 'heuristic_draft_not_applied' -or $route.score_evidence.kind -ne 'legacy_heuristic') { throw 'Unlabeled routing draft' }
    if ($route.team[0].canonical_model -ne 'preferred-fit') { throw 'Quality overrode role-fit order' }
    Write-Output "PASS: $count consumer cases plus routing; provenance, warnings, candidate scope, fit priority; no OpenCode key, no hosted requests, no false removals."
} finally {
    $env:OPENCLAW_CONFIG_PATH = $previousConfig
    # Retain fixture outputs for inspection; no broad filesystem cleanup.
    Write-Output "Fixture: $fixtureRoot"
}
