// lib/screens/reflection/reflection_confirm_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:ai_life_recorder/models/generation_result.dart';
import 'package:ai_life_recorder/models/reflection_summary.dart';
import 'package:ai_life_recorder/models/reflection_draft.dart';
import 'package:ai_life_recorder/providers/reflection_provider.dart';

/// 人工确认页面
class ReflectionConfirmScreen extends StatefulWidget {
  final ReflectionGenerationResult result;
  final ReflectionDraft draft;
  final Set<String> selectedMemoryIds;
  final Set<String> selectedPhotoIds;

  const ReflectionConfirmScreen({
    super.key,
    required this.result,
    required this.draft,
    required this.selectedMemoryIds,
    required this.selectedPhotoIds,
  });

  @override
  State<ReflectionConfirmScreen> createState() =>
      _ReflectionConfirmScreenState();
}

class _ReflectionConfirmScreenState extends State<ReflectionConfirmScreen> {
  late TextEditingController _eventSummaryController;
  late TextEditingController _goodPointsController;
  late TextEditingController _ignoredFactorsController;
  late TextEditingController _improvementPointsController;
  late TextEditingController _nextSuggestionController;
  late TextEditingController _suggestedTaskController;

  @override
  void initState() {
    super.initState();
    final ReflectionSummary? s = widget.result.summary;
    _eventSummaryController =
        TextEditingController(text: s?.eventSummary ?? '');
    _goodPointsController = TextEditingController(text: s?.goodPoints ?? '');
    _ignoredFactorsController =
        TextEditingController(text: s?.ignoredFactors ?? '');
    _improvementPointsController =
        TextEditingController(text: s?.improvementPoints ?? '');
    _nextSuggestionController =
        TextEditingController(text: s?.nextSuggestion ?? '');
    _suggestedTaskController =
        TextEditingController(text: s?.suggestedTask ?? '');
  }

  @override
  void dispose() {
    _eventSummaryController.dispose();
    _goodPointsController.dispose();
    _ignoredFactorsController.dispose();
    _improvementPointsController.dispose();
    _nextSuggestionController.dispose();
    _suggestedTaskController.dispose();
    super.dispose();
  }

  ReflectionSummary _buildEditedSummary() {
    return ReflectionSummary(
      eventSummary: _eventSummaryController.text.trim(),
      goodPoints: _goodPointsController.text.trim(),
      ignoredFactors: _ignoredFactorsController.text.trim(),
      improvementPoints: _improvementPointsController.text.trim(),
      nextSuggestion: _nextSuggestionController.text.trim().isEmpty
          ? '无'
          : _nextSuggestionController.text.trim(),
      suggestedTask: _suggestedTaskController.text.trim().isEmpty
          ? null
          : _suggestedTaskController.text.trim(),
      citations: null,
    );
  }

  List<String> _dedupAttemptRules() {
    final Set<String> rules = {};
    for (final a in widget.result.attempts) {
      rules.add(a.rule);
    }
    return rules.toList();
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.read<ReflectionProvider>();
    final dedupRules = _dedupAttemptRules();
    return Scaffold(
      appBar: AppBar(
          title: const Text('人工确认反思'),
          backgroundColor: const Color(0xFF4A90D9)),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFF3E0),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  dedupRules.isEmpty
                      ? 'AI 输出需人工确认'
                      : 'AI 输出未通过安全校验（违规：${dedupRules.join(', ')}），请人工确认后保存',
                  style: const TextStyle(color: Color(0xFF6A4A00)),
                ),
              ),
              const SizedBox(height: 12),
              _buildSection('事件摘要', _eventSummaryController, hint: '对事件的简短总结'),
              const SizedBox(height: 8),
              _buildSection('做得好的地方', _goodPointsController, hint: '列出积极点'),
              const SizedBox(height: 8),
              _buildSection('被忽略的因素', _ignoredFactorsController,
                  hint: '可能影响结果但被忽略的因素'),
              const SizedBox(height: 8),
              _buildSection('改进点', _improvementPointsController, hint: '可改进之处'),
              const SizedBox(height: 8),
              _buildSection('下一步建议', _nextSuggestionController,
                  hint: '下一步可采取的建议'),
              const SizedBox(height: 8),
              _buildSection('建议任务（可选）', _suggestedTaskController,
                  hint: '可转为任务的建议'),
              const SizedBox(height: 12),
              if (widget.result.summary == null &&
                  (widget.result.lastRawOutput ?? '').isNotEmpty)
                ExpansionTile(
                  title: const Text('查看 AI 原始输出'),
                  children: [
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
                      color: Colors.grey[100],
                      child: Text(widget.result.lastRawOutput ?? ''),
                    ),
                  ],
                ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () async {
                        final edited = _buildEditedSummary();
                        await provider.confirmAndSave(editedSummary: edited);
                        if (!context.mounted) return;
                        Navigator.of(context).pop();
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF4A90D9),
                        minimumSize: const Size.fromHeight(48),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8)),
                      ),
                      child: const Text('确认保存', style: TextStyle(fontSize: 16)),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () {
                        Navigator.of(context).pop();
                      },
                      style: OutlinedButton.styleFrom(
                        minimumSize: const Size.fromHeight(48),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8)),
                      ),
                      child: const Text('放弃', style: TextStyle(fontSize: 16)),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSection(String label, TextEditingController controller,
      {String? hint}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label,
            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
        const SizedBox(height: 6),
        TextField(
          controller: controller,
          maxLines: null,
          decoration: InputDecoration(
            hintText: hint,
            filled: true,
            fillColor: Colors.white,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
            contentPadding: const EdgeInsets.all(12),
          ),
        ),
      ],
    );
  }
}
