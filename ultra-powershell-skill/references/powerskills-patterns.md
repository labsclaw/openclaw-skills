# Windows Automation Patterns (PowerSkills)

Patterns for Windows desktop automation via PowerShell — Outlook COM,
Edge CDP, desktop screenshots, window management, and system commands.
Adapted from aloth/PowerSkills.

---

## Outlook COM Automation

```powershell
$outlook = New-Object -ComObject Outlook.Application
$namespace = $outlook.GetNamespace('MAPI')

# Read inbox
$inbox = $namespace.GetDefaultFolder([Microsoft.Office.Interop.Outlook.OlDefaultFolders]::olFolderInbox)
$inbox.Items | Select-Object -First 10 Subject, ReceivedTime, SenderName

# Send email
$mail = $outlook.CreateItem([Microsoft.Office.Interop.Outlook.OlItemType]::olMailItem)
$mail.Subject = "Subject"
$mail.Body = "Body"
$mail.To = "recipient@example.com"
$mail.Send()
```

---

## Edge Browser via CDP

```powershell
# Start Edge with remote debugging
Start-Process -FilePath "msedge.exe" -ArgumentList "--remote-debugging-port=9222"

# Find CDP endpoint
$endpoints = Invoke-RestMethod -Uri "http://localhost:9222/json/version"
$webSocketUrl = $endpoints.webSocketDebuggerUrl

# Get tabs
$tabs = Invoke-RestMethod -Uri "http://localhost:9222/json"
```

---

## Desktop Screenshots

```powershell
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms

$bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$bitmap = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
$bitmap.Save("$env:TEMP\screenshot.png", [System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose()
$bitmap.Dispose()
```

---

## Window Management

```powershell
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Win32 {
    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);
}
"@

# Minimize all windows
$shell = New-Object -ComObject "Shell.Application"
$shell.MinimizeAll()

# Find and focus a window
$hwnd = [Win32]::FindWindow($null, "Window Title")
if ($hwnd -ne [IntPtr]::Zero) {
    [Win32]::ShowWindow($hwnd, 9)  # SW_RESTORE
    [Win32]::SetForegroundWindow($hwnd)
}
```

---

## Process and System Info

```powershell
# System info
Get-CimInstance -ClassName Win32_OperatingSystem |
    Select-Object Caption, Version, LastBootUpTime, TotalVisibleMemorySize, FreePhysicalMemory

# Disk info
Get-CimInstance -ClassName Win32_LogicalDisk -Filter "DriveType=3" |
    Select-Object DeviceID, @{N='FreeGB';E={[math]::Round($_.FreeSpace/1GB,2)}}, @{N='TotalGB';E={[math]::Round($_.Size/1GB,2)}}

# Network
Get-NetAdapter | Where-Object Status -eq 'Up' | Select-Object Name, LinkSpeed, MacAddress
```

---

## JSON Output Format (PowerSkills Standard)

```powershell
$result = [PSCustomObject]@{
    status    = 'success'
    exit_code = 0
    data      = @{
        # Your data here
    }
    timestamp = (Get-Date -Format 'o')
}
$result | ConvertTo-Json -Depth 10
```
