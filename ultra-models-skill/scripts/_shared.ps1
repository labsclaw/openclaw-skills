# ============================================================
# _shared.ps1 - Funcoes comuns da ultra-models-skill
# ============================================================
# Carregado por: plan-routing.ps1, report-final.ps1,
#                sync-config.ps1, build-model-map.ps1
# Nao executar diretamente.
# ============================================================

# ── OpenClaw Home Detection ──────────────────────────────────
function Get-OpenClawHome {
    if ($env:OPENCLAW_CONFIG_PATH) { return Split-Path $env:OPENCLAW_CONFIG_PATH -Parent }
    foreach ($c in @(
        "$env:USERPROFILE\.openclaw",
        "$env:HOMEDRIVE$env:HOMEPATH\.openclaw",
        "$env:APPDATA\openclaw"
    )) { if ($c -and (Test-Path $c)) { return $c } }
    return "$env:USERPROFILE\.openclaw"
}

# ── Env Key Reader ───────────────────────────────────────────
function Get-EnvKey($keyName) {
    $ocHome = Get-OpenClawHome
    foreach ($envPath in @((Join-Path $ocHome ".env"), ".env")) {
        if (Test-Path $envPath) {
            $line = Get-Content $envPath |
                Where-Object { $_ -match "^$keyName\s*=\s*(.+)$" } |
                Select-Object -First 1
            if ($line -and $line -match "^$keyName\s*=\s*(.+)$") {
                return $Matches[1].Trim()
            }
        }
    }
    return $null
}

# ── Load All Env Keys ────────────────────────────────────────
function Get-AllEnvKeys {
    $keys = @{}
    $ocHome = Get-OpenClawHome
    foreach ($envPath in @((Join-Path $ocHome ".env"), ".env")) {
        if (Test-Path $envPath) {
            Get-Content $envPath | ForEach-Object {
                if ($_ -match '^\s*([A-Z_]+)\s*=\s*(.+)$') {
                    $keys[$Matches[1]] = $Matches[2].Trim()
                }
            }
        }
    }
    return $keys
}

# ── Canonical Model ID ───────────────────────────────────────
# Strip provider prefix, :free suffix, vendor subdirs
# "kilocode/nvidia/nemotron-3-super-120b-a12b:free" -> "nemotron-3-super-120b-a12b"
function Get-CanonicalModelId($fullId) {
    $b = $fullId
    $b = $b -replace '^(openrouter|opencode|kilocode|nvidia|antigravity-proxy)/', ''
    $b = $b -replace ':free$',          ''
    $b = $b -replace '-free$',          ''
    $b = $b -replace '^deepseek-ai/',   ''
    $b = $b -replace '^minimaxai/',     ''
    $b = $b -replace '^z-ai/',          ''
    $b = $b -replace '^deepseek/deepseek-', 'deepseek-'
    $b = $b -replace '^minimax/minimax-',   'minimax-'
    $b = $b -replace '^glm/glm-',           'glm-'
    $b = $b -replace '^qwen/',          ''
    $b = $b -replace '^nvidia/',        ''
    return $b.ToLower()
}

# ── Normalize provider name from full model ID ───────────────
function Get-ProviderFromId($fullId) {
    if ($fullId -match '^(openrouter|opencode|kilocode|nvidia|antigravity-proxy)/') {
        return $Matches[1]
    }
    return 'unknown'
}

# ── Quality Score (heuristic by size + family) ──────────────
function Get-ModelQualityScore($baseName) {
    $s = 50
    # Size bonus
    if     ($baseName -match '550b|405b|340b|253b|120b|70b') { $s += 30 }
    elseif ($baseName -match '49b|30b|31b|26b|24b')          { $s += 20 }
    elseif ($baseName -match '8b|9b|3b|1b|1\.2b|4b')         { $s += 5  }
    # Family bonus
    if     ($baseName -match 'nemotron.*ultra')    { $s += 15 }
    elseif ($baseName -match 'nemotron.*super')    { $s += 12 }
    elseif ($baseName -match 'llama.*(70b|405b)')  { $s += 10 }
    elseif ($baseName -match 'gemma.*4')           { $s += 10 }
    elseif ($baseName -match 'gpt-oss')            { $s += 12 }
    elseif ($baseName -match 'qwen3.*coder')       { $s += 10 }
    elseif ($baseName -match 'deepseek.*v4')       { $s += 10 }
    elseif ($baseName -match 'deepseek.*v3')       { $s +=  7 }
    elseif ($baseName -match 'minimax')            { $s +=  8 }
    elseif ($baseName -match 'glm.*5')             { $s +=  8 }
    elseif ($baseName -match 'hermes')             { $s +=  8 }
    elseif ($baseName -match 'laguna.*m\.1')       { $s +=  7 }
    elseif ($baseName -match 'hy3')                { $s +=  6 }
    # Penalty: non-chat models
    if ($baseName -match 'content-safety|embed|pii|safety-guard|nemoguard|parse|clip|retriever|translate|calibration|cosmos|neva|vila|ising|riva|nvclip|nemoretriever|gliner|chatqa|reward') {
        $s -= 40
    }
    # Penalty: very small models
    if ($baseName -match '(^|[^0-9])(1b|3b|1\.2b|4b)') { $s -= 15 }
    return [Math]::Max(0, $s)
}

# ── TPS Score (estimated throughput) ─────────────────────────
function Get-ModelTPSScore($baseName) {
    $t = 50
    if     ($baseName -match 'deepseek.*v4.*flash')        { $t = 95 }
    elseif ($baseName -match 'mimo.*v2\.5')                { $t = 90 }
    elseif ($baseName -match 'big-pickle')                  { $t = 85 }
    elseif ($baseName -match 'hy3|north-mini-code')        { $t = 80 }
    elseif ($baseName -match 'gemma.*4.*26b')               { $t = 75 }
    elseif ($baseName -match 'qwen3.*coder')                { $t = 75 }
    elseif ($baseName -match 'nemotron.*nano')              { $t = 75 }
    elseif ($baseName -match 'deepseek')                    { $t = 70 }
    elseif ($baseName -match 'gemma.*4.*31b')               { $t = 70 }
    elseif ($baseName -match 'gpt-oss.*20b')                { $t = 70 }
    elseif ($baseName -match 'glm.*5')                      { $t = 60 }
    elseif ($baseName -match 'llama.*70b')                  { $t = 55 }
    elseif ($baseName -match 'nemotron.*super.*120b')       { $t = 50 }
    elseif ($baseName -match 'minimax')                     { $t = 50 }
    elseif ($baseName -match 'gpt-oss.*120b')               { $t = 45 }
    elseif ($baseName -match 'nemotron.*ultra.*550b')       { $t = 30 }
    elseif ($baseName -match 'llama.*405b|hermes.*405b')    { $t = 25 }
    # Penalty: non-chat models
    if ($baseName -match 'content-safety|embed|pii|safety-guard|nemoguard|parse|clip|retriever|translate|calibration|cosmos|neva|vila') {
        $t = 0
    }
    return $t
}

# ── Provider Quota Score (budget friendliness) ──────────────
function Get-ProviderQuotaScore($provider) {
    switch ($provider) {
        'opencode'   { return 100 }
        'openrouter' { return 60  }
        'kilocode'   { return 50  }
        'nvidia'     { return 30  }
        default      { return 20  }
    }
}

# ── Model Family Classification ──────────────────────────────
function Get-ModelFamily($baseName) {
    if ($baseName -match 'nemotron')  { return 'nemotron' }
    if ($baseName -match 'deepseek')  { return 'deepseek' }
    if ($baseName -match 'llama')     { return 'llama' }
    if ($baseName -match 'gemma')     { return 'gemma' }
    if ($baseName -match 'qwen')      { return 'qwen' }
    if ($baseName -match 'minimax')   { return 'minimax' }
    if ($baseName -match 'glm')       { return 'glm' }
    if ($baseName -match 'hy3')       { return 'hy3' }
    if ($baseName -match 'hermes')    { return 'hermes' }
    if ($baseName -match 'laguna')    { return 'laguna' }
    if ($baseName -match 'gpt-oss')   { return 'gpt-oss' }
    if ($baseName -match 'mimo')      { return 'mimo' }
    if ($baseName -match 'big-pickle'){ return 'big-pickle' }
    if ($baseName -match 'north-mini') { return 'north-mini' }
    return 'other'
}

# ── Model Tier Classification ────────────────────────────────
function Get-ModelTier($baseName) {
    $q = Get-ModelQualityScore $baseName
    if     ($q -ge 90) { return 'premium' }
    elseif ($q -ge 70) { return 'high' }
    elseif ($q -ge 55) { return 'standard' }
    else               { return 'light' }
}

# ── Capability Scores (intrinsic, role-agnostic) ────────────
# Returns hashtable: reasoning, planning, code_gen, code_review,
# tool_use, structured_output, portuguese, long_context, vision,
# fast_execution, instruction_following
function Get-ModelCapabilities($baseName) {
    $caps = @{
        reasoning          = 0.60
        planning           = 0.60
        code_gen           = 0.55
        code_review        = 0.55
        tool_use           = 0.60
        structured_output  = 0.65
        portuguese         = 0.60
        long_context       = 0.60
        vision             = 0.00
        fast_execution     = 0.55
        instruction_follow = 0.65
    }

    # Nemotron Ultra 550B
    if ($baseName -match 'nemotron.*ultra|550b') {
        $caps.reasoning = 0.97; $caps.planning = 0.96
        $caps.code_review = 0.95; $caps.long_context = 0.95
        $caps.code_gen = 0.85; $caps.tool_use = 0.88
        $caps.instruction_follow = 0.95; $caps.fast_execution = 0.28
    }
    # Nemotron Super 120B
    elseif ($baseName -match 'nemotron.*super|120b') {
        $caps.reasoning = 0.94; $caps.planning = 0.93
        $caps.code_review = 0.91; $caps.long_context = 0.88
        $caps.code_gen = 0.84; $caps.tool_use = 0.86
        $caps.instruction_follow = 0.92; $caps.fast_execution = 0.55
    }
    # Nemotron Nano Omni (reasoning)
    elseif ($baseName -match 'nemotron.*nano.*omni') {
        $caps.reasoning = 0.90; $caps.planning = 0.85
        $caps.code_review = 0.78; $caps.long_context = 0.75
        $caps.code_gen = 0.72; $caps.tool_use = 0.80
        $caps.instruction_follow = 0.85; $caps.fast_execution = 0.75
    }
    # Nemotron Nano 30B
    elseif ($baseName -match 'nemotron.*nano.*30b|nemotron.*30b') {
        $caps.reasoning = 0.70; $caps.planning = 0.68
        $caps.code_review = 0.65; $caps.long_context = 0.65
        $caps.code_gen = 0.62; $caps.tool_use = 0.70
        $caps.instruction_follow = 0.72; $caps.fast_execution = 0.75
    }
    # Nemotron Nano 12B VL (vision)
    elseif ($baseName -match 'nemotron.*nano.*12b.*vl|nemotron.*12b.*vl') {
        $caps.reasoning = 0.65; $caps.planning = 0.60
        $caps.vision = 0.85; $caps.fast_execution = 0.75
        $caps.code_gen = 0.55; $caps.tool_use = 0.60
        $caps.instruction_follow = 0.65
    }
    # DeepSeek V4 Flash
    elseif ($baseName -match 'deepseek.*v4.*flash') {
        $caps.reasoning = 0.75; $caps.planning = 0.70
        $caps.code_gen = 0.82; $caps.code_review = 0.72
        $caps.tool_use = 0.78; $caps.structured_output = 0.80
        $caps.portuguese = 0.70; $caps.fast_execution = 0.95
        $caps.instruction_follow = 0.78
    }
    # DeepSeek V4 Pro
    elseif ($baseName -match 'deepseek.*v4.*pro') {
        $caps.reasoning = 0.80; $caps.planning = 0.78
        $caps.code_gen = 0.85; $caps.code_review = 0.80
        $caps.tool_use = 0.75; $caps.structured_output = 0.75
        $caps.portuguese = 0.68; $caps.fast_execution = 0.70
        $caps.instruction_follow = 0.80
    }
    # DeepSeek Coder 6.7B
    elseif ($baseName -match 'deepseek.*coder.*6\.7b') {
        $caps.code_gen = 0.70; $caps.code_review = 0.60
        $caps.fast_execution = 0.80; $caps.structured_output = 0.65
        $caps.reasoning = 0.55; $caps.tool_use = 0.55
        $caps.instruction_follow = 0.60
    }
    # GLM-5
    elseif ($baseName -match 'glm.*5') {
        $caps.reasoning = 0.72; $caps.planning = 0.70
        $caps.code_gen = 0.68; $caps.code_review = 0.65
        $caps.tool_use = 0.70; $caps.structured_output = 0.70
        $caps.portuguese = 0.65; $caps.fast_execution = 0.60
        $caps.instruction_follow = 0.70
    }
    # HY3
    elseif ($baseName -match 'hy3') {
        $caps.reasoning = 0.65; $caps.planning = 0.60
        $caps.code_gen = 0.58; $caps.structured_output = 0.72
        $caps.fast_execution = 0.80; $caps.tool_use = 0.60
        $caps.portuguese = 0.62; $caps.instruction_follow = 0.65
    }
    # MiniMax
    elseif ($baseName -match 'minimax') {
        $caps.reasoning = 0.68; $caps.planning = 0.65
        $caps.code_gen = 0.60; $caps.structured_output = 0.65
        $caps.portuguese = 0.65; $caps.fast_execution = 0.50
        $caps.tool_use = 0.65; $caps.instruction_follow = 0.68
    }
    # Llama 3.3 70B
    elseif ($baseName -match 'llama.*3\.3.*70b|llama.*70b') {
        $caps.reasoning = 0.78; $caps.planning = 0.75
        $caps.code_gen = 0.72; $caps.code_review = 0.70
        $caps.tool_use = 0.72; $caps.structured_output = 0.70
        $caps.portuguese = 0.68; $caps.fast_execution = 0.55
        $caps.instruction_follow = 0.75
    }
    # Llama 3.1 Nemotron Ultra 253B
    elseif ($baseName -match 'llama.*3\.1.*nemotron.*ultra.*253b') {
        $caps.reasoning = 0.90; $caps.planning = 0.88
        $caps.code_gen = 0.82; $caps.code_review = 0.85
        $caps.tool_use = 0.85; $caps.long_context = 0.90
        $caps.instruction_follow = 0.88; $caps.fast_execution = 0.40
    }
    # Hermes 3 405B
    elseif ($baseName -match 'hermes.*405b') {
        $caps.reasoning = 0.85; $caps.planning = 0.82
        $caps.code_gen = 0.78; $caps.code_review = 0.80
        $caps.tool_use = 0.80; $caps.long_context = 0.85
        $caps.instruction_follow = 0.85; $caps.fast_execution = 0.25
    }
    # Gemma 4
    elseif ($baseName -match 'gemma.*4') {
        $caps.reasoning = 0.72; $caps.planning = 0.68
        $caps.code_gen = 0.65; $caps.structured_output = 0.70
        $caps.fast_execution = 0.75; $caps.tool_use = 0.65
        $caps.instruction_follow = 0.70
    }
    # GPT-OSS
    elseif ($baseName -match 'gpt-oss') {
        $caps.reasoning = 0.70; $caps.planning = 0.68
        $caps.code_gen = 0.72; $caps.structured_output = 0.75
        $caps.tool_use = 0.70; $caps.fast_execution = 0.55
        $caps.instruction_follow = 0.72
    }
    # Qwen3 Coder
    elseif ($baseName -match 'qwen3.*coder') {
        $caps.code_gen = 0.80; $caps.code_review = 0.72
        $caps.structured_output = 0.75; $caps.tool_use = 0.72
        $caps.fast_execution = 0.75; $caps.reasoning = 0.68
        $caps.instruction_follow = 0.72
    }
    # North Mini Code
    elseif ($baseName -match 'north-mini-code|north.*mini') {
        $caps.code_gen = 0.72; $caps.fast_execution = 0.80
        $caps.structured_output = 0.68; $caps.tool_use = 0.65
        $caps.reasoning = 0.58; $caps.instruction_follow = 0.65
    }
    # Laguna
    elseif ($baseName -match 'laguna') {
        $caps.code_gen = 0.65; $caps.reasoning = 0.60
        $caps.fast_execution = 0.55; $caps.structured_output = 0.60
        $caps.tool_use = 0.55; $caps.instruction_follow = 0.60
    }
    # Mimo
    elseif ($baseName -match 'mimo') {
        $caps.fast_execution = 0.90; $caps.code_gen = 0.60
        $caps.structured_output = 0.65; $caps.reasoning = 0.55
        $caps.tool_use = 0.60; $caps.instruction_follow = 0.62
    }
    # Big Pickle
    elseif ($baseName -match 'big-pickle') {
        $caps.fast_execution = 0.85; $caps.code_gen = 0.58
        $caps.structured_output = 0.62; $caps.reasoning = 0.55
        $caps.tool_use = 0.58; $caps.instruction_follow = 0.60
    }
    # LFM
    elseif ($baseName -match 'lfm') {
        $caps.fast_execution = 0.80; $caps.reasoning = 0.50
        $caps.code_gen = 0.45; $caps.structured_output = 0.50
        $caps.tool_use = 0.45; $caps.instruction_follow = 0.50
    }
    # Llama 3.2 3B
    elseif ($baseName -match 'llama.*3\.2.*3b') {
        $caps.fast_execution = 0.85; $caps.reasoning = 0.45
        $caps.code_gen = 0.40; $caps.structured_output = 0.50
        $caps.tool_use = 0.45; $caps.instruction_follow = 0.50
    }

    return $caps
}

# ── Role-to-Capability Mapping ───────────────────────────────
# Which capabilities matter most for each agent role
function Get-RoleCapabilityWeights($role) {
    $weights = @{
        ceo_orchestrator = @{
            reasoning = 0.25; planning = 0.20; code_review = 0.15
            instruction_follow = 0.15; long_context = 0.10
            structured_output = 0.05; tool_use = 0.05
            portuguese = 0.05; code_gen = 0.00; vision = 0.00
            fast_execution = 0.00
        }
        strategic_planner = @{
            reasoning = 0.25; planning = 0.25; long_context = 0.15
            code_review = 0.10; instruction_follow = 0.10
            structured_output = 0.05; tool_use = 0.05
            portuguese = 0.05; code_gen = 0.00; vision = 0.00
            fast_execution = 0.00
        }
        architecture_agent = @{
            reasoning = 0.20; planning = 0.15; code_review = 0.15
            code_gen = 0.15; long_context = 0.10; tool_use = 0.10
            instruction_follow = 0.08; structured_output = 0.05
            portuguese = 0.02; vision = 0.00; fast_execution = 0.00
        }
        implementation_agent = @{
            code_gen = 0.25; tool_use = 0.20; fast_execution = 0.15
            structured_output = 0.10; reasoning = 0.10
            code_review = 0.08; instruction_follow = 0.07
            planning = 0.03; portuguese = 0.02; vision = 0.00
            long_context = 0.00
        }
        reviewer_agent = @{
            code_review = 0.25; reasoning = 0.20; structured_output = 0.15
            instruction_follow = 0.10; code_gen = 0.10
            long_context = 0.08; tool_use = 0.05; planning = 0.05
            portuguese = 0.02; vision = 0.00; fast_execution = 0.00
        }
        research_agent = @{
            reasoning = 0.20; long_context = 0.20; portuguese = 0.15
            structured_output = 0.15; planning = 0.10
            instruction_follow = 0.10; tool_use = 0.05
            code_gen = 0.03; code_review = 0.02; vision = 0.00
            fast_execution = 0.00
        }
        fast_worker = @{
            fast_execution = 0.30; structured_output = 0.15
            tool_use = 0.10; instruction_follow = 0.10
            code_gen = 0.10; reasoning = 0.10; portuguese = 0.05
            code_review = 0.05; planning = 0.03; vision = 0.02
            long_context = 0.00
        }
        classifier_agent = @{
            fast_execution = 0.25; structured_output = 0.25
            instruction_follow = 0.15; reasoning = 0.15
            tool_use = 0.10; portuguese = 0.05; code_gen = 0.03
            code_review = 0.02; planning = 0.00; vision = 0.00
            long_context = 0.00
        }
        vision_agent = @{
            vision = 0.40; reasoning = 0.15; structured_output = 0.15
            instruction_follow = 0.10; tool_use = 0.08
            code_gen = 0.05; portuguese = 0.05; planning = 0.02
            code_review = 0.00; long_context = 0.00; fast_execution = 0.00
        }
        red_team_agent = @{
            reasoning = 0.25; code_review = 0.20; planning = 0.15
            instruction_follow = 0.10; long_context = 0.10
            structured_output = 0.08; tool_use = 0.05
            portuguese = 0.05; code_gen = 0.02; vision = 0.00
            fast_execution = 0.00
        }
    }
    if ($weights.ContainsKey($role)) { return $weights[$role] }
    # Default: balanced
    return @{
        reasoning = 0.12; planning = 0.10; code_gen = 0.10
        code_review = 0.10; tool_use = 0.10; structured_output = 0.10
        portuguese = 0.08; long_context = 0.08; vision = 0.05
        fast_execution = 0.07; instruction_follow = 0.10
    }
}

# ── Fit Score: model + role suitability ──────────────────────
# fit = sum(weight[cap] * capability[cap]) for all caps
function Get-ModelRoleFit($baseName, $role) {
    $caps = Get-ModelCapabilities $baseName
    $weights = Get-RoleCapabilityWeights $role
    $fit = 0.0
    foreach ($key in $caps.Keys) {
        $w = if ($weights.ContainsKey($key)) { $weights[$key] } else { 0 }
        $fit += $w * $caps[$key]
    }
    return [Math]::Round($fit, 3)
}

# ── Provider Health Score (placeholder for live metrics) ─────
function Get-ProviderHealthScore($provider) {
    # Baseline; overwritten by live probe data
    switch ($provider) {
        'nvidia'     { return 0.85 }
        'opencode'   { return 0.90 }
        'openrouter' { return 0.80 }
        'kilocode'   { return 0.75 }
        default      { return 0.50 }
    }
}

# ── Write colored section header ─────────────────────────────
function Write-Section($title) {
    $line = "=" * 60
    Write-Host "`n$line" -ForegroundColor Cyan
    Write-Host "  $title" -ForegroundColor Cyan
    Write-Host "$line" -ForegroundColor Cyan
}

# ── Write colored status line ────────────────────────────────
function Write-Status($msg, $level = "INFO") {
    $color = switch ($level) {
        "OK"    { "Green"   }
        "WARN"  { "Yellow"  }
        "ERROR" { "Red"     }
        "STEP"  { "Cyan"    }
        "DATA"  { "White"   }
        default { "Gray"    }
    }
    Write-Host "[$level] $msg" -ForegroundColor $color
}

# ── Export JSON (UTF-8, no BOM) ──────────────────────────────
function Export-Json($path, $obj) {
    $json = $obj | ConvertTo-Json -Depth 10 -Compress
    # Write without BOM
    [System.IO.File]::WriteAllText($path, $json, [System.Text.UTF8Encoding]::new($false))
}

# ── Export JSON pretty (indented) ────────────────────────────
function Export-JsonPretty($path, $obj) {
    $json = $obj | ConvertTo-Json -Depth 10
    [System.IO.File]::WriteAllText($path, $json, [System.Text.UTF8Encoding]::new($false))
}
