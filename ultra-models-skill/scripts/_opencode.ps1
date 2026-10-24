function Get-OpenCodeCliCatalog {
    $raw = & node (Join-Path $PSScriptRoot 'opencode-catalog.cjs')
    if ($LASTEXITCODE -ne 0) { throw 'Catálogo OpenCode indisponível no CLI; preservar modelos configurados.' }
    $catalog = ($raw -join "`n") | ConvertFrom-Json -ErrorAction Stop
    if ($catalog.status -ne 'catalog_only' -or $catalog.error) { throw 'Catálogo OpenCode inválido; preservar modelos configurados.' }
    return $catalog
}
