# T13 年度总结

## 产出
1. lib/services/annual_service.dart：
   chart_data 构建（memoryTrend/photoTrend 按月计数；moodTrend 从
   reflections.emotion 按月计数；tagTrend 按月标签计数）→
   截断后调年度 AI（输出结构见 §9.5）→ 落库 type=年
2. screens/annual/：滚动五幕「封面→主题卡片→图表→亮点时间线→建议」
   - 封面：大年份 + 三行统计 + 渐变背景
   - 图表：复用 fl_chart（月度折线 ×2 + 情绪堆叠图 + 标签趋势）
   - 时间线：垂直节点 + 卡片
3. 动画（flutter_animate）：fadeIn 250ms delay 50ms / slideX 300ms
   decelerate / scale 0.95→1 200ms easeOutBack / 时间线竖线 AnimatedContainer
   + 卡片右侧滑入。MediaQuery.disableAnimations=true 时全部跳过，内容完整可读。
4. 主题卡片点击 → showModalBottomSheet 详情

## 测试
chart_data 构建单测（fixture 数据月度计数正确）；
widget test：五幕 section 均从 fixture 渲染出关键文案

## 验证
flutter analyze + flutter test 全绿
