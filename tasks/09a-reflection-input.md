# T09a 反思输入与上下文侧栏

依赖：T01~T06、T07 已完成。
执行顺序：T09a → T09b → T10 → T09c（见 AGENTS.md §0 特例）

## 产出

### 1. 草稿模型 lib/models/reflection_draft.dart

```dart
class ReflectionDraft {
  final String eventDescription;   // 必填
  final String? emotion;           // Emotion 枚举值或 null（不填）
  final String? actionTaken;
  final String? result;
  final List<String> tags;
  bool get isValid => eventDescription.trim().length >= 2;
}
2. Provider lib/providers/reflection_provider.dart
状态机：
enum ReflectionEditState { editing, searching, contextLoaded,
                           contextEmpty, error }
updateDraft(...) → editing
searchContext()：
draft.isValid 为 false → 抛 StateError，不发请求
数据来源窗口：记忆/照片/总结取近 90 天；任务取全部未完成 + 近 30 天已完成
调 utils/context_retrieval.dart 的 buildContextPack
有结果 → contextLoaded；无结果 → contextEmpty；异常 → error
勾选管理：selectMemory(id)/deselectMemory(id)、照片同理
（Set<String>
reset() 清空全部字段与勾选
3. 页面 screens/reflection/reflection_edit_screen.dart
四字段多行输入；「发生的事」为空或 1 字时两个按钮均禁用
情绪下拉：默认「不填」+ Emotion.valuesList
标签：复用 widgets/tag_input_widget.dart
「查找相关」按钮 → searchContext
侧栏（LayoutBuilder：宽屏右侧面板 / 窄屏底部抽屉）：
四分组：相关记忆/照片/任务/总结，组标题带数量徽标
条目卡片：title 或 summary 首行 + 日期 + 标签 chips + 勾选框
点卡片 → 底部弹层展示完整信息（不改变勾选状态）
「生成反思」按钮：本任务渲染为禁用态，下方灰字「生成功能将在下一任务启用」
（T09b 负责移除灰字并接通）
contextEmpty → 侧栏灰字「未找到相关记录，可直接生成反思」
测试 test/providers/reflection_provider_test.dart
eventDescription 空/1字 → isValid=false，searchContext 抛 StateError
检索返回 2记忆+1照片 → contextLoaded，计数正确
全空 → contextEmpty
勾选/取消 → Set 正确增减
reset() → 全部清空
Widget 测试 test/screens/reflection_edit_screen_test.dart
必填为空 → 两按钮均禁用
注入 fixture ContextPack → 侧栏渲染标题与数量徽标
点勾选框 → selectedMemoryIds 变化
验证
flutter analyze 0 issues；flutter test 全绿（含 T07 回归测试）
