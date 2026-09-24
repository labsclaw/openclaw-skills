# Real-Browser CDP Mode Reference

Connect to the user's running Chrome instance via CDP remote debugging.

## Setup
### Windows (PowerShell)
```powershell
Start-Process "chrome.exe" -ArgumentList "--remote-debugging-port=9222","--user-data-dir=$HOME\AppData\Local\Google\Chrome\User Data"
```

## Connect & Control
Use CDP attach via Playwright or native WebSocket to reuse existing logged-in cookies and session state.

## Humanized Input
- Variable keystroke delay: 50-180ms
- Bézier mouse trajectories to target coordinates
- Randomized pause between sequential form inputs
