# PSResourceGet & PowerShell Gallery Reference

> Source: hmohamed01/powershell-expert/references/powershellget.md

## Overview

**PowerShell Gallery** (`https://www.powershellgallery.com`) is the central repository.
**PSResourceGet** (`Microsoft.PowerShell.PSResourceGet`) is the modern replacement for PowerShellGet.
Ships with PowerShell 7.4+. Faster, more reliable.

## Legacy vs Modern Cmdlets

| Action | Legacy (PowerShellGet) | Modern (PSResourceGet) |
|--------|------------------------|------------------------|
| Search | `Find-Module` | `Find-PSResource` |
| Install | `Install-Module` | `Install-PSResource` |
| Update | `Update-Module` | `Update-PSResource` |
| Uninstall | `Uninstall-Module` | `Uninstall-PSResource` |
| List installed | `Get-InstalledModule` | `Get-InstalledPSResource` |
| Publish | `Publish-Module` | `Publish-PSResource` |

## Setup

```powershell
# Check installed version
Get-Module -Name PowerShellGet -ListAvailable
Get-Module -Name Microsoft.PowerShell.PSResourceGet -ListAvailable

# Install/update PSResourceGet
Install-Module -Name Microsoft.PowerShell.PSResourceGet -Force
Update-Module -Name Microsoft.PowerShell.PSResourceGet

# Configure repository
Get-PSResourceRepository
Register-PSResourceRepository -PSGallery
Set-PSResourceRepository -Name PSGallery -Priority 50
Set-PSResourceRepository -Name PSGallery -Trusted
```

## Find-PSResource Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `-Name` | Module name (wildcards) | `'PSReadLine'` |
| `-Type` | Resource type | `Module`, `Script` |
| `-Version` | Version or NuGet range | `'2.0.0'`, `'[1.0,2.0)'` |
| `-Prerelease` | Include prereleases | Switch |
| `-Tag` | Filter by tags | `'DSC', 'Azure'` |
| `-Repository` | Target repository | `'PSGallery'` |
| `-CommandName` | Find by command | `'Get-AzVM'` |
| `-DscResourceName` | Find by DSC resource | `'File'` |

## Version Range Syntax (NuGet)

| Syntax | Meaning |
|--------|---------|
| `1.0.0` | Exact version |
| `[1.0,2.0]` | >= 1.0 AND <= 2.0 |
| `[1.0,2.0)` | >= 1.0 AND < 2.0 |
| `(1.0,)` | > 1.0 |
| `[,2.0]` | <= 2.0 |

## Install-PSResource Parameters

| Parameter | Description |
|-----------|-------------|
| `-Scope` | `CurrentUser` (default) or `AllUsers` (admin) |
| `-Repository` | Source repository |
| `-TrustRepository` | Skip trust prompt |
| `-Reinstall` | Force reinstall |
| `-SkipDependencyCheck` | Don't install dependencies |
| `-NoClobber` | Don't overwrite commands |

## Common Patterns

### Install if Missing

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

### Bulk Install from List

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

### Find Recently Updated

```powershell
Find-PSResource -Name '*' -Repository PSGallery |
    Sort-Object PublishedDate -Descending |
    Select-Object -First 20
```

### Publish Module

```powershell
# Get API key from https://www.powershellgallery.com/account/apikeys
$apiKey = 'your-api-key'
Publish-PSResource -Path './MyModule' -ApiKey $apiKey -Repository PSGallery

# Dry run (validate without publishing)
Publish-PSResource -Path './MyModule' -ApiKey $apiKey -WhatIf
```

## Useful Links

- **PowerShell Gallery**: https://www.powershellgallery.com
- **Gallery Status**: https://raw.githubusercontent.com/PowerShell/PowerShellGallery/master/psgallery_status.md
- **Gallery Issues**: https://github.com/PowerShell/PowerShellGallery/issues
- **Module Browser**: https://learn.microsoft.com/en-us/powershell/module/
- **PSResourceGet Docs**: https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.psresourceget/
- **PSResourceGet Docs Raw**: https://raw.githubusercontent.com/MicrosoftDocs/powershell-docs-psget/live/powershell-gallery/powershellget-3.x/Microsoft.PowerShell.PSResourceGet/
