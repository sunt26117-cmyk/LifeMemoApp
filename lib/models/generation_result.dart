// lib/models/generation_result.dart
import 'package:ai_life_recorder/models/reflection_summary.dart';

/// 生成结果的可能输出状态
enum GenerationOutcome { passed, needsManualConfirm, aiError }

/// 单次尝试记录
class AttemptRecord {
  final int attemptNo;
  final String rule;
  final String detail;

  AttemptRecord({
    required this.attemptNo,
    required this.rule,
    required this.detail,
  });

  Map<String, dynamic> toJson() => {
        'attemptNo': attemptNo,
        'rule': rule,
        'detail': detail,
      };

  @override
  String toString() =>
      'AttemptRecord(attemptNo:$attemptNo, rule:$rule, detail:$detail)';
}

/// 反思生成最终结果封装
class ReflectionGenerationResult {
  final GenerationOutcome outcome;
  final ReflectionSummary? summary;
  final String? lastRawOutput;
  final List<AttemptRecord> attempts;

  ReflectionGenerationResult({
    required this.outcome,
    this.summary,
    this.lastRawOutput,
    List<AttemptRecord>? attempts,
  }) : attempts = attempts ?? [];
}
