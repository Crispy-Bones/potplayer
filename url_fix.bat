@echo off
setlocal enabledelayedexpansion

:: 获取传入的完整 URL（去掉双引号）
set "input=%~1"

:: 将 http// 替换为 http://
set "fixed=!input:http//=http://!"

:: 启动 PotPlayer 并传递修复后的 URL
start "" "D:\APP\PotPlayer\PotPlayerMini64.exe" "!fixed!"

exit /b 0
