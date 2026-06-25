# ============================================================
# list-antigravity-models.ps1 - Lista modelos via antigravity proxy
# ============================================================
# Proxy local em 127.0.0.1:8080 (Anthropic Messages API format)
# Nao requer API key (proxy gerencia internamente)
# ============================================================

$ErrorActionPreference = "Continue"

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "`n==========================================" -ForegroundColor Cyan
Write-Host " ANTIGRAVITY PROXY - Modelos Disponiveis" -ForegroundColor Cyan
Write-Host " $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# -- Buscar modelos -------------------------------------------
try {
    $response = Invoke-RestMethod -Uri "http://127.0.0.1:8080/v1/models" -Method Get -TimeoutSec 10

    $models = if ($response.data) { $response.data } else { $response }

    if ($models -is [array] -and $models.Count -gt 0) {
        Write-Host "`n[>>] $($models.Count) modelos encontrados:`n" -ForegroundColor Green

        # Classificar por provedor
        $grouped = @{}
        foreach ($m in $models) {
            $id = if ($m.id) { $m.id } else { "$m" }
            # Extrair provedor do id
            $provider = "unknown"
            if ($id -match '^claude') { $provider = "Anthropic" }
            elseif ($id -match '^gemini') { $provider = "Google" }
            elseif ($id -match '^gpt') { $provider = "OpenAI" }
            elseif ($id -match '^nvidia' -or $id -match '^nemotron') { $provider = "NVIDIA" }

            if (-not $grouped.ContainsKey($provider)) { $grouped[$provider] = @() }
            $grouped[$provider] += $id
        }

        foreach ($prov in ($grouped.Keys | Sort-Object)) {
            Write-Host "  [$prov]" -ForegroundColor Yellow
            foreach ($id in ($grouped[$prov] | Sort-Object)) {
                Write-Host "    - $id" -ForegroundColor White
            }
            Write-Host ""
        }
    } else {
        Write-Host "[!] Nenhum modelo retornado" -ForegroundColor Yellow
        Write-Host " Resposta raw: $($response | ConvertTo-Json -Depth 3 -Compress)" -ForegroundColor DarkGray
    }
} catch {
    Write-Host "[ERRO] Proxy indisponivel: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host " Verifique se o antigravity proxy esta rodando em 127.0.0.1:8080" -ForegroundColor DarkGray
}

Write-Host "==========================================" -ForegroundColor Cyan
