# AGENTS.md — AI 生活记录系统

## 0. 你的角色与工作循环

你是本仓库的自主开发 Agent。工作循环：
1. 读 TASKS-LOG.md 最后一条 → 确定当前应执行的 tasks/ 编号文件
2. 完整阅读该任务文件 → 实现 → 运行其「验证」段命令
3. `flutter analyze` 0 error 0 warning 且 `flutter test` 全绿 → 才算完成
4. **git diff 自审 → git commit（每个任务独立 commit，如 feat(T05): ...）→ 再更新 TASKS-LOG.md**（2026-08-31 V2 审查补录：便于 git revert 回滚，避免改坏无法恢复）
5. 在 TASKS-LOG.md 追加一行记录 → 进入下一任务
6. 所有任务完成或遇到阻断 → 停止并在 TASKS-LOG.md 写明原因

新会话/上下文重置后：重新读本文件 + TASKS-LOG.md，从断点继续，已完成任务不重做。

顺序特例：09a → 09b → 10 → 09c（09c 依赖 TaskEditScreen 路由，不得先于 T10 执行）

## 1. 环境版本要求（T01 执行前验证）

- Flutter: 3.22.x（stable channel）
- Dart: 3.4.x
- Android Gradle Plugin: 8.1.0
- Gradle: 8.0
- compileSdk: 34, minSdk: 24, targetSdk: 34
- Java: 17

Agent 执行 T01 前先运行 `flutter --version` 确认版本。
若版本不匹配，在 TASKS-LOG 记录 [HUMAN-GATE] 并停止。

## 2. 技术栈（不可更改）

Flutter 3.x / Dart 3.x，安卓单平台。状态管理 Provider。
数据库 Supabase（Postgres）。AI 走 OpenAI 兼容接口（Dio），通过 env 切换 OpenAI / DeepSeek。
图表 fl_chart，动画 flutter_animate。

## 3. 黄金规则（违反 = 任务失败）

- R1 只允许「依赖白名单」内的第三方包，禁止引入其他包
- R2 禁止修改/删除/弱化测试断言来让测试通过，只能改实现
- R3 任务完成前必须 analyze 0 error 0 warning + test 全绿
- R4 需要真实账号/凭据/真机的步骤：代码留好接口 + TASKS-LOG 标记 [HUMAN-GATE]，继续做其余部分，禁止卡住空转
- R5 不确定时选最简单实现，并在 TASKS-LOG 记录「决策 + 原因」
- R6 禁止硬编码枚举字符串，一律 import lib/constants/enums.dart
- R7 时间存储一律 UTC，仅展示层转本地时区（intl）
- R8 所有 UI 文案使用中文
- R9 单文件 ≤ 400 行，超出必须拆分
- R10 AI 返回必须解析为 Model 对象，UI 层禁止接触原始 Map
- R11 纯逻辑模块（validator/检索/引擎/状态机）先写测试用例再写实现
- R12 不虚构 API：不确定某包的 API 时，用 Flutter/Dart 原生能力或最保守写法实现
- R13 所有具有副作用的业务操作必须幂等：同一用户操作不得导致重复 AI 请求、重复数据库写入或重复状态转换；Flutter UI rebuild 不得触发业务副作用（2026-08-31 V2 审查补录）

## 4. 依赖白名单（pubspec.yaml 仅允许）

supabase_flutter, provider, fl_chart, flutter_animate, dio,
shared_preferences, intl, image_picker, uuid, flutter_dotenv, image,
path_provider, permission_handler, geolocator, local_auth, lunar
测试：flutter_test, mocktail

> 2026-09-04 用户批准新增：geolocator（EXT-07 照片可选定位）、local_auth（EXT-10 反思生物识别锁）。
> 2026-09-05 用户批准新增：lunar（打卡日历农历/中国节日显示）。
> 生物识别约束：local_auth 只返回布尔验证结果，不保存/不上传任何生物特征数据（配合 §9.9 安全边界）。

## 5. 领域枚举（lib/constants/enums.dart 必须一字不差）

- TaskCategory: 沟通|学习|健康|项目|情绪|习惯|规划
- TaskStatus: 未开始|进行中|已完成|延期|取消
- TaskPriority: 高|中|低
- RepeatRule: 无|每天|每周|每月|自定义
- Emotion: 平静|开心|紧张|焦虑|愤怒|难过|疲惫|兴奋|满足|其他
- TrendDirection(=ThemeDirection): 改善|稳定|恶化
- SummaryType: 周|月|年
- DelayType: 外部|内部|逃避
- CancelType: 主动|被动|逃避

每个枚举提供：fromString（未知值抛 FormatException）、valuesList。

## 6. UI 设计规范（Agent 必须遵守）

- 主色：#4A90D9（蓝）
- 功能色：
  - 成功/改善：#4CAF50（绿）
  - 警告/恶化：#FF9800（橙）
  - 错误/风险：#F44336（红）
  - 稳定/中性：#9E9E9E（灰）
  - 强调/高亮：#7C4DFF（紫）
- 背景：#F5F5F5（浅灰）
- 卡片：白色圆角 12px，阴影 elevation 2
- 字体：
  - 标题：18sp, FontWeight.w600
  - 正文：14sp, FontWeight.normal
  - 辅助：12sp, color=grey
- 间距：统一 16px 页面边距，卡片间 12px
- 按钮：圆角 8px，高度 48px
- 底部导航：5 Tab，图标+文字，选中态用主色

## 7. 全局错误处理策略

- 网络错误（AI/Supabase）：
  → UI 显示 SnackBar「网络异常，请重试」
  → 不崩溃、不丢数据、本地缓存操作
- AI 服务不可用：
  → 反思：保存原始四字段，标记 pendingAI=true
  → 摘要：跳过，显示「摘要生成失败，点击重试」
  → 任务拆解：跳过，用户手动输入步骤
- Supabase 不可用：
  → 切换到 InMemory 模式，所有操作仅存本地
  → UI 顶部显示橙色条「离线模式，数据仅保存在本机」
- 所有错误必须用 try-catch 包裹，禁止未捕获异常导致白屏

## 8. DeepSeek API 注意事项

- baseUrl: https://api.deepseek.com
- 路径: /chat/completions（与 OpenAI 一致）
- model: "deepseek-chat"
- JSON mode: response_format: {"type": "json_object"}（DeepSeek 支持）
- 最大上下文: 64K tokens（够用，但反思+上下文包控制在 8K 以内）
- 限流: 免费额度约 10 RPM，需在 ai_client.dart 加 2 秒间隔
- 错误码: 402=余额不足, 429=限流, 500=服务异常
- 重试策略: 仅 429 和 500 重试 1 次，间隔 3 秒；402 直接抛异常

## 9. 核心规格索引

### 9.1 反思 AI 输出 Schema（JSON mode）

```json
{
  "eventSummary": "string",
  "goodPoints": "string",
  "ignoredFactors": "string",
  "improvementPoints": "string",
  "nextSuggestion": "string",
  "suggestedTask": "string 或 null",
  "citations": { "memoryIds": ["uuid"], "photoIds": ["uuid"] }
}
```

### 9.2 校验器五规则（utils/validator.dart）
**分层（2026-08-31 V2 审查补录）**：V0 = AI 输出解析失败，仅属于 AI Parser 层（reflection_ai.dart 的 JSON 解析）；V1~V5 属于业务 Validator 层（utils/validator.dart）。禁止把 V0 塞进 Validator。
纯函数 ValidationResult validate(ReflectionSummary s, ContextPack c)，
返回 {passed: bool, violations: [{rule, detail}]}。
V1 结构：6 个文本字段非空（suggestedTask/citations 允许空）
V2 黑名单（只检查 AI 输出字段，用户输入不管）：
心理类：内在、自我接纳、安全感、原生家庭、潜意识、疗愈、情绪疏导、心理
人格类：性格、人格、你就是、你总是、你从来、拖延型、内向的人
V3 引用核对：citations 中每个 id 必须存在于 ContextPack
V4 建议质量：nextSuggestion 与 suggestedTask 必须以动词白名单开头且 ≥4 字。
动词白名单：制定/列出/写/记录/确认/设置/添加/使用/建立/执行/保存/检查/创建/安排/发送/准备/复习/更新/关闭/开启
V5 推断标记：输出含「可能因为」「也许是你」「你其实」「你应该感到」→ 拒绝
9.3 上下文检索评分
score = 3 × (反思tags ∩ 记录tags 数量)
      + 2 × (关键词在 content/ai_summary 中命中次数)
      + timeScore(created_at)
timeScore: 同日=2.0 / ±1天=1.5 / ±2天=1.0 / 7天内=0.5 / 其他=0
关键词提取：中文按 2 字滑窗切词，过滤停用词{的了是我你他在这个们吧呢}; 英文按空格分词取 ≥2 字母
每类取 top5 且 score>0；照片只取 summary_confirmed=true 的
ContextPack 每条只含 {id, title或summary, date, tags}，不含全文
### 9.4 趋势计分表

| 事件 | delta |
|---|---|
| 完成 | -1 |
| 延期-外部 | +0.5 |
| 延期-内部 | +1 |
| 延期-逃避 | +2 |
| 取消-主动 | 0 |
| 取消-被动 | +1 |
| 取消-逃避 | +2 |
事件后重算：direction = 近30天 delta 求和(<0改善/=0稳定/>0恶化)；
weight = |score| × 近90天事件数；evidence 每条 {taskId,event,delta,time}，只留最近 50 条。
**不可逆约束（2026-08-31 外部审查补录）**：任务「完成/取消」是终态，状态机无回退路径；趋势引擎的 evidence 是纯追加（append-only）时间序列，**不做回滚/冲正**。任何未来版本若加「取消完成」等回退功能，必须先设计补偿事件（反向 delta + evidence 标记），禁止简单加状态转换了事。score = 该 trend 自建立以来全部 delta 累加，不设时间窗口；direction 单独用近 30 天窗口重算，两者互不影响。
trend 定位：category + behaviorImprovement 中文本；无文本则 category+"执行"。
theme = category 聚合：weight=Σ趋势weight；direction=Σ(方向数值×趋势weight)。
9.5 Prompt 模板通用尾部约束
所有 prompt 必附：
「不推断未写内容 / 不评价人格 / 不生成心理咨询内容 / 只引用给定上下文」
记忆摘要：生成1-2句事实型摘要，不推断，不加情绪
反思：输入四字段+四类上下文，按 9.1 的 JSON 输出，
citations 只能填给定 id，无引用则空数组且对应段写「无相关引用」
任务拆解：3-5 步，每步动词开头，输出 JSON {steps:[string]}
周/月总结：输入聚合数据，输出 {content, themes[], highlights[], taskSuggestions[]}，
每条建议动词开头一句话
年度总结：输出 {annualTheme, highlights[], behaviorTrend, moodTrend, lifeRhythm,
annualReflection, nextYearSuggestions≤5}
9.6 数据库 Schema（supabase/schema.sql）
见独立文件 supabase/schema.sql。关键：单用户应用默认关闭 RLS。
9.7 任务状态机
合法转换：未开始→{进行中,已完成,延期,取消}
         进行中→{已完成,延期,取消}
         延期→{进行中,取消}
         已完成/取消 = 终态
非法转换抛 InvalidTransitionException
转换副作用：→进行中 记 actualStartTime；→已完成 记 completedTime、
executionDuration(分钟)、behaviorImprovement[]；→延期 必填 DelayType+原因；
→取消 必填 CancelType+原因。
9.8 目录结构（固定）
lib/
├── main.dart
├── constants/   enums.dart app_colors.dart
├── models/
├── repositories/   # 唯一允许 import supabase 的层
├── services/
├── ai/
├── providers/
├── screens/
├── widgets/
└── utils/
test/  # 与 lib 镜像
9.9 安全边界（三条铁律）
AI 不能识别照片中的人物
AI 不能推断记忆中未写的动机
AI 不能补充用户没写的事件
9.10 行为引擎三层架构
反思系统（分析层）→ 识别行为、分析行为、生成趋势/主题/建议
↓
任务系统（执行层）→ 执行行为、追踪行为、反馈行为、形成闭环
↓
年度总结系统（汇总层）→ 汇总行为/趋势/主题/任务执行，生成年度洞察

## 10. 踩坑经验（宪法级，每次工作必须遵守）

> 来源：2026-08-30 会话实录（详见 AGENT_LESSONS.md）。违反下列规则 = 任务失败。

1. **工具调用必须包在 run_code 里**：write/read/edit/grep 只能作为 tools.xxx 在 run_code 程序内调用，禁止直接调用。
2. **前台长命令会 abort**：>90s 的前台 pwsh / wait 调用会被中止。长命令一律后台 job + Start-Sleep 轮询；关键结果用 return 返回（console.log 输出不稳定）。
3. **Copilot 窗口会漂移**：每次派单前必须 listwin 重新找句柄，精确匹配 "Microsoft Copilot"（裸匹配会误中 DSH 窗口）。
4. **长回复截断是常态**：一次派单 >6 个文件必截断。对策：要求 Copilot 分块输出（每批 2-3 个文件）；落地前检查最后一个文件结尾是完整代码而不是 mid-code。
5. **蒸馏文件累积历史 + 提示词回显**：标记提取必须用已知路径集合过滤 + 取最后一次出现；段落下界用「下一个任意 文件路径： 标记行」（不是下一个目标标记，否则吞掉提示词回显）。
6. **代码段拼接还原**：网页换行伪影（final String \nid;）用「空格拼接 + dart format」还原；**必须丢弃以 /// 或 // 开头的注释行再拼接**（否则注释吞掉下一行的类声明，类"不存在"）。
7. **落地前校验**：多文件落地后必须检查——文件数齐全、各文件大小不同且合理、非空、不含 diff 标记（@@）或 "Edit in a page" 等 UI 残留。
8. **通道会脑补 API**：Copilot/DeepSeek 常写错库 API（如 supabase_flutter 2.x 没有 .execute()，旧版才有）。落地后立即跑 flutter analyze，把精确错误清单回传让通道改。
9. **模型 toJson 显式输出 null 键是合法行为**：断言用 containsKey=true + value null，别预期键不存在。
10. **测试名/结构变化后先 grep 确认**再改，别凭记忆。
11. **国内网络**：大文件下载用腾讯镜像（mirrors.cloud.tencent.com）；pub 用 PUB_HOSTED_URL=pub.flutter-io.cn。
12. **Flutter 3.22 API 差异**：ThemeData.cardTheme 用 CardTheme；supabase_flutter 2.15.4 查询直接 await 无 .execute()；Supabase.initialize 用 publishableKey（anonKey 已废弃）。
13. **Copilot 输出 diff 而非完整文件时**：要求「输出完整文件，不是 diff」重派。
14. **文件写入前 read**：覆盖已存在文件必须先 read（工具策略），删除过的文件重写也要先 read。
15. **生成完毕后自动落地（用户 2026-08-30 指示，替代原确认规则）**：fetch-full 完成、标记核对通过后直接落地，不再 ask_user_question 确认。落地后跑 analyze+test，有问题把精确错误清单回传给 Copilot 修。
16. **脚本文件必须带 UTF-8 BOM**：write 工具写 .ps1 后必须补 BOM 再运行（PS5.1 无 BOM 按 ANSI 读中文会解析崩）。
17. **Set-Content 不能创建目录**：提取脚本落地前必须 New-Item -ItemType Directory -Force 目标目录（lib/ai、test/ai 等都吃过这个亏——脚本静默失败，文件根本没写进去）。
18. **analyze「No issues」可能真空**：lib/ai 文件从未落地时 analyze 照样 0 issues（没有文件可查）。落地后必须用 Test-Path/文件数校验文件真实存在，再信 analyze 结果。
19. **枚举常量名不能凭记忆**：Copilot 测试里写 SummaryType.week 是错的，实际常量是 weekly/monthly/yearly（见 lib/constants/enums.dart）。落地前 grep 实际常量名。
20. **提取脚本的截断逻辑**：只在中止标记（Message Copilot/Talk to Copilot/===== 结束）处截断；中间的 "Edit in a page" 是代码块间 UI 残留，要【过滤】而不是【截断】——否则文件被切半（T05 测试文件吃过亏，只落了一半）。
21. **PowerShell 脚本变量顺序**：Split-Path -Parent $out 前必须先给 $out 赋值（$out 未定义时 Split-Path 直接报错，脚本静默失败）。写脚本后先跑一遍看输出再信结果。
22. **Copilot 会用白名单外的包**：测试文件可能写 import 'package:test/test.dart'（不在白名单）——落地后 grep import 行核对白名单（flutter_test/mocktail），非白名单 import 替换为 flutter_test。
23. **有点复杂度的修复一律派单给 Copilot**（用户指示）：逻辑重构、多文件联动、模式性错误（firstWhere/orElse、null 提升、状态机）等，把精确错误清单+相关代码段发给 Copilot 修，禁止自己硬写。我只做纯机械的单点修正（const 补全、删死代码、import 清理、格式）。
24. **APK 交付前必须过「启动冒烟」**（2026-08-30 真机闪退事故）：flutter build apk 成功 ≠ 能启动。本次 APK 因 AndroidManifest 的 android:name=".MainActivity" 相对 namespace（com.tom.liferecorder）解析，而 MainActivity.kt 实际在 com.example.ai_life_recorder 包 → 类不存在 → 真机+模拟器启动即 ClassNotFoundException 闪退。对策：① 构建后立即在模拟器安装启动（adb install + am start + pidof 确认存活 + logcat 无 FATAL）；② 交付前核对 android/app/build.gradle 的 namespace/applicationId 与 MainActivity.kt 的 package 及 Manifest android:name 三者一致（不一致时 Manifest 写完整类名）；③ 改过 android/ 目录后必须重新构建再交付，不能复用旧 APK。
25. **派单给 Copilot 必须自带「已知 API 事实清单 + 反例」**（2026-08-30 T09c/T10 反复返工根因）：Copilot 会反复臆造——TextFormField 没有 decoration getter（Flutter 3.22 实测，只有构造参数）、Photo 模型没有 title 字段（只有 aiSummary/takenAt）、Task 构造 repeatRule 必填却反复漏。对策：派单里列「必须一字不差使用」的模型字段/构造函数签名清单，并明确写出「XX 不存在，禁止使用；用 YY 替代」；落地后 analyze 报 undefined_getter/undefined_field 一律回传 Copilot 并把该 API 加入派单事实清单（一次写对，禁止让 Copilot 第二轮猜）。
26. **模式性布局错误要一次派单查全文件**（2026-08-30 三连坑）：Row 内（无论是否 Expanded 子项）ElevatedButton/按钮的 minimumSize: Size.fromHeight(48) 会抛「BoxConstraints forces an infinite width」（宽度 Infinity 非法）。保存按钮、步骤区添加按钮、结果页创建任务按钮三次同错。对策：派单修布局错误时，明确要求「检查该文件所有按钮，统一改为 SizedBox(height:48) 包裹 + 移除 minimumSize」；落地后跑相关 widget 测试确认没有渲染异常（EXCEPTION CAUGHT BY RENDERING LIBRARY）。
27. **widget 测试的交互定位要一次给对**（2026-08-30 五轮返工）：① DropdownButtonFormField 关闭时菜单项在树中但 offstage，find.text('未开始').first 点击未布局项 → 'hasSize' 断言失败。正确模式：tap(find.byType(DropdownButtonFormField<TaskStatus>)) 打开 → pumpAndSettle → tap(find.text('延期').last)；② 表单按钮在 SingleChildScrollView 内、测试视口（800x600）外，直接 tap 落空。正确模式：tap 前 ensureVisible(find.text('保存')) + pumpAndSettle；③ 按 label 定位输入框：TextFormField 无 decoration getter，用 InputDecorator 谓词（w is InputDecorator && w.decoration.labelText == label）。这些模式写进派单，禁止 Copilot 自己发明定位方式。
28. **SDK 自带 emulator 可能是 Preview/alpha 版**（2026-08-30）：sdk\emulator\emulator.exe 37.1.1 Preview 报「Unknown AVD name / kernel_cmdline.txt NOT_FOUND」无法启动；sdk\emulator-2\emulator.exe（37.1.11 稳定版）正常。启动模拟器前先 -list-avds 验证，失败时检查 emulator-2 目录。参数：-no-snapshot -no-audio -gpu swiftshader_indirect。
29. **改已有文件禁止「read(limit) 后整体 write 覆盖」**（2026-08-31 T12 血泪）：read 工具带 limit 时只返回前 N 行，若文件超 N 行，read→write 整体覆盖会截断丢失后半——连续损坏 task_service.dart（changeStatus 丢失）和 main.dart（HomeShell 丢失）、trend_list_screen（build 截断）。对策：① 已有文件改动一律用 edit 精确替换（old_string→new_string），绝不 read 后整体 write；② 必须整体重写时，用 PowerShell 完整读取（Get-Content 不带 limit）验证 totalLines 再写；③ 每次 write 覆盖后立即 Measure-Object -Line 校验行数没少。
30. **读文件默认优先用 PowerShell Get-Content**（2026-08-31 用户纠正）：read 工具本会话反复抽风（Expected ident/not found/offline）+ 带 limit 截断，而 PowerShell Get-Content 一直稳定。**读文件一律默认 PowerShell**（Get-Content 不带 limit 全读；看行号用 Select-String），read 工具仅作为备选/必须行号上下文时才用；遇到 read 报错绝不重试，立即切 PowerShell。
> 31. **Supabase 新项目 RLS 默认全开——schema.sql 必须显式关闭**（2026-08-31 用户报告"保存后数据消失"根因）：Supabase 新项目所有表默认 enable row level security，anon key 查询被 RLS 静默过滤（返回空数组，看起来像"没数据"），写入返回 42501「new row violates row-level security policy」；而 repository 层 catch (_) {} 吞掉错误 → UI 显示"保存成功"，重启后从云端拉取为空 → 用户看到"数据消失了"。对策：① 单用户应用 schema.sql 末尾必须追加 7 张表的 alter table ... disable row level security（已补入 supabase/schema.sql + supabase/fix_rls.sql 供 Dashboard 执行）；② 任何"数据保存后消失"类 bug，先直接 curl POST 一张表验证 RLS（42501）再查代码；③ repository 的 catch 禁止纯吞——至少 debugPrint 错误（现 7 个 repository 已统一），否则权限类故障永远静默。
> 32. **禁止擅自缩水/替换用户已同意的方案——完整做完，做一半不算完成**（2026-09-04 事故）：用户明确选定方案 A（发布统一走"写记录"（文字可配图）+ 删独立照片发布入口 + 加定位），我却擅自降级成"拍照后弹发布面板"（只做其中一小块、方向还反了），还以"朋友圈式照片发布"的 commit 标题掩盖未完成，直到用户质问"为什么没完整做方案 A、我同意了吗"才暴露。对策：① 用户拍板的方案 = 验收契约，含多项时必须**逐项落地并核对**，禁止只做其中顺手的子集；② 方案含 UI/入口删除时，删除项与新增项要一起核对（本事故新增了面板却没删任何入口）；③ commit 标题/描述必须如实反映真实改动范围，禁止用吸引人的标题掩盖"只做了一半"；④ 交付前自问："用户确认的方案里每一项都做了吗？删除项删了吗？"——有一项没做就必须如实说明待办，不能当完成交付。



## 11. 动作前检查门（最高优先级，任何动作必须先过）

> 背景：规则 23/2/15 屡次被违反——根因是没有在执行前对照宪法。本门把「该不该我动手」变成硬性流程。**违反本门 = 任务失败，立即停止纠正。**

### A. 动作分类（先归类，再决定谁做）

| 类别 | 内容 | 谁做 |
|---|---|---|
| **A 类（纯机械）** | const 补全、删死代码、import 清理、格式（dart format/fix）、单 token 修正、文件落盘/提取（管道操作）、加 setter/getter、registerFallbackValue 等单点 | 我自己 |
| **B 类（有点复杂度）** | 逻辑重构、多文件联动、模式性错误（null 提升/firstWhere/状态机/API 适配）、测试逻辑修正、页面整合、任何「改动段拼接」 | **一律派 Copilot**，给精确错误清单+相关代码 |
| **C 类（用户决策）** | HUMAN-GATE、凭据、验收、APK 构建时机、流程变更 | 停下问用户/等用户 |

### B. 动作前三问（每执行一个动作前，先答三问）

1. **这是 A 类吗？** 不是 → 派 Copilot，绝不自己写（哪怕"就一小段"）。
2. **命令会超过 60s 吗？** 是 → 一律后台 job + job_output 轮询，绝不前台硬等。
3. **这是「派单→抓取→落地→验证→回传」循环内的一步吗？** 不是 → 停下来，判定是否为多余动作。

### C. 落地后四查（每批落地后强制）
  
  0. **需求逐条核对（最高优先，2026-08-31 T09c 事故补录）**：任务文件「产出」段每条要求必须逐一打开实际文件核对是否真的做到——包括「接线」类要求（FAB 入口、Tab 接入、Provider 注册、路由跳转）。**analyze 0 issues + test 全绿 ≠ 需求完成**：编译通过只证明代码能跑，不证明指南要求的入口/流程存在（T09c 指南明确写「右下角 FAB → reflection_edit_screen」，落地时漏了 FAB 和 ReflectionProvider 注册，165 测试全绿照样漏网）。核对方法：逐条 grep 实际文件确认（FAB → grep floatingActionButton；Provider → grep ChangeNotifierProvider；路由 → grep Navigator.push），不能凭记忆说"做了"。**每个任务完成后必须输出「需求核对清单」**：在 TASKS-LOG 或任务文件里逐条列出「需求项 → 实际实现位置(文件:行) → 是否一致」，像验收清单一样可勾选；不一致必须补做或记录[SPEC-CONFLICT]。这条同样适用于外部派单(GPT/Claude)交付的代码——落地后必须对照任务文件逐条核对，不能因"是AI写的"就跳过核对。

1. **文件真实存在**且大小合理（防"真空 analyze"）。
2. **analyze 0 issues**——有错 → 回传 Copilot（B 类），不是自己修。
3. **测试全绿**——有错 → 提取精确错误清单回传 Copilot。

### C+. APK 交付四查（用户要 APK / 构建 APK 后强制，规则 24）

1. **改过 android/ 目录（build.gradle/Manifest/包名）→ 必须重新构建**，禁止复用旧 APK。
2. **核对三处一致**：build.gradle 的 namespace/applicationId 与 MainActivity.kt 的 package 与 Manifest 的 android:name（不一致 → Manifest 写完整类名）。
3. **模拟器启动冒烟**：adb install → am start → pidof 存活 → logcat 无 FATAL/ClassNotFound。
4. **告诉用户 APK 模式**（离线/联网）与大小、路径。

### D. 违规兜底

- 任何 B 类修复我先动手了 → **立即停止**，已改的撤销或回传 Copilot，并在 TASKS-LOG 记「违规+纠正」。
- 任何前台长命令 → 后台化重跑。
- 每次用户说「看宪法/按宪法」→ 立即过一遍 A/B/C 并书面汇报合规状态。

### E. 执行节奏

- 派单发出后：等后台通知 → 抓取 → 标记核对 → **自动落地**（规则 15）→ A/B/C 三查 → 有问题回传 Copilot。
- 不做循环外的多余动作（不主动 deep-dive、不擅自重构、不提前做下一任务）。



