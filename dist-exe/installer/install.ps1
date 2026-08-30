# DeepSeek Harness — Windows 10/11 One-Click Installer
[CmdletBinding()]
param(
    [switch]$NoLaunch
)

$ErrorActionPreference = 'Stop'

$AppName = 'DeepSeek Harness'
$AppVersion = '0.1.1'
$Publisher = 'DeepSeek AI'
$ExeName = 'DeepSeek Harness.exe'

$SourceDir = Join-Path $PSScriptRoot '..\DeepSeek-Harness'
if (-not (Test-Path (Join-Path $SourceDir $ExeName))) {
    Write-Error "Cannot find source directory at: $SourceDir. Please run dist-exe/package-app.mjs first."
}

$InstallDir = Join-Path $env:LOCALAPPDATA "Programs\$AppName"
Write-Host "Installing $AppName v$AppVersion to: $InstallDir" -ForegroundColor Cyan

# 1. Stop running instances
Get-Process -Name "DeepSeek Harness", "electron" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Milliseconds 500

# 2. Create Destination Directory and Copy Files
if (Test-Path $InstallDir) {
    Remove-Item $InstallDir -Recurse -Force -ErrorAction SilentlyContinue
}
New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
Copy-Item "$SourceDir\*" -Destination $InstallDir -Recurse -Force

# 3. Copy Uninstaller Script
Copy-Item (Join-Path $PSScriptRoot 'uninstall.ps1') (Join-Path $InstallDir 'uninstall.ps1') -Force
$UninstallCmdContent = @"
@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0uninstall.ps1"
"@
Set-Content -Path (Join-Path $InstallDir 'uninstall.cmd') -Value $UninstallCmdContent -Encoding ASCII

# 4. Create Shortcuts (Desktop & Start Menu)
$WshShell = New-Object -ComObject WScript.Shell
$TargetExe = Join-Path $InstallDir $ExeName

# Desktop Shortcut
$DesktopPath = [Environment]::GetFolderPath('Desktop')
$DesktopLnk = Join-Path $DesktopPath "$AppName.lnk"
$Shortcut = $WshShell.CreateShortcut($DesktopLnk)
$Shortcut.TargetPath = $TargetExe
$Shortcut.WorkingDirectory = $InstallDir
$Shortcut.IconLocation = "$TargetExe,0"
$Shortcut.Description = "$AppName AI Agent Harness"
$Shortcut.Save()

# Start Menu Shortcut
$StartMenuPath = [Environment]::GetFolderPath('Programs')
$StartMenuLnk = Join-Path $StartMenuPath "$AppName.lnk"
$Shortcut = $WshShell.CreateShortcut($StartMenuLnk)
$Shortcut.TargetPath = $TargetExe
$Shortcut.WorkingDirectory = $InstallDir
$Shortcut.IconLocation = "$TargetExe,0"
$Shortcut.Description = "$AppName AI Agent Harness"
$Shortcut.Save()

# 5. Register in Windows Add/Remove Programs (Registry)
$RegPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\DeepSeekHarness"
if (-not (Test-Path $RegPath)) {
    New-Item -Path $RegPath -Force | Out-Null
}

$UninstallString = "`"$InstallDir\uninstall.cmd`""

Set-ItemProperty -Path $RegPath -Name "DisplayName" -Value $AppName -Type String
Set-ItemProperty -Path $RegPath -Name "DisplayVersion" -Value $AppVersion -Type String
Set-ItemProperty -Path $RegPath -Name "Publisher" -Value $Publisher -Type String
Set-ItemProperty -Path $RegPath -Name "DisplayIcon" -Value "$TargetExe,0" -Type String
Set-ItemProperty -Path $RegPath -Name "InstallLocation" -Value $InstallDir -Type String
Set-ItemProperty -Path $RegPath -Name "UninstallString" -Value $UninstallString -Type String
Set-ItemProperty -Path $RegPath -Name "NoModify" -Value 1 -Type DWord
Set-ItemProperty -Path $RegPath -Name "NoRepair" -Value 1 -Type DWord

Write-Host "Installation completed successfully!" -ForegroundColor Green
Write-Host "Created Desktop and Start Menu shortcuts." -ForegroundColor Gray

if (-not $NoLaunch) {
    Write-Host "Launching $AppName..." -ForegroundColor Cyan
    Start-Process -FilePath $TargetExe
}
