### 简介
emby 自带的播放功能太简陋, 对 ass 字幕支持有限, 对 HDR, 杜比视界格式的视频解码有问题, 播放4K 视频卡顿掉帧等等.

EmbylaunchPot 是一款 emby 的播放插件, 支持在 emby 中调用本地的 PotPlayer 播放器. 原理是获取 emby 中视频和字幕的 URL, 通过浏览器打开 URL来启动 PotPlayer 来播放视频.

由于 emby, edge 浏览器以及 PotPlayer 的更新, 会出现视频无法播放, 标题显示乱码, 字幕无法加载等问题.
本文介绍此插件的安装以及相关问题的修复.

**注: 主脚本非本人原创, 只是在此基础上进行改动, 脚本中已包含原作者信息**

<img width="1178" height="408" alt="Pasted image 20250319153559" src="https://github.com/user-attachments/assets/b27c2c4c-1fcf-4677-85a4-5c95ae3273b1" />

### 1. 主脚本 externalPlayer .js
将主脚本 `externalPlayer .js` 放置在 emby 的安装目录下 `D:\APP\embyserver-win-x64-4.8.4.0\system\dashboard-ui` (根据实际的安装路径进行修改)

### 2. 修改 index. html
修改同目录下的 `index. html` 文件, 添加 externalPlayer .js, 使 emby 启动时能够加载脚本.
```html
    <script src="apploader.js" defer></script>
    <script src="externalPlayer.js" defer></script>
</body>
</html>
```

### 3. 向注册表中添加 potplayer 协议
双击 potplayer. reg 运行

**注: 每次 PotPlayer 更新都会覆盖此注册表, 因此更新后需要重新运行添加**

遗留问题: 如果将 potplayer 改为其他名称则会报错, 原因未知

### 4. 修复 URL 问题
完整的 URL 样例:
```
potplayer://http://localhost:8096/emby/videos/126006/The.Last.of.Us.S02.E07.Convergence.2160p.MAX.WEB-DL.DDP5.1.Atmos.DV.HDR.H.265-STC.mkv?api_key=6b6139a7968042eb95083c2aab6cbefc&Static=true&MediaSourceId=c27f8132bf5c144ba7458054b45de623 /sub=http://localhost:8096/emby/videos/126006/c27f8132bf5c144ba7458054b45de623/Subtitles/45/Stream.ass?api_key=6b6139a7968042eb95083c2aab6cbefc /current /seek=0:00
```
**URL 解析:**
1. `potplayer://` 指通过注册表中的 potplayer 协议来播放视频
2. `http://localhost...` 指 emby 中视频的 URL, 其中 `The.Last.of.Us...` 是要显示的视频标题, 原本视频标题是通过 `/title` 参数定义, 但是中文会乱码, 而且会连带显示后面的 `/seek` 参数, 因此移除
3. `/sub` 指 emby 的外挂字幕 URL
4. `/current` 指示 PotPlayer 使用当前打开的实例播放, 避免重复启动新窗口
5. `/seek=0:00` 设置初始播放位置为视频的 `0分0秒` (即从头开始播放), 该参数必须放在最后, 否则无法解析

#### 问题说明
使用 Chrome 内核130以上版本的浏览器在解析 URL 链接时, 会将 emby URL 中的 http:// 改为 http//, 导致视频无法播放.
<img width="1840" height="160" alt="屏幕截图 2025-05-29 193812" src="https://github.com/user-attachments/assets/873c8a5a-7a7a-4b70-becf-6df7a9cd440c" />
最新版本的 PotPlayer (ver.250514) 貌似解决了这个问题, 但是依然不能加载外挂字幕.

#### 解决方案
使用批处理文件`. bat `或 `vb` 脚本来修复 (此方案灵感来源于Reddit的帖子, 具体出处已不可考, 感谢原作者!)
- **批处理文件**
```batch
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

:: 更改为实际安装路径
start "" "D:\APP\PotPlayer\PotPlayerMini64.exe" "!fixed!"
exit
```
- **vb 脚本**
```visual basic
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

' 更改为实际安装路径
objShell.Run Chr(34) & "D:\APP\PotPlayer\PotPlayerMini64.exe" & Chr(34) & " " & fixed, 0
```
将 `url_fix.bat` 或 `url_fix.vbs` 放置在 `potplayer.reg` 中定义的路径下, 此处为 `D:\APP\PotPlayer`

<mark style="background: #FF5582A6;">注:</mark>  `potplayer.reg`  中的路径名称
```reg
# 使用 url_fix.bat
@="\"D:\\APP\\PotPlayer\\url_fix.bat\" \"%1\""

# 使用 url_fix.vbs
@="wscript \"D:\\APP\\PotPlayer\\url_fix.vbs\" \"%1\""
```
-  `.bat` 与 `.vbs` 的区别

使用 `.bat` 时, 每次启动都会打开命令行窗口, 一闪而过, 影响使用体验, 而 `.vbs` 则通过 0 参数隐藏了命令行窗口, 推荐使用.
当然也可以将 `.bat` 文件转换为 `.exe` 文件, 此处略过.

最后刷新emby客户端或网页即可出现PotPlayer播放器图标, 点击即可播放视频
