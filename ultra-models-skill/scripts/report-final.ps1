# report-final.ps1 - Relatorio Final de Modelos

$ErrorActionPreference = "Continue"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

function Get-OpenClawHome {
    if ($env:OPENCLAW_CONFIG_PATH) { return Split-Path $env:OPENCLAW_CONFIG_PATH -Parent }
    $c = "$env:USERPROFILE\.openclaw"
    if (Test-Path $c) { return $c }
    return "$env:USERPROFILE\.openclaw"
}

$openClawHome = Get-OpenClawHome
$envFile = Join-Path $openClawHome ".env"
$envVars = @{}
Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*([A-Z_]+)\s*=\s*(.+)$') { $envVars[$Matches[1]] = $Matches[2].Trim() }
}

function Get-ModelBaseName($fullId) {
    $b = $fullId
    $b = $b -replace '^(openrouter|opencode|kilocode|nvidia|antigravity-proxy)/', ''
    $b = $b -replace ':free$', ''
    $b = $b -replace '-free$', ''
    $b = $b -replace '^deepseek-ai/', ''
    $b = $b -replace '^minimaxai/', ''
    $b = $b -replace '^z-ai/', ''
    $b = $b -replace '^deepseek/deepseek-', 'deepseek-'
    $b = $b -replace '^minimax/minimax-', 'minimax-'
    $b = $b -replace '^glm/glm-', 'glm-'
    $b = $b -replace '^glm-5\.2$', 'glm-5'
    $b = $b -replace '^glm-5\.1$', 'glm-5'
    $b = $b -replace '^minimax-m2\.7$', 'minimax-m2'
    $b = $b -replace '^minimax-m2\.5$', 'minimax-m2'
    $b = $b -replace '^minimax-m3$', 'minimax-m2'
    $b = $b -replace '^qwen/', ''
    $b = $b -replace '^nvidia/', ''
    return $b.ToLower()
}

function Get-Quality($base) {
    $s = 50
    if ($base -match '550b|405b|340b|253b|120b|70b') { $s += 30 }
    elseif ($base -match '49b|30b|31b|26b|24b') { $s += 20 }
    elseif ($base -match '8b|9b|3b') { $s += 5 }
    if ($base -match 'nemotron.*ultra') { $s += 15 }
    elseif ($base -match 'nemotron.*super') { $s += 12 }
    elseif ($base -match 'llama.*(70b|405b)') { $s += 10 }
    elseif ($base -match 'gemma.*4') { $s += 10 }
    elseif ($base -match 'gpt-oss') { $s += 12 }
    elseif ($base -match 'qwen3.*coder') { $s += 10 }
    elseif ($base -match 'deepseek.*v4') { $s += 10 }
    elseif ($base -match 'minimax') { $s += 8 }
    elseif ($base -match 'glm.*5') { $s += 8 }
    elseif ($base -match 'hermes') { $s += 8 }
    elseif ($base -match 'laguna.*m\.1') { $s += 7 }
    elseif ($base -match 'hy3') { $s += 6 }
    if ($base -match 'content-safety|embed|pii|safety|parse|clip|retriever|translate|calibration|cosmos|neva|vila|ising|riva|nvclip|nemoretriever|gliner|chatqa|reward') { $s -= 40 }
    return $s
}

function Get-TPS($base) {
    $t = 50
    if ($base -match 'deepseek.*v4.*flash') { $t = 95 }
    elseif ($base -match 'mimo.*v2\.5') { $t = 90 }
    elseif ($base -match 'big-pickle') { $t = 85 }
    elseif ($base -match 'hy3|north-mini-code') { $t = 80 }
    elseif ($base -match 'gemma.*4.*26b|qwen3.*coder') { $t = 75 }
    elseif ($base -match 'deepseek') { $t = 70 }
    elseif ($base -match 'nemotron.*nano') { $t = 75 }
    elseif ($base -match 'nemotron.*super.*120b') { $t = 50 }
    elseif ($base -match 'nemotron.*ultra.*550b') { $t = 30 }
    elseif ($base -match 'llama.*405b|hermes.*405b') { $t = 25 }
    elseif ($base -match 'gpt-oss.*120b') { $t = 45 }
    elseif ($base -match 'minimax') { $t = 50 }
    elseif ($base -match 'glm.*5') { $t = 60 }
    if ($base -match 'content-safety|embed|pii|safety|parse|clip|retriever|translate|calibration|cosmos|neva|vila') { $t = 0 }
    return $t
}

# Coletar modelos
$live = @{}

try {
    $h = @{ "Authorization" = "Bearer $($envVars['OPENROUTER_API_KEY'])" }
    $r = Invoke-RestMethod -Uri "https://openrouter.ai/api/v1/models" -Headers $h -Method Get -TimeoutSec 30
    $r.data | Where-Object { $_.pricing.prompt -eq "0" -or $_.pricing.prompt -eq 0 } | ForEach-Object {
        $live["openrouter/$($_.id)"] = @{ provider="openrouter"; id=$_.id }
    }
} catch {}

try {
    $h = @{ "Authorization" = "Bearer $($envVars['OPENCODE_API_KEY'])"; "Content-Type" = "application/json" }
    $r = Invoke-RestMethod -Uri "https://opencode.ai/zen/v1/models" -Headers $h -Method Get -TimeoutSec 30
    $a = if ($r.data) { $r.data } else { $r }
    $a | Where-Object { $_.id -match "-free" -or $_.id -eq "big-pickle" -or $_.id -match '^(deepseek|minimax|glm|qwen|mimo)' } | ForEach-Object {
        $live["opencode/$($_.id)"] = @{ provider="opencode"; id=$_.id }
    }
} catch {}

try {
    $h = @{ "Authorization" = "Bearer $($envVars['KILOCODE_API_KEY'])"; "Content-Type" = "application/json" }
    $r = Invoke-RestMethod -Uri "https://api.kilo.ai/api/gateway/models" -Headers $h -Method Get -TimeoutSec 30
    $a = if ($r.data) { $r.data } else { $r }
    $a | Where-Object { $_.isFree -eq $true } | ForEach-Object {
        $live["kilocode/$($_.id)"] = @{ provider="kilocode"; id=$_.id }
    }
} catch {}

try {
    $h = @{ "Authorization" = "Bearer $($envVars['NVIDIA_API_KEY'])"; "Accept" = "application/json" }
    $r = Invoke-RestMethod -Uri "https://integrate.api.nvidia.com/v1/models" -Headers $h -Method Get -TimeoutSec 30
    $a = if ($r.data) { $r.data } else { $r }
    $a | Where-Object {
        ($_.id -match '^nvidia/' -or $_.id -match '^(deepseek-ai|minimaxai|z-ai|qwen)/') -and
        (-not $_.pricing -or $_.pricing.prompt -eq "0" -or $_.pricing.prompt -eq 0 -or $null -eq $_.pricing.prompt)
    } | ForEach-Object {
        $live["nvidia/$($_.id)"] = @{ provider="nvidia"; id=$_.id }
    }
} catch {}

# Cross-provider map
$xmap = @{}
foreach ($fid in $live.Keys) {
    $base = Get-ModelBaseName $fid
    if ($base -match 'content-safety|embed|pii|safety|parse|clip|retriever|translate|calibration|cosmos|neva|vila|ising|riva|nvclip|nemoretriever|gliner|chatqa|reward') { continue }
    if (-not $xmap.ContainsKey($base)) { $xmap[$base] = @() }
    $xmap[$base] += @{ fullId=$fid; provider=$live[$fid].provider }
}

# Output
$date = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$sep = "#" * 80

Write-Host ""
Write-Host "# PROVIDER MODELS MONITOR" -ForegroundColor Cyan
Write-Host "# $date" -ForegroundColor DarkGray
Write-Host $sep -ForegroundColor DarkGray

$pnames = @{ "nvidia"="NVIDIA NIM"; "opencode"="OPENCODE ZEN"; "kilocode"="KILOCODE"; "openrouter"="OPENROUTER" }

foreach ($prov in @("nvidia","opencode","kilocode","openrouter")) {
    Write-Host ""
    Write-Host "## $($pnames[$prov])" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "| # | Model-ID | Score | TPS | Status |"
    Write-Host "|---| ------------------------------------ | ----- | ------- | --------------- |"

    $pm = @()
    foreach ($base in $xmap.Keys) {
        $route = $xmap[$base] | Where-Object { $_.provider -eq $prov } | Select-Object -First 1
        if ($route) {
            $q = Get-Quality $base
            $t = Get-TPS $base
            $rbonus = [Math]::Min(($xmap[$base].provider | Select-Object -Unique).Count - 1, 3) * 15
            $sc = [Math]::Round(($q * 0.5) + ($t * 0.25) + 25 * 0.25 + $rbonus, 1)
            $pm += @{ base=$base; fullId=$route.fullId; score=$sc; tps=$t }
        }
    }
    $pm = $pm | Sort-Object { $_.score } -Descending
    $i = 0
    foreach ($m in $pm) {
        $i++
        $tl = if ($m.tps -ge 80) { "$($m.tps) T" } elseif ($m.tps -ge 65) { "$($m.tps) t" } else { "$($m.tps)" }
        Write-Host ("| {0} | {1} | {2} | {3} | {4} |" -f $i, $m.fullId, $m.score, $tl, "OK")
    }
}

# Primary Candidates
Write-Host ""
Write-Host "## Model Router Planning" -ForegroundColor Yellow
Write-Host ""
Write-Host "### PRIMARY CANDIDATES" -ForegroundColor Cyan
Write-Host "(apenas modelos com potencial para primary)" -ForegroundColor DarkGray
Write-Host ""
Write-Host "| Modelo | OpenCode | NVIDIA | OpenRouter | KiloCode |"
Write-Host "| -------------------- | -------- | ------ | ---------- | -------- |"

$pc = @()
foreach ($base in $xmap.Keys) {
    $q = Get-Quality $base
    if ($q -lt 55) { continue }
    $provs = $xmap[$base] | ForEach-Object { $_.provider } | Select-Object -Unique
    $pc += @{
        base = $base
        oc = if ($provs -contains "opencode") { "Y" } else { "-" }
        nv = if ($provs -contains "nvidia") { "Y" } else { "-" }
        or2 = if ($provs -contains "openrouter") { "Y" } else { "-" }
        kc = if ($provs -contains "kilocode") { "Y" } else { "-" }
        q = $q
    }
}
$pc = $pc | Sort-Object { $_.q } -Descending | Select-Object -First 10
foreach ($p in $pc) {
    Write-Host ("| {0} | {1} | {2} | {3} | {4} |" -f $p.base, $p.oc, $p.nv, $p.or2, $p.kc)
}

# Agents
Write-Host ""
Write-Host "### AGENTS (MODEL CANDIDATES)" -ForegroundColor Cyan
Write-Host "- fallback = mesmo modelo em outro provider sempre que possivel" -ForegroundColor DarkGray
Write-Host ""
Write-Host "| # | Nome Base | Score | Q | TPS | Providers | Rotas |"
Write-Host "|---| -------------------------- | ----- | --- | ------- | --------- | ------------------------------ |"

$ag = @()
foreach ($base in $xmap.Keys) {
    $provs = $xmap[$base] | ForEach-Object { $_.provider } | Select-Object -Unique
    if ($provs.Count -lt 2) { continue }
    $q = Get-Quality $base
    $t = Get-TPS $base
    $rbonus = [Math]::Min(($provs.Count - 1) * 15, 45)
    $sc = [Math]::Round(($q * 0.5) + ($t * 0.25) + 25 * 0.25 + $rbonus, 1)
    $routes = ($provs | Sort-Object) -join " + "
    $ag += @{ base=$base; score=$sc; q=$q; tps=$t; provs=$provs.Count; routes=$routes }
}
$ag = $ag | Sort-Object { $_.score } -Descending | Select-Object -First 15

$i = 0
foreach ($a in $ag) {
    $i++
    $tl = if ($a.tps -ge 80) { "$($a.tps) T" } elseif ($a.tps -ge 65) { "$($a.tps) t" } else { "$($a.tps)" }
    Write-Host ("| {0} | {1} | {2} | {3} | {4} | {5} | {6} |" -f $i, $a.base, $a.score, $a.q, $tl, $a.provs, $a.routes)
}

Write-Host ""
Write-Host $sep -ForegroundColor DarkGray
Write-Host "# FIM DO RELATORIO" -ForegroundColor Cyan
Write-Host ""
