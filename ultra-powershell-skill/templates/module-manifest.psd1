@{
    RootModule        = '{ModuleName}.psm1'
    ModuleVersion     = '0.1.0'
    GUID              = [guid]::NewGuid().ToString()
    Author            = '{AuthorName}'
    CompanyName       = 'Unknown'
    Copyright         = '(c) {Year}. All rights reserved.'
    Description       = '{ModuleDescription}'

    PowerShellVersion = '5.1'

    FunctionsToExport = @(
        # Add exported function names here
    )
    CmdletsToExport   = @()
    VariablesToExport  = @()
    AliasesToExport    = @()

    PrivateData = @{
        PSData = @{
            Tags       = @('powershell', 'automation')
            ProjectUri = ''
            ReleaseNotes = ''
        }
    }
}
