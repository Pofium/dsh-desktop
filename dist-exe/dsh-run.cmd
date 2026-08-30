@echo off
rem Запуск dsh.exe (опционально с кастомным провайдером)
if "%DEEPSEEK_API_KEY%"=="" (
  echo Please set DEEPSEEK_API_KEY environment variable or in .env
)
rem set DEEPSEEK_API_KEY=your_deepseek_api_key_here
rem set DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
"%~dp0dsh.exe" %* > "%~dp0last-run.log" 2>&1
type "%~dp0last-run.log"
