# T07 记忆功能

## 产出
- lib/providers/memory_provider.dart：列表、tag/关键词过滤、保存、摘要状态(无/生成中/成功/失败可重试)
- screens/memory/：列表页（倒序+标签 Chip 筛选+搜索框）、编辑页（标题可选/正文必填/标签多选+自定义）、
  详情页（原文+可编辑 aiSummary+删除二次确认）
- 保存流程：先写库 → 异步 memoryAi 摘要 → 回填；失败不阻塞，显示重试按钮
- widgets/tag_input_widget.dart：可复用标签输入组件（文本输入+回车添加+chip 展示+点击删除），
  T08/T09a 复用

## 测试
Provider 状态流转单测（保存→生成中→成功/失败）；表单校验（空正文禁提交）
的 widget test（InMemory repo）

## 验证
flutter analyze + flutter test 全绿
