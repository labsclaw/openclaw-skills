param()

$ErrorActionPreference = "Stop"

# --- Config ---
$configPath = "$env:USERPROFILE\.openclaw\openclaw.json"
$headerField = "User-Agent"

# --- Helper: write result as JSON for agent consumption ---
function Write-Result {
    param($status, $installed, $configured, $message)
    $result = @{
        status    = $status
        installed = $installed
        configured = $configured
        message   = $message
        timestamp = (Get-Date -Format "o")
    }
    Write-Output ($result | ConvertTo-Json)
}

# --- Step 1: Get installed version from npm ---
try {
    $npmOutput = npm view opencode-ai version 2>$null
    $installedVersion = $npmOutput.Trim()
    if (-not $installedVersion) {
        Write-Result -status "ERROR" -installed $null -configured $null -message "npm view returned empty"
        exit 1
    }
} catch {
    Write-Result -status "ERROR" -installed $null -configured $null -message "Failed to query npm registry: $_"
    exit 1
}

# --- Step 2: Read configured version from openclaw.json ---
try {
    $config = Get-Content $configPath -Raw | ConvertFrom-Json
    $userAgent = $config.models.providers.opencode.headers.$headerField
    if (-not $userAgent) {
        Write-Result -status "WARN" -installed $installedVersion -configured $null -message "User-Agent not found in openclaw.json models.providers.opencode.headers"
        exit 0
    }

    # Extract version from "opencode/X.X.X ..."
    if ($userAgent -match 'opencode/(\d+\.\d+\.\d+)') {
        $configuredVersion = $Matches[1]
    } else {
        Write-Result -status "WARN" -installed $installedVersion -configured $userAgent -message "Could not parse version from User-Agent string"
        exit 0
    }
} catch {
    Write-Result -status "ERROR" -installed $installedVersion -configured $null -message "Failed to read openclaw.json: $_"
    exit 1
}

# --- Step 3: Compare ---
if ($installedVersion -eq $configuredVersion) {
    Write-Result -status "MATCH" -installed $installedVersion -configured $configuredVersion -message "Versions aligned. No action needed."
    exit 0
} else {
    Write-Result -status "MISMATCH" -installed $installedVersion -configured $configuredVersion -message "OpenCode $installedVersion installed but config uses $configuredVersion. Update models.providers.opencode.headers['User-Agent'] in openclaw.json."
    exit 0
}
