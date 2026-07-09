# ============================================================
# compare-config.ps1 - Cruza API vs config OpenClaw
# ============================================================
# Identifica: modelos mortos, novos disponiveis, aliases orfos
# Inclui: antigravity proxy (127.0.0.1:8080)
# ============================================================

$ErrorActionPreference = "Continue"

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

# -- Detectar diretorio OpenClaw -------------------------------
function Get-OpenClawHome {
    if ($env:OPENCLAW_CONFIG_PATH) {
        return Split-Path $env:OPENCLAW_CONFIG_PATH -Parent
    }
    $candidate = "$env:USERPROFILE\.openclaw"
    if (Test-Path $candidate) { return $candidate }
    $candidate = "$env:HOMEDRIVE$env:HOMEPATH\.openclaw"
    if (Test-Path $candidate) { return $candidate }
    return "$env:USERPROFILE\.openclaw"
}

$openClawHome = Get-OpenClawHome

# -- Carregar .env ---------------------------------------------
$envFile = Join-Path $openClawHome ".env"
if (-not (Test-Path $envFile)) {
    Write-Host "[ERRO] .env nao encontrado: $envFile" -ForegroundColor Red
    exit 1
}

$envVars = @{}
Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*([A-Z_]+)\s*=\s*(.+)$') {
        $envVars[$Matches[1]] = $Matches[2].Trim()
    }
}

# -- Carregar config -------------------------------------------
$configPath = Join-Path $openClawHome "openclaw.json"
if (-not (Test-Path $configPath)) {
    Write-Host "[ERRO] openclaw.json nao encontrado: $configPath" -ForegroundColor Red
    exit 1
}

$config = Get-Content $configPath -Raw | ConvertFrom-Json

# --- Ler aliases (models section) ---
$configModels = @{}
if ($config.agents.defaults.models) {
    foreach ($alias in $config.agents.defaults.models.PSObject.Properties) {
        $configModels[$alias.Name] = @{
            id = $alias.Name
            name = $alias.Value.alias
            source = "alias"
        }
    }
}

# --- Ler primary + fallbacks ---
$primaryModel = $null
$fallbacks = @()
if ($config.agents.defaults.model) {
    $modelCfg = $config.agents.defaults.model
    if ($modelCfg -is [string]) {
        $primaryModel = $modelCfg
    } elseif ($modelCfg.primary) {
        $primaryModel = $modelCfg.primary
        if ($modelCfg.fallbacks) {
            $fallbacks = @($modelCfg.fallbacks)
        }
    }
}

# --- Ler tambem se houver agent-level model config ---
if ($config.agents.list) {
    foreach ($agent in $config.agents.list) {
        if ($agent.model) {
            $agentModel = $agent.model
            if ($agentModel -is [string]) {
                # agent-level string override
            } elseif ($agentModel.primary) {
                # agent-level object, could add to tracking
            }
        }
    }
}

Write-Host "`n==========================================" -ForegroundColor Cyan
Write-Host " CONFIG vs API - Comparacao" -ForegroundColor Cyan
Write-Host " $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
Write-Host " OpenClaw home: $openClawHome" -ForegroundColor DarkGray
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# -- Helpers ---------------------------------------------------
function Write-Section($title) {
    Write-Host "`n--- $title ---" -ForegroundColor Yellow
}

# ============================================================
# 1. Buscar modelos live de cada API
# ============================================================
$liveModels = @{}
$providerCounts = @{}

# OpenRouter
Write-Host "[1/5] Consultando OpenRouter..." -ForegroundColor DarkGray
try {
    $headers = @{ "Authorization" = "Bearer $($envVars['OPENROUTER_API_KEY'])" }
    $resp = Invoke-RestMethod -Uri "https://openrouter.ai/api/v1/models" -Headers $headers -Method Get -TimeoutSec 30
    $free = $resp.data | Where-Object { $_.pricing -and ($_.pricing.prompt -eq "0" -or $_.pricing.prompt -eq 0) }
    foreach ($m in $free) {
        $liveModels["openrouter/$($m.id)"] = @{ provider="openrouter"; id=$m.id; name=$m.name }
    }
    $providerCounts["OpenRouter"] = $free.Count
    Write-Host "  OpenRouter: $($free.Count) free" -ForegroundColor Green
} catch {
    Write-Host "  OpenRouter: ERRO - $($_.Exception.Message)" -ForegroundColor Red
}

# OpenCode
Write-Host "[2/5] Consultando OpenCode..." -ForegroundColor DarkGray
try {
    $headers = @{ "Authorization" = "Bearer $($envVars['OPENCODE_API_KEY'])"; "Content-Type" = "application/json" }
    $resp = Invoke-RestMethod -Uri "https://opencode.ai/zen/v1/models" -Headers $headers -Method Get -TimeoutSec 30
    $all = if ($resp.data) { $resp.data } else { $resp }
    $free = $all | Where-Object { $_.id -match "-free" -or $_.id -eq "big-pickle" }
    foreach ($m in $free) {
        $liveModels["opencode/$($m.id)"] = @{ provider="opencode"; id=$m.id; name=$m.name }
    }
    $providerCounts["OpenCode"] = $free.Count
    Write-Host "  OpenCode: $($free.Count) free" -ForegroundColor Green
} catch {
    Write-Host "  OpenCode: ERRO - $($_.Exception.Message)" -ForegroundColor Red
}

# KiloCode
Write-Host "[3/5] Consultando KiloCode..." -ForegroundColor DarkGray
try {
    $headers = @{ "Authorization" = "Bearer $($envVars['KILOCODE_API_KEY'])"; "Content-Type" = "application/json" }
    $resp = Invoke-RestMethod -Uri "https://api.kilo.ai/api/gateway/models" -Headers $headers -Method Get -TimeoutSec 30
    $all = if ($resp.data) { $resp.data } else { $resp }
    $free = $all | Where-Object { $_.isFree -eq $true }
    foreach ($m in $free) {
        $liveModels["kilocode/$($m.id)"] = @{ provider="kilocode"; id=$m.id; name=$m.name }
    }
    $providerCounts["KiloCode"] = $free.Count
    Write-Host "  KiloCode: $($free.Count) free" -ForegroundColor Green
} catch {
    Write-Host "  KiloCode: ERRO - $($_.Exception.Message)" -ForegroundColor Red
}

# NVIDIA
Write-Host "[4/5] Consultando NVIDIA..." -ForegroundColor DarkGray
try {
    $headers = @{ "Authorization" = "Bearer $($envVars['NVIDIA_API_KEY'])"; "Accept" = "application/json" }
    $resp = Invoke-RestMethod -Uri "https://integrate.api.nvidia.com/v1/models" -Headers $headers -Method Get -TimeoutSec 30
    $all = if ($resp.data) { $resp.data } else { $resp }
    $free = $all | Where-Object {
        ($_.id -match '(nim|nvidia).*preview' -or $_.id -match '-preview$' -or $_.id -match '^nvidia/') -and
        (-not $_.pricing -or $_.pricing.prompt -eq "0" -or $_.pricing.prompt -eq 0 -or $null -eq $_.pricing.prompt)
    }
    foreach ($m in $free) {
        $liveModels["nvidia/$($m.id)"] = @{ provider="nvidia"; id=$m.id; name=$m.name }
    }
    $providerCounts["NVIDIA"] = $free.Count
    Write-Host "  NVIDIA: $($free.Count) free" -ForegroundColor Green
} catch {
    Write-Host "  NVIDIA: ERRO - $($_.Exception.Message)" -ForegroundColor Red
}

# Antigravity Proxy (local, no auth needed)
Write-Host "[5/5] Consultando Antigravity Proxy..." -ForegroundColor DarkGray
try {
    $resp = Invoke-RestMethod -Uri "http://127.0.0.1:8080/v1/models" -Method Get -TimeoutSec 10
    $all = if ($resp.data) { $resp.data } else { $resp }
    if ($all -is [array]) {
        foreach ($m in $all) {
            $id = if ($m.id) { $m.id } else { "$m" }
            $liveModels["antigravity-proxy/$id"] = @{ provider="antigravity-proxy"; id=$id; name=$id }
        }
        $providerCounts["Antigravity"] = $all.Count
        Write-Host "  Antigravity: $($all.Count) models" -ForegroundColor Green
    }
} catch {
    Write-Host "  Antigravity: offline (proxy nao rodando)" -ForegroundColor Yellow
}

Write-Host "`nTotal live: $($liveModels.Count) modelos free`n" -ForegroundColor Cyan

# ============================================================
# 2. Comparar: Config vs Live
# ============================================================

# 2a. Aliases que NAO existem na API (MORTOS)
Write-Section "ALIASES MORTOS (no config, ausente na API)"
$deadCount = 0
foreach ($fullId in $configModels.Keys) {
    if (-not $liveModels.ContainsKey($fullId)) {
        $m = $configModels[$fullId]
        $aliasInfo = if ($m.name) { " -> $($m.name)" } else { "" }
        $isFallback = if ($fallbacks -contains $fullId) { " [FALLBACK]" } else { "" }
        $isPrimary = if ($fullId -eq $primaryModel) { " [PRIMARY]" } else { "" }
        Write-Host "  X $fullId$aliasInfo$isFallback$isPrimary" -ForegroundColor Red
        $deadCount++
    }
}
if ($deadCount -eq 0) { Write-Host "  (nenhum)" -ForegroundColor Green }

# 2b. Modelos live que NAO estao nos aliases (NOVOS para considerar)
Write-Section "MODELOS NOVOS (na API, sem alias no config)"
$newCount = 0
foreach ($fullId in $liveModels.Keys) {
    if (-not $configModels.ContainsKey($fullId)) {
        $m = $liveModels[$fullId]
        Write-Host "  + $fullId ($($m.name))" -ForegroundColor Green
        $newCount++
    }
}
if ($newCount -eq 0) { Write-Host "  (nenhum)" -ForegroundColor Green }

# 2c. Aliases orfos
Write-Section "ALIASES ORFOS"
$orphanCount = 0
foreach ($aliasPath in $configModels.Keys) {
    if (-not $liveModels.ContainsKey($aliasPath)) {
        Write-Host "  ! $aliasPath -> $($configModels[$aliasPath].name)" -ForegroundColor Yellow
        $orphanCount++
    }
}
if ($orphanCount -eq 0) { Write-Host "  (nenhum)" -ForegroundColor Green }

# 2d. Fallbacks quebrados
Write-Section "FALLBACKS QUEBRADOS"
$brokenFb = 0
foreach ($fb in $fallbacks) {
    if (-not $liveModels.ContainsKey($fb)) {
        Write-Host "  X $fb" -ForegroundColor Red
        $brokenFb++
    }
}
if ($brokenFb -eq 0) { Write-Host "  (todos OK)" -ForegroundColor Green }

# 2e. Primary model status
Write-Section "PRIMARY MODEL"
if ($primaryModel) {
    if ($liveModels.ContainsKey($primaryModel)) {
        Write-Host "  OK $primaryModel" -ForegroundColor Green
    } else {
        Write-Host "  X $primaryModel (SILENT FALLBACK RISK!)" -ForegroundColor Red
    }
} else {
    Write-Host "  (nenhum primary configurado, usa catalogo built-in do gateway)" -ForegroundColor Yellow
}

# 2f. Resumo
Write-Host "`n==========================================" -ForegroundColor Cyan
Write-Host " RESUMO" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Aliases no config: $($configModels.Count)" -ForegroundColor White
Write-Host "  Live:             $($liveModels.Count) modelos free disponiveis" -ForegroundColor White
Write-Host "  Mortos:           $deadCount" -ForegroundColor $(if($deadCount -gt 0){"Red"}else{"Green"})
Write-Host "  Novos:            $newCount" -ForegroundColor $(if($newCount -gt 0){"Green"}else{"White"})
Write-Host "  Fallbacks quebrados: $brokenFb" -ForegroundColor $(if($brokenFb -gt 0){"Red"}else{"Green"})
foreach ($prov in ($providerCounts.Keys | Sort-Object)) {
    Write-Host "  $prov`: $($providerCounts[$prov]) free" -ForegroundColor DarkGray
}
Write-Host ""
