# PowerShell Best Practices Reference

> Source: hmohamed01/powershell-expert/references/best-practices.md
> See also: Section 4 (Script Development) and Section 8 (Enterprise Patterns)

## Naming Conventions

### Cmdlet/Function Names
- **Verb-Noun format**: Always use approved verbs from `Get-Verb`
- **Pascal Case**: Capitalize first letter of verb and all noun terms
- **Singular Nouns**: Even for cmdlets operating on multiple items
- **Specific Nouns**: Use product-specific names, not generic terms

```powershell
# Good
Get-SQLServer
New-AzureStorageAccount
Remove-UserSession

# Bad
Get-Server           # Too generic
Get-Servers          # Plural noun
get-sqlserver        # Wrong case
```

### Parameter Names
- Pascal Case: `ErrorAction`, not `errorAction`
- Singular: unless parameter always accepts arrays
- Standard names: use established names with aliases

### Variable Names
- `$PascalCase` for script/global scope
- `$camelCase` acceptable for local scope
- Descriptive names over abbreviations

## Parameter Design

### Strong Typing

```powershell
param(
    [Parameter(Mandatory)]
    [ValidateNotNullOrEmpty()]
    [string]$Name,

    [ValidateRange(1, 100)]
    [int]$Count = 10,

    [ValidateSet('Debug', 'Info', 'Warning', 'Error')]
    [string]$LogLevel = 'Info',

    [switch]$Force,

    [nullable[bool]]$Enabled  # Three-state: true, false, unspecified
)
```

### Parameter Sets

```powershell
[CmdletBinding(DefaultParameterSetName = 'ByName')]
param(
    [Parameter(ParameterSetName = 'ByName', Position = 0)]
    [string]$Name,

    [Parameter(ParameterSetName = 'ByID')]
    [int]$ID,

    [Parameter(ParameterSetName = 'ByObject', ValueFromPipeline)]
    [PSObject]$InputObject
)
```

### Standard Parameters to Support

| Parameter | Use Case |
|-----------|----------|
| `-Force` | Override warnings/protections |
| `-PassThru` | Return modified objects |
| `-WhatIf` | Preview without executing |
| `-Confirm` | Prompt before executing |
| `-Verbose` | Detailed operational info |

## Pipeline Support

### Accept Pipeline Input

```powershell
param(
    [Parameter(ValueFromPipeline)]
    [string[]]$Name,

    [Parameter(ValueFromPipelineByPropertyName)]
    [Alias('FullName')]
    [string]$Path
)

process {
    foreach ($item in $Name) {
        Write-Output (Process-Item $item)
    }
}
```

### Stream, Don't Buffer

```powershell
# Good — streams output as items are ready
foreach ($item in $collection) {
    Write-Output (Process-Item $item)
}

# Bad — buffers entire collection first
$results = @()
foreach ($item in $collection) {
    $results += Process-Item $item
}
$results
```

## Error Handling

### Use Try/Catch with Specific Errors

```powershell
try {
    $data = Get-Content -Path $Path -ErrorAction Stop
}
catch [System.IO.FileNotFoundException] {
    Write-Error "File not found: $Path"
}
catch [System.UnauthorizedAccessException] {
    Write-Error "Access denied: $Path"
}
catch {
    Write-Error "Unexpected error: $_"
    throw
}
```

### Terminating vs Non-Terminating

```powershell
# Terminating — stops execution
throw "Critical error"
$PSCmdlet.ThrowTerminatingError($record)

# Non-terminating — continues
Write-Error "Problem with item: $item"
$PSCmdlet.WriteError($record)
```

### Feedback Methods

| Method | When | Requires |
|--------|------|----------|
| `Write-Warning` | Potential side effects | None |
| `Write-Verbose` | Detailed operational info | `-Verbose` |
| `Write-Debug` | Troubleshooting state | `-Debug` |
| `Write-Progress` | Long-running operations | None |
| `Write-Information` | Structured output | None |

## Output Patterns

### Return Typed Custom Objects

```powershell
[PSCustomObject]@{
    PSTypeName = 'MyModule.ServerInfo'
    Name       = $server.Name
    Status     = $server.Status
    IPAddress  = $server.IP
}
```

### PassThru Pattern

```powershell
function Set-ItemProperty {
    [CmdletBinding()]
    param(
        [string]$Name, [string]$Value, [switch]$PassThru
    )
    $item.Property = $Value
    if ($PassThru) { Write-Output $item }
}
```

### ShouldProcess Pattern

```powershell
function Remove-Item {
    [CmdletBinding(SupportsShouldProcess, ConfirmImpact = 'High')]
    param([string]$Path)

    if ($PSCmdlet.ShouldProcess($Path, 'Delete')) {
        # Perform deletion
    }
}
```

## Code Style

- **Avoid aliases in scripts**: `Get-ChildItem` not `gci`
- **Use explicit parameter names**: `Get-Process -Name 'notepad'` not `Get-Process 'notepad'`
- **Splatting for readability**: Build `@{}` hashtable, pass with `@params`
- **PascalCase for functions and parameters**
- **Comment-based help** on every exported function
- **No backticks** for line continuation (use splatting, subexpressions, or natural breaks)
