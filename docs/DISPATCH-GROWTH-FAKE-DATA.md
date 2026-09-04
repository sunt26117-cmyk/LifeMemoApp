# 派单：成长曲线页面移除模拟假数据（改用真实数据注入 + 空态）

> 给 Claude/Copilot 的实现指南。开工前先读真实文件，禁止臆造 API/类名/字段名。
> 只改 1 个文件：lib/screens/growth/growth_curve_screen.dart（当前 244 行）。

## 背景与问题（用户 2026-09-04 报告）
- 用户在「成长曲线」页看到 4 个月的数据，但他刚使用，不应有任何成长历史。
- 根因：页面内置了写死的模拟序列 `_buildDemoSeries()`（15 周假完成率 0.60→0.90），
  被 month 聚合后显示成 4 个月曲线——这是交付时的占位假数据，用户误以为是自己的真实数据。
- 要求：**页面不得内置/展示任何模拟假数据**。没有真实数据就显示空态引导。

## 任务要求（逐条）
1. 删除 `_demoSeries` 字段与 `_buildDemoSeries()` 方法（含其中 TODO 注释与假 rates 数组）。
2. 构造函数改为可注入真实序列：`const GrowthCurveScreen({super.key, this.series})`，
   `final List<GrowthUpdateResult>? series;`（可选）。无参构造 `const GrowthCurveScreen()`
   仍必须可用（设置页 lib/screens/settings/settings_screen.dart:205 目前用无参构造，无需改设置页）。
3. state 里用 `widget.series ?? const <GrowthUpdateResult>[]` 作为数据源，删除 initState 中生成假数据的调用。
4. 无数据（series 为空/未传）时：图表区显示空态引导（图标 + 「还没有成长数据」+ 
   「坚持打卡、完成任务后，这里会按周/月/年显示你的成长曲线。」中文文案，参考现 UI 风格），
   「AI 分析」按钮置灰禁用（onPressed: null），点击不触发 AI 请求。
5. 有真实数据时：原有 周/月/年 SegmentedButton + 平滑曲线 + AI 分析 逻辑保持不变，只把数据源从假序列换成注入序列。
6. 聚合/AI 分析等纯逻辑层（lib/utils/growth_aggregation.dart、lib/ai/growth_ai.dart、
   test/utils/growth_aggregation_test.dart、test/ai/growth_ai_test.dart）**不要动**——
   它们的测试用模拟序列验证纯函数是合法的，与页面假数据无关。
7. 不要在本次引入任何 GrowthState 持久化/仓库/Supabase 表——真实数据链路未实现，
   属于后续任务；本页面保持"由外部注入"的接口形态即可（文件头注释写明：真实序列将由后续任务按期计算注入）。

## 必须一字不差使用的现有 API（先读这些文件）
- lib/growth/growth_engine.dart：`enum TaskDifficulty {easy,normal,hard}`、
  `enum GrowthDirection {up,down,flat}`、`class GrowthState`（score/lastCompletionRate/
  consecutiveImproveStreak/consecutiveDeclineStreak/consecutivePerfectStreak）、
  `class GrowthUpdateResult { GrowthState newState; double delta; GrowthDirection direction; }`、
  `class GrowthEngine` 的 computeNext/computeSeries。
- lib/utils/growth_aggregation.dart：`enum AggregationView {week,month,year}`、
  `class GrowthDataPoint { String label; double score; }`、
  `List<GrowthDataPoint> aggregateGrowthSeries(List<GrowthUpdateResult>, AggregationView)`。
- lib/ai/growth_ai.dart：`class GrowthAi { Future<Map<String,dynamic>> generateGrowthAnalysis({required List<double> scores, required List<String> labels}) }`。
- lib/ai/ai_client.dart：`on AiException` 捕获网络/AI 错误（页面已有该处理模式，保留）。
- 颜色：AppColors.mutedIcon / AppColors.primary / Colors.grey（lib/constants/app_colors.dart）。
- fl_chart 0.66.2：LineChart/LineChartBarData(isCurved:true)/FlSpot——现有渲染代码保留即可。

## 反例（禁止）
- 禁止再写任何内置假数据/示例序列/演示数据到页面或构造函数默认值。
- 禁止臆造不存在的类：没有 GrowthRepository/GrowthStateRepository/GrowthProvider——不要新建或 import。
- 禁止修改 lib/utils/growth_aggregation.dart 或 lib/ai/growth_ai.dart 或任何测试文件。
- 禁止改 pubspec.yaml / 引入新依赖。
- 禁止把数据源改成从本地文件/随机数生成。

## 验收（你本地自测后报告）
- `flutter analyze` 0 issues（0 error 0 warning 0 info）。
- `flutter test` 全绿（现有 265 个测试，含 growth_aggregation/growth_ai 的用例不应受影响）。
- 交付内容：完整新文件 lib/screens/growth/growth_curve_screen.dart（非 diff）+ 改动说明。

## 交付格式
- 完整文件输出（不是 diff），从 `// lib/screens/growth/growth_curve_screen.dart` 注释头开始。
- 落地前自查：无 @@ 残留、无 UI 伪影、无占位包名、文件行数合理。
