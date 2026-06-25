$ErrorActionPreference = "Continue"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$envFile = "C:\Users\ClawLabs\.openclaw\.env"
$envVars = @{}
Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*([A-Z_]+)\s*=\s*(.+)$') {
        $envVars[$Matches[1]] = $Matches[2].Trim()
    }
}

$headers = @{
    "Authorization" = "Bearer $($envVars['KILOCODE_API_KEY'])"
    "Content-Type" = "application/json"
}
$response = Invoke-RestMethod -Uri "https://api.kilo.ai/api/gateway/models" -Headers $headers -Method Get -TimeoutSec 30
$allModels = if ($response.data) { $response.data } else { $response }
$freeModels = $allModels | Where-Object { $_.isFree -eq $true }

Write-Host "=== KILOCODE FREE MODELS (detalhes) ===" -ForegroundColor Cyan
Write-Host "Total free: $($freeModels.Count) de $($allModels.Count) totais`n" -ForegroundColor Gray

$freeModels | ForEach-Object {
    $id = $_.id
    $name = if ($_.name) { $_.name } else { "N/A" }
    $owned = if ($_.owned_by) { $_.owned_by } else { "N/A" }
    $desc = if ($_.description) { $_.description.Substring(0, [Math]::Min(120, $_.description.Length)) + "..." } else { "" }
    Write-Host "ID: $id" -ForegroundColor White
    Write-Host "  Nome: $name" -ForegroundColor Gray
    Write-Host "  Owner: $owned" -ForegroundColor Gray
    if ($desc) { Write-Host "  Desc: $desc" -ForegroundColor DarkGray }
    Write-Host ""
}
