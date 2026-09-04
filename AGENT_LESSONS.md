# Agent 踩坑经验（2026-08-30 会话实录）

> 用途：后续会话的参考经验，避免重犯。每条都是本会话真实踩过的坑。

## 工具使用类
1. **所有工具调用必须包在 run_code 里**：write/read/edit/grep 不能直接调用，只能作为 tools.xxx 在 run_code 程序内调用（犯过 3+ 次）。
2. **变量名笔误**：r/job/test 混用导致 ReferenceError（犯过 2 次），返回前检查变量名。
3. **前台长命令会 abort**：>90s 的前台 pwsh / job_output(wait:true) 会被中止（"[object Object]"）。长命令一律后台 job + Start-Sleep 轮询文件/进程状态。
4. **run_code 内部 console.log 输出不稳定**：关键结果用 return 返回。

## 通道/派单类（Copilot 网页通道）
5. **窗口会漂移**：每次派单前必须 listwin 重新找 Copilot 窗口句柄（788320→460696），精确匹配 "Microsoft Copilot"。
6. **长回复截断是常态**：一次派单 >6 个文件时回复必然被截断（T03 在 summary_repository 中途截断，后 5 个文件全丢）。对策：超长任务要求 Copilot 分块输出（每批 2-3 个文件），落地前检查最后一个文件结尾是否完整代码（不是 mid-code）。
7. **蒸馏文件会累积所有历史回复 + 提示词回显**：标记提取必须用已知路径集合过滤 + 取最后一次出现；提示词里的「## 文件路径：xxx」占位符行会污染匹配。
8. **回复内容有网页换行伪影**（final String \nid;）：Dart 语法仍合法，用「空格拼接 + dart format」还原，不用逐行保留。
9. **落地前校验**：多个文件落地后检查——文件数齐全、各文件大小不同、非空。本次 5 个文件因标记缺失被写成同一份 29KB 垃圾并落地（灾难）。

## 项目/代码类
10. **模型 toJson 显式输出 null 键是合法行为**：测试断言别预期"键不存在"，应断言 containsKey=true + value null。
11. **Flutter 3.22 API 差异**：ThemeData.cardTheme 用 CardTheme（CardThemeData 是 3.27+ 才有）。
12. **T00 fixtures 依赖 T02 模型**：任务顺序 T01→T02→T00→T03（已在 TASKS-LOG 按 R5 记录）。
13. **测试名/结构变化后要用 grep 重新确认**：改 models_test 时旧测试名和预期不符导致替换失败，先 grep 实际名字再动手。

## 环境类
14. **国内网络**：googleapis/raw.githubusercontent 慢或不通，下载用腾讯镜像（mirrors.cloud.tencent.com，25MB/s）；pub 用 PUB_HOSTED_URL=pub.flutter-io.cn。
15. **flutter 命令连 github 检查会卡 21s**：无害，别当错误处理；输出重定向到文件再读，别用管道捕获。
16. **SDK 自带 emulator 可能是 Preview/alpha 版（37.1.1 Preview），无法识别 AVD/报 kernel_cmdline.txt 缺失**：sdk 目录里可能另有稳定版 emulator-2（37.1.11）。启动模拟器用 `sdk\emulator-2\emulator.exe -avd <name>`，不要用 sdk\emulator\emulator.exe。判断：`-list-avds` 报「Unknown AVD name」或「kernel_cmdline.txt NOT_FOUND」时先检查 emulator-2。
17. **AVD 名用 -list-avds 验证**：启动前先 `emulator.exe -list-avds` 确认名称（rhythm/tianxuan），避免拼写错误导致 Unknown AVD name。
18. **模拟器启动参数**：`-no-snapshot -no-audio -gpu swiftshader_indirect`（软件渲染，避免宿主 GPU 驱动问题）；AVD 配置 hw.gpu.enabled=no 时也 OK。启动后 `adb devices` 出现 `emulator-5554 device` 即为在线。
19b. **edit/write 工具写 .ps1 会丢 BOM**（2026-08-30 二次踩坑）：用 edit 工具改带 BOM 的 .ps1 后，文件变无 BOM → PS5.1 按 ANSI 读中文变乱码 → 解析报 "Missing closing '}'" 等假错误。任何 .ps1 修改后必须用 [System.IO.File]::WriteAllText($f, $c, (New-Object System.Text.UTF8Encoding $true)) 补 BOM + ParseFile 验证，再派单。
19. **APK 闪退 ClassNotFoundException: MainActivity**：AndroidManifest 的 `android:name=".MainActivity"` 相对 namespace 解析，若 namespace/applicationId（如 com.tom.liferecorder）与 MainActivity.kt 实际包（如 com.example.ai_life_recorder）不一致 → 类不存在 → 启动即闪退（真机+模拟器都崩）。修法：Manifest 写完整类名 `android:name="com.example.ai_life_recorder.MainActivity"`，或把 kt 移入匹配包。APK 包名查 `adb shell pm list packages | Select-String`；崩溃日志用 `adb logcat -d | Select-String FATAL`。
