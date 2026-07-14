# ============================================================
# plan-routing.ps1 - Gera plano de roteamento por missao
# ============================================================
# Le o model-capability-map.json e gera um plano de roteamento
# com primary, fallback e degradacao para cada papel de agente.
#
# Uso:
#   powershell -ExecutionPolicy Bypass -File plan-routing.ps1
#   powershell -ExecutionPolicy Bypass -File plan-routing.ps1 -Mission "software_architecture"
#   powershell -ExecutionPolicy Bypass -File plan-routing.ps1 -Mission "research" -Criticality high
#   powershell -ExecutionPolicy Bypass -File plan-routing.ps1 -Mission "classification" -Json
# ============================================================

param(
    [string]$Mission = "general",
    [string]$Criticality = "medium",
    [switch]$Json,
    [string]$MapFile
)

$ErrorActionPreference = "Continue"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding  = [System.Text.Encoding]::UTF8
$OutputEncoding           = [System.Text.Encoding]::UTF8

# -- Load shared functions ------------------------------------
$sharedPath = Join-Path $PSScriptRoot "_shared.ps1"
if (Test-Path $sharedPath) { . $sharedPath } else {
    Write-Host "[ERRO] _shared.ps1 nao encontrado" -ForegroundColor Red
    exit 1
}

# -- Load or build model map ----------------------------------
if (-not $MapFile) {
    $MapFile = Join-Path (Get-OpenClawHome) "logs\model-capability-map.json"
}
if (-not (Test-Path $MapFile)) {
    Write-Status "Mapa nao encontrado. Executando build-model-map.ps1..." "WARN"
    & (Join-Path $PSScriptRoot "build-model-map.ps1")
}
if (-not (Test-Path $MapFile)) {
    Write-Status "Impossivel prosseguir sem mapa." "ERROR"
    exit 1
}

$map = Get-Content $MapFile -Raw | ConvertFrom-Json
Write-Status "Mapa carregado: $($map.models.Count) modelos, gerado em $($map.generated_at)" "OK"

# ============================================================
# 1. MISSION PROFILE DEFINITION
# ============================================================

Write-Section "1. Perfil da Missao"

# Define which roles are needed for each mission type
$missionProfiles = @{
    general = @{
        description = "Missao geral sem requisitos especificos"
        roles       = @("implementation_agent", "fast_worker")
        max_agents  = 3
    }
    software_architecture = @{
        description = "Projeto e validacao de arquitetura de software"
        roles       = @("strategic_planner", "architecture_agent", "implementation_agent", "red_team_agent", "reviewer_agent")
        max_agents  = 5
    }
    research = @{
        description = "Pesquisa, analise e síntese de informacao"
        roles       = @("research_agent", "research_agent", "reviewer_agent")
        max_agents  = 3
    }
    code_review = @{
        description = "Revisao critica de codigo e PRs"
        roles       = @("reviewer_agent", "red_team_agent", "architecture_agent")
        max_agents  = 3
    }
    implementation = @{
        description = "Implementacao e execucao tecnica"
        roles       = @("implementation_agent", "fast_worker", "reviewer_agent")
        max_agents  = 3
    }
    classification = @{
        description = "Triagem, classificacao e rotulagem"
        roles       = @("classifier_agent", "classifier_agent", "fast_worker")
        max_agents  = 3
    }
    content_creation = @{
        description = "Criacao de conteudo, redacao e formatacao"
        roles       = @("research_agent", "implementation_agent", "reviewer_agent")
        max_agents  = 3
    }
    critical_decision = @{
        description = "Decisao estrategica de alto impacto"
        roles       = @("ceo_orchestrator", "strategic_planner", "red_team_agent", "reviewer_agent")
        max_agents  = 4
    }
}

$profile = $missionProfiles[$Mission]
if (-not $profile) {
    Write-Status "Missao '$Mission' desconhecida. Usando perfil 'general'." "WARN"
    $profile = $missionProfiles["general"]
    $Mission = "general"
}

Write-Status "Missao: $Mission" "STEP"
Write-Status "Descricao: $($profile.description)" "INFO"
Write-Status "Papeis: $($profile.roles -join ', ')" "INFO"
Write-Status "Max agentes: $($profile.max_agents)" "INFO"
Write-Status "Criticidade: $Criticality" "INFO"

# ============================================================
# 2. ALLOCATE MODELS TO ROLES
# ============================================================

Write-Section "2. Alocacao de modelos"

# Build a quick lookup: for each role, rank models by fit
$allocations = @()
$usedCanonicals = @()

foreach ($role in $profile.roles) {
    Write-Host ""
    Write-Status "Papel: $role" "STEP"

    # Score each model for this role
    $candidates = @()
    foreach ($m in $map.models) {
        $fit = $m.role_fits.$role
        if ($null -eq $fit) { $fit = 0 }
        $candidates += [PSCustomObject]@{
            model    = $m
            fit      = [double]$fit
            quality  = [int]$m.quality_score
            tps      = [int]$m.tps_score
            providers = [int]$m.provider_count
        }
    }

    # Sort by fit descending, then quality
    $candidates = $candidates | Sort-Object { $_.fit } -Descending | Sort-Object { $_.quality } -Descending

    # Apply criticality filter
    if ($Criticality -eq "high" -or $Criticality -eq "critical") {
        # For critical missions, prefer models with quality >= 70
        $candidates = $candidates | Where-Object { $_.quality -ge 70 }
    }

    # Pick best candidate (avoid duplicate canonicals)
    $selected = $null
    $alreadyUsed = $usedCanonicals
    foreach ($c in $candidates) {
        if ($c.model.canonical_id -notin $alreadyUsed) {
            $selected = $c
            break
        }
    }

    # If all used, allow reuse
    if (-not $selected -and $candidates.Count -gt 0) {
        $selected = $candidates[0]
        Write-Status "Reutilizando modelo (sem alternativa)" "WARN"
    }

    if (-not $selected) {
        Write-Status "Nenhum modelo disponivel para $role" "ERROR"
        continue
    }

    $usedCanonicals += $selected.model.canonical_id

    # Build primary route (first provider by priority)
    $primaryRoute = $selected.model.availability | Sort-Object { $_.priority } | Select-Object -First 1

    # Build same-model fallback (other providers)
    $sameModelFallback = $selected.model.availability |
        Where-Object { $_.provider -ne $primaryRoute.provider } |
        Sort-Object { $_.priority }

    # Build capability fallback (different model, similar quality)
    $capFallback = $selected.model.fallback_policy.same_capability | Select-Object -First 3

    # Fix model_id: if it already starts with provider/, don't add provider again
    $primaryModelId = $primaryRoute.model_id
    if (-not $primaryModelId.StartsWith("$($primaryRoute.provider)/")) {
        $primaryModelId = "$($primaryRoute.provider)/$primaryModelId"
    }
    $sameModelFallbackFixed = @($sameModelFallback | ForEach-Object {
        $fbId = $_.model_id
        if (-not $fbId.StartsWith("$($_.provider)/")) {
            $fbId = "$($_.provider)/$fbId"
        }
        @{ provider = $_.provider; model_id = $fbId }
    })

    $allocations += [PSCustomObject]@{
        role            = $role
        agent_id        = "$($role.Substring(0, [Math]::Min(6, $role.Length)))-$($allocations.Count + 1)"
        canonical_model = $selected.model.canonical_id
        display_name    = $selected.model.display_name
        quality_score   = $selected.quality
        tps_score       = $selected.tps
        fit_score       = [Math]::Round($selected.fit, 3)
        primary_route   = @{
            provider = $primaryRoute.provider
            model_id = $primaryModelId
        }
        same_model_fallback = $sameModelFallbackFixed
        capability_fallback = @($capFallback)
        assignment_reason   = @(
            "role_fit=$($selected.fit)",
            "quality=$($selected.quality)",
            "tps=$($selected.tps)",
            "providers=$($selected.providers)"
        )
    }

    Write-Host "  -> $($selected.model.canonical_id) (fit=$([Math]::Round($selected.fit, 3)), Q=$($selected.quality))" -ForegroundColor Green
    Write-Host "     Primary: $primaryModelId" -ForegroundColor Gray
    if ($sameModelFallback.Count -gt 0) {
        $fbNames = ($sameModelFallback | ForEach-Object { $_.provider }) -join ", "
        Write-Host "     Fallback: $fbNames" -ForegroundColor Gray
    }
}

# ============================================================
# 3. DIVERSITY CHECK
# ============================================================

Write-Section "3. Verificacao de diversidade"

$families = $allocations | ForEach-Object {
    Get-ModelFamily $_.canonical_model
} | Group-Object | Sort-Object Count -Descending

$uniqueFamilies = $families.Count
$totalAgents = $allocations.Count

Write-Status "Familias representadas: $uniqueFamilies" "INFO"
foreach ($f in $families) {
    Write-Host "  $($f.Name): $($f.Count) agente(s)" -ForegroundColor Gray
}

if ($uniqueFamilies -lt 2 -and $totalAgents -ge 3) {
    Write-Status "BAIXA DIVERSIDADE: todos os agentes da mesma familia" "WARN"
    Write-Status "Considere adicionar um modelo de familia diferente para reduzir vies" "WARN"
} else {
    Write-Status "Diversidade adequada" "OK"
}

# ============================================================
# 4. CIRCUIT BREAKER POLICY
# ============================================================

Write-Section "4. Politica de fallback"

Write-Status "Retry: 2 tentativas no mesmo provider (backoff exponencial)" "INFO"
Write-Status "Failover horizontal: trocar provider apos 429 persistente" "INFO"
Write-Status "Fallback vertical: trocar modelo apos falha em todos os providers" "INFO"
Write-Status "Circuit breaker: 3 falhas consecutivas -> remover rota por 5-15 min" "INFO"
if ($Criticality -eq "high" -or $Criticality -eq "critical") {
    Write-Status "Modo critico: NAO degradar automaticamente, pausar e alertar" "WARN"
} else {
    Write-Status "Modo normal: degradacao permitida para tarefas nao criticas" "INFO"
}

# ============================================================
# 5. OUTPUT
# ============================================================

Write-Section "5. Resultado"

$routingPlan = @{
    generated_at     = (Get-Date -Format "o")
    mission          = $Mission
    mission_desc     = $profile.description
    criticality      = $Criticality
    total_agents     = $allocations.Count
    max_agents       = $profile.max_agents
    family_diversity = $uniqueFamilies
    circuit_breaker  = @{
        retry_attempts     = 2
        backoff_ms         = @(1000, 2000, 4000)
        failover_threshold = 3
        breaker_timeout_ms = 900000
        degrade_on_exhaustion = ($Criticality -ne "high" -and $Criticality -ne "critical")
    }
    team = @($allocations | ForEach-Object {
        @{
            agent_id          = $_.agent_id
            role              = $_.role
            canonical_model   = $_.canonical_model
            display_name      = $_.display_name
            quality_score     = $_.quality_score
            tps_score         = $_.tps_score
            fit_score         = $_.fit_score
            primary_route     = $_.primary_route
            same_model_fallback = $_.same_model_fallback
            capability_fallback = $_.capability_fallback
            assignment_reason = $_.assignment_reason
        }
    })
}

# Print table
Write-Host ""
Write-Host ("{0,-8} {1,-25} {2,-8} {3,-5} {4,-5} {5,-30}" -f "AGENT", "MODEL", "FIT", "Q", "TPS", "PRIMARY") -ForegroundColor Cyan
Write-Host ("{0,-8} {1,-25} {2,-8} {3,-5} {4,-5} {5,-30}" -f ("-"*8), ("-"*25), ("-"*8), ("-"*5), ("-"*5), ("-"*30)) -ForegroundColor DarkGray
foreach ($a in $allocations) {
    Write-Host ("{0,-8} {1,-25} {2,-8} {3,-5} {4,-5} {5,-30}" -f `
        $a.agent_id,
        $a.canonical_model.Substring(0, [Math]::Min(25, $a.canonical_model.Length)),
        $a.fit_score,
        $a.quality_score,
        $a.tps_score,
        $a.primary_route.model_id.Substring(0, [Math]::Min(30, $a.primary_route.model_id.Length))
    ) -ForegroundColor White
}

if ($Json) {
    $outPath = Join-Path (Get-OpenClawHome) "logs\routing-plan-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"
    Export-JsonPretty $outPath $routingPlan
    Write-Host ""
    Write-Status "Plano exportado: $outPath" "OK"
}

Write-Host ""
Write-Status "Concluido: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" "OK"
