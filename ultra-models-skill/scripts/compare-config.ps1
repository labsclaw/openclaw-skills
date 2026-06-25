# ============================================================
# compare-config.ps1 - Cruza API vs config OpenClaw
# ============================================================
# Identifica: modelos mortos, novos disponíveis, aliases orfos
# ============================================================

$ErrorActionPreference = "Continue"

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

# -- Carregar .env ---------------------------------------------
$envFile = "C:\Users\ClawLabs\.openclaw\.env"
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
$configPath = "C:\Users\ClawLabs\.openclaw\openclaw.json"
if (-not (Test-Path $configPath)) {
    Write-Host "[ERRO] openclaw.json nao encontrado: $configPath" -ForegroundColor Red
    exit 1
}

$config = Get-Content $configPath -Raw | ConvertFrom-Json
$configModels = @{}

# Provider models (definicoes reais)
foreach ($provider in $config.models.providers.PSObject.Properties) {
    $providerName = $provider.Name
    if ($provider.Value.models) {
        foreach ($m in $provider.Value.models) {
            $fullId = "$providerName/$($m.id)"
            $configModels[$fullId] = @{
                provider = $providerName
                id = $m.id
                name = $m.name
                source = "provider"
            }
        }
    }
}

# Agent aliases
$agentAliases = @{}
if ($config.agents.defaults.models) {
    foreach ($alias in $config.agents.defaults.models.PSObject.Properties) {
        $agentAliases[$alias.Name] = $alias.Value.alias
    }
}

# Fallbacks
$fallbacks = @()
if ($config.agents.defaults.model.fallbacks) {
    $fallbacks = @($config.agents.defaults.model.fallbacks)
}

Write-Host "`n==========================================" -ForegroundColor Cyan
Write-Host " CONFIG vs API - Comparacao" -ForegroundColor Cyan
Write-Host " $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
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

# OpenRouter
Write-Host "[1/4] Consultando OpenRouter..." -ForegroundColor DarkGray
try {
    $headers = @{ "Authorization" = "Bearer $($envVars['OPENROUTER_API_KEY'])" }
    $resp = Invoke-RestMethod -Uri "https://openrouter.ai/api/v1/models" -Headers $headers -Method Get -TimeoutSec 30
    $free = $resp.data | Where-Object { $_.pricing -and ($_.pricing.prompt -eq "0" -or $_.pricing.prompt -eq 0) }
    foreach ($m in $free) {
        $liveModels["openrouter/$($m.id)"] = @{ provider="openrouter"; id=$m.id; name=$m.name }
    }
    Write-Host "  OpenRouter: $($free.Count) free" -ForegroundColor Green
} catch {
    Write-Host "  OpenRouter: ERRO - $($_.Exception.Message)" -ForegroundColor Red
}

# OpenCode
Write-Host "[2/4] Consultando OpenCode..." -ForegroundColor DarkGray
try {
    $headers = @{ "Authorization" = "Bearer $($envVars['OPENCODE_API_KEY'])"; "Content-Type" = "application/json" }
    $resp = Invoke-RestMethod -Uri "https://opencode.ai/zen/v1/models" -Headers $headers -Method Get -TimeoutSec 30
    $all = if ($resp.data) { $resp.data } else { $resp }
    $free = $all | Where-Object { $_.id -match "-free" -or $_.id -eq "big-pickle" }
    foreach ($m in $free) {
        $liveModels["opencode/$($m.id)"] = @{ provider="opencode"; id=$m.id; name=$m.name }
    }
    Write-Host "  OpenCode: $($free.Count) free" -ForegroundColor Green
} catch {
    Write-Host "  OpenCode: ERRO - $($_.Exception.Message)" -ForegroundColor Red
}

# KiloCode
Write-Host "[3/4] Consultando KiloCode..." -ForegroundColor DarkGray
try {
    $headers = @{ "Authorization" = "Bearer $($envVars['KILOCODE_API_KEY'])"; "Content-Type" = "application/json" }
    $resp = Invoke-RestMethod -Uri "https://api.kilo.ai/api/gateway/models" -Headers $headers -Method Get -TimeoutSec 30
    $all = if ($resp.data) { $resp.data } else { $resp }
    $free = $all | Where-Object { $_.isFree -eq $true }
    foreach ($m in $free) {
        $liveModels["kilocode/$($m.id)"] = @{ provider="kilocode"; id=$m.id; name=$m.name }
    }
    Write-Host "  KiloCode: $($free.Count) free" -ForegroundColor Green
} catch {
    Write-Host "  KiloCode: ERRO - $($_.Exception.Message)" -ForegroundColor Red
}

# NVIDIA
Write-Host "[4/4] Consultando NVIDIA..." -ForegroundColor DarkGray
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
    Write-Host "  NVIDIA: $($free.Count) free" -ForegroundColor Green
} catch {
    Write-Host "  NVIDIA: ERRO - $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nTotal live: $($liveModels.Count) modelos free`n" -ForegroundColor Cyan

# ============================================================
# 2. Comparar: Config vs Live
# ============================================================

# 2a. Modelos no config que NAO existem na API (MORTOS)
Write-Section "MODELOS MORTOS (no config, ausente na API)"
$deadCount = 0
foreach ($fullId in $configModels.Keys) {
    if (-not $liveModels.ContainsKey($fullId)) {
        $m = $configModels[$fullId]
        $alias = if ($agentAliases.ContainsKey($fullId)) { " -> $($agentAliases[$fullId])" } else { "" }
        $isFallback = if ($fallbacks -contains $fullId) { " [FALLBACK]" } else { "" }
        Write-Host "  X $fullId ($($m.name))$alias$isFallback" -ForegroundColor Red
        $deadCount++
    }
}
if ($deadCount -eq 0) { Write-Host "  (nenhum)" -ForegroundColor Green }

# 2b. Modelos live que NAO estao no config (NOVOS)
Write-Section "MODELOS NOVOS (na API, ausente no config)"
$newCount = 0
foreach ($fullId in $liveModels.Keys) {
    if (-not $configModels.ContainsKey($fullId)) {
        $m = $liveModels[$fullId]
        Write-Host "  + $fullId ($($m.name))" -ForegroundColor Green
        $newCount++
    }
}
if ($newCount -eq 0) { Write-Host "  (nenhum)" -ForegroundColor Green }

# 2c. Aliases orfos (apontam pra modelos mortos)
Write-Section "ALIASES ORFOS (alias aponta pra modelo morto)"
$orphanCount = 0
foreach ($aliasPath in $agentAliases.Keys) {
    if (-not $liveModels.ContainsKey($aliasPath)) {
        Write-Host "  ! $aliasPath -> $($agentAliases[$aliasPath])" -ForegroundColor Yellow
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

# 2e. Resumo
Write-Host "`n==========================================" -ForegroundColor Cyan
Write-Host " RESUMO" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Config: $($configModels.Count) modelos definidos" -ForegroundColor White
Write-Host "  Live:   $($liveModels.Count) modelos free disponiveis" -ForegroundColor White
Write-Host "  Mortos: $deadCount" -ForegroundColor $(if($deadCount -gt 0){"Red"}else{"Green"})
Write-Host "  Novos:  $newCount" -ForegroundColor $(if($newCount -gt 0){"Green"}else{"White"})
Write-Host "  Aliases orfos: $orphanCount" -ForegroundColor $(if($orphanCount -gt 0){"Yellow"}else{"Green"})
Write-Host "  Fallbacks quebrados: $brokenFb" -ForegroundColor $(if($brokenFb -gt 0){"Red"}else{"Green"})
Write-Host ""
