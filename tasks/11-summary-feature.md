# T11 周/月总结

## 产出
1. lib/services/summary_service.dart：
   聚合周期内记忆(只取 aiSummary，≤30条)/照片(摘要)/反思/任务统计 →
   summary_ai 生成 → 落库（type=周|月）。输入超限必须截断。
2. screens/summary/：总结列表 + 详情页（fl_chart：标签柱状图 + 记录数折线图）
   + 每条 taskSuggestion 旁「创建任务」按钮 → 预填 TaskEdit

## 测试
聚合单测（固定 fixture：数量统计正确、截断生效、tag 计数正确）

## 验证
flutter analyze + flutter test 全绿
