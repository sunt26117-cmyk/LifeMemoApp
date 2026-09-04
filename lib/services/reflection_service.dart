// lib/services/reflection_service.dart
import 'package:ai_life_recorder/ai/reflection_ai.dart';
import 'package:ai_life_recorder/models/reflection_draft.dart';
import 'package:ai_life_recorder/models/context_pack.dart';
import 'package:ai_life_recorder/models/reflection_summary.dart';
import 'package:ai_life_recorder/models/generation_result.dart';
import 'package:ai_life_recorder/utils/validator.dart';
import 'package:ai_life_recorder/ai/ai_client.dart';

/// 反思生成服务
class ReflectionService {
  final ReflectionAi reflectionAi;
  final ValidationResult Function(ReflectionSummary, ContextPack) validator;

  ReflectionService({
    required this.reflectionAi,
    required this.validator,
  });

  /// 生成反思摘要：最多尝试 3 次，违规时重试并附带违规说明
  Future<ReflectionGenerationResult> generate({
    required ReflectionDraft draft,
    required ContextPack pack,
  }) async {
    final List<AttemptRecord> attempts = [];
    String modifiedEventDescription = draft.eventDescription;
    String lastRawOutput = '';

    for (int attempt = 1; attempt <= 3; attempt++) {
      try {
        final ReflectionAiResult aiResult = await reflectionAi.generate(
          eventDescription: modifiedEventDescription,
          emotion: draft.emotion,
          actionTaken: draft.actionTaken,
          result: draft.result,
          tags: draft.tags,
          pack: pack,
        );
        final ReflectionSummary summary = aiResult.summary;
        lastRawOutput = aiResult.rawOutput;

        ValidationResult vResult;
        try {
          vResult = validator(summary, pack);
        } catch (e) {
          return ReflectionGenerationResult(
            outcome: GenerationOutcome.aiError,
            attempts: const [],
          );
        }

        if (vResult.passed) {
          return ReflectionGenerationResult(
            outcome: GenerationOutcome.passed,
            summary: summary,
            attempts: attempts,
          );
        }

        for (final violation in vResult.violations) {
          attempts.add(AttemptRecord(
            attemptNo: attempt,
            rule: violation.rule,
            detail: violation.detail,
          ));
        }

        if (attempt < 3) {
          final violationSummary =
              vResult.violations.map((v) => '${v.rule}:${v.detail}').join('; ');
          modifiedEventDescription =
              '${draft.eventDescription}（上次输出违规：$violationSummary）';
          continue;
        } else {
          return ReflectionGenerationResult(
            outcome: GenerationOutcome.needsManualConfirm,
            summary: summary,
            lastRawOutput: lastRawOutput,
            attempts: attempts,
          );
        }
      } on AiParseException catch (_) {
        attempts.add(AttemptRecord(
          attemptNo: attempt,
          rule: 'V0',
          detail: '输出无法解析为JSON',
        ));
        if (attempt < 3) {
          modifiedEventDescription =
              '${draft.eventDescription}（上次输出违规：V0 输出无法解析为JSON）';
          continue;
        } else {
          return ReflectionGenerationResult(
            outcome: GenerationOutcome.needsManualConfirm,
            lastRawOutput: '',
            attempts: attempts,
          );
        }
      } on AiException catch (_) {
        // AiNetworkException / AiApiException 等均为 aiError
        return ReflectionGenerationResult(
          outcome: GenerationOutcome.aiError,
          attempts: const [],
        );
      } catch (_) {
        return ReflectionGenerationResult(
          outcome: GenerationOutcome.aiError,
          attempts: const [],
        );
      }
    }

    return ReflectionGenerationResult(
      outcome: GenerationOutcome.aiError,
      attempts: const [],
    );
  }
}
