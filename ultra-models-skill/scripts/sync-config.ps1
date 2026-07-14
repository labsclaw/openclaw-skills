# ============================================================
# sync-config.ps1 - Cruza API vs config OpenClaw
# ============================================================
# Identifica: modelos mortos, novos disponiveis, aliases orfos,
#             fallbacks quebrados, e sugere acoes.
#
# Uso:  powershell -ExecutionPolicy Bypass -File sync-config.ps1
#       powershell -ExecutionPolicy Bypass -File sync-config.ps1 -Json
# ============================================================

param(
    [switch]$Json,
    [switch]$Quiet
)

$ErrorActionPreference = "Continue"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding  = [System.Text.Encoding]::UTF8
$OutputEncoding           = [System.Text.Encoding]::UTF8

# -- Load shared functions ------------------------------------
$sharedPath = Join-Path $PSScriptRoot "_shared.ps1"
if (Test-Path $sharedPath) { . $sharedPath } else {
    Write-Host "[ERRO] _shared.ps1 nao encontrado em $PSScriptRoot" -ForegroundColor Red
    exit 1
}

# -- Load .env keys -------------------------------------------
$envVars = Get-AllEnvKeys
$requiredKeys = @("OPENROUTER_API_KEY", "OPENCODE_API_KEY", "KILOCODE_API_KEY", "NVIDIA_API_KEY")
$missing = @()
foreach ($key in $requiredKeys) {
    if (-not $envVars.ContainsKey($key) -or [string]::IsNullOrWhiteSpace($envVars[$key])) {
        $missing += $key
    }
}
if ($missing.Count -gt 0) {
    Write-Status "Chaves ausentes no .env: $($missing -join ', ')" "ERROR"
    exit 1
}

# -- Load openclaw.json config --------------------------------
$configPath = Join-Path (Get-OpenClawHome) "openclaw.json"
if (-not (Test-Path $configPath)) {
    Write-Status "openclaw.json nao encontrado: $configPath" "ERROR"
    exit 1
}
$config = Get-Content $configPath -Raw | ConvertFrom-Json

# ============================================================
# 1. QUERY LIVE APIs
# ============================================================

function Get-OpenRouterModels {
    try {
        $headers = @{ "Authorization" = "Bearer $($envVars['OPENROUTER_API_KEY'])" }
        $resp = Invoke-RestMethod -Uri "https://openrouter.ai/api/v1/models" -Headers $headers -Method Get -TimeoutSec 30
        $free = $resp.data | Where-Object {
            $_.pricing -and ($_.pricing.prompt -eq "0" -or $_.pricing.prompt -eq 0)
        }
        $result = @()
        foreach ($m in $free) {
            $result += [PSCustomObject]@{
                full_id    = "openrouter/$($m.id)"
                base_id    = Get-CanonicalModelId $m.id
                provider   = "openrouter"
                name       = if ($m.name) { $m.name } else { $m.id }
            }
        }
        return $result
    } catch {
        Write-Status "Falha OpenRouter: $($_.Exception.Message)" "WARN"
        return @()
    }
}

function Get-OpenCodeModels {
    try {
        $headers = @{
            "Authorization" = "Bearer $($envVars['OPENCODE_API_KEY'])"
            "Content-Type"  = "application/json"
        }
        $resp = Invoke-RestMethod -Uri "https://opencode.ai/zen/v1/models" -Headers $headers -Method Get -TimeoutSec 30
        $all = if ($resp.data) { $resp.data } else { $resp }
        $free = $all | Where-Object { $_.id -match "-free" -or $_.id -eq "big-pickle" }
        $result = @()
        foreach ($m in $free) {
            $id = if ($m.id) { $m.id } else { $m }
            $result += [PSCustomObject]@{
                full_id    = "opencode/$id"
                base_id    = Get-CanonicalModelId $id
                provider   = "opencode"
                name       = if ($m.name) { $m.name } else { $id }
            }
        }
        return $result
    } catch {
        Write-Status "Falha OpenCode: $($_.Exception.Message)" "WARN"
        return @()
    }
}

function Get-KiloCodeModels {
    try {
        $headers = @{
            "Authorization" = "Bearer $($envVars['KILOCODE_API_KEY'])"
            "Content-Type"  = "application/json"
        }
        $resp = Invoke-RestMethod -Uri "https://api.kilo.ai/api/gateway/models" -Headers $headers -Method Get -TimeoutSec 30
        $all = if ($resp.data) { $resp.data } else { $resp }
        $free = $all | Where-Object { $_.isFree -eq $true }
        $result = @()
        foreach ($m in $free) {
            $id = if ($m.id) { $m.id } else { $m }
            $result += [PSCustomObject]@{
                full_id    = "kilocode/$id"
                base_id    = Get-CanonicalModelId $id
                provider   = "kilocode"
                name       = if ($m.name) { $m.name } else { $id }
            }
        }
        return $result
    } catch {
        Write-Status "Falha KiloCode: $($_.Exception.Message)" "WARN"
        return @()
    }
}

function Get-NVIDIAModels {
    try {
        $headers = @{
            "Authorization" = "Bearer $($envVars['NVIDIA_API_KEY'])"
            "Accept"        = "application/json"
        }
        $resp = Invoke-RestMethod -Uri "https://integrate.api.nvidia.com/v1/models" -Headers $headers -Method Get -TimeoutSec 30
        $all = if ($resp.data) { $resp.data } else { $resp }
        $free = $all | Where-Object {
            ($_.owned_by -eq 'nvidia') -or
            (-not $_.pricing) -or
            ($_.pricing.prompt -eq "0" -or $_.pricing.prompt -eq 0)
        }
        $result = @()
        foreach ($m in $free) {
            $id = if ($m.id) { $m.id } else { $m }
            $result += [PSCustomObject]@{
                full_id    = "nvidia/$id"
                base_id    = Get-CanonicalModelId $id
                provider   = "nvidia"
                name       = if ($m.name) { $m.name } else { $id }
            }
        }
        return $result
    } catch {
        Write-Status "Falha NVIDIA: $($_.Exception.Message)" "WARN"
        return @()
    }
}

# Query all providers
Write-Section "1. Consultando APIs ao vivo"
Write-Status "OpenRouter..." "STEP"
$orModels = Get-OpenRouterModels
Write-Status "$($orModels.Count) modelos free" "OK"

Write-Status "OpenCode Zen..." "STEP"
$ocModels = Get-OpenCodeModels
Write-Status "$($ocModels.Count) modelos free" "OK"

Write-Status "KiloCode..." "STEP"
$kcModels = Get-KiloCodeModels
Write-Status "$($kcModels.Count) modelos free" "OK"

Write-Status "NVIDIA NIM..." "STEP"
$nvModels = Get-NVIDIAModels
Write-Status "$($nvModels.Count) modelos free" "OK"

$allLiveModels = $orModels + $ocModels + $kcModels + $nvModels

# ============================================================
# 2. EXTRACT CONFIG MODELS
# ============================================================

Write-Section "2. Extraindo modelos do config"

$configModels = @()
$configAliases = @{}
$configFallbacks = @()

# Extract from models.providers
if ($config.models -and $config.models.providers) {
    foreach ($prov in $config.models.providers) {
        $provName = $prov.name
        if ($prov.models) {
            foreach ($m in $prov.models) {
                $fullId = "$provName/$($m.id)"
                $configModels += [PSCustomObject]@{
                    full_id  = $fullId
                    base_id  = Get-CanonicalModelId $m.id
                    provider = $provName
                    name     = $m.name
                    aliases  = $m.aliases
                }
                # Track aliases
                if ($m.aliases) {
                    foreach ($alias in $m.aliases) {
                        $configAliases[$alias] = $fullId
                    }
                }
            }
        }
    }
}

# Extract fallback chains from agents
if ($config.agents) {
    foreach ($agent in $config.agents.PSObject.Properties) {
        $a = $agent.Value
        if ($a.model) {
            $configFallbacks += [PSCustomObject]@{
                agent    = $agent.Name
                model    = $a.model
                fallback = if ($a.fallback) { $a.fallback } else { @() }
            }
        }
    }
}

Write-Status "$($configModels.Count) modelos no config" "OK"
Write-Status "$($configAliases.Count) aliases registrados" "OK"
Write-Status "$($configFallbacks.Count) agentes com fallback" "OK"

# ============================================================
# 3. CROSS-REFERENCE
# ============================================================

Write-Section "3. Cruzamento API vs Config"

# Build lookup sets
$liveBaseIds = @{}
foreach ($m in $allLiveModels) {
    $key = "$($m.provider):$($m.base_id)"
    if (-not $liveBaseIds.ContainsKey($key)) {
        $liveBaseIds[$key] = $m
    }
}

$deadModels = @()
$newModels = @()
$orphanAliases = @()
$brokenFallbacks = @()

# 3a. Dead models (in config but not in any live API)
foreach ($cm in $configModels) {
    $found = $false
    # Check exact provider match
    $key = "$($cm.provider):$($cm.base_id)"
    if ($liveBaseIds.ContainsKey($key)) { $found = $true }
    # Check cross-provider (same base_id in any provider)
    if (-not $found) {
        foreach ($liveKey in $liveBaseIds.Keys) {
            if ($liveKey -like "*:$($cm.base_id)") { $found = $true; break }
        }
    }
    if (-not $found) {
        $deadModels += $cm
    }
}

# 3b. New models (in live API but not in config)
$configBaseIds = @{}
foreach ($cm in $configModels) {
    $key = "$($cm.provider):$($cm.base_id)"
    $configBaseIds[$key] = $true
}

foreach ($lm in $allLiveModels) {
    $key = "$($lm.provider):$($lm.base_id)"
    if (-not $configBaseIds.ContainsKey($key)) {
        # Also check if any config model has this base_id
        $found = $false
        foreach ($cm in $configModels) {
            if ($cm.base_id -eq $lm.base_id) { $found = $true; break }
        }
        if (-not $found) {
            $newModels += $lm
        }
    }
}

# 3c. Orphan aliases
foreach ($alias in $configAliases.Keys) {
    $target = $configAliases[$alias]
    $found = $false
    foreach ($cm in $configModels) {
        if ($cm.full_id -eq $target) { $found = $true; break }
    }
    if (-not $found) {
        $orphanAliases += [PSCustomObject]@{
            alias   = $alias
            target  = $target
            status  = "ORPHAN"
        }
    }
}

# 3d. Broken fallbacks
foreach ($fb in $configFallbacks) {
    if ($fb.fallback -and $fb.fallback.Count -gt 0) {
        foreach ($f in $fb.fallback) {
            $found = $false
            foreach ($cm in $configModels) {
                if ($cm.full_id -eq $f -or $cm.base_id -eq (Get-CanonicalModelId $f)) {
                    $found = $true; break
                }
            }
            if (-not $found) {
                $brokenFallbacks += [PSCustomObject]@{
                    agent    = $fb.agent
                    model    = $fb.model
                    fallback = $f
                    status   = "BROKEN"
                }
            }
        }
    }
}

# ============================================================
# 4. REPORT
# ============================================================

Write-Section "4. Resultado"

Write-Host ""
Write-Status "MORTOS (no config, nao na API): $($deadModels.Count)" $(if ($deadModels.Count -gt 0) { "ERROR" } else { "OK" })
foreach ($dm in $deadModels) {
    Write-Host "  - $($dm.full_id) ($($dm.name))" -ForegroundColor Red
}

Write-Host ""
Write-Status "NOVOS (na API, nao no config): $($newModels.Count)" $(if ($newModels.Count -gt 5) { "WARN" } else { "OK" })
# Deduplicate by base_id for display
$newUnique = $newModels | Sort-Object base_id -Unique
foreach ($nm in $newUnique) {
    $providers = ($newModels | Where-Object { $_.base_id -eq $nm.base_id } | ForEach-Object { $_.provider }) -join ", "
    Write-Host "  + $($nm.base_id) [$providers] - $($nm.name)" -ForegroundColor Green
}

Write-Host ""
Write-Status "ALIASES ORFOS: $($orphanAliases.Count)" $(if ($orphanAliases.Count -gt 0) { "WARN" } else { "OK" })
foreach ($oa in $orphanAliases) {
    Write-Host "  ? $($oa.alias) -> $($oa.target)" -ForegroundColor Yellow
}

Write-Host ""
Write-Status "FALLBACKS QUEBRADOS: $($brokenFallbacks.Count)" $(if ($brokenFallbacks.Count -gt 0) { "ERROR" } else { "OK" })
foreach ($bf in $brokenFallbacks) {
    Write-Host "  ! $($bf.agent): $($bf.model) -> $($bf.fallback)" -ForegroundColor Red
}

# ============================================================
# 5. RECOMMENDATIONS
# ============================================================

Write-Section "5. Recomendacoes"

if ($deadModels.Count -gt 0) {
    Write-Status "Remover do config:" "WARN"
    foreach ($dm in $deadModels) {
        Write-Host "  gateway config.patch: remover $($dm.full_id)" -ForegroundColor Yellow
    }
}

if ($newUnique.Count -gt 0) {
    Write-Status "Candidatos a adicionar (top 10 por qualidade):" "STEP"
    $ranked = @()
    foreach ($nm in $newUnique) {
        $q = Get-ModelQualityScore $nm.base_id
        $ranked += [PSCustomObject]@{ model = $nm; quality = $q }
    }
    $ranked | Sort-Object quality -Descending | Select-Object -First 10 | ForEach-Object {
        Write-Host "  + $($_.model.base_id) (Q=$($_.quality)) [$($_.model.provider)]" -ForegroundColor Green
    }
}

# ============================================================
# 6. JSON EXPORT
# ============================================================

if ($Json) {
    $output = @{
        generated_at = (Get-Date -Format "o")
        live_models  = @{
            openrouter = $orModels.Count
            opencode   = $ocModels.Count
            kilocode   = $kcModels.Count
            nvidia     = $nvModels.Count
            total      = $allLiveModels.Count
        }
        config_models = $configModels.Count
        dead          = $deadModels | ForEach-Object { @{ full_id = $_.full_id; base_id = $_.base_id; provider = $_.provider; name = $_.name } }
        new           = $newUnique | ForEach-Object { @{ full_id = $_.full_id; base_id = $_.base_id; provider = $_.provider; name = $_.name } }
        orphan_aliases = $orphanAliases | ForEach-Object { @{ alias = $_.alias; target = $_.target } }
        broken_fallbacks = $brokenFallbacks | ForEach-Object { @{ agent = $_.agent; model = $_.model; fallback = $_.fallback } }
    }
    $jsonPath = Join-Path (Get-OpenClawHome) "logs\sync-config-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"
    Export-JsonPretty $jsonPath $output
    Write-Host ""
    Write-Status "JSON exportado: $jsonPath" "OK"
}

Write-Host ""
Write-Status "Concluido: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" "OK"
