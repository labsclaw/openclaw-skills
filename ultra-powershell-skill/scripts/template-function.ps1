function Verb-Noun {
    <#
    .SYNOPSIS
        Brief description.
    .DESCRIPTION
        Detailed description.
    .PARAMETER Name
        Parameter description.
    .EXAMPLE
        Verb-Noun -Name 'Value'
    #>
    [CmdletBinding(SupportsShouldProcess)]
    param(
        [Parameter(Mandatory, ValueFromPipeline)]
        [ValidateNotNullOrEmpty()]
        [string[]]$Name,

        [Parameter(ValueFromPipelineByPropertyName)]
        [Alias('CN')]
        [string]$ComputerName = $env:COMPUTERNAME,

        [switch]$Force,

        [switch]$PassThru
    )

    begin {
        Write-Verbose "Starting Verb-Noun..."
    }

    process {
        foreach ($item in $Name) {
            try {
                if (-not $item) {
                    Write-Warning "Skipping empty item."
                    continue
                }

                if ($PSCmdlet.ShouldProcess($item, 'Action')) {
                    $result = [PSCustomObject]@{
                        PSTypeName   = 'Module.Result'
                        Name         = $item
                        ComputerName = $ComputerName
                        Processed    = (Get-Date)
                    }

                    if ($PassThru.IsPresent) {
                        Write-Output $result
                    }
                }
            }
            catch {
                $errorRecord = [System.Management.Automation.ErrorRecord]::new(
                    $_.Exception,
                    'VerbNounFailed',
                    [System.Management.Automation.ErrorCategory]::NotSpecified,
                    $item
                )
                $PSCmdlet.WriteError($errorRecord)
            }
        }
    }

    end {
        Write-Verbose "Verb-Noun completed."
    }
}
