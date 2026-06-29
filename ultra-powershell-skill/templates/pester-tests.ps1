#Requires -Modules Pester

BeforeAll {
    $ModulePath = Join-Path $PSScriptRoot '..' '{ModuleName}.psd1'
    Import-Module $ModulePath -Force
}

Describe '{ModuleName} Module' {
    Context 'Module loads correctly' {
        It 'Should import without errors' {
            { Import-Module (Join-Path $PSScriptRoot '..' '{ModuleName}.psd1') -Force } | Should -Not -Throw
        }

        It 'Should export expected functions' {
            $exported = (Get-Module {ModuleName}).ExportedFunctions.Keys
            $exported | Should -Not -BeNullOrEmpty
        }
    }
}

# Per-function Describe blocks:
# Describe 'FunctionName' {
#     Context 'When condition' {
#         It 'Should expected behavior' {
#             # Arrange, Act, Assert
#         }
#     }
# }
