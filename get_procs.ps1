Get-CimInstance Win32_Process | Where-Object { $_.Name -match 'node|python|electron' } | Select-Object Name, ProcessId, CommandLine | Export-Csv -Path procs.csv -NoTypeInformation -Force
