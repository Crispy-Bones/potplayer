@echo off
setlocal enabledelayedexpansion

@REM 获取传入的完整 URL（去掉双引号）
set "input=%~1"

:: 记录原始输入到日志文件
@REM echo Original Input: !input! >> "D:\APP\PotPlayer\log.txt"

@REM 将 http// 替换为 http://
set "fixed=!input:http//=http://!"

@REM 将 %20 替换为空格
set "fixed=!fixed:%%20= !"

@REM 将 %22 替换为 "
set "fixed=!fixed:%%22="!"

:: 记录修复后的结果
@REM echo Fixed Output: !fixed! >> "D:\APP\PotPlayer\log.txt"

start "" "D:\APP\PotPlayer\PotPlayerMini64.exe" "!fixed!"
exit
