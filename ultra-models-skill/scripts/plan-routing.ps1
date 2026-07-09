# ============================================================
# plan-routing.ps1 - Planejador de Roteamento Cross-Provider
# ============================================================
# Analisa todos os modelos free disponiveis e recomenda:
#   1. Primary ideal (melhor modelo com mais rotas)
#   2. Fallbacks robustos (prioriza redundancia multi-provider)
#   3. Cadeia resiliente (sobrevive a 1 provider caindo)
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
$config = $null
$primaryModel = $null
$fallbacks = @()
if (Test-Path $configPath) {
    $config = Get-Content $configPath -Raw | ConvertFrom-Json
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
}

# -- Helper ----------------------------------------------------
function Write-Section($title) {
    Write-Host "`n--- $title ---" -ForegroundColor Yellow
}

function Get-ModelBaseName($fullId) {
    $base = $fullId
    $base = $base -replace '^(openrouter|opencode|kilocode|nvidia|antigravity-proxy)/', ''
    $base = $base -replace ':free$', ''
    $base = $base -replace '-free$', ''
    # Normaliza prefixos de org (NVIDIA: org/model -> model)
    $base = $base -replace '^deepseek-ai/', ''
    $base = $base -replace '^minimaxai/', ''
    $base = $base -replace '^z-ai/', ''
    $base = $base -replace '^deepseek/deepseek-', 'deepseek-'
    $base = $base -replace '^minimax/minimax-', 'minimax-'
    $base = $base -replace '^glm/glm-', 'glm-'
    # Normaliza variantes
    $base = $base -replace '^glm-5\.2$', 'glm-5'
    $base = $base -replace '^glm-5\.1$', 'glm-5'
    $base = $base -replace '^minimax-m2\.7$', 'minimax-m2'
    $base = $base -replace '^minimax-m2\.5$', 'minimax-m2'
    $base = $base -replace '^minimax-m3$', 'minimax-m2'
    # Normaliza qwen/qwen3-coder -> qwen3-coder
    $base = $base -replace '^qwen/', ''
    # Remove prefixo nvidia/ residual (nvidia/nemotron-3-super-120b -> nemotron-3-super-120b)
    $base = $base -replace '^nvidia/', ''
    return $base.ToLower()
}

# -- Score de "qualidade" do modelo ----------------------------
# Baseado em tamanho, tipo e reputacao
function Get-ModelQualityScore($baseName) {
    $score = 50  # baseline

    # Modelos grandes = melhor qualidade
    if ($baseName -match '550b|405b|340b|253b|120b|70b') { $score += 30 }
    elseif ($baseName -match '49b|30b|31b|26b|24b') { $score += 20 }
    elseif ($baseName -match '8b|9b|3b|1b|1\.2b') { $score += 5 }

    # Modelos conhecidos e confiaveis
    if ($baseName -match 'nemotron.*ultra') { $score += 15 }
    elseif ($baseName -match 'nemotron.*super') { $score += 12 }
    elseif ($baseName -match 'llama.*(70b|405b)') { $score += 10 }
    elseif ($baseName -match 'gemma.*4') { $score += 10 }
    elseif ($baseName -match 'gpt-oss') { $score += 12 }
    elseif ($baseName -match 'qwen3.*coder') { $score += 10 }
    elseif ($baseName -match 'qwen3.*next') { $score += 8 }
    elseif ($baseName -match 'deepseek') { $score += 8 }
    elseif ($baseName -match 'hermes') { $score += 8 }
    elseif ($baseName -match 'deepseek.*v4') { $score += 10 }
    elseif ($baseName -match 'deepseek.*v3') { $score += 7 }
    elseif ($baseName -match 'minimax') { $score += 8 }
    elseif ($baseName -match 'glm.*5') { $score += 8 }
    elseif ($baseName -match 'laguna.*m\.1') { $score += 7 }
    elseif ($baseName -match 'hy3') { $score += 6 }

    # Modelos de safety/embedding nao servem como primary
    if ($baseName -match 'content-safety|embed|pii|safety-guard|nemoguard|parse|clip|retriever|translate|calibration|cosmos|neva|vila') { $score -= 40 }

    # Modelos muito pequenos (< 3B) sao fracos como primary
    if ($baseName -match '(^|[^0-9])(1b|3b|1\.2b|4b)') { $score -= 15 }

    return $score
}

# -- Score de TPS (tokens per second) por modelo -----------------
# Estimativa baseada em benchmarks conhecidos
# Fallbacks precisam ser RAPIDOS — resposta em segundos, nao minutos
function Get-ModelTPSScore($baseName) {
    $tps = 50  # baseline (resposta moderada)

    # Modelos leves/rapidos (alto TPS)
    if ($baseName -match 'deepseek.*v4.*flash') { $tps = 95 }    # flash = otimizado pra velocidade
    elseif ($baseName -match 'mimo.*v2\.5') { $tps = 90 }       # mimo = coding rapido
    elseif ($baseName -match 'big-pickle') { $tps = 85 }         # opencode default, rapido
    elseif ($baseName -match 'hy3') { $tps = 80 }                # tencent, leve
    elseif ($baseName -match 'north-mini-code') { $tps = 80 }    # cohere mini
    elseif ($baseName -match 'gemma.*4.*26b') { $tps = 75 }      # gemma 4 menor
    elseif ($baseName -match 'gemma.*4.*31b') { $tps = 70 }      # gemma 4 maior
    elseif ($baseName -match 'qwen3.*coder') { $tps = 75 }       # qwen3 coder, eficiente
    elseif ($baseName -match 'deepseek') { $tps = 70 }           # deepseek generico
    elseif ($baseName -match 'nemotron.*nano') { $tps = 75 }     # nano = leve
    elseif ($baseName -match 'nemotron.*3\.5') { $tps = 70 }     # 3.5 series
    elseif ($baseName -match 'nemotron.*super.*49b') { $tps = 65 }
    elseif ($baseName -match 'nemotron.*super.*120b') { $tps = 50 }  # 120b = lento
    elseif ($baseName -match 'nemotron.*ultra.*550b') { $tps = 30 }  # 550b = muito lento
    elseif ($baseName -match 'llama.*70b') { $tps = 55 }
    elseif ($baseName -match 'llama.*405b') { $tps = 25 }        # gigante
    elseif ($baseName -match 'gpt-oss.*120b') { $tps = 45 }
    elseif ($baseName -match 'gpt-oss.*20b') { $tps = 70 }
    elseif ($baseName -match 'minimax.*m2\.7') { $tps = 55 }    # minimax m2.7 = moderate
    elseif ($baseName -match 'minimax.*m3') { $tps = 45 }        # minimax m3 = forte mas lento
    elseif ($baseName -match 'minimax.*m2\.5') { $tps = 55 }    # minimax m2.5 = moderate
    elseif ($baseName -match 'glm.*5') { $tps = 60 }             # glm5 = moderado
    elseif ($baseName -match 'hermes.*405b') { $tps = 25 }
    elseif ($baseName -match 'glm') { $tps = 55 }                # glm5 estimado

    # Modelos de safety/embedding
    if ($baseName -match 'content-safety|embed|pii|safety-guard|nemoguard|parse|clip|retriever|translate|calibration|cosmos|neva|vila') { $tps = 0 }

    return $tps
}

# -- Score combinado para fallbacks (quota + TPS + redundancia) --
function Get-FallbackScore($baseName, $providerCount) {
    $quality = Get-ModelQualityScore $baseName
    $tps = Get-ModelTPSScore $baseName
    $redundancy = [Math]::Min(($providerCount - 1) * 15, 45)  # max +45 por 3+ providers

    # Trade-off: capacidade primeiro, velocidade complementa
    # Quality 50%, TPS 25%, Redundancia 25%
    $combined = ($quality * 0.50) + ($tps * 0.25) + ($redundancy * 0.25)
    return [Math]::Round($combined, 1)
}

# -- Score de quota por provider --------------------------------
# Primary DEVE vir do provider com cota mais generosa
function Get-ProviderQuotaScore($provider) {
    switch ($provider) {
        'opencode'    { return 100 }  # Cota mais generosa (big-pickle, mimo, deepseek)
        'openrouter'  { return 60 }   # Free models com rate limits
        'kilocode'    { return 50 }   # Free models, limits moderados
        'nvidia'      { return 30 }   # NIM preview, rate limits estritos
        default       { return 20 }
    }
}

# Provider com cota mais generosa (para primary)
$generousProviders = @('opencode', 'openrouter', 'kilocode', 'nvidia')
$providerQuotaRank = @{}
foreach ($p in $generousProviders) {
    $providerQuotaRank[$p] = Get-ProviderQuotaScore $p
}

Write-Host "`n==========================================" -ForegroundColor Cyan
Write-Host " MODEL ROUTING PLANNER" -ForegroundColor Cyan
Write-Host " $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor DarkGray
Write-Host " OpenClaw home: $openClawHome" -ForegroundColor DarkGray
Write-Host "==========================================" -ForegroundColor Cyan

# ============================================================
# 1. Buscar todos os modelos live
# ============================================================
$liveModels = @{}

# OpenRouter
try {
    $headers = @{ "Authorization" = "Bearer $($envVars['OPENROUTER_API_KEY'])" }
    $resp = Invoke-RestMethod -Uri "https://openrouter.ai/api/v1/models" -Headers $headers -Method Get -TimeoutSec 30
    $free = $resp.data | Where-Object { $_.pricing -and ($_.pricing.prompt -eq "0" -or $_.pricing.prompt -eq 0) }
    foreach ($m in $free) {
        $liveModels["openrouter/$($m.id)"] = @{ provider="openrouter"; id=$m.id; name=$m.name; score=0 }
    }
    Write-Host "  OpenRouter: $($free.Count) free" -ForegroundColor Green
} catch {
    Write-Host "  OpenRouter: ERRO" -ForegroundColor Red
}

# OpenCode
try {
    $headers = @{ "Authorization" = "Bearer $($envVars['OPENCODE_API_KEY'])"; "Content-Type" = "application/json" }
    $resp = Invoke-RestMethod -Uri "https://opencode.ai/zen/v1/models" -Headers $headers -Method Get -TimeoutSec 30
    $all = if ($resp.data) { $resp.data } else { $resp }
    $free = $all | Where-Object { $_.id -match "-free" -or $_.id -eq "big-pickle" -or $_.id -match '^(deepseek|minimax|glm|qwen|mimo)' }
    foreach ($m in $free) {
        $liveModels["opencode/$($m.id)"] = @{ provider="opencode"; id=$m.id; name=$m.name; score=0 }
    }
    Write-Host "  OpenCode: $($free.Count) free" -ForegroundColor Green
} catch {
    Write-Host "  OpenCode: ERRO" -ForegroundColor Red
}

# KiloCode
try {
    $headers = @{ "Authorization" = "Bearer $($envVars['KILOCODE_API_KEY'])"; "Content-Type" = "application/json" }
    $resp = Invoke-RestMethod -Uri "https://api.kilo.ai/api/gateway/models" -Headers $headers -Method Get -TimeoutSec 30
    $all = if ($resp.data) { $resp.data } else { $resp }
    $free = $all | Where-Object { $_.isFree -eq $true }
    foreach ($m in $free) {
        $liveModels["kilocode/$($m.id)"] = @{ provider="kilocode"; id=$m.id; name=$m.name; score=0 }
    }
    Write-Host "  KiloCode: $($free.Count) free" -ForegroundColor Green
} catch {
    Write-Host "  KiloCode: ERRO" -ForegroundColor Red
}

# NVIDIA
try {
    $headers = @{ "Authorization" = "Bearer $($envVars['NVIDIA_API_KEY'])"; "Accept" = "application/json" }
    $resp = Invoke-RestMethod -Uri "https://integrate.api.nvidia.com/v1/models" -Headers $headers -Method Get -TimeoutSec 30
    $all = if ($resp.data) { $resp.data } else { $resp }
    $free = $all | Where-Object {
        ($_.id -match '^nvidia/' -or $_.id -match '^(deepseek-ai|minimaxai|z-ai|qwen)/') -and
        (-not $_.pricing -or $_.pricing.prompt -eq "0" -or $_.pricing.prompt -eq 0 -or $null -eq $_.pricing.prompt)
    }
    foreach ($m in $free) {
        $liveModels["nvidia/$($m.id)"] = @{ provider="nvidia"; id=$m.id; name=$m.name; score=0 }
    }
    Write-Host "  NVIDIA: $($free.Count) free" -ForegroundColor Green
} catch {
    Write-Host "  NVIDIA: ERRO" -ForegroundColor Red
}

Write-Host "`n  Total: $($liveModels.Count) modelos free" -ForegroundColor Cyan

# ============================================================
# 2. Cross-Provider Mapping + Scoring
# ============================================================
$crossProviderMap = @{}
foreach ($fullId in $liveModels.Keys) {
    $base = Get-ModelBaseName $fullId
    if (-not $crossProviderMap.ContainsKey($base)) {
        $crossProviderMap[$base] = @()
    }
    $quality = Get-ModelQualityScore $base
    $liveModels[$fullId].score = $quality
    $crossProviderMap[$base] += @{
        fullId = $fullId
        provider = $liveModels[$fullId].provider
        name = $liveModels[$fullId].name
        score = $quality
    }
}

# Calcular score combinado por modelo (qualidade + redundancia)
$modelScores = @{}
foreach ($base in $crossProviderMap.Keys) {
    $routes = $crossProviderMap[$base]
    $providers = $routes | ForEach-Object { $_.provider } | Select-Object -Unique
    $maxScore = ($routes | ForEach-Object { $_.score } | Measure-Object -Maximum).Maximum
    $redundancyBonus = [Math]::Min(($providers.Count - 1) * 10, 30)  # max +30 por 3+ providers
    $combinedScore = $maxScore + $redundancyBonus

    $modelScores[$base] = @{
        score = $combinedScore
        quality = $maxScore
        redundancy = $providers.Count
        providers = $providers
        routes = $routes
    }
}

# ============================================================
# 3. Rankings
# ============================================================
$sorted = $modelScores.GetEnumerator() | Sort-Object { $_.Value.score } -Descending

Write-Section "TOP 15 MODELOS (qualidade + redundancia)"
Write-Host ""
$i = 0
foreach ($entry in $sorted) {
    if ($i -ge 15) { break }
    $base = $entry.Key
    $info = $entry.Value
    $providers = ($info.providers | Sort-Object) -join " + "
    $scoreColor = if ($info.score -ge 70) { "Green" } elseif ($info.score -ge 50) { "Yellow" } else { "Red" }
    $rank = $i + 1
    Write-Host ("  {0,2}. {1}" -f $rank, $base) -ForegroundColor White
    Write-Host ("      Score: {0} (qualidade: {1} + redundancia: {2} providers)" -f $info.score, $info.quality, $info.redundancy) -ForegroundColor $scoreColor
    Write-Host ("      Providers: {0}" -f $providers) -ForegroundColor DarkGray
    $i++
}

# ============================================================
# 4. Recomendacao de Primary
# RESTRICAO: Primary = melhor modelo do provedor com cota mais generosa
# ============================================================
Write-Section "RECOMENDACAO: PRIMARY MODEL"

# Estrategia: agrupar por provider generoso, pegar melhor modelo de cada
$primaryByProvider = @{}
foreach ($entry in $sorted) {
    $base = $entry.Key
    $info = $entry.Value
    foreach ($route in $info.routes) {
        $prov = $route.provider
        $quotaScore = Get-ProviderQuotaScore $prov
        $totalScore = $info.quality + $quotaScore  # qualidade + quota
        if (-not $primaryByProvider.ContainsKey($prov) -or $totalScore -gt $primaryByProvider[$prov].totalScore) {
            $primaryByProvider[$prov] = @{
                base = $base
                info = $info
                route = $route
                totalScore = $totalScore
                quotaScore = $quotaScore
            }
        }
    }
}

# Melhor provider geral (quota + qualidade)
$bestPrimary = $primaryByProvider.GetEnumerator() | Sort-Object { $_.Value.totalScore } -Descending | Select-Object -First 1
$bestBase = $bestPrimary.Value.base
$bestInfo = $bestPrimary.Value.info
$bestRoute = $bestPrimary.Value.route

Write-Host ""
Write-Host "  MODELO:  $bestBase" -ForegroundColor Green
Write-Host "  ROTA:    $($bestRoute.fullId)" -ForegroundColor White
Write-Host "  SCORE:   $($bestPrimary.Value.totalScore) (qualidade: $($bestInfo.quality) + quota: $($bestPrimary.Value.quotaScore))" -ForegroundColor Cyan
Write-Host "  PROVIDER: $($bestRoute.provider) (cota: $(Get-ProviderQuotaScore $bestRoute.provider)/100)" -ForegroundColor Cyan
Write-Host ""

# Mostrar ranking por provider
Write-Host "  Ranking por provider (quota + qualidade):" -ForegroundColor DarkGray
$rankByProvider = $primaryByProvider.GetEnumerator() | Sort-Object { $_.Value.totalScore } -Descending
$rank = 1
foreach ($entry in $rankByProvider) {
    $prov = $entry.Key
    $pri = $entry.Value
    $marker = if ($rank -eq 1) { " <<<< PRIMARY" } else { "" }
    $color = if ($rank -eq 1) { "Green" } else { "DarkGray" }
    Write-Host ("    {0}. {1} - {2} (score: {3})" -f $rank, $prov, $pri.base, $pri.totalScore) -ForegroundColor $color
    if ($marker) { Write-Host $marker -ForegroundColor Green -NoNewline; Write-Host "" }
    $rank++
}

Write-Host ""

if ($primaryModel) {
    $currentBase = Get-ModelBaseName $primaryModel
    if ($currentBase -eq $bestBase) {
        Write-Host "  Status: JA E O PRIMARY ATUAL" -ForegroundColor Green
    } else {
        Write-Host "  Status: PRIMARY ATUAL E '$primaryModel' (score: $($modelScores[$currentBase].score))" -ForegroundColor Yellow
        Write-Host "  Troca sugerida: $primaryModel -> $($bestRoute.fullId)" -ForegroundColor Yellow
    }
} else {
    Write-Host "  Status: NENHUM PRIMARY CONFIGURADO" -ForegroundColor Yellow
    Write-Host "  Sugerir: $($bestRoute.fullId)" -ForegroundColor Yellow
}

# ============================================================
# 5. Recomendacao de Fallbacks
# RESTRICAO: trade-off quota + TPS + redundancia multi-provider
# ============================================================
Write-Section "RECOMENDACAO: FALLBACKS ROBUSTOS (quota + TPS + redundancia)"

# Pegar top modelos que NAO sao o primary, com diversidade de providers
$usedProviders = @{}
if ($bestRoute) { $usedProviders[$bestRoute.provider] = $true }

$fallbackCandidates = @()
foreach ($entry in $sorted) {
    $base = $entry.Key
    $info = $entry.Value
    if ($base -eq $bestBase) { continue }

    # Evitar modelos de safety/embedding como fallback
    if ($base -match 'content-safety|embed|pii|safety-guard|nemoguard|parse|clip|retriever|translate|calibration|cosmos|neva|vila') { continue }

    # RESTRICAO: fallbacks so de modelos com 2+ providers (redundancia)
    if ($info.redundancy -lt 2) { continue }

    # Calcular bonus por provider novo
    $newProviders = @()
    foreach ($p in $info.providers) {
        if (-not $usedProviders.ContainsKey($p)) {
            $newProviders += $p
        }
    }
    $diversityBonus = $newProviders.Count * 5

    # Score combinado: quota + TPS + redundancia
    $fallbackScore = Get-FallbackScore $base $info.redundancy
    $tpsScore = Get-ModelTPSScore $base
    $qualityScore = Get-ModelQualityScore $base

    $fallbackCandidates += @{
        base = $base
        info = $info
        diversityBonus = $diversityBonus
        totalScore = $fallbackScore + $diversityBonus
        fallbackScore = $fallbackScore
        tpsScore = $tpsScore
        qualityScore = $qualityScore
        newProviders = $newProviders
    }
}

$fallbackCandidates = $fallbackCandidates | Sort-Object { $_.totalScore } -Descending

$maxFallbacks = 12
$fallbackCount = 0
$allUsedProviders = @{}
if ($bestRoute) { $allUsedProviders[$bestRoute.provider] = $true }

Write-Host ""
foreach ($fc in $fallbackCandidates) {
    if ($fallbackCount -ge $maxFallbacks) { break }

    # Escolher melhor rota (priorizar provider novo)
    $bestFallbackRoute = $fc.info.routes | Sort-Object {
        if ($allUsedProviders.ContainsKey($_.provider)) { 1 } else { 0 }
    } | Select-Object -First 1

    $providerLabel = if ($fc.newProviders.Count -gt 0) {
        " [NOVO: $($fc.newProviders -join ', ')]"
    } else { "" }

    $redundancyLabel = if ($fc.info.redundancy -ge 3) { " [3 rotas]" }
                       elseif ($fc.info.redundancy -ge 2) { " [2 rotas]" }
                       else { "" }

    $fallbackCount++
    $fbNum = $fallbackCount + 1
    # ID curto: parte depois do ultimo /
    $shortId = $bestFallbackRoute.fullId -replace '.*/', ''
    # Nome base: normalizado (Get-ModelBaseName ja faz isso)
    $baseName = Get-ModelBaseName $bestFallbackRoute.fullId
    # Rotas: todos os providers que tem este modelo
    $routesList = ($fc.info.routes | ForEach-Object { $_.provider } | Select-Object -Unique | Sort-Object) -join ' + '
    Write-Host "  Fallback $fbNum" -ForegroundColor White
    Write-Host "    ID:        $($bestFallbackRoute.fullId)" -ForegroundColor Cyan
    Write-Host "    Base:      $baseName" -ForegroundColor Green
    Write-Host "    Score:     $($fc.totalScore) (Q:$($fc.qualityScore) T:$($fc.tpsScore) R:$($fc.info.redundancy)) + diversity $($fc.diversityBonus)" -ForegroundColor DarkGray
    Write-Host "    Rotas:     $routesList ($($fc.info.redundancy) providers)" -ForegroundColor Magenta

    # Marcar providers usados
    foreach ($p in $fc.info.providers) {
        $allUsedProviders[$p] = $true
    }
}

# ============================================================
# 6. Cadeia Completa Recomendada
# ============================================================
Write-Section "CADEIA COMPLETA RECOMENDADA"

Write-Host ""
Write-Host "  # Primary" -ForegroundColor Cyan
Write-Host "  primary: $($bestRoute.fullId)" -ForegroundColor Green
Write-Host ""
Write-Host "  # Fallbacks (em ordem de prioridade)" -ForegroundColor Cyan

$fbIndex = 0
foreach ($fc in $fallbackCandidates) {
    if ($fbIndex -ge $maxFallbacks) { break }
    $bestFallbackRoute = $fc.info.routes | Sort-Object {
        if ($allUsedProviders.ContainsKey($_.provider)) { 1 } else { 0 }
    } | Select-Object -First 1
    $fbIndex++
    Write-Host "  -$($bestFallbackRoute.fullId)" -ForegroundColor White
}

Write-Host ""
Write-Host "  # Providers na cadeia: $($allUsedProviders.Keys.Count) unicos" -ForegroundColor DarkGray
Write-Host "  # Sobrevive a queda de $($allUsedProviders.Keys.Count - 1) provider(s)" -ForegroundColor DarkGray

# ============================================================
# 7. Analise de Resiliencia
# ============================================================
Write-Section "ANALISE DE RESILIENCIA"

# Simular queda de cada provider
Write-Host ""
Write-Host "  Simulacao: queda individual de cada provider" -ForegroundColor DarkGray
Write-Host ""

foreach ($prov in ($allUsedProviders.Keys | Sort-Object)) {
    $survivingModels = @()
    foreach ($entry in $sorted) {
        $base = $entry.Key
        $info = $entry.Value
        if ($base -match 'content-safety|embed|pii|safety-guard|nemoguard|parse|clip|retriever|translate|calibration|cosmos|neva|vila') { continue }
        $otherProviders = $info.providers | Where-Object { $_ -ne $prov }
        if ($otherProviders.Count -gt 0) {
            $survivingModels += $base
        }
    }

    $status = if ($survivingModels.Count -ge 5) { "FORTAL" }
              elseif ($survivingModels.Count -ge 3) { "MODERADO" }
              elseif ($survivingModels.Count -ge 1) { "FRACO" }
              else { "CRITICO" }
    $color = switch ($status) {
        "FORTAL" { "Green" }
        "MODERADO" { "Yellow" }
        "FRACO" { "DarkYellow" }
        "CRITICO" { "Red" }
    }

    Write-Host "  Se $($prov) cair: $status ($($survivingModels.Count) modelos sobram)" -ForegroundColor $color
}

# ============================================================
# 8. Gap Analysis - Fallbacks Quebrados
# ============================================================
Write-Section "GAP ANALYSIS"

if ($fallbacks.Count -gt 0) {
    Write-Host ""
    foreach ($fb in $fallbacks) {
        $fbBase = Get-ModelBaseName $fb
        if ($modelScores.ContainsKey($fbBase)) {
            Write-Host "  OK $fb (score: $($modelScores[$fbBase].score), $($modelScores[$fbBase].redundancy) providers)" -ForegroundColor Green
        } else {
            # Verificar se existe por match parcial
            $found = $false
            foreach ($key in $modelScores.Keys) {
                if ($key -match $fbBase -or $fbBase -match $key) {
                    Write-Host "  ~? $fb -> possivel match: $key" -ForegroundColor Yellow
                    $found = $true
                    break
                }
            }
            if (-not $found) {
                Write-Host "  X $fb (MORTO - sem match encontrado)" -ForegroundColor Red
            }
        }
    }
}

Write-Host "`n==========================================" -ForegroundColor Cyan
Write-Host " FIM DO PLANNING" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
