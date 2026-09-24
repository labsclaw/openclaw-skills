# PowerShell Advanced Recipes & Automation

## JSON Handling (CP850 & UTF-8 Safe)
```powershell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$data | ConvertTo-Json -Depth 10 | Set-Content -Path "output.json" -Encoding UTF8
```

## Process Supervision & Timeouts
```powershell
$p = Start-Process -FilePath "node" -ArgumentList "script.js" -PassThru -NoNewWindow
if (-not $p.WaitForExit(30000)) {
    $p.Kill()
    throw "Process timed out after 30s"
}
```
