---
name: ultra-powershell-skill
description: >-
  PowerShell for production: Windows pitfalls, GUI automation, gallery patterns,
  NASA Power of Ten, 5-step code review, and enterprise module development.
---

# Ultra PowerShell Skill

Production PowerShell on Windows. No boilerplate. Only what matters.

---

## 1. Version Awareness

```powershell
$ver = $PSVersionTable.PSVersion
if ($ver -ge [version]'7.0') {
    Write-Verbose "PowerShell 7+: $ver"
} else {
    Write-Verbose "Windows PowerShell 5.1"
}
```

### Windows PowerShell 5.1 Non-negotiable Limits
- No `&&` / `||` — use `;`
- No `??`, `?.`, ternary, `ForEach-Object -Parallel`
- No `Select-String -Raw`
- `~` does NOT expand — always full paths: `C:\Users\...`
- `2>$null` can fail — omit if it breaks

### PowerShell 7+ Worth Using
`&&`/`||` chains, ternary, null-coalescing, `ForEach-Object -Parallel -ThrottleLimit`,
`Get-ChildItem -Depth`, `ConvertFrom-Json -Depth`.

---

## 2. Windows PowerShell CRITICAL Pitfalls

Battle-tested from real incidents (2026-06-27/29). Non-negotiable.

### 2.1 Operator Syntax — Parentheses Required

| Wrong | Correct |
|-------|---------|
| `if (Test-Path "a" -or Test-Path "b")` | `if ((Test-Path "a") -or (Test-Path "b"))` |
| `if (Get-Item $x -and $y -eq 5)` | `if ((Get-Item $x) -and ($y -eq 5))` |

Every cmdlet call in `-and`/`-or`/`-not` MUST be parenthesized.

### 2.2 Chaining: `;` Only in 5.1

| PS Version | Chain Operator |
|-----------|----------------|
| 5.1 | `;` only |
| 7+ | `;` or `&&`/`||` |

### 2.3 No Unicode/Emoji — Plain ASCII Only

| Purpose | Don't Use | Use Instead |
|---------|-----------|-------------|
| Success | ✅ ✓ | `[OK]` `[+]` |
| Error | ❌ ✗ 🔴 | `[!]` `[X]` |
| Warning | ⚠️ 🟡 | `[*]` `[WARN]` |

### 2.4 Null Checks

| Wrong | Correct |
|-------|---------|
| `$array.Count -gt 0` | `$array -and $array.Count -gt 0` |
| `$text.Length` | `if ($text) { $text.Length }` |

### 2.5 String Interpolation

```powershell
# Avoid nested $() — breaks readability
"Value: $($obj.prop.sub.prop)"
# Prefer intermediate variable
$value = $obj.prop.sub.prop
"Value: $value"
```

### 2.6 JSON Depth

Default depth is 2 — truncates silently. Always: `ConvertTo-Json -Depth 10`. `ConvertFrom-Json -Depth 10` is PS 7+ only.

### 2.7 Select-String: No -Raw in 5.1

```powershell
# Works in both:
Select-String -Pattern 'foo' -Path file.txt | Select-Object -ExpandProperty Line
```

### 2.8 File Paths

```powershell
$path = Join-Path $env:USERPROFILE "documents" "file.txt"  # ALWAYS Join-Path for variable paths
# No tilde — doesn't expand reliably
```

### 2.9 Node.js + PowerShell: Escaping Trap

PowerShell consumes backslashes before they reach Node. Any `node -e` with `\d`/`\w`/`\s`/`\b` → write temp file:

```powershell
$script = "$env:TEMP\_fix.js"
@"console.log(/\d+/);"@ | Set-Content -Path $script -Encoding UTF8
node $script
Remove-Item $script -Force
```

### 2.10 CP850 vs UTF-8 Encoding

On Windows `String(buffer)` uses CP850, not UTF-8:

```powershell
$text = [System.Text.Encoding]::UTF8.GetString($buffer)
```

### 2.11 BOM in Script Files

```powershell
Set-Content -Path file.ps1 -Encoding UTF8       # No BOM (PS 6+)
Out-File -FilePath file.ps1 -Encoding utf8BOM    # With BOM (widest compat)
```

### 2.12 Quick Error Reference

| Error | Cause | Fix |
|-------|-------|-----|
| `'&&' not a valid statement separator` | Using `&&` in PS 5.1 | Use `;` |
| `Especificação de arquivo ausente` | `2>$null` broken | Remove redirection |
| `Unexpected token` | Unicode/emoji in code | ASCII only |
| `Cannot find property` on null | Dereferencing null | Check null first |
| Regex escapes consumed by shell | `node -e` with `\d` | Write temp `.js` |
| UTF-8 garbled in output | `String()` uses CP850 | `[Encoding]::UTF8.GetString()` |
| Unix command in prompt | `grep`, `ls`, `python3` | Replace with native PS |

### 2.13 Unix Commands → Safe Alternatives

| Unix | Safe Alternative |
|------|------------------|
| `ls` | `Get-ChildItem` or `dir /b` |
| `grep` | `Select-String -Pattern` |
| `wc -l` | `(Get-Content file.md).Count` |
| `cat file` | `Get-Content file` |
| `head`/`tail` | `Get-Content -TotalCount N` / `-Tail N` |
| `rm -rf` | `Remove-Item -Recurse -Force` |
| `mkdir -p` | `New-Item -ItemType Directory -Force` |
| `touch file` | `New-Item -ItemType File` |
| `2>/dev/null` | `-ErrorAction SilentlyContinue` or try/catch |
| `python3` | `python` or `py -3` |
| `python -c "..."` | Write temp `.ps1`/`.py` file |

**Preferred:** eliminate shell dependency — use `read`/`edit`/`write` tools. `exec` only when truly needed.

---
### 2.14 gh CLI on PowerShell — Body & Path Traps

PowerShell mangles quotes inside `--body "string"`. **Always** use `--body-file` with an absolute path (no tilde, forward slashes preferred).

| Wrong | Correct |
|-------|---------|
| `gh pr create --body "text with quotes"` | Write to temp file, then `--body-file` |
| `gh pr create --body-file ~\.openclaw\temp.md` | `gh pr create --body-file C:/Users/.../temp.md` |
| `gh api ... -f body="complex json"` | Write JSON to temp file, pipe via `--input` |

```powershell
# Correct pattern for gh with multi-line body
$tempFile = Join-Path $env:TEMP "gh-body-$(Get-Date -Format 'yyyyMMddHHmmss').md"
@"
## Title
Body with "quotes" and special chars like & | % work fine here.
"@ | Set-Content -Path $tempFile -Encoding UTF8

gh pr create --body-file $tempFile --repo owner/repo --head branch --base main
Remove-Item $tempFile -Force
```

**Rules:**
1. `--body-file` always, never `--body "string"`
2. Absolute path, no `~` expansion
3. Forward slashes `/` preferred over backslashes `\`
4. Clean up temp files after use
5. For `gh api` JSON bodies, write to temp file and use `--input` or pipe


## 3. Script Development Essentials

### 3.1 Structure Template

```powershell
#Requires -Version 5.1
<#
.SYNOPSIS    Brief.
.DESCRIPTION Detailed.
.PARAMETER X  Description.
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory, ValueFromPipeline)]
    [ValidateNotNullOrEmpty()]
    [string[]]$Name,
    [switch]$Force
)
begin   { $ErrorActionPreference = 'Stop'; Write-Verbose "Starting..." }
process { foreach ($item in $Name) { try { ... } catch { $PSCmdlet.WriteError($_) } } }
end     { Write-Verbose "Done." }
```

### 3.2 Naming — Approved Verbs, PascalCase, No Aliases

```powershell
Get-ChildItem -Path $Path -File | Where-Object { $_.Length -gt 1MB }  # Good
gci $Path | ? Length -gt 1MB  # Bad
```

### 3.3 Parameter Design

```powershell
[CmdletBinding(DefaultParameterSetName = 'ByName')]
param(
    [Parameter(Mandatory, Position = 0)]
    [ValidateNotNullOrEmpty()]
    [string]$Name,
    [Parameter(ParameterSetName = 'ByID')]
    [int]$ID,
    [Parameter(ValueFromPipeline)]
    [PSObject]$InputObject,
    [ValidateSet('Dev', 'Test', 'Prod')]
    [string]$Environment = 'Dev',
    [switch]$Force,      # Always [switch], never [bool]
    [switch]$PassThru
)
```

### 3.4 Splatting

```powershell
$params = @{ Path=$sourcePath; Destination=$destPath; Recurse=$true; Force=$true; ErrorAction='Stop' }
Copy-Item @params
```

### 3.5 Pipeline — Stream, Don't Buffer

```powershell
# Right — writes immediately
foreach ($obj in $InputObject) { Write-Output (Process-Item $obj) }
# Wrong — collects then outputs
$results = @(); foreach ($obj in $InputObject) { $results += Process-Item $obj }; Write-Output $results
```

### 3.6 Error Handling

```powershell
try { $result = Get-Content -Path $Path -ErrorAction Stop }
catch [System.IO.FileNotFoundException] {
    $err = [System.Management.Automation.ErrorRecord]::new(
        $_.Exception, 'FileNotFound',
        [System.Management.Automation.ErrorCategory]::ObjectNotFound, $Path)
    $PSCmdlet.WriteError($err)
}
catch { $PSCmdlet.ThrowTerminatingError($_) }
```

Use `$PSCmdlet.WriteError()` over `Write-Error`, `$PSCmdlet.ThrowTerminatingError()` over bare `throw`. Never `catch { }` silently.

### 3.7 Output — Typed Objects, Not Strings

```powershell
[PSCustomObject]@{ PSTypeName='MyModule.ServerInfo'; Name=$server.Name; Status=$server.Status }
```

`Write-Output` for data. Never `Write-Host` for data (bypasses pipeline).

---

## 4. Module Development

```
{ModuleName}/
├── Public/               # Exported functions
├── Private/              # Internal helpers
├── Tests/*.Tests.ps1
├── {ModuleName}.psd1     # Manifest
├── {ModuleName}.psm1     # Loader
├── build.ps1
└── PSScriptAnalyzerSettings.psd1
```

### 4.1 Module Manifest (.psd1)

```powershell
@{
    RootModule        = '{ModuleName}.psm1'
    ModuleVersion     = '0.1.0'
    GUID              = [guid]::NewGuid().ToString()
    Author            = '{AuthorName}'
    PowerShellVersion = '5.1'
    FunctionsToExport = @('Verb-Noun1', 'Verb-Noun2')
    PrivateData = @{ PSData = @{ Tags = @('powershell','automation'); ProjectUri = '...' } }
}
```

### 4.2 Module Loader (.psm1)

```powershell
foreach ($file in @('Private','Public')) {
    Get-ChildItem "$PSScriptRoot/$file/*.ps1" -ErrorAction SilentlyContinue | ForEach-Object { . $_.FullName }
}
```

### 4.3 Pester 5

```powershell
BeforeAll { Import-Module (Join-Path $PSScriptRoot '..\ModuleName.psd1') -Force }
Describe 'Verb-Noun' {
    It 'Requires -Name parameter' {
        (Get-Command Verb-Noun).Parameters['Name'].Attributes.Where({
            $_ -is [System.Management.Automation.ParameterAttribute]
        })[0].Mandatory | Should -BeTrue
    }
}
```

### 4.4 PSScriptAnalyzer

```powershell
Invoke-ScriptAnalyzer -Path . -Recurse -Settings PSScriptAnalyzerSettings.psd1
```

---

## 5. Windows & Desktop Automation

Add-Type `System.Windows.Forms` and `System.Drawing` before use.

```powershell
# Outlook / Edge CDP / WMI
$outlook = New-Object -ComObject Outlook.Application
Start-Process "msedge.exe" -ArgumentList "--remote-debugging-port=9222"
Get-CimInstance -ClassName Win32_LogicalDisk

# Win32 API
Add-Type @"
using System; using System.Runtime.InteropServices;
public class Win32 {
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern IntPtr FindWindow(string cls, string title);
}
"@
[Win32]::FindWindow($null, "Window Title")
```

| Control | Properties |
|---------|------------|
| Form | StartPosition, FormBorderStyle, MaximizeBox |
| Button | DialogResult, AcceptButton |
| TextBox | Multiline, ScrollBars, PasswordChar |
| ComboBox | DropDownStyle='DropDownList', Items.AddRange() |
| DataGridView | DataSource, ReadOnly, AutoSizeColumnsMode |
| Timer | Interval, Add_Tick() |

```powershell
$button.Add_Click({ [Windows.Forms.MessageBox]::Show('Clicked') })
$form.Add_FormClosing({ param($s,$e) $e.Cancel = -not $confirmed })
$textBox.Add_TextChanged({ $button.Enabled = $textBox.Text.Length -gt 0 })
```

### 5.1 Input Dialog Template

```powershell
function Show-InputDialog($Title='Input', $Prompt='Enter:', $Default='') {
    Add-Type -AssemblyName System.Windows.Forms,System.Drawing
    $f = New-Object Windows.Forms.Form -Property @{ Text=$Title; Size='350,150'; StartPosition='CenterScreen'; FormBorderStyle='FixedDialog'; MaximizeBox=$false }
    $f.Controls.AddRange(@(
        (New-Object Windows.Forms.Label -Property @{ Location='10,15'; Size='320,20'; Text=$Prompt }),
        (New-Object Windows.Forms.TextBox -Property @{ Location='10,40'; Size='310,20'; Text=$Default }),
        ($ok = New-Object Windows.Forms.Button -Property @{ Location='160,75'; Size='75,23'; Text='OK'; DialogResult='OK' }),
        ($c = New-Object Windows.Forms.Button -Property @{ Location='245,75'; Size='75,23'; Text='Cancel'; DialogResult='Cancel' })
    ))
    $f.AcceptButton=$ok; $f.CancelButton=$c
    if ($f.ShowDialog() -eq 'OK') { return $f.Controls[1].Text }
}
```

### 5.2 WPF/XAML

```powershell
Add-Type -AssemblyName PresentationFramework
[xml]$xaml = @"
<Window xmlns='http://schemas.microsoft.com/winfx/2006/xaml/presentation'
        Title='App' Height='300' Width='400' WindowStartupLocation='CenterScreen'>
    <StackPanel><TextBox x:Name='Input'/><Button x:Name='OK' Content='OK'/></StackPanel>
</Window>
"@
$w = [Windows.Markup.XamlReader]::Load((New-Object System.Xml.XmlNodeReader $xaml))
$w.FindName('OK').Add_Click({ $w.DialogResult=$true; $w.Close() })
$null = $w.ShowDialog()
```

---

## 6. NASA Power of Ten + Code Review

**NASA Rules:** (1) Simple control flow. (2) Bound loops — `while ($next -and $pc++ -lt $maxPages)`. (3) Initialize before use — `Set-StrictMode -Version Latest`. (4) Small functions, one purpose. (5) Assert + validate — `[ValidateNotNullOrEmpty()]`. (6) Minimize scope — no `$global:`. (7) Check return values. (8) No `Invoke-Expression`. (9) Don't mutate inputs. (10) `Invoke-ScriptAnalyzer` must pass clean.

**5-Step Code Review:** (1) Make requirements less dumb. (2) Delete unjustifiable code. (3) Simplify — loops → pipeline. (4) Accelerate cycle time — no N+1. (5) Automate last.

---

## 7. Enterprise Patterns

```powershell
# ShouldProcess (WhatIf / Confirm)
function Remove-CacheFiles {
    [CmdletBinding(SupportsShouldProcess, ConfirmImpact = 'High')]
    param([Parameter(Mandatory)][string]$Path)
    process {
        if ($PSCmdlet.ShouldProcess($Path, 'Remove cache')) {
            Remove-Item $Path -Recurse -Force
        }
    }
}

# PassThru
function Set-ItemProperty {
    [CmdletBinding()]
    param([string]$Name, [string]$Value, [switch]$PassThru)
    $item.Property = $Value
    if ($PassThru) { Write-Output $item }
}

# Cross-Version JSON
if ($PSVersionTable.PSVersion -ge '7.0') {
    $json = $data | ConvertFrom-Json -Depth 10
} else {
    $json = $data | ConvertFrom-Json
}
```

Use `Microsoft.PowerShell.SecretManagement` for secrets. Never hardcode, log, or display them.

---

## 8. Gallery + Live Verification

| Action | Legacy | Modern |
|--------|--------|--------|
| Search | `Find-Module` | `Find-PSResource` |
| Install | `Install-Module` | `Install-PSResource` |
| Update | `Update-Module` | `Update-PSResource` |
| Uninstall | `Uninstall-Module` | `Uninstall-PSResource` |

```powershell
# Ensure-Module (install if missing)
function Ensure-Module($Name, $MinVersion) {
    if (Get-Module -Name Microsoft.PowerShell.PSResourceGet -ListAvailable) {
        $installed = Get-InstalledPSResource $Name -ErrorAction SilentlyContinue
        if (-not $installed -or ($MinVersion -and $installed.Version -lt $MinVersion)) {
            Install-PSResource $Name -Scope CurrentUser -TrustRepository
        }
    } else {
        $installed = Get-InstalledModule $Name -ErrorAction SilentlyContinue
        if (-not $installed -or ($MinVersion -and $installed.Version -lt $MinVersion)) {
            Install-Module $Name -Scope CurrentUser -Force
        }
    }
    Import-Module $Name
}
```

**Verify against live sources:** `WebFetch https://www.powershellgallery.com/packages/{ModuleName}` or `Get-Help CmdletName -Full`.
