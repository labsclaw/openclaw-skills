#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Setup completo do sistema de memória Memory Caching para um novo ambiente.
.DESCRIPTION
    Cria estrutura de diretórios, copia scripts, configura cron jobs, e opcionalmente
    instala dependências wiki (Hyper-Extract, qmd, agentmemory).
.PARAMETER Wiki
    Instalar ecossistema wiki completo (Hyper-Extract, qmd, agentmemory).
.PARAMETER Cron
    Configurar cron job de health check (diário 3h manhã).
.PARAMETER Force
    Sobrescrever arquivos existentes.
.EXAMPLE
    .\setup.ps1                    # Setup mínimo (SSC router + health check)
    .\setup.ps1 -Wiki -Cron        # Setup completo com wiki + cron
    .\setup.ps1 -Wiki -Force       # Forçar reinstalação
#>

param(
    [switch]$Wiki,
    [switch]$Cron,
    [switch]$Force
)

$ErrorActionPreference = "Stop"
$ScriptDir = $PSScriptRoot
$WorkspaceDir = if ($env:OPENCLAW_WORKSPACE) { $env:OPENCLAW_WORKSPACE } else { Join-Path $env:USERPROFILE ".openclaw\workspace" }
$MemoryDir = Join-Path $WorkspaceDir "memory"

# ── Helpers ─────────────────────────────────────────────────────────
function Write-Step($msg) { Write-Host "`n>> $msg" -ForegroundColor Cyan }
function Write-Ok($msg) { Write-Host "   [OK] $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "   [!] $msg" -ForegroundColor Yellow }
function Write-Fail($msg) { Write-Host "   [X] $msg" -ForegroundColor Red }
function Ensure-Dir($path) { if (-not (Test-Path $path)) { New-Item -ItemType Directory -Path $path -Force | Out-Null } }

Write-Host @"

  ╔══════════════════════════════════════════════╗
  ║  Ultra Memory Skill — Setup                  ║
  ║  Memory Caching for LLM Agents               ║
  ║  arXiv 2602.24281                            ║
  ╚══════════════════════════════════════════════╝

"@ -ForegroundColor Cyan

# ── Step 1: Create Directory Structure ──────────────────────────────
Write-Step "Creating memory directory structure"

$dirs = @(
    $MemoryDir,
    (Join-Path $MemoryDir "segments"),
    (Join-Path $MemoryDir "checkpoints"),
    (Join-Path $MemoryDir "daily"),
    (Join-Path $MemoryDir "fixes")
)

foreach ($dir in $dirs) {
    Ensure-Dir $dir
    Write-Ok $dir
}

# ── Step 2: Copy Scripts ────────────────────────────────────────────
Write-Step "Copying SSC scripts"

$scripts = @("ssc-router.ps1", "ssc-health.ps1")
foreach ($script in $scripts) {
    $src = Join-Path $ScriptDir "scripts" $script
    $dst = Join-Path $MemoryDir $script
    if ((Test-Path $dst) -and -not $Force) {
        Write-Warn "$script already exists (use -Force to overwrite)"
    } else {
        Copy-Item $src $dst -Force
        Write-Ok $script
    }
}

# ── Step 3: Create index.json ───────────────────────────────────────
Write-Step "Initializing index.json"

$indexPath = Join-Path $MemoryDir "index.json"
if ((Test-Path $indexPath) -and -not $Force) {
    Write-Warn "index.json already exists (use -Force to overwrite)"
} else {
    $index = @{
        version = "1.0"
        description = "Sparse Selective Cache (SSC) — Memory Caching"
        created = (Get-Date -Format "yyyy-MM-dd")
        lastMaintenance = $null
        segments = @()
        config = @{
            maxSegmentsPerQuery = 6
            minWeightThreshold = 0.3
            autoCompressAfterDays = 30
            autoMergeSimilarityThreshold = 0.85
            maintenanceSchedule = "during-heartbeat"
        }
    }
    $index | ConvertTo-Json -Depth 10 | Set-Content $indexPath -Encoding UTF8
    Write-Ok "index.json created"
}

# ── Step 4: Create MEMORY.md Template ──────────────────────────────
Write-Step "Creating MEMORY.md template"

$memoryMd = Join-Path $WorkspaceDir "MEMORY.md"
if ((Test-Path $memoryMd) -and -not $Force) {
    Write-Warn "MEMORY.md already exists (use -Force to overwrite)"
} else {
    $template = @"
# MEMORY.md — Online Memory (auto-gerada)

> **Arquitetura**: Memory Caching (inspirado em arXiv 2602.24281)
> **Ultima atualizacao**: $(Get-Date -Format "yyyy-MM-dd")
> **Segmentos ativos**: 0

## Segmentos Relevantes (carregar sob demanda)

| ID | Segmento | Status | Relevancia |
|----|----------|--------|------------|

## Ultimos Eventos

## Regras Importantes

---

> Este arquivo e gerado automaticamente a partir dos segmentos em ``memory/segments/``.
> Nao edite diretamente — atualize os segmentos e rode manutencao.
"@
    $template | Set-Content $memoryMd -Encoding UTF8
    Write-Ok "MEMORY.md created"
}

# ── Step 5: Copy AGENTS.md Template Section ─────────────────────────
Write-Step "Checking AGENTS.md memory protocol"

$agentsMd = Join-Path $WorkspaceDir "AGENTS.md"
if (Test-Path $agentsMd) {
    $content = Get-Content $agentsMd -Raw -Encoding UTF8
    if ($content -match "SSC Router") {
        Write-Ok "AGENTS.md already has SSC protocol"
    } else {
        Write-Warn "AGENTS.md exists but lacks SSC protocol"
        Write-Warn "Add the session startup section from templates/AGENTS-template.md"
    }
} else {
    Write-Warn "AGENTS.md not found — copy templates/AGENTS-template.md to workspace root"
}

# ── Step 6: Wiki Setup (Optional) ──────────────────────────────────
if ($Wiki) {
    Write-Step "Installing wiki ecosystem (Hyper-Extract, qmd, agentmemory)"

    # Hyper-Extract
    try {
        $heVersion = & he --version 2>&1
        Write-Ok "Hyper-Extract already installed: $heVersion"
    } catch {
        Write-Host "   Installing Hyper-Extract..." -ForegroundColor White
        try {
            & uv tool install hyperextract 2>&1 | Out-Null
            Write-Ok "Hyper-Extract installed"
        } catch {
            Write-Fail "Failed to install Hyper-Extract (requires uv)"
            Write-Host "   Manual: uv tool install hyperextract" -ForegroundColor Gray
        }
    }

    # qmd
    try {
        $qmdVersion = & qmd --version 2>&1
        Write-Ok "qmd already installed: $qmdVersion"
    } catch {
        Write-Host "   Installing qmd..." -ForegroundColor White
        try {
            & npm install -g @tobilu/qmd 2>&1 | Out-Null
            Write-Ok "qmd installed"
        } catch {
            Write-Fail "Failed to install qmd (requires npm)"
        }
    }

    # agentmemory
    try {
        $amVersion = & npx @agentmemory/agentmemory --version 2>&1
        Write-Ok "agentmemory already installed: $amVersion"
    } catch {
        Write-Host "   Installing agentmemory..." -ForegroundColor White
        try {
            & npm install -g @agentmemory/agentmemory 2>&1 | Out-Null
            Write-Ok "agentmemory installed"
        } catch {
            Write-Fail "Failed to install agentmemory (requires npm)"
        }
    }

    # Create wiki structure
    Write-Step "Creating wiki directory structure"
    $wikiDirs = @(
        (Join-Path $WorkspaceDir "wiki"),
        (Join-Path $WorkspaceDir "wiki" "raw"),
        (Join-Path $WorkspaceDir "wiki" "entities"),
        (Join-Path $WorkspaceDir "wiki" "concepts"),
        (Join-Path $WorkspaceDir "wiki" "sources"),
        (Join-Path $WorkspaceDir "wiki" "synthesis"),
        (Join-Path $WorkspaceDir "wiki" "comparisons"),
        (Join-Path $WorkspaceDir "wiki" "projects"),
        (Join-Path $WorkspaceDir "wiki" "checkpoints")
    )
    foreach ($dir in $wikiDirs) {
        Ensure-Dir $dir
    }
    Write-Ok "Wiki directories created"

    # Initialize qmd
    Write-Step "Initializing qmd index"
    Push-Location $WorkspaceDir
    try {
        & qmd init 2>&1 | Out-Null
        & qmd collection add wiki --name wiki 2>&1 | Out-Null
        Write-Ok "qmd initialized"
    } catch {
        Write-Warn "qmd init failed — run manually: cd workspace; qmd init; qmd collection add wiki --name wiki"
    }
    Pop-Location

    # Initialize agentmemory
    Write-Step "Initializing agentmemory"
    try {
        & npx @agentmemory/agentmemory init 2>&1 | Out-Null
        Write-Ok "agentmemory initialized"
    } catch {
        Write-Warn "agentmemory init failed — run manually: npx @agentmemory/agentmemory init"
    }
}

# ── Step 7: Cron Job (Optional) ────────────────────────────────────
if ($Cron) {
    Write-Step "Health check cron job"
    Write-Host @"

   To configure the daily health check cron in OpenClaw:

   {
     "name": "ssc-health-check",
     "schedule": { "kind": "cron", "expr": "0 3 * * *", "tz": "America/Sao_Paulo" },
     "sessionTarget": "isolated",
     "payload": {
       "kind": "agentTurn",
       "message": "Run: powershell -ExecutionPolicy Bypass -File $MemoryDir\\ssc-health.ps1"
     },
     "delivery": { "mode": "announce", "channel": "telegram" }
   }

   Add this via: /cron add <json>

"@ -ForegroundColor DarkGray
}

# ── Step 8: Verify ─────────────────────────────────────────────────
Write-Step "Verifying installation"

$checks = @(
    @{ Name = "memory/ directory"; Path = $MemoryDir },
    @{ Name = "segments/ directory"; Path = Join-Path $MemoryDir "segments" },
    @{ Name = "checkpoints/ directory"; Path = Join-Path $MemoryDir "checkpoints" },
    @{ Name = "daily/ directory"; Path = Join-Path $MemoryDir "daily" },
    @{ Name = "index.json"; Path = $indexPath },
    @{ Name = "ssc-router.ps1"; Path = Join-Path $MemoryDir "ssc-router.ps1" },
    @{ Name = "ssc-health.ps1"; Path = Join-Path $MemoryDir "ssc-health.ps1" },
    @{ Name = "MEMORY.md"; Path = $memoryMd }
)

$allOk = $true
foreach ($check in $checks) {
    if (Test-Path $check.Path) {
        Write-Ok $check.Name
    } else {
        Write-Fail "$($check.Name) missing"
        $allOk = $false
    }
}

# ── Summary ─────────────────────────────────────────────────────────
Write-Host "`n" -NoNewline
if ($allOk) {
    Write-Host "  Setup complete!" -ForegroundColor Green
} else {
    Write-Host "  Setup completed with warnings" -ForegroundColor Yellow
}

Write-Host @"

  Next steps:
  1. Add SSC protocol to your AGENTS.md (see templates/AGENTS-template.md)
  2. Create your first segment: ssc-router.ps1 -Query "test"
  3. Configure cron for daily health checks (see above)
  $(if ($Wiki) { "4. Configure Hyper-Extract: he config init" } else { "" })
  $(if ($Wiki) { "5. Add wiki context: qmd context add qmd://wiki 'description'" } else { "" })

  Commands:
    .\ssc-router.ps1 -Query "search terms"    # Query segments
    .\ssc-router.ps1 -List                     # List all segments
    .\ssc-router.ps1 -Stats                    # Show access stats
    .\ssc-health.ps1                           # Run health check

"@ -ForegroundColor White
