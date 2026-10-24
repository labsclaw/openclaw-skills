param([switch]$Json)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '_opencode.ps1')
try {
    $catalog = Get-OpenCodeCliCatalog
    if ($Json) { $catalog | ConvertTo-Json -Depth 8 } else {
        Write-Output "OpenCode CLI: $($catalog.free) gratuitos de $($catalog.total). Somente catálogo; acesso e inferência não verificados."
        $catalog.models | ForEach-Object { Write-Output " - $($_.id)" }
    }
} catch { Write-Error 'Falha no catálogo OpenCode CLI. Nenhum modelo pode ser removido com essa evidência.'; exit 1 }
