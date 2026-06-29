---
name: ultra-powershell-skill
description: >-
  PowerShell for production: Windows pitfalls, GUI automation, gallery patterns,
  NASA Power of Ten, 5-step code review, and enterprise module development.
---

# Ultra PowerShell Skill

Curated PowerShell expertise for agents. No boilerplate, no agent-config
disguised as domain knowledge. Only what actually matters for production
PowerShell on Windows.

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
- No `??` (null-coalescing), `?.` (null-conditional)
- No `Select-String -Raw`
- No ternary (`$a ? $b : $c`)
- No `ForEach-Object -Parallel`
- `~` does NOT expand in all contexts — always full paths: `C:\Users\...`
- `2>$null` can fail — omit entirely if it breaks

### PowerShell 7+ Worth Using
`&&`, `||` chains, ternary, null-coalescing, `ForEach-Object -Parallel -ThrottleLimit`,
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

`&&` in PS 5.1 throws: `"The token '&&' is not a valid statement separator"`.

### 2.3 No Unicode/Emoji

PowerShell mangles non-ASCII in arguments on Windows.

| Purpose | Don't Use | Use Instead |
|---------|-----------|-------------|
| Success | ✅ ✓ | `[OK]` `[+]` |
| Error | ❌ ✗ 🔴 | `[!]` `[X]` |
| Warning | ⚠️ 🟡 | `[*]` `[WARN]` |

Plain ASCII only in scripts and paths.

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

Default depth is 2 — will truncate nested structures silently.

```powershell
ConvertTo-Json -Depth 10
ConvertFrom-Json -Depth 10   # PS 7+ only
```

### 2.7 Select-String: No -Raw in 5.1

```powershell
# Fails in PS 5.1:
Select-String -Pattern 'foo' -Path file.txt -Raw

# Works in both:
Select-String -Pattern 'foo' -Path file.txt | Select-Object -ExpandProperty Line
```

### 2.8 File Paths

```powershell
# Variable paths: ALWAYS Join-Path
$path = Join-Path $env:USERPROFILE "documents" "file.txt"

# No tilde — doesn't expand reliably
❌ ~\.openclaw\...
✅ C:\Users\ClawLabs\.openclaw\...
```

### 2.9 Node.js + PowerShell: Escaping Trap

Calling `node -e` from PowerShell breaks regex escapes. PowerShell consumes backslashes
before they reach Node.

```powershell
# WRONG — PowerShell eats the backslashes:
node -e "console.log(/\d+/)"

# CORRECT — write temp .js file:
$script = "$env:TEMP\_fix.js"
@"
console.log(/\d+/);
"@ | Set-Content -Path $script -Encoding UTF8
node $script
Remove-Item $script -Force
```

**Rule:** Any `node -e` with `\d`/`\w`/`\s`/`\b` or non-ASCII → write temp file.

### 2.10 CP850 vs UTF-8 Encoding

On Windows `String(buffer)` uses system default (CP850), not UTF-8.

```powershell
# Wrong — uses CP850:
$text = [String]$buffer

# Correct:
$text = [System.Text.Encoding]::UTF8.GetString($buffer)
```

Root cause of Paperclip adapter-utils encoding bug (PR #7440).

### 2.11 BOM in Script Files

PowerShell 6+ defaults to UTF8 without BOM. Some Windows tools require BOM.

```powershell
# No BOM (PS 6+):
Set-Content -Path file.ps1 -Encoding UTF8

# With BOM (widest Windows compat):
Out-File -FilePath file.ps1 -Encoding utf8BOM
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

---

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
# Good
Get-ChildItem -Path $Path -File | Where-Object { $_.Length -gt 1MB }

# Bad (aliases, positional)
gci $Path | ? Length -gt 1MB
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

- `[switch]` always, never `[bool]`
- `[ValidateNotNullOrEmpty()]` on mandatory strings
- `[ValidateSet()]` for limited options (enables tab completion)
- Standard common params: `-Force`, `-PassThru`, `-WhatIf`, `-Confirm`

### 3.4 Splatting

```powershell
$params = @{
    Path = $sourcePath; Destination = $destPath
    Recurse = $true; Force = $true; ErrorAction = 'Stop'
}
Copy-Item @params
```

### 3.5 Pipeline — Stream, Don't Buffer

```powershell
process {
    # Right — writes immediately
    foreach ($obj in $InputObject) { Write-Output (Process-Item $obj) }

    # Wrong — collects everything then outputs
    $results = @(); foreach ($obj in $InputObject) { $results += Process-Item $obj }; Write-Output $results
}
```

### 3.6 Error Handling

```powershell
try {
    $result = Get-Content -Path $Path -ErrorAction Stop
}
catch [System.IO.FileNotFoundException] {
    $err = [System.Management.Automation.ErrorRecord]::new(
        $_.Exception, 'FileNotFound',
        [System.Management.Automation.ErrorCategory]::ObjectNotFound, $Path)
    $PSCmdlet.WriteError($err)
}
catch { $PSCmdlet.ThrowTerminatingError($_) }
```

- Advanced function? Use `$PSCmdlet.WriteError()` over `Write-Error`
- `$PSCmdlet.ThrowTerminatingError()` over bare `throw`
- Construct proper `ErrorRecord` objects
- Never `catch { }` silently

### 3.7 Output — Typed Objects, Not Strings

```powershell
[PSCustomObject]@{
    PSTypeName = 'MyModule.ServerInfo'
    Name       = $server.Name
    Status     = $server.Status
}
```

- `Write-Output` for data, `Write-Verbose`/`Write-Warning` for status
- Never `Write-Host` for data output (it bypasses the pipeline)

---

## 4. Module Development

### 4.1 Structure

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

### 4.2 Module Manifest (.psd1) — Key Fields

```powershell
@{
    RootModule        = '{ModuleName}.psm1'
    ModuleVersion     = '0.1.0'
    GUID              = [guid]::NewGuid().ToString()   # Real GUID, never placeholder
    Author            = '{AuthorName}'
    PowerShellVersion = '5.1'
    FunctionsToExport = @('Verb-Noun1', 'Verb-Noun2')
    PrivateData = @{ PSData = @{ Tags = @('powershell','automation'); ProjectUri = '...' } }
}
```

### 4.3 Module Loader (.psm1)

```powershell
foreach ($file in @('Private','Public')) {
    Get-ChildItem "$PSScriptRoot/$file/*.ps1" -ErrorAction SilentlyContinue | ForEach-Object {
        . $_.FullName
    }
}
```

### 4.4 Pester 5

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

### 4.5 PSScriptAnalyzer

```powershell
# PSScriptAnalyzerSettings.psd1 — run before every commit
Invoke-ScriptAnalyzer -Path . -Recurse -Settings PSScriptAnalyzerSettings.psd1
```

---

## 5. Windows & Desktop Automation

### 5.1 COM + System Toolkit

```powershell
# Outlook
$outlook = New-Object -ComObject Outlook.Application
$namespace = $outlook.GetNamespace('MAPI')

# Edge CDP
Start-Process "msedge.exe" -ArgumentList "--remote-debugging-port=9222"

# WMI/CIM
Get-CimInstance -ClassName Win32_LogicalDisk

# Window management (Win32 API via C# inline)
Add-Type @"
using System; using System.Runtime.InteropServices;
public class Win32 {
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")] public static extern extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern IntPtr FindWindow(string cls, string title);
}
"@
[Win32]::FindWindow($null, "Window Title")
```

### 5.2 GUI Development — Controls Reference

Add-Type `System.Windows.Forms` and `System.Drawing` before use.

| Control | Code | Properties |
|---------|------|------------|
| Form | `New-Object Windows.Forms.Form` | StartPosition, FormBorderStyle, MaximizeBox, Topmost |
| Button | `New-Object Windows.Forms.Button` | DialogResult, AcceptButton |
| TextBox | `New-Object Windows.Forms.TextBox` | Multiline, ScrollBars, PasswordChar, MaxLength |
| ComboBox | `New-Object Windows.Forms.ComboBox` | DropDownStyle='DropDownList', Items.AddRange() |
| ListBox | `New-Object Windows.Forms.ListBox` | SelectionMode='MultiExtended' |
| DataGridView | `New-Object Windows.Forms.DataGridView` | DataSource, ReadOnly, AutoSizeColumnsMode |
| ProgressBar | `New-Object Windows.Forms.ProgressBar` | Min/Max/Value, Style='Marquee' |
| Timer | `New-Object Windows.Forms.Timer` | Interval, Add_Tick() |

```powershell
$form = New-Object Windows.Forms.Form -Property @{
    Text = 'App'; Size = '400,300'
    StartPosition = 'CenterScreen'; FormBorderStyle = 'FixedDialog'
    MaximizeBox = $false; MinimizeBox = $false
}

# DataGridView — bind process data
$grid = New-Object Windows.Forms.DataGridView -Property @{
    Location = '10,10'; Size = '380,200'
    AutoSizeColumnsMode = 'Fill'; ReadOnly = $true
}
$grid.DataSource = [System.Collections.ArrayList]@(Get-Process | Select Name,CPU,WorkingSet -First 10)
$form.Controls.Add($grid)
```

### 5.3 GUI Layout Patterns

```powershell
# Anchoring — resize with form
$tb.Anchor = [Windows.Forms.AnchorStyles]::Top -bor [Windows.Forms.AnchorStyles]::Left -bor [Windows.Forms.AnchorStyles]::Right

# Docking
$panel.Dock = [Windows.Forms.DockStyle]::Top   # Top, Bottom, Left, Right, Fill

# TableLayoutPanel — grid layout
$tbl = New-Object Windows.Forms.TableLayoutPanel -Property @{ ColumnCount=2; RowCount=3 }
$tbl.ColumnStyles.Add((New-Object Windows.Forms.ColumnStyle('Percent',30)))
$tbl.ColumnStyles.Add((New-Object Windows.Forms.ColumnStyle('Percent',70)))
$tbl.Controls.Add($label, 0, 0); $tbl.Controls.Add($textBox, 1, 0)
```

### 5.4 Events

```powershell
$button.Add_Click({ [Windows.Forms.MessageBox]::Show('Clicked') })
$form.Add_Load({ $textBox.Focus() })
$form.Add_FormClosing({ param($s,$e) $e.Cancel = -not $confirmed })
$textBox.Add_TextChanged({ $button.Enabled = $textBox.Text.Length -gt 0 })
$timer = New-Object Windows.Forms.Timer; $timer.Interval=1000
$timer.Add_Tick({ $label.Text = (Get-Date -Format 'HH:mm:ss') }); $timer.Start()
```

### 5.5 GUI Templates

**Input Dialog:**
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

**File Browser:**
```powershell
function Show-FileBrowser($Title='Select File', $Filter='All|*.*', [switch]$Multi) {
    Add-Type -AssemblyName System.Windows.Forms
    $d = New-Object Windows.Forms.OpenFileDialog -Property @{ Title=$Title; Filter=$Filter; Multiselect=$Multi }
    return if ($d.ShowDialog() -eq 'OK') { if ($Multi) { $d.FileNames } else { $d.FileName } }
}
```

### 5.6 WPF/XAML

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

WPF > WinForms for: styling, data binding, MVVM, vector graphics, modern controls.

---

## 6. NASA Power of Ten — Adapted

**1. Keep Control Flow Simple** — No deep nesting, catch covering too much code.
**2. Bound Loops** — Every loop has a max. Graph pagination:
```powershell
$maxPages=500; $pc=0
while ($next -and $pc++ -lt $maxPages) { ... }
```
**3. Initialize Before Use** — `Set-StrictMode -Version Latest`, `$array=@()` before adding.
**4. Keep Functions Small** — One screen, one purpose. Split: `Get-GraphPage`, `Invoke-GraphRetry`.
**5. Assert + Validate** — `[ValidateNotNullOrEmpty()]`, `[ValidateSet()]`, guard clauses.
**6. Minimize Scope** — No `$global:`, no hidden module state.
**7. Check Return Values** — HTTP status, null, empty collections, batch failures, Graph throttling.
**8. Avoid Dynamic Code** — No `Invoke-Expression`, no runtime-generated names.
**9. Careful with Mutation** — Create new objects; don't modify inputs.
**10. Zero Warnings** — `Invoke-ScriptAnalyzer` must pass clean.

---

## 7. Code Review — 5-Step Elimination Process

Adapted from Musk's design process. Apply in order; never skip to step 5.

### Step 1 — Make Requirements Less Dumb
Challenge everything. What breaks without this code?

### Step 2 — Delete (most important)
Remove what can't justify existence:
- "Nice to have" parameters
- Functions wrapping one cmdlet without adding value
- Comments explaining bad code (rewrite instead)
- Code that exists "just in case"
- `Begin`/`End` blocks where `Process` alone suffices
- Single-use helper functions

### Step 3 — Simplify / Optimize
Replace loops with pipeline. Replace string building with here-strings.
Remove abstraction layers with no real reuse.

### Step 4 — Accelerate Cycle Time
Does this pattern slow future changes? Any N+1 API patterns?
Is object materialization blocking streaming?

### Step 5 — Automate (last!)
Never automate what should be deleted.

---

## 8. Enterprise Patterns

### 8.1 ShouldProcess (WhatIf / Confirm)

```powershell
function Remove-CacheFiles {
    [CmdletBinding(SupportsShouldProcess, ConfirmImpact = 'High')]
    param([Parameter(Mandatory)][string]$Path)
    process {
        if ($PSCmdlet.ShouldProcess($Path, 'Remove cache')) {
            Remove-Item $Path -Recurse -Force
        }
    }
}
```

### 8.2 PassThru

```powershell
function Set-ItemProperty {
    [CmdletBinding()]
    param([string]$Name, [string]$Value, [switch]$PassThru)
    $item.Property = $Value
    if ($PassThru) { Write-Output $item }
}
```

### 8.3 Cross-Version

```powershell
if ($PSVersionTable.PSVersion -ge '7.0') {
    $json = $data | ConvertFrom-Json -Depth 10
} else {
    $json = $data | ConvertFrom-Json
}
$path = [System.IO.Path]::Combine($base, $relative)
```

### 8.4 Secrets

Use `Microsoft.PowerShell.SecretManagement`. Never hardcode, log, or display secrets.

---

## 9. Gallery + Live Verification

PowerShell Gallery: `https://www.powershellgallery.com`.

### 9.1 PSResourceGet (Modern) vs PowerShellGet (Legacy)

| Action | Legacy | Modern |
|--------|--------|--------|
| Search | `Find-Module` | `Find-PSResource` |
| Install | `Install-Module` | `Install-PSResource` |
| Update | `Update-Module` | `Update-PSResource` |
| Uninstall | `Uninstall-Module` | `Uninstall-PSResource` |

```powershell
Get-Module -Name Microsoft.PowerShell.PSResourceGet -ListAvailable
Install-Module -Name Microsoft.PowerShell.PSResourceGet -Force -Scope CurrentUser
```

### 9.2 Version Range (NuGet)

| Syntax | Meaning |
|--------|---------|
| `[1.0,2.0]` | >= 1.0 AND <= 2.0 |
| `[1.0,2.0)` | >= 1.0 AND < 2.0 |
| `(1.0,)` | > 1.0 |
| `*` | All versions |

### 9.3 Useful Patterns

**Ensure-Module (install if missing):**
```powershell
function Ensure-Module($Name, $MinVersion) {
    $installed = Get-InstalledPSResource $Name -ErrorAction SilentlyContinue
    if (-not $installed -or ($MinVersion -and $installed.Version -lt $MinVersion)) {
        Install-PSResource $Name -Scope CurrentUser -TrustRepository
    }
    Import-Module $Name
}
```

**Bulk Install:**
```powershell
@(@{Name='Pester';Version='5.0.0'}, @{Name='PSReadLine'}) | ForEach-Object {
    $p = @{Name=$_.Name; Scope='CurrentUser'; TrustRepository=$true}
    if ($_.Version) { $p.Version = $_.Version }
    Install-PSResource @p
}
```

### 9.4 Live Verification

When recommending modules/cmdlets, verify against live sources:

1. **Gallery:** `WebFetch https://www.powershellgallery.com/packages/{ModuleName}`
2. **Cmdlet docs:** `Search: {CmdletName} site:learn.microsoft.com/en-us/powershell`
3. **Raw docs:** `WebFetch https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/live/reference/`
4. **Fallback:** `Get-Help CmdletName -Full` or `Get-Command CmdletName -Syntax`

---

## Reference Files

| File | What |
|------|------|
| `scripts/template-script.ps1` | Script skeleton |
| `scripts/template-function.ps1` | Advanced function template |
| `scripts/Search-Gallery.ps1` | Gallery search with parameter sets + legacy fallback |
| `templates/module-manifest.psd1` | Module manifest |
| `templates/module-loader.psm1` | Module loader |
| `templates/pester-tests.ps1` | Pester 5 template |
| `templates/build.ps1` | Build script (Analyze/Test/Build/CI) |
| `templates/PSScriptAnalyzerSettings.psd1` | Rule exclusions |
| `references/powerskills-patterns.md` | COM, CDP, desktop automation |
| `references/nasa-power-of-ten-full.md` | NASA 10 rules with PowerShell examples |
| `references/powershellget-reference.md` | Gallery publishing, version ranges |
| `references/best-practices-reference.md` | Naming, pipeline, error handling |
| `examples/review-report.md` | Code review report example |
