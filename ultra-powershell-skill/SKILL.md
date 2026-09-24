---
name: ultra-powershell-skill
description: "Master PowerShell 7 (pwsh) and Windows scripting safely. Native commands, path escaping, encoding safety, and process lifecycle."
---

# Ultra PowerShell Skill

Best practices and safety rules for executing PowerShell scripts and commands in Windows 11 / OpenClaw.

## Golden Rules
1. **Never Chain with `;` or `&&`:** OpenClaw exec runs commands directly. Split multiline or chained logic into separate tool calls or `.ps1` files.
2. **Explicit Working Directory:** Always set absolute paths or specify `workdir` parameter to avoid CWD inheritance bugs.
3. **No Unescaped Quotes with CLI Tools:** When invoking `gh`, `git`, or native tools, avoid raw inline quotes. Prefer `--body-file <path>` with absolute paths.
4. **UTF-8 Encoding Guard:** Ensure scripts set UTF-8 console encoding when capturing multi-byte characters.

## Quick Lookup Matrix

| Topic | Primary Guideline | Reference Doc |
| :--- | :--- | :--- |
| Advanced process & JSON | `ConvertTo-Json`, `Start-Process` | `references/powershell-recipes.md` |
| GitHub CLI (`gh`) integration | Use `--body-file <path>` | Local TOOLS.md |
| File manipulation | `Get-ChildItem`, `Set-Content -Encoding UTF8` | `references/powershell-recipes.md` |
