# ============================================================
# report-final.ps1 - Relatorio final consolidado
# ============================================================
# Gera um relatorio completo do estado dos modelos free:
# inventario, rankings, saude dos providers, e recomendacoes.
#
# Uso:  powershell -ExecutionPolicy Bypass -File report-final.ps1
#       powershell -ExecutionPolicy Bypass -File report-final.ps1 -Json
# ============================================================

param(
    [switch]$Json
)

$ErrorActionPreference = "Continue"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding  = [System.Text.Encoding]::UTF8
$OutputEncoding           = [System.Text.Encoding]::UTF8

# -- Load shared functions ------------------------------------
$sharedPath = Join-Path $PSScriptRoot "_shared.ps1"
if (Test-Path $sharedPath) { . $sharedPath } else {
    Write-Host "[ERRO] _shared.ps1 nao encontrado" -ForegroundColor Red
    exit 1
}

# -- Load .env keys -------------------------------------------
$envVars = Get-AllEnvKeys

# ============================================================
# 1. QUERY ALL PROVIDERS
# ============================================================

Write-Section "1. Consultando providers"

function Safe-Query($name, $url, $headers, $filterFn) {
    try {
        $resp = Invoke-RestMethod -Uri $url -Headers $headers -Method Get -TimeoutSec 30
        $all = if ($resp.data) { $resp.data } else { $resp }
        $filtered = & $filterFn $all
        return @{ total = $all.Count; free = $filtered.Count; models = $filtered; error = $null }
    } catch {
        return @{ total = 0; free = 0; models = @(); error = $_.Exception.Message }
    }
}

# OpenRouter
$orHeaders = @{ "Authorization" = "Bearer $($envVars['OPENROUTER_API_KEY'])" }
$orResult = Safe-Query "OpenRouter" "https://openrouter.ai/api/v1/models" $orHeaders {
    param($all)
    $all | Where-Object { $_.pricing -and ($_.pricing.prompt -eq "0" -or $_.pricing.prompt -eq 0) }
}
Write-Status "OpenRouter: $($orResult.free) free / $($orResult.total) total" $(if ($orResult.error) { "WARN" } else { "OK" })

# OpenCode
$ocHeaders = @{ "Authorization" = "Bearer $($envVars['OPENCODE_API_KEY'])"; "Content-Type" = "application/json" }
$ocResult = Safe-Query "OpenCode" "https://opencode.ai/zen/v1/models" $ocHeaders {
    param($all)
    $all | Where-Object { $_.id -match "-free" -or $_.id -eq "big-pickle" }
}
Write-Status "OpenCode: $($ocResult.free) free / $($ocResult.total) total" $(if ($ocResult.error) { "WARN" } else { "OK" })

# KiloCode
$kcHeaders = @{ "Authorization" = "Bearer $($envVars['KILOCODE_API_KEY'])"; "Content-Type" = "application/json" }
$kcResult = Safe-Query "KiloCode" "https://api.kilo.ai/api/gateway/models" $kcHeaders {
    param($all)
    $all | Where-Object { $_.isFree -eq $true }
}
Write-Status "KiloCode: $($kcResult.free) free / $($kcResult.total) total" $(if ($kcResult.error) { "WARN" } else { "OK" })

# NVIDIA
$nvHeaders = @{ "Authorization" = "Bearer $($envVars['NVIDIA_API_KEY'])"; "Accept" = "application/json" }
$nvResult = Safe-Query "NVIDIA" "https://integrate.api.nvidia.com/v1/models" $nvHeaders {
    param($all)
    $all | Where-Object {
        ($_.owned_by -eq 'nvidia') -or (-not $_.pricing) -or
        ($_.pricing.prompt -eq "0" -or $_.pricing.prompt -eq 0)
    }
}
Write-Status "NVIDIA: $($nvResult.free) free / $($nvResult.total) total" $(if ($nvResult.error) { "WARN" } else { "OK" })

# ============================================================
# 2. BUILD UNIFIED INVENTORY
# ============================================================

Write-Section "2. Inventario unificado"

$inventory = [System.Collections.ArrayList]::new()

function Add-ToInventory($provider, $models, $providerLabel) {
    foreach ($m in $models) {
        $id = if ($m.id) { $m.id } else { $m }
        $name = if ($m.name) { $m.name } else { $id }
        $cid = Get-CanonicalModelId $id
        $q = Get-ModelQualityScore $cid
        $t = Get-ModelTPSScore $cid
        $fam = Get-ModelFamily $cid
        $tier = Get-ModelTier $cid

        $existing = $inventory | Where-Object { $_.canonical_id -eq $cid -and $_.provider -eq $provider }
        if (-not $existing) {
            [void]$inventory.Add([PSCustomObject]@{
                provider     = $provider
                full_id      = "$provider/$id"
                canonical_id = $cid
                display_name = $name
                family       = $fam
                tier         = $tier
                quality      = $q
                tps          = $t
            })
        }
    }
}

Add-ToInventory "openrouter" $orResult.models "OpenRouter"
Add-ToInventory "opencode" $ocResult.models "OpenCode"
Add-ToInventory "kilocode" $kcResult.models "KiloCode"
Add-ToInventory "nvidia" $nvResult.models "NVIDIA"

Write-Status "$($inventory.Count) entradas no inventario" "OK"

# ============================================================
# 3. RANKINGS
# ============================================================

Write-Section "3. Rankings"

# 3a. By quality
Write-Host ""
Write-Status "TOP 15 por qualidade:" "STEP"
Write-Host ("  {0,-4} {1,-40} {2,-8} {3,-5} {4,-15}" -f "#", "MODELO", "QUALITY", "TPS", "PROVIDER") -ForegroundColor Cyan
Write-Host ("  {0,-4} {1,-40} {2,-8} {3,-5} {4,-15}" -f ("-"*4), ("-"*40), ("-"*8), ("-"*5), ("-"*15)) -ForegroundColor DarkGray

$rankedByQuality = $inventory | Sort-Object quality -Descending | Select-Object -First 15
$i = 1
foreach ($m in $rankedByQuality) {
    Write-Host ("  {0,-4} {1,-40} {2,-8} {3,-5} {4,-15}" -f $i, $m.canonical_id, $m.quality, $m.tps, $m.provider) -ForegroundColor White
    $i++
}

# 3b. By TPS
Write-Host ""
Write-Status "TOP 10 por throughput:" "STEP"
Write-Host ("  {0,-4} {1,-40} {2,-5} {3,-8} {4,-15}" -f "#", "MODELO", "TPS", "QUALITY", "PROVIDER") -ForegroundColor Cyan
$rankedByTPS = $inventory | Sort-Object tps -Descending | Select-Object -First 10
$i = 1
foreach ($m in $rankedByTPS) {
    Write-Host ("  {0,-4} {1,-40} {2,-5} {3,-8} {4,-15}" -f $i, $m.canonical_id, $m.tps, $m.quality, $m.provider) -ForegroundColor White
    $i++
}

# 3c. Multi-provider models
Write-Host ""
Write-Status "Modelos disponiveis em 2+ providers:" "STEP"
$multiProvider = $inventory | Group-Object canonical_id | Where-Object { $_.Count -ge 2 } |
    Sort-Object { ($_.Group | Measure-Object quality -Maximum).Maximum } -Descending
foreach ($mp in $multiProvider) {
    $q = ($mp.Group | Measure-Object quality -Maximum).Maximum
    $providers = ($mp.Group | ForEach-Object { $_.provider }) -join " + "
    Write-Host "  $($mp.Name) (Q=$q) [$providers]" -ForegroundColor Green
}

# ============================================================
# 4. PROVIDER HEALTH
# ============================================================

Write-Section "4. Saude dos providers"

$providers = @(
    @{ name = "OpenRouter"; result = $orResult; health = Get-ProviderHealthScore "openrouter" }
    @{ name = "OpenCode";   result = $ocResult; health = Get-ProviderHealthScore "opencode" }
    @{ name = "KiloCode";   result = $kcResult; health = Get-ProviderHealthScore "kilocode" }
    @{ name = "NVIDIA";     result = $nvResult; health = Get-ProviderHealthScore "nvidia" }
)

Write-Host ("  {0,-12} {1,-8} {2,-8} {3,-8} {4,-10}" -f "PROVIDER", "FREE", "TOTAL", "HEALTH", "STATUS") -ForegroundColor Cyan
Write-Host ("  {0,-12} {1,-8} {2,-8} {3,-8} {4,-10}" -f ("-"*12), ("-"*8), ("-"*8), ("-"*8), ("-"*10)) -ForegroundColor DarkGray
foreach ($p in $providers) {
    $status = if ($p.result.error) { "ERROR" } elseif ($p.result.free -eq 0) { "EMPTY" } else { "OK" }
    $color = switch ($status) { "OK" { "Green" } "EMPTY" { "Yellow" } "ERROR" { "Red" } }
    $healthPct = [Math]::Round($p.health * 100)
    Write-Host ("  {0,-12} {1,-8} {2,-8} {3,-7}% {4,-10}" -f $p.name, $p.result.free, $p.result.total, $healthPct, $status) -ForegroundColor $color
}

# ============================================================
# 5. FAMILY ANALYSIS
# ============================================================

Write-Section "5. Analise por familia"

$families = $inventory | Group-Object family | Sort-Object Count -Descending
Write-Host ("  {0,-15} {1,-6} {2,-8} {3,-8}" -f "FAMILIA", "QTD", "MAX_Q", "MAX_TPS") -ForegroundColor Cyan
foreach ($f in $families) {
    $maxQ = ($f.Group | Measure-Object quality -Maximum).Maximum
    $maxT = ($f.Group | Measure-Object tps -Maximum).Maximum
    Write-Host ("  {0,-15} {1,-6} {2,-8} {3,-8}" -f $f.Name, $f.Count, $maxQ, $maxT) -ForegroundColor White
}

# ============================================================
# 6. RECOMMENDATIONS
# ============================================================

Write-Section "6. Recomendacoes"

# Find models that are good for each key role
$roles = @("ceo_orchestrator", "implementation_agent", "reviewer_agent", "fast_worker")
foreach ($role in $roles) {
    $best = $null
    $bestFit = -1
    foreach ($m in $inventory | Sort-Object quality -Descending) {
        $fit = Get-ModelRoleFit $m.canonical_id $role
        if ($fit -gt $bestFit) {
            $bestFit = $fit
            $best = $m
        }
    }
    if ($best) {
        Write-Status "$role -> $($best.canonical_id) (fit=$([Math]::Round($bestFit, 3)))" "OK"
    }
}

# Warn about single-provider models
$singleProvider = $inventory | Group-Object canonical_id | Where-Object { $_.Count -eq 1 }
if ($singleProvider.Count -gt 0) {
    Write-Host ""
    Write-Status "Modelos sem redundancia de provider:" "WARN"
    foreach ($sp in $singleProvider | Select-Object -First 5) {
        Write-Host "  $($sp.Name) (apenas $($sp.Group[0].provider))" -ForegroundColor Yellow
    }
}

# ============================================================
# 7. JSON EXPORT
# ============================================================

if ($Json) {
    $output = @{
        generated_at = (Get-Date -Format "o")
        providers    = @{}
        inventory    = @()
        rankings     = @{
            by_quality = @()
            by_tps     = @()
        }
    }

    foreach ($p in $providers) {
        $output.providers[$p.name.ToLower()] = @{
            free = $p.result.free
            total = $p.result.total
            health = $p.health
            error = $p.result.error
        }
    }

    foreach ($m in $inventory) {
        $output.inventory += @{
            provider     = $m.provider
            full_id      = $m.full_id
            canonical_id = $m.canonical_id
            display_name = $m.display_name
            family       = $m.family
            tier         = $m.tier
            quality      = $m.quality
            tps          = $m.tps
        }
    }

    $output.rankings.by_quality = $inventory | Sort-Object quality -Descending | Select-Object -First 20 | ForEach-Object {
        @{ canonical_id = $_.canonical_id; quality = $_.quality; provider = $_.provider }
    }
    $output.rankings.by_tps = $inventory | Sort-Object tps -Descending | Select-Object -First 20 | ForEach-Object {
        @{ canonical_id = $_.canonical_id; tps = $_.tps; provider = $_.provider }
    }

    $outPath = Join-Path (Get-OpenClawHome) "logs\model-report-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"
    Export-JsonPretty $outPath $output
    Write-Host ""
    Write-Status "Relatorio exportado: $outPath" "OK"
}

Write-Host ""
Write-Status "Concluido: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" "OK"
