---
name: ultra-powershell-skill
description: >-
  Master PowerShell 7 and Windows PowerShell 5.1 for production scripting,
  module development, Windows automation, and cloud infra. Synthesizes
  Microsoft best practices, NASA Power of Ten safety principles, community
  patterns from 11+ curated sources, and Windows-specific pitfalls from
  real incidents. Use when writing PowerShell for enterprise automation,
  module scaffold, code review, GUI creation, debugging pipeline issues,
  or Windows admin scripting. Trigger terms: powershell, pwsh, ps1, psm1,
  psd1, pester, scriptanalyzer, winforms, wpf, module, cmdlet, pipeline,
  shouldprocess, splatting, graph api, azure automation.
---

# Ultra PowerShell Skill

PowerShell mastery for agents — from one-liners to enterprise modules,
from Windows COM to cross-platform cloud automation.

---

## Sources

This skill synthesizes patterns from 11 curated sources:

1. **antigravity-awesome-skills/powershell-windows** — Windows pitfalls, operator syntax, unicode, null checks
2. **hmohamed01/powershell-expert** — Script dev, GUI dev, Gallery, Live Verification
3. **jorgeasaurus/agent-skills/powershell-expert** — Best practices, naming, pipeline, error handling
4. **jorgeasaurus/powershell-code-review** — 5-step elimination process, production review
5. **jorgeasaurus/powershell-module-scaffold** — Module scaffold, CI/CD, Pester, PSScriptAnalyzer
6. **jorgeasaurus/powershell-nasa-power-of-ten** — 10 safety principles adapted for PowerShell
7. **aloth/PowerSkills** — Windows COM, CDP, desktop automation toolkit
8. **github/awesome-copilot PowerShell instructions** — Microsoft-aligned cmdlet development guidelines
9. **VoltAgent/powershell-module-architect** — Module architecture, profiles, cross-version
10. **VoltAgent/powershell-7-expert (Claude)** — PS7 features, cloud, enterprise
11. **VoltAgent/powershell-7-expert (Codex)** — Working mode, quality checks, execution boundaries

---

## 1. Version Awareness

### Detect PowerShell Version

```powershell
if ($PSVersionTable.PSVersion -ge [version]'7.0') {
    Write-Verbose "PowerShell 7+: $($PSVersionTable.PSVersion)"
} else {
    Write-Verbose "Windows PowerShell 5.1"
}
```

### Windows PowerShell 5.1 Limitations
- No `&&` / `||` pipeline chain operators (use `;`)
- No `??` (null-coalescing) or `?.` (null-conditional)
- No `Select-String -Raw`
- No ternary operators (`$a ? $b : $c`)
- No `ForEach-Object -Parallel`
- `~` (tilde) does NOT expand in all contexts — always use full paths: `C:\Users\ClawLabs\...`
- `2>$null` can fail with "Especificação de arquivo ausente" — omit redirection entirely if it breaks

### PowerShell 7+ Exclusive Features Worth Using
- `&&`, `||` pipeline chain operators
- `$null ? 'yes' : 'no'` ternary
- `$value ?? 'default'` null-coalescing
- `$obj?.Property` null-conditional
- `Get-ChildItem -Depth` (no more recursive piping to `Where-Object`)
- `ForEach-Object -Parallel -ThrottleLimit`
- `ConvertFrom-Json -Depth` (also backportable, but safer in 7+)
- `-NoProfile` for faster pwsh invocations in CI

---

## 2. Windows PowerShell CRITICAL Pitfalls

These are non-negotiable rules based on real agent incidents (2026-06-27/29).

### 2.1 Operator Syntax — Parentheses Required

| ❌ Wrong | ✅ Correct |
|----------|-----------|
| `if (Test-Path "a" -or Test-Path "b")` | `if ((Test-Path "a") -or (Test-Path "b"))` |
| `if (Get-Item $x -and $y -eq 5)` | `if ((Get-Item $x) -and ($y -eq 5))` |

**Rule:** Each cmdlet call MUST be in parentheses when using `-and`, `-or`, `-not`.

### 2.2 Chaining Commands

| PowerShell Version | Chaining Operator |
|--------------------|-------------------|
| 5.1 (Windows) | `;` only |
| 7+ | `;` or `&&`/`\|\|` |

Never use `&&` in scripts targeting Windows PowerShell 5.1 — it produces an invalid token error.

### 2.3 No Unicode/Emoji in Scripts

PowerShell encoding mangles non-ASCII characters in command-line arguments on Windows.

| Purpose | ❌ Don't Use | ✅ Use |
|---------|-------------|--------|
| Success | ✅ ✓ | [OK] [+] |
| Error | ❌ ✗ 🔴 | [!] [X] |
| Warning | ⚠️ 🟡 | [*] [WARN] |
| Info | ℹ️ 🔵 | [i] [INFO] |

**Rule:** Keep script output and paths plain ASCII. Emoji in scripts causes "Unexpected token" errors.

### 2.4 Null Check Patterns

| ❌ Wrong | ✅ Correct |
|----------|-----------|
| `$array.Count -gt 0` | `$array -and $array.Count -gt 0` |
| `$text.Length` | `if ($text) { $text.Length }` |

### 2.5 String Interpolation

Complex expressions in strings break readability and are fragile:

```powershell
# Avoid
"Value: $($obj.prop.sub.prop)"

# Prefer
$value = $obj.prop.sub.prop
"Value: $value"
```

### 2.6 JSON Operations — Depth Parameter

| ❌ Wrong | ✅ Correct |
|----------|-----------|
| `ConvertTo-Json` | `ConvertTo-Json -Depth 10` |
| `ConvertFrom-Json` | `ConvertFrom-Json -Depth 10` (PS 7+) |

**Rule:** Always specify `-Depth` for nested objects. Default depth is 2.

### 2.7 Select-String — No -Raw

Windows PowerShell `Select-String` does NOT have a `-Raw` parameter. Use `-SimpleMatch` or pipe to `Select-Object`:
```powershell
# WRONG (fails in 5.1):
Select-String -Pattern 'foo' -Path file.txt -Raw

# CORRECT:
Select-String -Pattern 'foo' -Path file.txt | Select-Object -ExpandProperty Line
```

### 2.8 File Paths

```powershell
# ALWAYS use Join-Path for variable paths
$path = Join-Path $env:USERPROFILE "documents" "file.txt"

# Literal paths use backslashes
C:\Users\ClawLabs\...

# Avoid tilde — it doesn't expand reliably
❌ ~\.openclaw\...
✅ C:\Users\ClawLabs\.openclaw\...
```

### 2.9 Common Errors Quick Reference

| Error | Cause | Fix |
|-------|-------|-----|
| "The token '&&' is not a valid statement separator" | Using `&&` in PS 5.1 | Use `;` |
| "Especificação de arquivo ausente após o operador de redirecionamento" | `2>$null` issue | Remove redirection |
| "Unexpected token" | Unicode character | Use ASCII only |
| "Cannot find property" on null | Accessing null object | Check null first |
| "Cannot convert" | Type mismatch | Use `.ToString()` |

---

## 3. Script Development

### 3.1 Script Structure Template

```powershell
#Requires -Version 5.1

<#
.SYNOPSIS
    Brief description.
.DESCRIPTION
    Detailed description.
.PARAMETER Name
    Parameter description.
.EXAMPLE
    Example-Usage -Name 'Value'
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory, ValueFromPipeline)]
    [ValidateNotNullOrEmpty()]
    [string[]]$Name,

    [switch]$Force
)

begin {
    $ErrorActionPreference = 'Stop'
    Write-Verbose "Starting script..."
}

process {
    foreach ($item in $Name) {
        try {
            # Logic here
            if ($Force.IsPresent -or $PSCmdlet.ShouldProcess($item, 'Action')) {
                # Implementation
            }
        } catch {
            $PSCmdlet.WriteError($_)
        }
    }
}

end {
    Write-Verbose "Script completed."
}
```

### 3.2 Naming Conventions

- **Verb-Noun** format with approved verbs (`Get-Verb`)
- **PascalCase** for verb and noun, singular nouns
- **Full cmdlet names** — no aliases in scripts (`Get-ChildItem` not `gci` or `ls`)
- **Full parameter names** — no positional parameters in production code

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

    [ValidateRange(1, 100)]
    [int]$Count = 10,

    [ValidateSet('Dev', 'Test', 'Prod')]
    [string]$Environment = 'Dev',

    # ALWAYS use [switch] for boolean flags, never [bool]
    [switch]$Force,

    [switch]$PassThru
)
```

**Rules:**
- ALWAYS use `[switch]` for boolean flags, never `[bool]`
- Switch parameters default to `$false` when omitted
- Use `.IsPresent` to check switch state
- Use `[ValidateNotNullOrEmpty()]` on mandatory strings
- Use `[ValidateSet()]` for limited options (enables tab completion)
- Use `[SupportsWildcards()]` on path parameters
- Common parameters: `-Force`, `-PassThru`, `-WhatIf`, `-Confirm`, `-Verbose`

### 3.4 Splatting

```powershell
$params = @{
    Path        = $sourcePath
    Destination = $destPath
    Recurse     = $true
    Force       = $true
    ErrorAction = 'Stop'
}
Copy-Item @params
```

### 3.5 Pipeline Best Practices

```powershell
# Accept pipeline input
param(
    [Parameter(ValueFromPipeline)]
    [string[]]$InputObject
)

process {
    # Process each item immediately — do NOT buffer
    foreach ($obj in $InputObject) {
        $result = Process-Item $obj
        Write-Output $result   # Stream immediately
    }
}
```

**Rules:**
- `ValueFromPipeline` for direct object input
- `ValueFromPipelineByPropertyName` for property mapping
- `Begin`/`Process`/`End` blocks for pipeline handling
- Output one object at a time — never buffer into `$results = @()`
- Write as you go, don't collect

### 3.6 Error Handling

```powershell
try {
    $result = Get-Content -Path $Path -ErrorAction Stop
}
catch [System.IO.FileNotFoundException] {
    $errorRecord = [System.Management.Automation.ErrorRecord]::new(
        $_.Exception,
        'FileNotFound',
        [System.Management.Automation.ErrorCategory]::ObjectNotFound,
        $Path
    )
    $PSCmdlet.WriteError($errorRecord)
    return
}
catch [System.UnauthorizedAccessException] {
    Write-Error "Access denied: $Path"
    return
}
catch {
    $PSCmdlet.ThrowTerminatingError($_)
}
```

**Key patterns:**
- In advanced functions (`[CmdletBinding()]`), prefer `$PSCmdlet.WriteError()` over `Write-Error`
- Prefer `$PSCmdlet.ThrowTerminatingError()` over `throw`
- Construct proper `ErrorRecord` objects with category, target, and exception
- Use typed exceptions over generic `catch`
- Never swallow exceptions silently
- Set `$ErrorActionPreference = 'Stop'` at script start, save/restore original

### 3.7 Output Patterns

```powershell
# Return typed objects, not formatted text
[PSCustomObject]@{
    PSTypeName = 'MyModule.ServerInfo'
    Name       = $server.Name
    Status     = $server.Status
}

# PassThru pattern for action cmdlets
if ($PassThru.IsPresent) {
    Write-Output $result
}

# Write-Output for data
# Write-Verbose / Write-Warning for status
# NEVER Write-Host for data output (use Write-Output)
```

---

## 4. Module Development

### 4.1 Project Structure

```
{ModuleName}/
├── Public/               # Exported functions
├── Private/              # Internal functions
├── Tests/
│   └── {ModuleName}.Tests.ps1
├── scripts/
│   └── Format-AllFiles.ps1
├── .github/
│   └── workflows/
│       └── ci.yml
├── {ModuleName}.psd1     # Module manifest
├── {ModuleName}.psm1     # Module loader
├── build.ps1             # Build script
├── PSScriptAnalyzerSettings.psd1
└── README.md
```

### 4.2 Module Manifest — .psd1

```powershell
@{
    RootModule        = '{ModuleName}.psm1'
    ModuleVersion     = '0.1.0'
    GUID              = [guid]::NewGuid().ToString()  # Generate real GUID, never placeholder
    Author            = '{AuthorName}'
    CompanyName       = 'Unknown'
    Copyright         = '(c) {Year}. All rights reserved.'
    Description       = '{ModuleDescription}'
    PowerShellVersion = '5.1'

    FunctionsToExport = @('Verb-Noun1', 'Verb-Noun2')
    CmdletsToExport   = @()
    VariablesToExport  = @()
    AliasesToExport    = @()

    PrivateData = @{
        PSData = @{
            Tags       = @('powershell', 'automation')
            ProjectUri = 'https://github.com/...'
            ReleaseNotes = ''
        }
    }
}
```

### 4.3 Module Loader — .psm1

```powershell
$Private = @(Get-ChildItem -Path "$PSScriptRoot/Private/*.ps1" -ErrorAction SilentlyContinue)
$Public  = @(Get-ChildItem -Path "$PSScriptRoot/Public/*.ps1"  -ErrorAction SilentlyContinue)

foreach ($file in @($Private + $Public)) {
    try {
        . $file.FullName
    } catch {
        Write-Error "Failed to import $($file.FullName): $_"
    }
}
```

### 4.4 Testing with Pester 5

```powershell
#Requires -Modules Pester

BeforeAll {
    $ModulePath = Join-Path $PSScriptRoot '..' '{ModuleName}.psd1'
    Import-Module $ModulePath -Force
}

Describe '{ModuleName} Module' {
    Context 'Module loads correctly' {
        It 'Should import without errors' {
            { Import-Module $ModulePath -Force } | Should -Not -Throw
        }
        It 'Should export expected functions' {
            $exported = (Get-Module {ModuleName}).ExportedFunctions.Keys
            $exported | Should -Not -BeNullOrEmpty
        }
    }
}

# Unit test pattern — test parameter attributes, not invocation with missing params
Describe 'Get-Something' {
    It 'Should require -Name parameter' {
        $param = (Get-Command Get-Something).Parameters['Name']
        $attr = $param.Attributes.Where({ $_ -is [System.Management.Automation.ParameterAttribute] })
        $attr[0].Mandatory | Should -BeTrue
    }
}
```

### 4.5 PSScriptAnalyzer

```powershell
# PSScriptAnalyzerSettings.psd1
@{
    Severity = @('Error', 'Warning')
    ExcludeRules = @(
        'PSAvoidUsingPositionalParameters'
        'PSUseDeclaredVarsMoreThanAssignments'
        'PSAvoidUsingWriteHost'
        'PSUseBOMForUnicodeEncodedFile'
    )
}
```

**Run before every commit:**
```powershell
Invoke-ScriptAnalyzer -Path . -Recurse -Settings PSScriptAnalyzerSettings.psd1
```

---

## 5. Windows & Desktop Automation

### 5.1 Windows Automation Toolkit Pattern

For Outlook, COM objects, Edge CDP, desktop screenshots, and window management — see `references/powerskills-patterns.md` for full examples.

```powershell
# COM objects
$outlook = New-Object -ComObject Outlook.Application
$namespace = $outlook.GetNamespace('MAPI')

# Edge browser CDP
Start-Process -FilePath "msedge.exe" -ArgumentList "--remote-debugging-port=9222"

# WMI/CIM (cross-platform)
Get-CimInstance -ClassName Win32_LogicalDisk
```

### 5.2 GUI Development

> Source: hmohamed01/powershell-expert/references/gui-development.md

GUI development works on Windows platforms only.

#### Windows Forms — Required Assemblies

```powershell
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
```

#### Form Creation Pattern

```powershell
$form = New-Object System.Windows.Forms.Form -Property @{
    Text            = 'Application Title'
    Size            = New-Object System.Drawing.Size(400, 300)
    StartPosition   = 'CenterScreen'
    FormBorderStyle = 'FixedDialog'
    MaximizeBox     = $false
    MinimizeBox     = $false
    Topmost         = $true
}
```

#### Common Controls Reference

| Control | Code | Key Properties |
|---------|------|----------------|
| **Button** | `New-Object System.Windows.Forms.Button` | Text, DialogResult, AcceptButton |
| **TextBox** | `New-Object System.Windows.Forms.TextBox` | Multiline, ScrollBars, PasswordChar, MaxLength |
| **Label** | `New-Object System.Windows.Forms.Label` | Text, AutoSize |
| **ComboBox** | `New-Object System.Windows.Forms.ComboBox` | DropDownStyle ('DropDownList'), Items.AddRange() |
| **ListBox** | `New-Object System.Windows.Forms.ListBox` | SelectionMode, Items.AddRange() |
| **CheckBox** | `New-Object System.Windows.Forms.CheckBox` | Checked, Text |
| **RadioButton** | `New-Object System.Windows.Forms.RadioButton` | Checked, group inside GroupBox |
| **DateTimePicker** | `New-Object System.Windows.Forms.DateTimePicker` | Format, Value |
| **ProgressBar** | `New-Object System.Windows.Forms.ProgressBar` | Minimum, Maximum, Value, Style |
| **DataGridView** | `New-Object System.Windows.Forms.DataGridView` | DataSource, ReadOnly, AutoSizeColumnsMode |
| **Timer** | `New-Object System.Windows.Forms.Timer` | Interval, Add_Tick() |

```powershell
# DataGridView example — bind process data
$dataGrid = New-Object System.Windows.Forms.DataGridView -Property @{
    Location            = New-Object System.Drawing.Point(10, 10)
    Size                = New-Object System.Drawing.Size(400, 200)
    AutoSizeColumnsMode = 'Fill'
    ReadOnly            = $true
    AllowUserToAddRows  = $false
}
$data = Get-Process | Select-Object Name, CPU, WorkingSet -First 10
$dataGrid.DataSource = [System.Collections.ArrayList]@($data)
$form.Controls.Add($dataGrid)
```

#### Layout Patterns

```powershell
# Anchoring (resize handling)
$textBox.Anchor = [System.Windows.Forms.AnchorStyles]::Top -bor [System.Windows.Forms.AnchorStyles]::Left -bor [System.Windows.Forms.AnchorStyles]::Right

# Docking
$panel.Dock = [System.Windows.Forms.DockStyle]::Top  # Top, Bottom, Left, Right, Fill

# TableLayoutPanel (grid layout)
$tableLayout = New-Object System.Windows.Forms.TableLayoutPanel -Property @{
    Location    = New-Object System.Drawing.Point(10, 10)
    Size        = New-Object System.Drawing.Size(380, 200)
    ColumnCount = 2
    RowCount    = 3
}
$tableLayout.ColumnStyles.Add((New-Object System.Windows.Forms.ColumnStyle('Percent', 30)))
$tableLayout.ColumnStyles.Add((New-Object System.Windows.Forms.ColumnStyle('Percent', 70)))
$tableLayout.Controls.Add($label, 0, 0)    # Column 0, Row 0
$tableLayout.Controls.Add($textBox, 1, 0)  # Column 1, Row 0
```

#### Event Handling

```powershell
# Button click
$button.Add_Click({ [System.Windows.Forms.MessageBox]::Show('Clicked', 'Info') })

# Form load — runs when form loads
$form.Add_Load({ $textBox.Focus() })

# Form closing — confirm before close
$form.Add_FormClosing({ param($s, $e)
    $r = [System.Windows.Forms.MessageBox]::Show('Quit?', 'Confirm', 'YesNo', 'Question')
    if ($r -eq 'No') { $e.Cancel = $true }
})

# TextBox validation as user types
$textBox.Add_TextChanged({ $button.Enabled = $textBox.Text.Length -gt 0 })

# Timer for background updates
$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 1000
$timer.Add_Tick({ $label.Text = "Time: $(Get-Date -Format 'HH:mm:ss')" })
$timer.Start()
# Don't forget: $timer.Stop() when done
```

#### GUI Templates

**Input Dialog:**
```powershell
function Show-InputDialog {
    param([string]$Title = 'Input', [string]$Prompt = 'Enter:', [string]$Default = '')
    Add-Type -AssemblyName System.Windows.Forms, System.Drawing
    $form = New-Object System.Windows.Forms.Form -Property @{ Text=$Title; Size=New-Object System.Drawing.Size(350,150); StartPosition='CenterScreen'; FormBorderStyle='FixedDialog'; MaximizeBox=$false; MinimizeBox=$false }
    $lbl = New-Object System.Windows.Forms.Label -Property @{ Location=New-Object System.Drawing.Point(10,15); Size=New-Object System.Drawing.Size(320,20); Text=$Prompt }
    $tb = New-Object System.Windows.Forms.TextBox -Property @{ Location=New-Object System.Drawing.Point(10,40); Size=New-Object System.Drawing.Size(310,20); Text=$Default }
    $ok = New-Object System.Windows.Forms.Button -Property @{ Location=New-Object System.Drawing.Point(160,75); Size=New-Object System.Drawing.Size(75,23); Text='OK'; DialogResult='OK' }
    $cancel = New-Object System.Windows.Forms.Button -Property @{ Location=New-Object System.Drawing.Point(245,75); Size=New-Object System.Drawing.Size(75,23); Text='Cancel'; DialogResult='Cancel' }
    $form.AcceptButton = $ok; $form.CancelButton = $cancel
    $form.Controls.AddRange(@($lbl,$tb,$ok,$cancel))
    $form.Add_Shown({ $tb.Select() })
    if ($form.ShowDialog() -eq 'OK') { return $tb.Text }
}
```

**File Browser:**
```powershell
function Show-FileBrowser {
    param([string]$Title = 'Select File', [string]$Filter = 'All (*.*)|*.*', [switch]$MultiSelect)
    Add-Type -AssemblyName System.Windows.Forms
    $d = New-Object System.Windows.Forms.OpenFileDialog -Property @{ Title=$Title; Filter=$Filter; Multiselect=$MultiSelect }
    if ($d.ShowDialog() -eq 'OK') { return if ($MultiSelect) { $d.FileNames } else { $d.FileName } }
}
```

**Folder Browser:**
```powershell
function Show-FolderBrowser {
    param([string]$Description = 'Select folder')
    Add-Type -AssemblyName System.Windows.Forms
    $d = New-Object System.Windows.Forms.FolderBrowserDialog -Property @{ Description=$Description }
    if ($d.ShowDialog() -eq 'OK') { return $d.SelectedPath }
}
```

#### WPF/XAML (Complex Interfaces)

```powershell
Add-Type -AssemblyName PresentationFramework

[xml]$xaml = @"
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="WPF App" Height="300" Width="400"
        WindowStartupLocation="CenterScreen">
    <Grid Margin="10">
        <Grid.RowDefinitions>
            <RowDefinition Height="Auto"/>
            <RowDefinition Height="*"/>
            <RowDefinition Height="Auto"/>
        </Grid.RowDefinitions>
        <Label Grid.Row="0" Content="Enter text:"/>
        <TextBox Grid.Row="1" x:Name="InputText" Margin="0,5"/>
        <StackPanel Grid.Row="2" Orientation="Horizontal" HorizontalAlignment="Right">
            <Button x:Name="OKButton" Content="OK" Width="75" Margin="5"/>
            <Button x:Name="CancelButton" Content="Cancel" Width="75" Margin="5"/>
        </StackPanel>
    </Grid>
</Window>
"@

$reader = New-Object System.Xml.XmlNodeReader $xaml
$window = [Windows.Markup.XamlReader]::Load($reader)
$inputText = $window.FindName('InputText')
$okButton = $window.FindName('OKButton')
$cancelButton = $window.FindName('CancelButton')

$okButton.Add_Click({ $script:result = $inputText.Text; $window.DialogResult = $true; $window.Close() })
$cancelButton.Add_Click({ $window.DialogResult = $false; $window.Close() })

$null = $window.ShowDialog()
```

**WPF advantages over WinForms:** Better styling, data binding, MVVM, vector graphics, modern controls (ribbon).

---

## 6. NASA Power of Ten — Adapted for PowerShell

These 10 rules make PowerShell production code predictable, testable, and safe.

### 6.1 Keep Control Flow Simple

Prefer readable, linear logic. Avoid deep nesting, hidden side effects, `try/catch` covering too much code.

### 6.2 Bound Loops and Pagination

Every loop must have a clear termination condition. For Graph API:

```powershell
$maxPages = 500
$pageCount = 0

while ($nextLink) {
    $pageCount++
    if ($pageCount -gt $maxPages) {
        throw "Pagination exceeded max page limit of $maxPages."
    }
    $response = Invoke-MgGraphRequest -Uri $nextLink -Method GET
    $nextLink = $response.'@odata.nextLink'
}
```

### 6.3 Avoid Uncontrolled Runtime State

Avoid `$global:`, mutable script-scoped variables, or hidden module state. Pass values explicitly.

### 6.4 Keep Functions Small

One clear purpose per function. Minimal nesting. Explicit output. Split large functions:
```powershell
Get-GraphPage
Invoke-GraphRequestWithRetry
Test-GraphResponse
```

### 6.5 Use Assertions, Validation, Guard Clauses

```powershell
param([Parameter(Mandatory)][ValidateNotNullOrEmpty()][string]$PolicyName)

if (-not $PolicyName) { throw "PolicyName cannot be empty." }

[CmdletBinding(SupportsShouldProcess, ConfirmImpact = 'High')]
param()
```

### 6.6 Minimize Variable Scope

Declare near where used. No large top-level variable blocks.

### 6.7 Check Every Important Return Value

Never assume API calls succeeded. Check: HTTP status, null results, error records, partial failures, Graph throttling, empty collections.

### 6.8 Avoid Clever Dynamic Code

No `Invoke-Expression`, runtime-generated function names, excessive aliases, or implicit positional parameters.

### 6.9 Be Careful with Object Mutation

Avoid modifying input objects unless documented. Prefer creating new objects:
```powershell
[PSCustomObject]@{ Id = $Device.Id; Name = $Device.DisplayName }
```

### 6.10 Treat Warnings and Analyzer Findings as Defects

Generated code should pass `Invoke-ScriptAnalyzer` with zero warnings.

---

## 7. Code Review (5-Step Elimination Process)

Adapted from Elon Musk's 5-Step Design Process for ruthless code review.

### Step 1 — Make Requirements Less Dumb
Challenge every requirement. What breaks if this code doesn't exist?

### Step 2 — Delete (most critical)
Remove everything that can't justify its existence:
- Parameters that are "nice to have"
- Functions wrapping single cmdlets without adding value
- Comments explaining bad code (rewrite instead)
- Code that exists "just in case"
- `Begin`/`End` blocks where `Process` alone suffices
- Helper functions used only once

### Step 3 — Simplify / Optimize
- Replace loops with pipeline operations
- Replace string building with here-strings
- Replace custom formatting with structured objects
- Remove abstraction layers with no real reuse

### Step 4 — Accelerate Cycle Time
- Does this pattern slow future changes?
- Are there N+1 API call patterns?
- Is object materialization blocking streaming?

### Step 5 — Automate (last step only)
Never automate what should be deleted.

### Review Report Structure

```markdown
## Executive Summary
## Critical Issues
## Recommended Deletions
## Recommended Enhancements
## Optional Improvements
## Risk Assessment
## Appendix: Deletion Summary
```

---

## 8. Enterprise Patterns

### 8.1 ShouldProcess (WhatIf / Confirm Support)

```powershell
function Remove-CacheFiles {
    [CmdletBinding(SupportsShouldProcess, ConfirmImpact = 'High')]
    param(
        [Parameter(Mandatory)]
        [string]$Path
    )

    process {
        # ShouldProcess enables -WhatIf and -Confirm
        if ($PSCmdlet.ShouldProcess($Path, 'Remove cache files')) {
            # ShouldContinue for additional confirmation
            if ($Force.IsPresent -or $PSCmdlet.ShouldContinue(
                "Are you sure?",
                "Confirm Removal")) {
                Remove-Item -Path $Path -Recurse -Force
            }
        }
    }
}
```

**Rules:**
- ALWAYS use `SupportsShouldProcess` for any function that modifies state
- Set `ConfirmImpact = 'High'` for destructive operations
- Call `$PSCmdlet.ShouldProcess()` as close to the change action as possible

### 8.2 PassThru Pattern

```powershell
function Set-ItemProperty {
    [CmdletBinding()]
    param(
        [string]$Name,
        [string]$Value,
        [switch]$PassThru
    )

    $item.Property = $Value

    if ($PassThru.IsPresent) {
        Write-Output $item
    }
}
```

### 8.3 Cross-Version Compatibility

```powershell
if ($PSVersionTable.PSVersion -ge [version]'7.0') {
    # PS7+ features
    $json = $data | ConvertFrom-Json -Depth 10 -NoEnumerate
} else {
    # PS5.1 fallback
    $json = $data | ConvertFrom-Json
}

# Cross-platform paths
$path = [System.IO.Path]::Combine($base, $relative)
```

### 8.4 Secure Secrets Handling

- Use `Microsoft.PowerShell.SecretManagement` for credential storage
- Never hardcode secrets in scripts
- Never write secrets to host, logs, or error messages

---

## 9. PowerShell Gallery & Live Verification

> Source: hmohamed01/powershell-expert/references/powershellget.md

PowerShell Gallery (`https://www.powershellgallery.com`) is the central repository for modules, scripts, and DSC resources.

### 9.1 PSResourceGet vs Legacy PowerShellGet

`Microsoft.PowerShell.PSResourceGet` is the modern replacement (ships with PS 7.4+).

| Action | Legacy (PowerShellGet) | Modern (PSResourceGet) |
|--------|------------------------|------------------------|
| Search | `Find-Module` | `Find-PSResource` |
| Install | `Install-Module` | `Install-PSResource` |
| Update | `Update-Module` | `Update-PSResource` |
| Uninstall | `Uninstall-Module` | `Uninstall-PSResource` |
| List installed | `Get-InstalledModule` | `Get-InstalledPSResource` |
| Publish | `Publish-Module` | `Publish-PSResource` |

```powershell
# Check which is available
Get-Module -Name Microsoft.PowerShell.PSResourceGet -ListAvailable

# Install if missing
Install-Module -Name Microsoft.PowerShell.PSResourceGet -Force -Scope CurrentUser
```

### 9.2 Version Range Syntax (NuGet)

| Syntax | Meaning |
|--------|---------|
| `1.0.0` | Exact version |
| `[1.0,2.0]` | >= 1.0 AND <= 2.0 |
| `[1.0,2.0)` | >= 1.0 AND < 2.0 |
| `(1.0,)` | > 1.0 |
| `[,2.0]` | <= 2.0 |
| `*` | All versions |

```powershell
Find-PSResource -Name 'Pester' -Version '*'
Find-PSResource -Name 'Az' -Version '[5.0,7.0)' -Prerelease
```

### 9.3 Repository Setup and Trust

```powershell
# List registered repos
Get-PSResourceRepository

# Register PSGallery if missing
Register-PSResourceRepository -PSGallery

# Set priority (lower = higher priority)
Set-PSResourceRepository -Name PSGallery -Priority 50

# Trust to skip prompts
Set-PSResourceRepository -Name PSGallery -Trusted
# Or per-install: Install-PSResource -Name 'Module' -TrustRepository
```

### 9.4 Search and Install

```powershell
# By name
Find-PSResource -Name 'Az.Compute'

# By tag
Find-PSResource -Tag 'Azure', 'Cloud'

# By command name
Find-PSResource -CommandName 'Get-AzVM'

# By DSC resource
Find-PSResource -DscResourceName 'File'

# Install latest stable
Install-PSResource -Name 'Az.Compute'

# Install specific version
Install-PSResource -Name 'Pester' -Version '5.0.0'

# Install prerelease
Install-PSResource -Name 'Az' -Prerelease

# Scope: CurrentUser (no admin) vs AllUsers
Install-PSResource -Name 'PSReadLine' -Scope CurrentUser
```

> A dedicated search script with parameter sets, legacy fallback, and formatted output
> is available at: `scripts/Search-Gallery.ps1`

### 9.5 Managing Modules

```powershell
# List installed
Get-InstalledPSResource -Name 'Az.*'

# Update specific
Update-PSResource -Name 'Az.Compute'

# Update all
Update-PSResource -Name '*'

# Uninstall
Uninstall-PSResource -Name 'Pester' -Version '4.0.0'

# Save for offline use (download without install)
Save-PSResource -Name 'Az.Compute' -Path 'C:\OfflineModules' -IncludeXml
```

### 9.6 Publishing Modules

```powershell
# Manifest must have: RootModule, ModuleVersion, GUID, Author, Description
# Get API key from: https://www.powershellgallery.com/account/apikeys

$apiKey = 'your-api-key'
Publish-PSResource -Path './MyModule' -ApiKey $apiKey -Repository PSGallery

# Dry run (validate only)
Publish-PSResource -Path './MyModule' -ApiKey $apiKey -WhatIf
```

### 9.7 Common Patterns

**Install if missing:**
```powershell
function Ensure-Module {
    param([string]$Name, [string]$MinVersion)
    $installed = Get-InstalledPSResource -Name $Name -ErrorAction SilentlyContinue
    if (-not $installed -or ($MinVersion -and $installed.Version -lt $MinVersion)) {
        Install-PSResource -Name $Name -Scope CurrentUser -TrustRepository
    }
    Import-Module $Name
}
```

**Bulk install from list:**
```powershell
$modules = @(
    @{ Name = 'Pester'; Version = '5.0.0' }
    @{ Name = 'PSReadLine' }
    @{ Name = 'Az.Accounts' }
)
foreach ($mod in $modules) {
    $params = @{ Name=$mod.Name; Scope='CurrentUser'; TrustRepository=$true }
    if ($mod.Version) { $params.Version = $mod.Version }
    Install-PSResource @params
}
```

**Find recently updated:**
```powershell
Find-PSResource -Name '*' -Repository PSGallery |
    Sort-Object PublishedDate -Descending |
    Select-Object -First 20
```

### 9.8 Live Verification Workflow

When recommending modules or providing cmdlet syntax, MUST verify against live sources:

**Step 1 — Verify module on PowerShell Gallery:**
```powershell
# Use WebFetch on:
https://www.powershellgallery.com/packages/{ModuleName}
```

**Step 2 — Verify cmdlet syntax:**
```powershell
# Search first, then WebFetch
Search query: {CmdletName} cmdlet site:learn.microsoft.com/en-us/powershell

# OR fetch raw docs directly:
https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/live/reference/
```

**Step 3 — Fallback:**
```powershell
# Suggest user runs locally:
Get-Help CmdletName -Full
Get-Command CmdletName -Syntax
```

### 9.9 Recommended Modules

| Category | Modules |
|----------|---------|
| **Testing** | Pester, PSScriptAnalyzer |
| **Azure** | Az, Az.Compute, Az.Storage |
| **M365** | Microsoft.Graph, Microsoft.Graph.Authentication |
| **Secrets** | Microsoft.PowerShell.SecretManagement |
| **Console** | PSReadLine, Terminal-Icons |
| **Web** | Pode, PoshRSJob |
| **GUI** | WPFBot3000, PSGUI |
| **Excel** | ImportExcel |

---

## 10. Reference Materials

| File | Content |
|------|---------|
| `scripts/template-script.ps1` | Production script skeleton |
| `scripts/template-function.ps1` | Advanced function template |
| `scripts/Search-Gallery.ps1` | Gallery search with parameter sets + legacy fallback |
| `templates/module-manifest.psd1` | Module manifest template |
| `templates/module-loader.psm1` | Module loader template |
| `templates/pester-tests.ps1` | Pester 5 test skeleton |
| `templates/build.ps1` | Build script with Analyze/Test/Build/Clean |
| `templates/PSScriptAnalyzerSettings.psd1` | Analyzer rule exclusions |
| `references/powerskills-patterns.md` | Windows COM, CDP, desktop automation |
| `references/nasa-power-of-ten-full.md` | Full NASA 10 rules with PowerShell examples |
| `references/powershellget-reference.md` | PSResourceGet vs PowerShellGet, version ranges, publishing |
| `references/best-practices-reference.md` | Naming, parameters, pipeline, error handling, code style |
| `examples/review-report.md` | Code review report example |

---

## Allowed Tools

- `exec` — Run PowerShell scripts (prefer `pwsh` for PS7 features)
- `read` / `write` / `edit` — File operations
- `web_search` / `web_fetch` — Live verification of modules and cmdlets
- `browser` / `camofox` — Browser automation tests

---

## Related Skills

| Skill | Relationship |
|-------|-------------|
| `ultra-create-skill` | Create agent skills |
| `ultra-provider-health-skill` | Monitor provider client versions |
| `ultra-models-skill` | Free model availability |

---

## License

Apache-2.0. Part of the OpenClaw ecosystem.
