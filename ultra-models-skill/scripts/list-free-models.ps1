# ============================================================
# list_free_models.ps1 - Lista modelos free de cada provedor
# ============================================================
# Provedores: OpenRouter, OpenCode Zen, KiloCode, NVIDIA
# Le chaves do .env em C:\Users\ClawLabs\.openclaw\.env
# ============================================================

$ErrorActionPreference = "Continue"

# -- Forcar UTF-8 no PowerShell --------------------------------
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

# -- Carregar .env ---------------------------------------------
$envFile = "C:\Users\ClawLabs\.openclaw\.env"
if (-not (Test-Path $envFile)) {
    Write-Host "[ERRO] Arquivo .env nao encontrado em: $envFile" -ForegroundColor Red
    exit 1
}

$envVars = @{}
Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*([A-Z_]+)\s*=\s*(.+)$') {
        $envVars[$Matches[1]] = $Matches[2].Trim()
    }
}

# -- Validar chaves necessarias --------------------------------
$requiredKeys = @("OPENROUTER_API_KEY", "OPENCODE_API_KEY", "KILOCODE_API_KEY", "NVIDIA_API_KEY")
$missing = @()
foreach ($key in $requiredKeys) {
    if (-not $envVars.ContainsKey($key) -or [string]::IsNullOrWhiteSpace($envVars[$key])) {
        $missing += $key
    }
}
if ($missing.Count -gt 0) {
    Write-Host "[ERRO] Chaves ausentes no .env: $($missing -join ', ')" -ForegroundColor Red
    exit 1
}

Write-Host "[OK] Todas as 4 chaves encontradas no .env`n" -ForegroundColor Green

# -- Helper: separador visual ---------------------------------
function Write-Section($title) {
    $line = "=" * 60
    Write-Host "`n$line" -ForegroundColor Cyan
    Write-Host " $title" -ForegroundColor Cyan
    Write-Host "$line" -ForegroundColor Cyan
}

# ============================================================
# 1. OPENROUTER - GET https://openrouter.ai/api/v1/models
# Filtra modelos com pricing.prompt == "0" (free)
# ============================================================
Write-Section "1. OPENROUTER - Modelos Free"

try {
    $headers = @{ "Authorization" = "Bearer $($envVars['OPENROUTER_API_KEY'])" }
    $response = Invoke-RestMethod -Uri "https://openrouter.ai/api/v1/models" -Headers $headers -Method Get -TimeoutSec 30

    $freeModels = $response.data | Where-Object {
        $_.pricing -and
        ($_.pricing.prompt -eq "0" -or $_.pricing.prompt -eq 0)
    }

    if ($freeModels.Count -gt 0) {
        Write-Host "[>>] $($freeModels.Count) modelos free encontrados:`n" -ForegroundColor Green
        $freeModels | ForEach-Object {
            $name = if ($_.name) { $_.name } else { $_.id }
            Write-Host " - $($_.id)" -ForegroundColor White
            Write-Host " Nome: $name" -ForegroundColor DarkGray
        }
    } else {
        Write-Host "[!] Nenhum modelo free encontrado (ou formato de pricing mudou)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "[ERRO] Erro ao consultar OpenRouter: $($_.Exception.Message)" -ForegroundColor Red
}

# ============================================================
# 2. OPENCODE ZEN - GET https://opencode.ai/zen/v1/models
# ============================================================
Write-Section "2. OPENCODE ZEN - Modelos Free"

try {
    $headers = @{
        "Authorization" = "Bearer $($envVars['OPENCODE_API_KEY'])"
        "Content-Type" = "application/json"
    }
    $response = Invoke-RestMethod -Uri "https://opencode.ai/zen/v1/models" -Headers $headers -Method Get -TimeoutSec 30

    $allModels = if ($response.data) { $response.data } else { $response }
    $models = $allModels | Where-Object { $_.id -match "-free" -or $_.id -eq "big-pickle" }

    if ($models.Count -gt 0) {
        Write-Host "[>>] $($models.Count) modelos free encontrados (de $($allModels.Count) totais):`n" -ForegroundColor Green
        $models | ForEach-Object {
            $id = if ($_.id) { $_.id } else { $_ }
            $name = if ($_.name) { " ($($_.name))" } else { "" }
            Write-Host " - $id$name" -ForegroundColor White
        }
    } else {
        Write-Host "[!] Nenhum modelo retornado" -ForegroundColor Yellow
        Write-Host " Resposta raw: $($response | ConvertTo-Json -Depth 3 -Compress)" -ForegroundColor DarkGray
    }
} catch {
    Write-Host "[ERRO] Erro ao consultar OpenCode Zen: $($_.Exception.Message)" -ForegroundColor Red
}

# ============================================================
# 3. KILOCODE - GET https://api.kilo.ai/api/gateway/models
# ============================================================
Write-Section "3. KILOCODE - Modelos Free"

try {
    $headers = @{
        "Authorization" = "Bearer $($envVars['KILOCODE_API_KEY'])"
        "Content-Type" = "application/json"
    }
    $response = Invoke-RestMethod -Uri "https://api.kilo.ai/api/gateway/models" -Headers $headers -Method Get -TimeoutSec 30

    $allModels = if ($response.data) { $response.data } else { $response }
    $models = $allModels | Where-Object { $_.isFree -eq $true }

    if ($models.Count -gt 0) {
        Write-Host "[>>] $($models.Count) modelos free encontrados (de $($allModels.Count) totais):`n" -ForegroundColor Green
        $models | ForEach-Object {
            $id = if ($_.id) { $_.id } else { $_ }
            $name = if ($_.name) { " ($($_.name))" } else { "" }
            $owned = if ($_.owned_by) { " [by: $($_.owned_by)]" } else { "" }
            Write-Host " - $id$name$owned" -ForegroundColor White
        }
    } else {
        Write-Host "[!] Nenhum modelo retornado" -ForegroundColor Yellow
        Write-Host " Resposta raw: $($response | ConvertTo-Json -Depth 3 -Compress)" -ForegroundColor DarkGray
    }
} catch {
    Write-Host "[ERRO] Erro ao consultar KiloCode: $($_.Exception.Message)" -ForegroundColor Red
}

# ============================================================
# 4. NVIDIA - Modelos Free (NIM Preview)
# Duas abordagens:
#   A) Catalogo JSON do build.nvidia.com (HTML fallback)
#   B) API /v1/models com cruzamento de pricing
# ============================================================
Write-Section "4. NVIDIA - Modelos Free (NIM Preview)"

$nimPreviewIds = @()

# --- Abordagem A: Catalogo JSON ---
try {
    Write-Host " [A] Tentando catalogo JSON do build.nvidia.com..." -ForegroundColor DarkGray

    # 1) Tenta API JSON do catalogo (se disponivel)
    $catalogApiUrls = @(
        "https://build.nvidia.com/api/v1/models?nimType=preview&pageSize=200",
        "https://catalog.api.nvidia.com/v2/models?filters=nimType:preview&limit=200"
    )
    foreach ($catalogUrl in $catalogApiUrls) {
        try {
            $catalogHeaders = @{
                "Authorization" = "Bearer $($envVars['NVIDIA_API_KEY'])"
                "Accept" = "application/json"
                "User-Agent" = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }
            $catalogResp = Invoke-RestMethod -Uri $catalogUrl -Headers $catalogHeaders -Method Get -TimeoutSec 15 -ErrorAction Stop
            $catalogData = if ($catalogResp.data) { $catalogResp.data } elseif ($catalogResp.models) { $catalogResp.models } else { $catalogResp }
            if ($catalogData -is [array] -and $catalogData.Count -gt 0) {
                foreach ($item in $catalogData) {
                    $nimId = if ($item.id) { $item.id } elseif ($item.name) { $item.name } else { $null }
                    if ($nimId) { $nimPreviewIds += $nimId }
                }
                Write-Host "   Encontrados $($nimPreviewIds.Count) modelos no catalogo JSON" -ForegroundColor DarkGray
                break
            }
        } catch { }
    }

    # 2) Fallback: scraping HTML (funciona se pagina renderizar no servidor)
    if ($nimPreviewIds.Count -eq 0) {
        Write-Host "   JSON indisponivel, tentando scraping HTML..." -ForegroundColor DarkGray
        $htmlUrl = "https://build.nvidia.com/models?filters=nimType%3Anim_preview&orderBy=weightPopular%3ADESC&pageSize=200"
        $webHeaders = @{ "User-Agent" = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
        $htmlResponse = Invoke-WebRequest -Uri $htmlUrl -Headers $webHeaders -UseBasicParsing -TimeoutSec 20
        $html = $htmlResponse.Content

        # Procura links de modelos no HTML
        $patterns = @(
            'class="linkbox-overlay"[^>]*href="(/[^"/]+/[^"]+)"',
            'href="(/[a-z0-9_-]+/[a-z0-9_.-]+)"[^>]*class="[^"]*model',
            '"modelId":"([^"]+)"',
            'data-model="([^"]+)"'
        )
        foreach ($p in $patterns) {
            $regexMatches = [regex]::Matches($html, $p)
            foreach ($m in $regexMatches) {
                $nimPreviewIds += $m.Groups[1].Value.TrimStart('/')
            }
        }
        # Deduplica
        $nimPreviewIds = $nimPreviewIds | Select-Object -Unique
        if ($nimPreviewIds.Count -gt 0) {
            Write-Host "   Encontrados $($nimPreviewIds.Count) modelos via HTML scraping" -ForegroundColor DarkGray
        }
    }
} catch {
    Write-Host "   Falha no catalogo: $($_.Exception.Message)" -ForegroundColor DarkGray
}

# --- Abordagem B: API /v1/models (lista completa) ---
try {
    Write-Host " [B] Buscando modelos via integrate.api.nvidia.com..." -ForegroundColor DarkGray
    $apiHeaders = @{
        "Authorization" = "Bearer $($envVars['NVIDIA_API_KEY'])"
        "Accept" = "application/json"
    }
    $response = Invoke-RestMethod -Uri "https://integrate.api.nvidia.com/v1/models" -Headers $apiHeaders -Method Get -TimeoutSec 30
    $allModels = if ($response.data) { $response.data } else { $response }

    # Identifica NIM Preview por:
    #   1) Cruzamento com catalogo (Abordagem A)
    #   2) owned_by = 'nvidia' + sem pricing ou pricing = 0
    #   3) id contendo '-preview' ou '-nim-preview'
    $apiFreeModels = @()
    $nimPreviewSet = @{}; foreach ($id in $nimPreviewIds) { $nimPreviewSet[$id] = $true }

    foreach ($model in $allModels) {
        $id = if ($model.id) { $model.id } else { "" }
        $owned = if ($model.owned_by) { $model.owned_by } else { "" }

        # Match por catalogo
        if ($nimPreviewSet.ContainsKey($id)) {
            $apiFreeModels += $model
            continue
        }

        # Match por naming patterns de NIM Preview
        if ($id -match '(nim|nvidia).*preview' -or $id -match '-preview$' -or $id -match '^nvidia/') {
            $pricing = $model.pricing
            $isFree = $false
            if ($pricing) {
                $prompt = $pricing.prompt
                if ($prompt -eq "0" -or $prompt -eq 0 -or $null -eq $prompt) {
                    $isFree = $true
                }
            } else {
                # Sem pricing = provavelmente NIM Preview (free tier)
                $isFree = $true
            }
            if ($isFree) {
                $apiFreeModels += $model
            }
        }
    }

    $freeUnique = $apiFreeModels | Sort-Object -Property { if ($_.id) { $_.id } else { "" } } -Unique

    Write-Host "[>>] $($allModels.Count) modelos totais na API" -ForegroundColor Green
    if ($freeUnique.Count -gt 0) {
        Write-Host "     $($freeUnique.Count) modelos NIM Preview (free) identificados:`n" -ForegroundColor Green
        $freeUnique | ForEach-Object {
            $mid = if ($_.id) { $_.id } else { $_ }
            $owned = if ($_.owned_by) { " [by: $($_.owned_by)]" } else { "" }
            Write-Host " - $mid$owned" -ForegroundColor White
        }
    } else {
        Write-Host "[!] Nenhum modelo NIM Preview identificado automaticamente" -ForegroundColor Yellow
        Write-Host "    Listando todos os $($allModels.Count) modelos (verifique manualmente):`n" -ForegroundColor Yellow
        $allModels | Select-Object -First 30 | ForEach-Object {
            $mid = if ($_.id) { $_.id } else { $_ }
            $owned = if ($_.owned_by) { " [by: $($_.owned_by)]" } else { "" }
            Write-Host " - $mid$owned" -ForegroundColor DarkGray
        }
        if ($allModels.Count -gt 30) {
            Write-Host "   ... e mais $($allModels.Count - 30) modelos" -ForegroundColor DarkGray
        }
    }
} catch {
    Write-Host "[ERRO] Erro ao consultar NVIDIA API: $($_.Exception.Message)" -ForegroundColor Red
}

# -- Resumo ----------------------------------------------------
Write-Host "`n$("=" * 60)" -ForegroundColor Cyan
Write-Host " Consulta finalizada! $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
Write-Host "$("=" * 60)" -ForegroundColor Cyan