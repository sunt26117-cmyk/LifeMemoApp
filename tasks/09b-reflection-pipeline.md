# T09b 反思生成管线

依赖：T04（AI 层）、T05（校验器）、T06（检索）、T09a。
本任务是全系统最关键的纯逻辑模块。

## 产出

### 1. lib/models/generation_result.dart

```dart
enum GenerationOutcome { passed, needsManualConfirm, aiError }

class AttemptRecord {
  final int attemptNo;      // 1..3
  final String rule;        // V0..V5
  final String detail;
}

class ReflectionGenerationResult {
  final GenerationOutcome outcome;
  final ReflectionSummary? summary;   // passed 时非空
  final String? lastRawOutput;        // needsManualConfirm 时非空
  final List<AttemptRecord> attempts;
}
2. lib/services/reflection_service.dart
class ReflectionService {
  ReflectionService({required this.reflectionAi, required this.validator});

  Future<ReflectionGenerationResult> generate({
    required ReflectionDraft draft,
    required ContextPack pack,
  });

  Future<String> saveReflection({
    required ReflectionDraft draft,
    required ReflectionSummary summary,
    required Set<String> selectedMemoryIds,
    required Set<String> selectedPhotoIds,
    required bool userConfirmedPath,
  });
}
3. generate 流程（严格按此伪码实现，不得偏离）
prompt = prompts.reflection(draft, pack；pack 四类皆空时相关段写「无相关上下文」)
for attempt in 1..3:
  try:
    summary = reflectionAi.generate(prompt)   // 已解析为 ReflectionSummary
  catch AiParseException:
    记 AttemptRecord(attempt, "V0", "输出无法解析为JSON") → 重试
  catch 网络类异常（T04 定义的网络异常类型，以 lib/ai/ 实际命名为准）:
    return aiError   // 不消耗校验次数，attempts 不记录
  v = validator.validate(summary, pack)
  if v.passed: return passed(summary, attempts)
  记录 v.violations 为 AttemptRecord
  if attempt < 3:
    prompt += "\n\n上一次输出存在以下违规，必须全部修正后重新输出：\n"
            + 每条一行 "- [V2] 黑名单词：性格"
return needsManualConfirm(lastRawOutput = 第三次原始输出文本, attempts)
4. 保存语义（写库规则）
relatedMemoryIds = summary.citations.memoryIds ∪ selectedMemoryIds
relatedPhotoIds  = summary.citations.photoIds ∪ selectedPhotoIds
is_user_confirmed = userConfirmedPath，且仅以下两条路径允许传 true：
① 3 次校验失败后用户人工确认保存
② 用户编辑过 AI 输出后保存
自动通过且未编辑 → false
ai_summary 列存 summary.toJson()
5. UI 接入（替换 T09a 的禁用按钮）
provider 增加 generate()：editing → callingAi（转圈）→ 三种终态
passed → 立即 saveReflection 落库 → 进入结果展示（T09c 实现前
先临时用 SnackBar 显示 eventSummary，T09c 接管，TASKS-LOG 记录）
needsManualConfirm → 人工确认界面：
顶部黄色警告条：「AI 输出未通过安全校验（违规：{attempts 去重后的规则号列表}），请人工确认后保存」
六段可编辑表单：最后输出可解析 → 预填；不可解析 → 留空 + 折叠区展示原始输出供参考
citations 强制清空（违规输出的引用不可信），related 仅来自用户勾选
[确认保存]（userConfirmedPath=true）[放弃]（回编辑页，不落库）
aiError → 红色提示 + [重试] 回 callingAi
测试 test/services/reflection_service_test.dart
（mocktail mock reflectionAi，禁止真实网络；用例先全部写好再实现）
首次合规 → passed；ai 与 validator 各恰好调用 1 次
首次 V2 违规、二次合规 → passed；ai 调用 2 次；
第二次收到的 prompt 包含 "V2"
三次违规 → needsManualConfirm；attempts 长度 3；
lastRawOutput = 第三次原始文本
AiParseException 后二次合规 → passed，attempts[0].rule == "V0"
网络异常 → aiError；attempts 为空；ai 恰好调用 1 次
空 ContextPack → 第一次 prompt 相关段含「无相关上下文」
saveReflection：citations{m1} + 勾选{m2} → 落库 related 含 m1、m2
saveReflection：userConfirmedPath=true → is_user_confirmed=true
重试 prompt 违规行格式为 "- [V2] ..."（mock capture 验证）
三次均 V0 → needsManualConfirm（解析失败同样走满三次）
Provider 测试
editing → callingAi → passed / needsManualConfirm / aiError 状态流转；
aiError.retry() 回到 callingAi
验证
flutter analyze 0 issues；flutter test 全绿；本任务新增测试 ≥ 12 条
