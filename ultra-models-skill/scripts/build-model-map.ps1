# ============================================================
# build-model-map.ps1 - Gera model-capability-map.json
# ============================================================
# Consulta APIs ao vivo, normaliza, computa capacidades,
# e gera o mapa que o agente alocador usa para montar times.
#
# Uso:  powershell -ExecutionPolicy Bypass -File build-model-map.ps1
#       powershell -ExecutionPolicy Bypass -File build-model-map.ps1 -OutFile <path>
# ============================================================

param(
    [string]$OutFile
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
# 1. QUERY ALL LIVE APIs
# ============================================================

Write-Section "1. Consultando APIs"

function Query-Provider($name, $url, $headers, $filterFn) {
    try {
        $resp = Invoke-RestMethod -Uri $url -Headers $headers -Method Get -TimeoutSec 30
        $all = if ($resp.data) { $resp.data } else { $resp }
        $filtered = & $filterFn $all
        Write-Status "$name : $($filtered.Count) free de $($all.Count) total" "OK"
        return $filtered
    } catch {
        Write-Status "$name falhou: $($_.Exception.Message)" "WARN"
        return @()
    }
}

# OpenRouter
$orHeaders = @{ "Authorization" = "Bearer $($envVars['OPENROUTER_API_KEY'])" }
$orFree = Query-Provider "OpenRouter" "https://openrouter.ai/api/v1/models" $orHeaders {
    param($all)
    $all | Where-Object { $_.pricing -and ($_.pricing.prompt -eq "0" -or $_.pricing.prompt -eq 0) }
}

# OpenCode
$ocHeaders = @{ "Authorization" = "Bearer $($envVars['OPENCODE_API_KEY'])"; "Content-Type" = "application/json" }
$ocFree = Query-Provider "OpenCode" "https://opencode.ai/zen/v1/models" $ocHeaders {
    param($all)
    $all | Where-Object { $_.id -match "-free" -or $_.id -eq "big-pickle" }
}

# KiloCode
$kcHeaders = @{ "Authorization" = "Bearer $($envVars['KILOCODE_API_KEY'])"; "Content-Type" = "application/json" }
$kcFree = Query-Provider "KiloCode" "https://api.kilo.ai/api/gateway/models" $kcHeaders {
    param($all)
    $all | Where-Object { $_.isFree -eq $true }
}

# NVIDIA
$nvHeaders = @{ "Authorization" = "Bearer $($envVars['NVIDIA_API_KEY'])"; "Accept" = "application/json" }
$nvFree = Query-Provider "NVIDIA" "https://integrate.api.nvidia.com/v1/models" $nvHeaders {
    param($all)
    $all | Where-Object {
        ($_.owned_by -eq 'nvidia') -or (-not $_.pricing) -or
        ($_.pricing.prompt -eq "0" -or $_.pricing.prompt -eq 0)
    }
}

# ============================================================
# 2. BUILD CANONICAL INDEX
# ============================================================

Write-Section "2. Normalizando modelos"

# Index: canonical_id -> list of provider routes
$canonicalIndex = @{}

function Add-ToIndex($provider, $rawId, $name, $ownedBy) {
    $cid = Get-CanonicalModelId $rawId
    if (-not $canonicalIndex.ContainsKey($cid)) {
        $canonicalIndex[$cid] = @{
            canonical_id = $cid
            family       = Get-ModelFamily $cid
            tier         = Get-ModelTier $cid
            availability = @()
            display_name = if ($name) { $name } else { $cid }
        }
    }
    $canonicalIndex[$cid].availability += @{
        provider    = $provider
        model_id    = "$provider/$rawId"
        is_free     = $true
        status      = "healthy"
        tps_estimated = Get-ModelTPSScore $cid
    }
}

foreach ($m in $orFree) {
    $id = if ($m.id) { $m.id } else { $m }
    $name = if ($m.name) { $m.name } else { $id }
    Add-ToIndex "openrouter" $id $name $null
}
foreach ($m in $ocFree) {
    $id = if ($m.id) { $m.id } else { $m }
    $name = if ($m.name) { $m.name } else { $id }
    Add-ToIndex "opencode" $id $name $null
}
foreach ($m in $kcFree) {
    $id = if ($m.id) { $m.id } else { $m }
    $name = if ($m.name) { $m.name } else { $id }
    Add-ToIndex "kilocode" $id $name $null
}
foreach ($m in $nvFree) {
    $id = if ($m.id) { $m.id } else { $m }
    $name = if ($m.name) { $m.name } else { $id }
    $owned = if ($m.owned_by) { $m.owned_by } else { $null }
    Add-ToIndex "nvidia" $id $name $owned
}

Write-Status "$($canonicalIndex.Count) modelos canonicos unicos" "OK"

# ============================================================
# 3. COMPUTE CAPABILITIES & ROLE FIT
# ============================================================

Write-Section "3. Computando capacidades"

$allRoles = @(
    "ceo_orchestrator", "strategic_planner", "architecture_agent",
    "implementation_agent", "reviewer_agent", "research_agent",
    "fast_worker", "classifier_agent", "vision_agent", "red_team_agent"
)

$modelsOutput = @()

foreach ($cid in $canonicalIndex.Keys) {
    $entry = $canonicalIndex[$cid]
    $caps = Get-ModelCapabilities $cid
    $quality = Get-ModelQualityScore $cid
    $tps = Get-ModelTPSScore $cid

    # Compute role fits
    $roleFits = @{}
    $bestRoles = @()
    $avoidRoles = @()
    foreach ($role in $allRoles) {
        $fit = Get-ModelRoleFit $cid $role
        $roleFits[$role] = $fit
        if ($fit -ge 0.75) { $bestRoles += $role }
        if ($fit -lt 0.40) { $avoidRoles += $role }
    }

    # Provider diversity
    $providerCount = $entry.availability.Count

    # Build fallback chains
    $sameModelProviders = @()
    $sameCapabilityModels = @()

    # Same model, other providers (same canonical_id)
    foreach ($avail in $entry.availability) {
        $sameModelProviders += $avail.provider
    }

    # Same capability tier, different family
    $family = $entry.family
    foreach ($otherCid in $canonicalIndex.Keys) {
        if ($otherCid -eq $cid) { continue }
        $otherEntry = $canonicalIndex[$otherCid]
        if ($otherEntry.family -eq $family) { continue }
        $otherQ = Get-ModelQualityScore $otherCid
        $diff = [Math]::Abs($quality - $otherQ)
        if ($diff -le 15) {
            $sameCapabilityModels += $otherCid
        }
    }

    # Sort same-capability by quality proximity
    $sameCapabilityModels = $sameCapabilityModels | Sort-Object { [Math]::Abs((Get-ModelQualityScore $_) - $quality) }

    $modelsOutput += [PSCustomObject]@{
        canonical_id   = $cid
        display_name   = $entry.display_name
        family         = $entry.family
        tier           = $entry.tier
        quality_score  = $quality
        tps_score      = $tps
        provider_count = $providerCount
        availability   = $entry.availability
        capabilities   = $caps
        role_fits      = $roleFits
        best_roles     = $bestRoles
        avoid_roles    = $avoidRoles
        fallback_policy = @{
            same_model       = $sameModelProviders | Select-Object -Unique
            same_capability  = $sameCapabilityModels | Select-Object -First 5
            degradation_allowed = ($quality -lt 60)
        }
    }
}

# Sort by quality descending
$modelsOutput = $modelsOutput | Sort-Object quality_score -Descending

Write-Status "$($modelsOutput.Count) modelos processados" "OK"

# ============================================================
# 4. BUILD OUTPUT MAP
# ============================================================

Write-Section "4. Montando mapa"

$output = @{
    generated_at   = (Get-Date -Format "o")
    schema_version = "1.0"
    stats          = @{
        total_models    = $modelsOutput.Count
        total_providers = 4
        families        = ($modelsOutput | ForEach-Object { $_.family } | Select-Object -Unique).Count
        premium_count   = ($modelsOutput | Where-Object { $_.tier -eq "premium" }).Count
        high_count      = ($modelsOutput | Where-Object { $_.tier -eq "high" }).Count
        standard_count  = ($modelsOutput | Where-Object { $_.tier -eq "standard" }).Count
        light_count     = ($modelsOutput | Where-Object { $_.tier -eq "light" }).Count
    }
    models         = @()
}

# Build the models array with provider priority
foreach ($m in $modelsOutput) {
    # Assign provider priority (lower = better)
    $priority = 1
    $availSorted = $m.availability | Sort-Object {
        $providerRank = switch ($_.provider) {
            "nvidia"    { 1 }
            "opencode"  { 2 }
            "kilocode"  { 3 }
            "openrouter"{ 4 }
            default     { 5 }
        }
        $providerRank
    }
    $availWithPriority = @()
    $p = 1
    foreach ($a in $availSorted) {
        $a.priority = $p
        $availWithPriority += $a
        $p++
    }

    $output.models += @{
        canonical_id    = $m.canonical_id
        display_name    = $m.display_name
        family          = $m.family
        tier            = $m.tier
        quality_score   = $m.quality_score
        tps_score       = $m.tps_score
        provider_count  = $m.provider_count
        availability    = $availWithPriority
        capabilities    = $m.capabilities
        role_fits       = $m.role_fits
        best_roles      = $m.best_roles
        avoid_roles     = $m.avoid_roles
        fallback_policy = $m.fallback_policy
    }
}

# ============================================================
# 5. EXPORT
# ============================================================

Write-Section "5. Exportando"

if (-not $OutFile) {
    $OutFile = Join-Path (Get-OpenClawHome) "logs\model-capability-map.json"
}

Export-JsonPretty $OutFile $output
Write-Status "Mapa exportado: $OutFile" "OK"
Write-Status "Tamanho: $([Math]::Round((Get-Item $OutFile).Length / 1KB, 1)) KB" "OK"

# Print summary
Write-Section "Resumo"
Write-Status "Modelos premium: $($output.stats.premium_count)" "OK"
Write-Status "Modelos high:    $($output.stats.high_count)" "OK"
Write-Status "Modelos standard:$($output.stats.standard_count)" "OK"
Write-Status "Modelos light:   $($output.stats.light_count)" "OK"
Write-Status "Familias:        $($output.stats.families)" "OK"
Write-Host ""
Write-Status "Top 5 por qualidade:" "STEP"
$modelsOutput | Select-Object -First 5 | ForEach-Object {
    $providers = ($_.availability | ForEach-Object { $_.provider }) -join ", "
    Write-Host "  $($_.canonical_id) Q=$($_.quality_score) TPS=$($_.tps_score) [$providers]" -ForegroundColor Green
}

Write-Host ""
Write-Status "Concluido: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" "OK"
