# T09c 反思卡片、历史列表与任务跳转

依赖：T09a、T09b、T10 全部完成（需 TaskEditScreen 路由）。

## 产出

### 1. lib/models/task_prefill.dart

```dart
class TaskPrefill {
  final String title;               // suggestedTask 原文
  final String description;         // 来源反思的 eventSummary
  final String sourceReflectionId;
  final TaskCategory defaultCategory; // tags 与 TaskCategory 匹配，无匹配 → 规划
}
2. widgets/reflection_card.dart
六段固定顺序子卡片：事件总结 / 做得好的地方 / 可能忽略的因素 /
可以改进的地方 / 下次建议 / 建议创建的任务（每段固定图标 + 标题 + 正文）
suggestedTask == null → 第六段整段不渲染
引用区：记忆、照片两组，每条一行「标题或摘要 + 日期」，
点击 → Navigator 跳记忆/照片详情（复用 T07/T08 路由）；
两组皆空 → 灰字一行「本次反思未引用其他记录」
构造参数：ReflectionSummary + related 明细列表 + 可选 onEdit
3. screens/reflection/reflection_result_screen.dart
ReflectionCard 为主体
底部操作区：
[创建任务]：仅 suggestedTask != null 时渲染 →
Navigator.pushNamed('/task_edit', arguments: TaskPrefill(...))
[重新生成]：回编辑页并保留草稿
[完成]：返回列表
数据流：T09b 生成 passed 时已落库；本页只读展示；
[创建任务] 仅跳转预填，绝不自动建任务（用户控制原则）
4. screens/reflection/reflection_list_screen.dart + detail
倒序列表：eventSummary 首行 + emotion chip + 日期 +
is_user_confirmed=true 时灰色小标「人工确认」
点击 → reflection_detail_screen：
上半：用户原始四字段（只读）；下半：ReflectionCard + [创建任务]
5. Tab 接线
反思 Tab 占位页 → reflection_list_screen；
右下角 FAB → reflection_edit_screen
测试
Widget：
fixture 六段渲染齐全且顺序正确；suggestedTask=null → 第六段不存在
引用区 2 条记忆 → 2 行可点（mock NavigatorObserver 验证目标路由）
[创建任务] 仅 suggestedTask 非空时存在；点击携带 TaskPrefill 参数
列表 3 条 → 3 卡；「人工确认」徽标只出现在标记项
集成：
passed → 落库恰好 1 次 upsert；点 [创建任务] 不产生第二次 upsert
验证
flutter analyze 0 issues；flutter test 全绿
