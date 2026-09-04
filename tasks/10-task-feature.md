# T10 任务系统

## 产出
1. lib/services/task_service.dart：状态机严格按 §9.7 + 副作用记录 +
   onTaskEvent 回调接口（本期注册一个只打日志的 stub，T12 替换为趋势引擎）
2. screens/task/：列表页（状态 Tab + 分类筛选 + 优先级排序）、
   TaskEditScreen（12 字段 + steps 编辑器 + 支持外部预填 prefillTask 参数不落库）、
   AI 拆解按钮（task_ai）
3. TaskEditScreen 必须支持路由参数接收：didChangeDependencies 取
   ModalRoute.of(context).settings.arguments，若为 TaskPrefill
   （lib/models/task_prefill.dart，T09c 创建）→ 预填 title/description/
   sourceReflectionId/defaultCategory；预填本身不落库，仅用户点保存才写库
4. 状态变更表单：延期必选 DelayType+原因；取消必选 CancelType+原因；
   完成时展示自动计算的 executionDuration + behaviorImprovement 多行输入

## 测试
状态机全表测试（所有合法转换成功 + 至少 4 条非法转换抛异常）；
延期未选类型提交被拒；预填数据不落库验证

## 验证
flutter analyze + flutter test 全绿
