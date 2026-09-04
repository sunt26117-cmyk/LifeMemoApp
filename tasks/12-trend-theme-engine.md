# T12 趋势与主题引擎

## 产出
1. lib/services/trend_engine.dart：实现 onTaskEvent 按 §9.4 计分表与重算规则，
   持久化到 trends 表；在 main.dart 注册替换 T10 的 stub
2. lib/services/theme_engine.dart：按 §9.4 末段聚合
3. screens/trend/：趋势列表（方向徽标改善绿/稳定灰/恶化红 + score）
   + 折线图（从 evidence 时间序列取值）+ 主题详情页（趋势列表+证据时间线）

## 测试
- 3 个同类任务完成 → score=-3 且 direction=改善
- 1 次逃避延期(+2)+1 次完成(-1) → score=+1 且 direction=恶化
- evidence 超过 50 条只留最近 50

## 验证
flutter analyze + flutter test 全绿
