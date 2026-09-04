# 派单：TASK-EXT-06（成长曲线）+ TASK-EXT-10（反思生物识别锁）

> 给独立 AI 的实现指南。开工前必须读真实代码，禁止臆造 API 名/字段名/类名。
> 两个任务独立，可分开交付。只允许使用 pubspec 白名单内依赖（见下）。

## 通用红线（必须遵守）
- 不引入白名单外包：当前白名单 = supabase_flutter/provider/fl_chart 0.66.2/flutter_animate ^4.5.2/dio/shared_preferences/intl/image_picker/uuid/flutter_dotenv/image/path_provider/permission_handler；测试 = flutter_test/mocktail。**local_auth 不在白名单**（EXT-10 需要它，见该节说明）。
- 时间存储一律 UTC（R7）；UI 文案全中文（R8）；单文件 ≤400 行（R9）；纯逻辑先测后写（R11）。
- supabase 查询直接 await，无 .execute()（2.x API）。
- 枚举常量名/类名必须照抄下面事实清单，禁止发明（如 SummaryType 值是 weekly/monthly/yearly 不是 week/month）。
- 布局按钮禁用 minimumSize: Size.fromHeight(48)（Row 内无限宽崩溃），用 SizedBox(height:48) 包裹。

---

## TASK-EXT-06｜成长曲线可视化（周/月/年）+ AI 自然语言成长分析

### 需求（拆解文档 §21-§25）
1. 三档视图：周（近若干周坡度曲线）、月（每周成长状态连成曲线）、年（每月成长状态连成曲线）。
2. 视觉 = **平滑坡度曲线**（LineChart isCurved:true）。明确禁止：热力图/GitHub 打卡图风格/多线堆叠折线图/坐标轴刻度密集的数据后台风格。
3. 新增方法把 GrowthScore 序列转自然语言分析（走现有 AI 调用链，不新建一套）。语气温和、不做心理诊断、不用「你今天落后了」类压力文案（§39 文案原则）。

### 已落地可复用（EXT-05 已完成，文件真实存在，先读）
文件：`lib/growth/growth_engine.dart`（纯逻辑，无 IO）
- `enum TaskDifficulty { easy, normal, hard }`（extension baseRewardMultiplier: 0.8/1.0/1.3）
- `enum GrowthDirection { up, down, flat }`
- `class GrowthAlgorithmConfig`（全参数集中，const 默认值）
- `class GrowthState { double score; double? lastCompletionRate; int consecutiveImproveStreak; int consecutiveDeclineStreak; int consecutivePerfectStreak; }` + `GrowthState.initial()` + copyWith
- `class GrowthUpdateResult { GrowthState newState; double delta; GrowthDirection direction; }`
- `class GrowthEngine { const GrowthEngine([config]); GrowthUpdateResult computeNext({required GrowthState previousState, required double completionRate, double? difficultyMultiplier}); List<GrowthUpdateResult> computeSeries({required GrowthState initialState, required List<double> completionRates, List<double?>? difficultyMultipliers}); }`
- 注意：GrowthState/result 目前**无 toJson/fromJson**，若要持久化需自行加（保持 UTC）。

### 本任务需新增（建议，可自拟合理结构但命名贴近现有）
- 聚合纯函数（放 `lib/utils/` 或 `lib/growth/`，**先写测试**）：输入一段按周/月产出的 GrowthUpdateResult 序列，输出周/月/年三个档位的 (label, score) 点列。聚合语义：周视图取最近 N 周每周期末 score 或 delta 累计（自定并注释理由）；月视图 = 该月各周合并为一点；年视图 = 该年各月合并为一点。测试只断言聚合正确性与边界（空序列/不足 12 月等）。
- 页面 `lib/screens/growth/growth_curve_screen.dart`（或相近命名）：SegmentedButton 切 周/月/年，fl_chart LineChart(isCurved:true) 单条线渲染点列。禁止密集网格与多线。数据源先支持「模拟序列」演示（测试要求就是喂模拟 GrowthScore 序列），真实持久化接线若不确定留 TODO 注释并说明，不要臆造仓库接口。
- AI 分析：在 `lib/ai/` 加一个角色文件（参考 summary_ai.dart 的结构），方法签名风格：`Future<Map<String,dynamic>> generateGrowthAnalysis({required List<double> scores, required List<String> labels})`；prompt 常量加到 `lib/ai/prompts.dart`（参考 summaryPrompt，字符串模板可含中文），必须拼接现有 `safetyTail` 常量；输出严格 JSON {analysis: string}；**严禁压力文案**。

### AI 调用链事实（照抄，禁止新造）
- `lib/ai/ai_client.dart`：`class AiClient { AiClient({Dio? dio, String? baseUrl, String? apiKey, String? model}); Future<String> chat({required String systemPrompt, required String userPrompt, bool jsonMode}) }`；异常体系 AiException/AiNetworkException/AiApiException/AiKeyMissingException/AiParseException；`extractJson(String)` 在 ai_client.dart:148 是顶层函数。
- 现有角色参考：`lib/ai/summary_ai.dart` `class SummaryAi { final AiClient client; Future<Map<String,dynamic>> generate({required SummaryType type, required Map<String,dynamic> aggregate}) }`——新角色照此结构（try chat → extractJson → json.decode → 字段校验 → 归一化）。
- Prompt 参考 `lib/ai/prompts.dart`：现有 `safetyTail` 常量 L6；各 prompt 均为 `String xxxPrompt({...}) => '''...'''` 拼接 `$safetyTail`。
- main.dart 注册模式（参考现有 SummaryAi/AnnualService 的 Provider 注入）：`AiClient(apiKey: KeyStore.instance.apiKey)`，KeyStore 在 lib/services/key_repository.dart。不要在代码里硬编码 key。
- 页面入口可选：设置页 `lib/screens/settings/settings_screen.dart` 已有 `ListTile(title: Text('打卡类型管理')...)` 跳转模式（L162-178），照此加一条「成长曲线」入口；或首页快捷卡。选择后所有 UI 文案中文。

### 测试要求（test/ 镜像目录）
- 模拟 GrowthScore 序列喂入聚合函数：周/月/年聚合正确；边界（空序列、单点）。
- AI 分析：mock AiClient 返回合法 JSON → 断言非空、不含压力词黑名单（如「落后」「失败」「你应该更努力」等，自拟黑名单）。不断言具体文字。mock 抛异常 → 断言走 AiException 分支（页面/方法不崩溃）。
- mocktail 用真实 inMemory 或 mock（参考 test/services/ 现有文件），自定义类型需 registerFallbackValue。

---

## TASK-EXT-10｜反思功能生物识别锁

### 需求（拆解文档 §34）
- 进入「反思」入口前调用系统生物识别（`local_auth`），成功才进入，失败不进入。
- 不自制指纹 UI，不保存任何生物特征数据。

### 现状事实（必须先读这些文件）
- 「反思」入口现状（无独立 tab，反思从首页进）：
  - `lib/screens/home/home_screen.dart` L736 附近：`Navigator.push(builder: (_) => ReflectionListScreen(...))`（首页某区块/按钮进反思列表）。
  - `lib/screens/reflection/reflection_list_screen.dart` L249：列表页 FAB → `ReflectionEditScreen()`。
  - 反思详情/编辑跳转链：reflection_list → reflection_edit（新建）；reflection_detail → reflection_edit（编辑，L46）。
- 需求只锁「进入反思的入口」——实现时选一个**主入口**（建议：凡是新开一条反思的编辑入口 ReflectionEditScreen 新建路径，或首页进反思列表前）做鉴权，并在注释说明覆盖范围；历史查看/编辑旧反思是否需要锁可自行判断并在注释写明决策（不确定就写疑问注释，不要猜）。
- 现有页面跳转全部用 `Navigator.push(MaterialPageRoute(builder: (_) => XxxScreen(...)))`，无命名路由表。

### ⚠️ 关键阻断：local_auth 不在依赖白名单
- 宪法 R1：只允许白名单内第三方包，禁止引入其他包。local_auth 需要**用户先批准加入白名单**（pubspec + AGENTS.md 白名单两处都要改）。
- 因此交付时：① 代码按 local_auth 写（import 'package:local_auth/local_auth.dart'），但**不要擅自改 pubspec 加依赖**——标注 [HUMAN-GATE: 待用户批准加入白名单后执行 flutter pub add local_auth]；② 提供可测试的抽象（如 `abstract class BiometricGate { Future<bool> authenticate(); }` + `LocalAuthBiometricGate` 实现 + 测试用假实现），这样 mock 测试不需要真实 local_auth。

### 测试要求
- mock 生物识别返回失败 → 页面不跳转（仍在原页面/弹提示）。
- mock 返回成功 → 正常跳转进入反思。
- 用抽象 gate + 假实现测，不要依赖真机指纹。

---

## 交付格式要求
- 完整文件输出（不要 diff）；新建文件从路径注释头开始（`// lib/xxx.dart`）。
- 落地前自查：文件数与声明一致、无 @@ 或 UI 残留、无占位包名。
- 附：改动文件清单 + analyze/test 自测结果。
