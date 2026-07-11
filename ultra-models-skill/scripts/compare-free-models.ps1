# ============================================================
# compare-free-models.ps1 v2 - Compara config local vs providers
# ============================================================
# Evolucao do script original. Melhorias:
#   1. API do OpenRouter (nao parsing HTML)
#   2. Caminho dinamico (sem hardcoded)
#   3. Ping de validacao (modelo realmente responde?)
#   4. Saida JSON estruturada
#   5. Deteccao de modelos novos e removidos
#   6. Compativel com qualquer instalacao OpenClaw
# ============================================================

param(
    [switch]$Json,
    [switch]$Ping,
    [switch]$Quiet,
    [switch]$Templates,
    [string]$TemplateModel
)

$ErrorActionPreference = "Continue"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

# -- Detectar OpenClaw home (sem hardcoded) -------------------
function Get-OpenClawHome {
    if ($env:OPENCLAW_CONFIG_PATH) {
        return Split-Path $env:OPENCLAW_CONFIG_PATH -Parent
    }
    $candidates = @(
        "$env:USERPROFILE\.openclaw",
        "$env:HOMEDRIVE$env:HOMEPATH\.openclaw",
        "$env:APPDATA\openclaw"
    )
    foreach ($c in $candidates) {
        if ($c -and (Test-Path $c)) { return $c }
    }
    return "$env:USERPROFILE\.openclaw"
}

# -- Ler chave de API do .env ---------------------------------
function Get-EnvKey($keyName) {
    $envPaths = @(
        (Join-Path $script:openClawHome ".env"),
        ".env"
    )
    foreach ($envPath in $envPaths) {
        if (Test-Path $envPath) {
            $line = Get-Content $envPath | Where-Object { $_ -match "^$keyName\s*=\s*(.+)$" } | Select-Object -First 1
            if ($line) {
                if ($line -match "^$keyName\s*=\s*(.+)$") {
                    return $Matches[1].Trim()
                }
            }
        }
    }
    return $null
}

$script:openClawHome = Get-OpenClawHome

if (-not $Quiet) {
    Write-Host "[INFO] OpenClaw home: $script:openClawHome" -ForegroundColor DarkGray
}

# -- Ler configuracao local -----------------------------------
$configPath = Join-Path $script:openClawHome "openclaw.json"
if (-not (Test-Path $configPath)) {
    Write-Host "[ERRO] openclaw.json nao encontrado em: $configPath" -ForegroundColor Red
    exit 1
}

# Remove trailing commas (PowerShell JSON parser nao suporta)
$jsonRaw = Get-Content $configPath -Raw
$jsonRaw = $jsonRaw -replace ',\s*([}\]])', '$1'
$config = $jsonRaw | ConvertFrom-Json

# Extrair todos os modelos configurados (de todos os providers)
$localModels = @()
foreach ($provider in $config.models.providers.PSObject.Properties) {
    $providerName = $provider.Name
    $providerData = $provider.Value
    if ($providerData.models) {
        foreach ($m in $providerData.models) {
            $localModels += [PSCustomObject]@{
                Provider = $providerName
                Id       = $m.id
                FullId   = "$providerName/$($m.id)"
                Name     = $m.name
                Free     = ($m.cost.input -eq 0 -and $m.cost.output -eq 0)
            }
        }
    }
}

$localFree = $localModels | Where-Object { $_.Free }

if (-not $Quiet) {
    Write-Host "[OK] $($localModels.Count) modelos configurados ($($localFree.Count) free)" -ForegroundColor Green
}

# -- Buscar modelos do OpenRouter (API, nao HTML) --------------
$orKey = Get-EnvKey "OPENROUTER_API_KEY"
$orModels = @()

if ($orKey) {
    try {
        $headers = @{ "Authorization" = "Bearer $orKey" }
        $response = Invoke-RestMethod -Uri "https://openrouter.ai/api/v1/models" -Headers $headers -Method Get -TimeoutSec 30
        $orModels = $response.data | Where-Object {
            $_.pricing -and ($_.pricing.prompt -eq "0" -or $_.pricing.prompt -eq 0)
        }
        if (-not $Quiet) {
            Write-Host "[OK] OpenRouter: $($orModels.Count) modelos free" -ForegroundColor Green
        }
    } catch {
        Write-Host "[ERRO] OpenRouter: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "[AVISO] OPENROUTER_API_KEY nao encontrada" -ForegroundColor Yellow
}

# -- Buscar modelos do OpenCode Zen ---------------------------
$ocKey = Get-EnvKey "OPENCODE_API_KEY"
$ocModels = @()

if ($ocKey) {
    try {
        $headers = @{
            "Authorization" = "Bearer $ocKey"
            "Content-Type"  = "application/json"
        }
        $response = Invoke-RestMethod -Uri "https://opencode.ai/zen/v1/models" -Headers $headers -Method Get -TimeoutSec 30
        $allOc = if ($response.data) { $response.data } else { $response }
        $ocModels = $allOc | Where-Object {
            ($_.id -match "-free") -or ($_.id -eq "big-pickle")
        }
        if (-not $Quiet) {
            Write-Host "[OK] OpenCode Zen: $($ocModels.Count) modelos free (de $($allOc.Count) totais)" -ForegroundColor Green
        }
    } catch {
        Write-Host "[ERRO] OpenCode Zen: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# -- Buscar modelos do KiloCode -------------------------------
$kcKey = Get-EnvKey "KILOCODE_API_KEY"
$kcModels = @()

if ($kcKey) {
    try {
        $headers = @{
            "Authorization" = "Bearer $kcKey"
            "Content-Type"  = "application/json"
        }
        $response = Invoke-RestMethod -Uri "https://api.kilo.ai/api/gateway/models" -Headers $headers -Method Get -TimeoutSec 30
        $allKc = if ($response.data) { $response.data } else { $response }
        $kcModels = $allKc | Where-Object { $_.isFree -eq $true }
        if (-not $Quiet) {
            Write-Host "[OK] KiloCode: $($kcModels.Count) modelos free (de $($allKc.Count) totais)" -ForegroundColor Green
        }
    } catch {
        Write-Host "[ERRO] KiloCode: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# -- Funcao: Ping de modelo (teste rapido) --------------------
function Test-ModelPing($provider, $modelId, $apiKey) {
    $baseUrl = switch ($provider) {
        "opencode" { "https://opencode.ai/zen/v1" }
        "kilocode" { "https://api.kilo.ai/api/gateway/v1" }
        default { $null }
    }
    if (-not $baseUrl) { return @{ Ok = $false; Error = "provider nao suportado para ping" } }

    $body = @{
        model    = $modelId
        messages = @(@{ role = "user"; content = "ping" })
        max_tokens = 5
    } | ConvertTo-Json -Compress

    $headers = @{
        "Authorization" = "Bearer $apiKey"
        "Content-Type"  = "application/json"
    }

    try {
        $start = Get-Date
        $resp = Invoke-RestMethod -Uri "$baseUrl/chat/completions" -Method Post -Headers $headers -Body $body -TimeoutSec 15
        $elapsed = ((Get-Date) - $start).TotalSeconds
        return @{
            Ok      = $true
            Latency = [math]::Round($elapsed, 1)
            Model   = $resp.model
        }
    } catch {
        return @{ Ok = $false; Error = $_.Exception.Message }
    }
}

# -- Comparar: quais free models da API nao estao na config? ---
$orIds = @{}; foreach ($m in $orModels) { $orIds[$m.id] = $m }
$ocIds = @{}; foreach ($m in $ocModels) { $ocIds[$m.id] = $m }
$kcIds = @{}; foreach ($m in $kcModels) { $kcIds[$m.id] = $m }
$localIds = @{}; foreach ($m in $localFree) { $localIds[$m.FullId] = $m }

# Modelos free em providers que NAO temos na config
$newModels = @()

# OpenRouter free que nao temos
foreach ($m in $orModels) {
    $matched = $localFree | Where-Object { $_.Id -eq $m.id -and $_.Provider -match "openrouter" }
    if (-not $matched) {
        $newModels += [PSCustomObject]@{
            Source   = "OpenRouter"
            Id       = $m.id
            Name     = if ($m.name) { $m.name } else { $m.id }
            Context  = $m.context_length
            Reasoning = $false
        }
    }
}

# OpenCode free que nao temos
foreach ($m in $ocModels) {
    $matched = $localFree | Where-Object { $_.Id -eq $m.id -and $_.Provider -eq "opencode" }
    if (-not $matched) {
        $newModels += [PSCustomObject]@{
            Source   = "OpenCode"
            Id       = $m.id
            Name     = if ($m.name) { $m.name } else { $m.id }
            Context  = $m.context_length
            Reasoning = $false
        }
    }
}

# KiloCode free que nao temos
foreach ($m in $kcModels) {
    $matched = $localFree | Where-Object { $_.Id -eq $m.id -and $_.Provider -match "kilocode" }
    if (-not $matched) {
        $newModels += [PSCustomObject]@{
            Source   = "KiloCode"
            Id       = $m.id
            Name     = if ($m.name) { $m.name } else { $m.id }
            Context  = $m.context_length
            Reasoning = $false
        }
    }
}

# Modelos free na config que nao existem mais no provider
$removedModels = @()
foreach ($m in $localFree) {
    $exists = $false
    switch -Wildcard ($m.Provider) {
        "openrouter*" { $exists = $orIds.ContainsKey($m.Id) }
        "opencode"    { $exists = $ocIds.ContainsKey($m.Id) }
        "kilocode*"   { $exists = $kcIds.ContainsKey($m.Id) }
        "nvidia*"     { $exists = $true }  # NVIDIA sempre assume free
    }
    if (-not $exists -and $m.Provider -notmatch "nvidia|antigravity|google") {
        $removedModels += $m
    }
}

# -- Ping de modelos (opcional) -------------------------------
$pingResults = @()
if ($Ping) {
    if (-not $Quiet) { Write-Host "`n[PING] Testando modelos free configurados..." -ForegroundColor Cyan }
    foreach ($m in $localFree) {
        $key = switch -Wildcard ($m.Provider) {
            "opencode"   { $ocKey }
            "kilocode*"  { $kcKey }
            default      { $null }
        }
        if ($key) {
            if (-not $Quiet) { Write-Host "  Testando $($m.FullId)..." -ForegroundColor DarkGray -NoNewline }
            $result = Test-ModelPing $m.Provider $m.Id $key
            $pingResults += [PSCustomObject]@{
                FullId  = $m.FullId
                Ok      = $result.Ok
                Latency = $result.Latency
                Error   = $result.Error
            }
            if (-not $Quiet) {
                if ($result.Ok) {
                    Write-Host " OK ($($result.Latency)s)" -ForegroundColor Green
                } else {
                    Write-Host " FALHOU" -ForegroundColor Red
                }
            }
        }
    }
}

# -- Saida JSON ------------------------------------------------
if ($Json) {
    $output = @{
        timestamp       = (Get-Date -Format "o")
        openClawHome    = $script:openClawHome
        localModels     = @{
            total  = $localModels.Count
            free   = $localFree.Count
            models = $localModels
        }
        providers       = @{
            openrouter = @{ freeCount = $orModels.Count }
            opencode   = @{ freeCount = $ocModels.Count }
            kilocode   = @{ freeCount = $kcModels.Count }
        }
        newModels       = $newModels
        removedModels   = $removedModels
        pingResults     = $pingResults
    }
    $output | ConvertTo-Json -Depth 5 | Out-File "compare-free-models-result.json" -Encoding UTF8
    Write-Host "JSON salvo em: compare-free-models-result.json" -ForegroundColor DarkGray
}

# -- Relatorio em texto ----------------------------------------
if (-not $Quiet) {
    $line = "=" * 60
    Write-Host "`n$line" -ForegroundColor Cyan
    Write-Host " RELATORIO - Free Models Comparison" -ForegroundColor Cyan
    Write-Host " $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
    Write-Host "$line`n" -ForegroundColor Cyan

    Write-Host "RESUMO:" -ForegroundColor Yellow
    Write-Host "  Local: $($localModels.Count) modelos ($($localFree.Count) free)" -ForegroundColor White
    Write-Host "  OpenRouter: $($orModels.Count) free | OpenCode: $($ocModels.Count) free | KiloCode: $($kcModels.Count) free" -ForegroundColor White

    if ($newModels.Count -gt 0) {
        Write-Host "`nMODELOS FREE DISPONIVEIS (nao configurados):" -ForegroundColor Yellow
        Write-Host "  $($newModels.Count) modelos encontrados nos providers:`n" -ForegroundColor Yellow
        $newModels | Sort-Object Source | ForEach-Object {
            $ctx = if ($_.Context) { "$([math]::Round($_.Context/1000))K" } else { "?" }
            Write-Host "  [$($_.Source)] $($_.Id)" -ForegroundColor White
            Write-Host "    Nome: $($_.Name) | Context: $ctx" -ForegroundColor DarkGray
        }
    } else {
        Write-Host "`nMODELOS FREE DISPONIVEIS: Nenhum novo" -ForegroundColor Green
    }

    if ($removedModels.Count -gt 0) {
        Write-Host "`nMODELOS REMOVIDOS (nao existem mais no provider):" -ForegroundColor Red
        $removedModels | ForEach-Object {
            Write-Host "  [$($_.Provider)] $($_.FullId)" -ForegroundColor Red
        }
    } else {
        Write-Host "`nMODELOS REMOVIDOS: Nenhum" -ForegroundColor Green
    }

    if ($pingResults.Count -gt 0) {
        Write-Host "`nPING:" -ForegroundColor Yellow
        $ok = ($pingResults | Where-Object { $_.Ok }).Count
        $fail = ($pingResults | Where-Object { -not $_.Ok }).Count
        Write-Host "  $ok OK / $fail FALHOU" -ForegroundColor $(if ($fail -gt 0) { "Yellow" } else { "Green" })
        $pingResults | Where-Object { -not $_.Ok } | ForEach-Object {
            Write-Host "  FALHOU: $($_.FullId) - $($_.Error)" -ForegroundColor Red
        }
    }

    Write-Host "`n$line`n" -ForegroundColor Cyan
}

# -- Templates estilo curl pra cada provider -----------------
if ($Templates) {
    $line = "=" * 60
    Write-Host "`n$line" -ForegroundColor Cyan
    Write-Host " TEMPLATES - Como testar modelos via API" -ForegroundColor Cyan
    Write-Host "$line`n" -ForegroundColor Cyan

    # --- OpenCode Zen ------------------------------------------
    Write-Host "## OPENCODE ZEN (opencode.ai/zen/v1)" -ForegroundColor Yellow
    Write-Host "Base URL: https://opencode.ai/zen/v1`n" -ForegroundColor DarkGray

    $ocModels = @("mimo-v2.5-free", "hy3-free", "big-pickle", "deepseek-v4-flash-free")
    if ($TemplateModel) { $ocModels = @($TemplateModel) }

    foreach ($mid in $ocModels) {
        Write-Host "### Modelo: $mid`n" -ForegroundColor White
        Write-Host "# PowerShell" -ForegroundColor DarkGray
        Write-Host "`$h = @{" -ForegroundColor DarkGray
        Write-Host '    "Authorization" = "Bearer $env:OPENCODE_API_KEY"' -ForegroundColor DarkGray
        Write-Host '    "Content-Type" = "application/json"' -ForegroundColor DarkGray
        Write-Host '    "x-opencode-client" = "cli"' -ForegroundColor DarkGray
        Write-Host '    "x-opencode-project" = "zen-openclaw"' -ForegroundColor DarkGray
        Write-Host '    "x-opencode-session" = "ses_test"' -ForegroundColor DarkGray
        Write-Host '    "x-opencode-request" = "msg_test"' -ForegroundColor DarkGray
        Write-Host '    "x-opencode-directory" = "C:\Users\ClawLabs\.openclaw\workspace"' -ForegroundColor DarkGray
        Write-Host '    "x-opencode-workspace" = "zen-openclaw-workspace"' -ForegroundColor DarkGray
        Write-Host '    "x-opencode-title" = "test"' -ForegroundColor DarkGray
        Write-Host '    "x-opencode-sync" = "false"' -ForegroundColor DarkGray
        Write-Host '    "x-opencode-ticket" = ""' -ForegroundColor DarkGray
        Write-Host "}" -ForegroundColor DarkGray
        Write-Host "`$b = '{\"model\":\"$mid\",\"messages\":[{\"role\":\"user\",\"content\":\"ping\"}],\"max_tokens\":10}'" -ForegroundColor DarkGray
        Write-Host 'Invoke-RestMethod -Uri "https://opencode.ai/zen/v1/chat/completions" -Method Post -Headers $h -Body $b' -ForegroundColor DarkGray
        Write-Host "`n# cURL" -ForegroundColor DarkGray
        Write-Host "curl -X POST https://opencode.ai/zen/v1/chat/completions \" -ForegroundColor DarkGray
        Write-Host '  -H "Authorization: Bearer $OPENCODE_API_KEY" \' -ForegroundColor DarkGray
        Write-Host '  -H "Content-Type: application/json" \' -ForegroundColor DarkGray
        Write-Host '  -H "x-opencode-client: cli" \' -ForegroundColor DarkGray
        Write-Host '  -H "x-opencode-project: zen-openclaw" \' -ForegroundColor DarkGray
        Write-Host "  -d '{\"model\":\"$mid\",\"messages\":[{\"role\":\"user\",\"content\":\"ping\"}],\"max_tokens\":10}'" -ForegroundColor DarkGray
        Write-Host ""
    }

    # --- OpenRouter ---------------------------------------------
    Write-Host "## OPENROUTER (openrouter.ai/api/v1)" -ForegroundColor Yellow
    Write-Host "Base URL: https://openrouter.ai/api/v1`n" -ForegroundColor DarkGray

    $orModels = @("tencent/hy3:free", "deepseek/deepseek-v4-flash:free", "qwen/qwen3-coder:free")
    if ($TemplateModel) { $orModels = @($TemplateModel) }

    foreach ($mid in $orModels) {
        Write-Host "### Modelo: $mid`n" -ForegroundColor White
        Write-Host "# PowerShell" -ForegroundColor DarkGray
        Write-Host "`$h = @{" -ForegroundColor DarkGray
        Write-Host '    "Authorization" = "Bearer $env:OPENROUTER_API_KEY"' -ForegroundColor DarkGray
        Write-Host '    "Content-Type" = "application/json"' -ForegroundColor DarkGray
        Write-Host '    "HTTP-Referer" = "https://openclaw.ai"' -ForegroundColor DarkGray
        Write-Host '    "X-Title" = "OpenClaw"' -ForegroundColor DarkGray
        Write-Host "}" -ForegroundColor DarkGray
        Write-Host "`$b = '{\"model\":\"$mid\",\"messages\":[{\"role\":\"user\",\"content\":\"ping\"}],\"max_tokens\":10}'" -ForegroundColor DarkGray
        Write-Host 'Invoke-RestMethod -Uri "https://openrouter.ai/api/v1/chat/completions" -Method Post -Headers $h -Body $b' -ForegroundColor DarkGray
        Write-Host "`n# cURL" -ForegroundColor DarkGray
        Write-Host "curl -X POST https://openrouter.ai/api/v1/chat/completions \" -ForegroundColor DarkGray
        Write-Host '  -H "Authorization: Bearer $OPENROUTER_API_KEY" \' -ForegroundColor DarkGray
        Write-Host '  -H "Content-Type: application/json" \' -ForegroundColor DarkGray
        Write-Host '  -H "HTTP-Referer: https://openclaw.ai" \' -ForegroundColor DarkGray
        Write-Host "  -d '{\"model\":\"$mid\",\"messages\":[{\"role\":\"user\",\"content\":\"ping\"}],\"max_tokens\":10}'" -ForegroundColor DarkGray
        Write-Host ""
    }

    # --- KiloCode -----------------------------------------------
    Write-Host "## KILOCODE (api.kilo.ai)" -ForegroundColor Yellow
    Write-Host "Base URL: https://api.kilo.ai/api/gateway/v1`n" -ForegroundColor DarkGray

    $kcModels = @("nvidia/nemotron-3-ultra-550b-a55b:free", "tencent/hy3:free", "stepfun/step-3.7-flash:free")
    if ($TemplateModel) { $kcModels = @($TemplateModel) }

    foreach ($mid in $kcModels) {
        Write-Host "### Modelo: $mid`n" -ForegroundColor White
        Write-Host "# PowerShell" -ForegroundColor DarkGray
        Write-Host "`$h = @{" -ForegroundColor DarkGray
        Write-Host '    "Authorization" = "Bearer $env:KILOCODE_API_KEY"' -ForegroundColor DarkGray
        Write-Host '    "Content-Type" = "application/json"' -ForegroundColor DarkGray
        Write-Host "}" -ForegroundColor DarkGray
        Write-Host "`$b = '{\"model\":\"$mid\",\"messages\":[{\"role\":\"user\",\"content\":\"ping\"}],\"max_tokens\":10}'" -ForegroundColor DarkGray
        Write-Host 'Invoke-RestMethod -Uri "https://api.kilo.ai/api/gateway/v1/chat/completions" -Method Post -Headers $h -Body $b' -ForegroundColor DarkGray
        Write-Host "`n# cURL" -ForegroundColor DarkGray
        Write-Host "curl -X POST https://api.kilo.ai/api/gateway/v1/chat/completions \" -ForegroundColor DarkGray
        Write-Host '  -H "Authorization: Bearer $KILOCODE_API_KEY" \' -ForegroundColor DarkGray
        Write-Host '  -H "Content-Type: application/json" \' -ForegroundColor DarkGray
        Write-Host "  -d '{\"model\":\"$mid\",\"messages\":[{\"role\":\"user\",\"content\":\"ping\"}],\"max_tokens\":10}'" -ForegroundColor DarkGray
        Write-Host ""
    }

    # --- NVIDIA NIM ---------------------------------------------
    Write-Host "## NVIDIA NIM (integrate.api.nvidia.com)" -ForegroundColor Yellow
    Write-Host "Base URL: https://integrate.api.nvidia.com/v1`n" -ForegroundColor DarkGray

    $nvModels = @("nvidia/deepseek-ai/deepseek-r1", "nvidia/meta/llama-3.3-70b-instruct")
    if ($TemplateModel) { $nvModels = @($TemplateModel) }

    foreach ($mid in $nvModels) {
        Write-Host "### Modelo: $mid`n" -ForegroundColor White
        Write-Host "# PowerShell" -ForegroundColor DarkGray
        Write-Host "`$h = @{" -ForegroundColor DarkGray
        Write-Host '    "Authorization" = "Bearer $env:NVIDIA_API_KEY"' -ForegroundColor DarkGray
        Write-Host '    "Content-Type" = "application/json"' -ForegroundColor DarkGray
        Write-Host "}" -ForegroundColor DarkGray
        Write-Host "`$b = '{\"model\":\"$mid\",\"messages\":[{\"role\":\"user\",\"content\":\"ping\"}],\"max_tokens\":10}'" -ForegroundColor DarkGray
        Write-Host 'Invoke-RestMethod -Uri "https://integrate.api.nvidia.com/v1/chat/completions" -Method Post -Headers $h -Body $b' -ForegroundColor DarkGray
        Write-Host "`n# cURL" -ForegroundColor DarkGray
        Write-Host "curl -X POST https://integrate.api.nvidia.com/v1/chat/completions \" -ForegroundColor DarkGray
        Write-Host '  -H "Authorization: Bearer $NVIDIA_API_KEY" \' -ForegroundColor DarkGray
        Write-Host '  -H "Content-Type: application/json" \' -ForegroundColor DarkGray
        Write-Host "  -d '{\"model\":\"$mid\",\"messages\":[{\"role\":\"user\",\"content\":\"ping\"}],\"max_tokens\":10}'" -ForegroundColor DarkGray
        Write-Host ""
    }

    # --- Helper: Listar modelos free ---------------------------
    Write-Host "## COMO LISTAR MODELOS FREE" -ForegroundColor Yellow
    Write-Host "# OpenRouter" -ForegroundColor DarkGray
    Write-Host 'Invoke-RestMethod -Uri "https://openrouter.ai/api/v1/models" -Headers @{"Authorization"="Bearer $env:OPENROUTER_API_KEY"} | Select-Object -ExpandProperty data | Where-Object {$_.pricing.prompt -eq "0"} | Select-Object id, name' -ForegroundColor DarkGray
    Write-Host "`n# OpenCode Zen" -ForegroundColor DarkGray
    Write-Host 'Invoke-RestMethod -Uri "https://opencode.ai/zen/v1/models" -Headers @{"Authorization"="Bearer $env:OPENCODE_API_KEY"} | Select-Object -ExpandProperty data | Where-Object {$_.id -match "-free"}' -ForegroundColor DarkGray
    Write-Host "`n# KiloCode" -ForegroundColor DarkGray
    Write-Host 'Invoke-RestMethod -Uri "https://api.kilo.ai/api/gateway/models" -Headers @{"Authorization"="Bearer $env:KILOCODE_API_KEY"} | Select-Object -ExpandProperty data | Where-Object {$_.isFree -eq $true} | Select-Object id, name' -ForegroundColor DarkGray
    Write-Host "`n# NVIDIA" -ForegroundColor DarkGray
    Write-Host 'Invoke-RestMethod -Uri "https://integrate.api.nvidia.com/v1/models" -Headers @{"Authorization"="Bearer $env:NVIDIA_API_KEY"} | Select-Object -ExpandProperty data | Select-Object id, owned_by' -ForegroundColor DarkGray
    Write-Host ""

    Write-Host "$line`n" -ForegroundColor Cyan
}

# -- Exit code -------------------------------------------------
if ($removedModels.Count -gt 0) { exit 2 }  # modelos removidos = alerta
if ($newModels.Count -gt 10) { exit 1 }     # muitos modelos novos = aviso
exit 0
