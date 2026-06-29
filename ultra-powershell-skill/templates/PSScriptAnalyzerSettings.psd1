@{
    Severity = @('Error', 'Warning')
    ExcludeRules = @(
        'PSAvoidUsingPositionalParameters'
        'PSUseDeclaredVarsMoreThanAssignments'
        'PSUseSingularNouns'
        'PSAvoidUsingWriteHost'
        'PSAvoidUsingBrokenHashAlgorithms'
        'PSUseBOMForUnicodeEncodedFile'
    )
}
