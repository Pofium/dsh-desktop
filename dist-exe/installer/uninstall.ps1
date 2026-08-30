# DeepSeek Harness — Windows 10/11 Uninstaller
$AppName = 'DeepSeek Harness'
$InstallDir = Join-Path $env:LOCALAPPDATA "Programs\$AppName"

Write-Host "Uninstalling $AppName..." -ForegroundColor Yellow

# 1. Stop running processes
Get-Process -Name "DeepSeek Harness", "electron" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Milliseconds 500

# 2. Remove Desktop and Start Menu Shortcuts
$DesktopPath = [Environment]::GetFolderPath('Desktop')
$DesktopLnk = Join-Path $DesktopPath "$AppName.lnk"
if (Test-Path $DesktopLnk) {
    Remove-Item $DesktopLnk -Force -ErrorAction SilentlyContinue
}

$StartMenuPath = [Environment]::GetFolderPath('Programs')
$StartMenuLnk = Join-Path $StartMenuPath "$AppName.lnk"
if (Test-Path $StartMenuLnk) {
    Remove-Item $StartMenuLnk -Force -ErrorAction SilentlyContinue
}

# 3. Remove Registry Entry
$RegPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\DeepSeekHarness"
if (Test-Path $RegPath) {
    Remove-Item -Path $RegPath -Recurse -Force -ErrorAction SilentlyContinue
}

# 4. Remove Installation Files
# Self-delete batch command scheduled to delete folder after script finishes
$TempBatch = Join-Path $env:TEMP "dsh-clean-uninstall.cmd"
$CleanupCmd = @"
@echo off
timeout /t 1 /nobreak >nul
rmdir /s /q "$InstallDir" 2>nul
del "%~f0" 2>nul
"@
Set-Content -Path $TempBatch -Value $CleanupCmd -Encoding ASCII
Start-Process -FilePath "cmd.exe" -ArgumentList "/c `"$TempBatch`"" -WindowStyle Hidden

Write-Host "$AppName has been successfully uninstalled from your computer." -ForegroundColor Green
