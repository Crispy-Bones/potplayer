' 获取传递给脚本的第一个参数
Set objArgs = WScript.Arguments
If objArgs.Count > 0 Then
    input = objArgs(0)
Else
    WScript.Quit
End If

' 将 http// 替换为 http://
fixed = Replace(input, "http//", "http://")

' 启动 PotPlayer 并传递修复后的 URL
Set objShell = CreateObject("WScript.Shell")
objShell.Run Chr(34) & "D:\APP\PotPlayer\PotPlayerMini64.exe" & Chr(34) & " " & fixed, 0
