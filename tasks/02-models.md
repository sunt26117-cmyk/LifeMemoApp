# T02 数据模型

按 AGENTS.md §9.6 的表结构，在 lib/models/ 创建：
- memory.dart / photo.dart / reflection.dart
- reflection_summary.dart（对应 §9.1 Schema + citations）
- task.dart（含 List<TaskStep> steps、TaskFeedback feedback、sourceReflectionId）
- summary.dart（含 chartData Map<String,dynamic>）
- trend.dart / theme.dart
- context_pack.dart（四类列表，每条 {id,title,date,tags}）
- task_prefill.dart（T09c 使用，title/description/sourceReflectionId/defaultCategory）

统一要求：构造函数命名参数；fromJson/toJson 往返一致；copyWith；
枚举字段用 fromString 解析。JSON 键用 snake_case 对应数据库列名。

## 测试（test/models/）
每个模型：完整字段 round-trip、含空数组的 round-trip，≥2 用例/模型

## 验证
flutter analyze + flutter test 全绿
