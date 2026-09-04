// lib/screens/reflection/reflection_edit_screen.dart
// 反思编辑页：输入草稿、检索上下文并选择相关记忆/照片
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:ai_life_recorder/providers/reflection_provider.dart';
import 'package:ai_life_recorder/models/context_pack.dart';
import 'package:ai_life_recorder/widgets/tag_input_widget.dart';
import 'package:ai_life_recorder/constants/enums.dart';
import 'package:ai_life_recorder/screens/reflection/reflection_confirm_screen.dart';
import 'package:ai_life_recorder/models/reflection.dart';

/// 反思编辑页面（新建或编辑已有反思）
class ReflectionEditScreen extends StatefulWidget {
  /// 非空 = 编辑模式：预填该反思四字段，保存时覆盖原记录（保留原 ID）
  final Reflection? existingReflection;

  const ReflectionEditScreen({super.key, this.existingReflection});

  bool get isEditMode => existingReflection != null;

  @override
  State<ReflectionEditScreen> createState() => _ReflectionEditScreenState();
}

class _ReflectionEditScreenState extends State<ReflectionEditScreen> {
  late TextEditingController _eventController;
  late TextEditingController _actionController;
  late TextEditingController _resultController;
  String? _selectedEmotion;

  @override
  void initState() {
    super.initState();
    final provider = context.read<ReflectionProvider>();
    final reflection = widget.existingReflection;
    if (reflection != null) {
      // 编辑模式：把已有反思同步进 Provider 草稿（编辑期间标签留空由用户重填）
      provider.loadReflectionIntoDraft(reflection);
    }
    _eventController =
        TextEditingController(text: provider.draft.eventDescription);
    _actionController =
        TextEditingController(text: provider.draft.actionTaken ?? '');
    _resultController =
        TextEditingController(text: provider.draft.result ?? '');
    _selectedEmotion = provider.draft.emotion;
  }

  @override
  void dispose() {
    _eventController.dispose();
    _actionController.dispose();
    _resultController.dispose();
    super.dispose();
  }

  void _syncEventToProvider(String v) {
    context.read<ReflectionProvider>().updateDraft(eventDescription: v);
  }

  void _syncActionToProvider(String v) {
    context.read<ReflectionProvider>().updateDraft(actionTaken: v);
  }

  void _syncResultToProvider(String v) {
    context.read<ReflectionProvider>().updateDraft(result: v);
  }

  void _onEmotionChanged(String? v) {
    setState(() {
      _selectedEmotion = v;
    });
    context.read<ReflectionProvider>().updateDraft(emotion: v);
  }

  Widget _buildTopInputArea(ReflectionProvider provider) {
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      elevation: 2,
      color: Colors.white,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Align(
              alignment: Alignment.centerLeft,
              child: Text('发生的事',
                  style: TextStyle(fontSize: 14, color: Colors.grey[800])),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _eventController,
              maxLines: 4,
              minLines: 4,
              decoration: const InputDecoration(
                hintText: '请简要描述发生的事件（至少 2 个字符）',
                border: OutlineInputBorder(),
                isDense: true,
                contentPadding: EdgeInsets.all(12),
              ),
              onChanged: _syncEventToProvider,
            ),
            const SizedBox(height: 12),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: DropdownButtonFormField<String?>(
                    value: _selectedEmotion,
                    decoration: const InputDecoration(
                      labelText: '情绪',
                      border: OutlineInputBorder(),
                      isDense: true,
                      contentPadding:
                          EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                    ),
                    items: [
                      const DropdownMenuItem<String?>(
                          value: null, child: Text('不填')),
                      ...Emotion.valuesList.map((e) =>
                          DropdownMenuItem<String?>(value: e, child: Text(e))),
                    ],
                    onChanged: _onEmotionChanged,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: TextField(
                    controller: _actionController,
                    maxLines: 2,
                    minLines: 2,
                    decoration: const InputDecoration(
                      labelText: '行动',
                      border: OutlineInputBorder(),
                      isDense: true,
                      contentPadding: EdgeInsets.all(12),
                    ),
                    onChanged: _syncActionToProvider,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: TextField(
                    controller: _resultController,
                    maxLines: 2,
                    minLines: 2,
                    decoration: const InputDecoration(
                      labelText: '结果',
                      border: OutlineInputBorder(),
                      isDense: true,
                      contentPadding: EdgeInsets.all(12),
                    ),
                    onChanged: _syncResultToProvider,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            TagInputWidget(
              initialTags: provider.draft.tags,
              hint: '添加标签（可选）',
              onChanged: (tags) => provider.updateDraft(tags: tags),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton(
                    onPressed: provider.draft.isValid
                        ? () async {
                            await provider.searchContext();
                          }
                        : null,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF4A90D9),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8)),
                      minimumSize: const Size.fromHeight(44),
                    ),
                    child: const Text('查找相关记忆/照片'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Container(
                    alignment: Alignment.center,
                    child: const SizedBox.shrink(),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildContextPanel(ReflectionProvider provider) {
    final state = provider.state;
    if (state == ReflectionEditState.editing) {
      return _buildEmptyHint('输入内容后点击「查找相关」以检索相关记忆、照片、任务与总结');
    } else if (state == ReflectionEditState.searching) {
      return const Center(child: CircularProgressIndicator());
    } else if (state == ReflectionEditState.contextEmpty) {
      return _buildEmptyHint('未找到相关记录，可直接生成反思');
    } else if (state == ReflectionEditState.error) {
      return _buildEmptyHint('检索失败，请重试', color: Colors.red);
    } else if (state == ReflectionEditState.contextLoaded) {
      final ContextPack pack = provider.pack!;
      return SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(8),
          child: Column(
            children: [
              if (pack.memories.isNotEmpty)
                _GroupSection(
                  title: '相关记忆',
                  items: pack.memories,
                  selectable: true,
                  isSelected: (id) => provider.selectedMemoryIds.contains(id),
                  onToggle: (id, checked) {
                    if (checked) {
                      provider.selectMemory(id);
                    } else {
                      provider.deselectMemory(id);
                    }
                  },
                ),
              if (pack.photos.isNotEmpty)
                _GroupSection(
                  title: '相关照片',
                  items: pack.photos,
                  selectable: true,
                  isSelected: (id) => provider.selectedPhotoIds.contains(id),
                  onToggle: (id, checked) {
                    if (checked) {
                      provider.selectPhoto(id);
                    } else {
                      provider.deselectPhoto(id);
                    }
                  },
                ),
              if (pack.tasks.isNotEmpty)
                _GroupSection(
                  title: '相关任务',
                  items: pack.tasks,
                  selectable: false,
                  isSelected: (_) => false,
                  onToggle: (_, __) {},
                ),
              if (pack.summaries.isNotEmpty)
                _GroupSection(
                  title: '相关总结',
                  items: pack.summaries,
                  selectable: false,
                  isSelected: (_) => false,
                  onToggle: (_, __) {},
                ),
            ],
          ),
        ),
      );
    } else {
      return const SizedBox.shrink();
    }
  }

  Widget _buildEmptyHint(String text, {Color? color}) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Text(text,
            style: TextStyle(fontSize: 14, color: color ?? Colors.grey[600])),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Builder(builder: (outerContext) {
      final watched = outerContext.watch<ReflectionProvider>();
      final provider = outerContext.read<ReflectionProvider>();
      final submitState = watched.submitState;
      final draft = watched.draft;
      final isSearching = watched.state == ReflectionEditState.searching;
      final canGenerate = draft.isValid && !isSearching;
      final isGenerating = submitState == ReflectionSubmitState.callingAi;

      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (submitState == null) return;
        if (submitState == ReflectionSubmitState.success) {
          ScaffoldMessenger.of(outerContext).showSnackBar(
            const SnackBar(
              content: Text('反思已保存', style: TextStyle(color: Colors.white)),
              backgroundColor: Colors.green,
            ),
          );
          provider.reset();
          return;
        }
        if (submitState == ReflectionSubmitState.needsManualConfirm) {
          final result = provider.lastResult;
          final draftCopy = provider.draft;
          final selectedMemoryIds = provider.selectedMemoryIds;
          final selectedPhotoIds = provider.selectedPhotoIds;
          provider.submitState = null;
          if (result != null) {
            Navigator.of(outerContext).push(
              MaterialPageRoute(
                builder: (_) => ReflectionConfirmScreen(
                  result: result,
                  draft: draftCopy,
                  selectedMemoryIds: selectedMemoryIds,
                  selectedPhotoIds: selectedPhotoIds,
                ),
              ),
            );
          }
          return;
        }
        if (submitState == ReflectionSubmitState.aiError) {
          ScaffoldMessenger.of(outerContext).showSnackBar(
            SnackBar(
              content:
                  const Text('生成失败', style: TextStyle(color: Colors.white)),
              backgroundColor: Colors.red,
              action: SnackBarAction(
                label: '重试',
                textColor: Colors.white,
                onPressed: () {
                  provider.retryGenerate();
                },
              ),
            ),
          );
          provider.reset();
          return;
        }
      });

      return Scaffold(
        appBar: AppBar(
          title: Text(widget.isEditMode ? '编辑反思' : '新建反思'),
          backgroundColor: const Color(0xFF4A90D9),
          elevation: 0,
        ),
        backgroundColor: const Color(0xFFF5F5F5),
        body: LayoutBuilder(builder: (context, constraints) {
          final bool wide = constraints.maxWidth > 800;
          if (wide) {
            return Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(16),
                    child: Column(children: [
                      _buildTopInputArea(provider),
                      const SizedBox(height: 12),
                      ElevatedButton(
                        onPressed: canGenerate
                            ? () {
                                provider.generateReflection();
                              }
                            : null,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF4A90D9),
                          minimumSize: const Size.fromHeight(48),
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8)),
                        ),
                        child: isGenerating
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(
                                    strokeWidth: 2, color: Colors.white),
                              )
                            : const Text('生成反思'),
                      ),
                    ]),
                  ),
                ),
                Container(
                  width: 320,
                  padding: const EdgeInsets.all(16),
                  child: Card(
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12)),
                    elevation: 2,
                    child: SizedBox(
                        height: double.infinity,
                        child: _buildContextPanel(provider)),
                  ),
                ),
              ],
            );
          } else {
            return SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  _buildTopInputArea(provider),
                  const SizedBox(height: 12),
                  ElevatedButton(
                    onPressed: canGenerate
                        ? () {
                            provider.generateReflection();
                          }
                        : null,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF4A90D9),
                      minimumSize: const Size.fromHeight(48),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8)),
                    ),
                    child: isGenerating
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(
                                strokeWidth: 2, color: Colors.white),
                          )
                        : const Text('生成反思'),
                  ),
                  const SizedBox(height: 12),
                  Card(
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12)),
                    elevation: 2,
                    color: Colors.white,
                    child: SizedBox(
                        width: double.infinity,
                        child: _buildContextPanel(provider)),
                  ),
                ],
              ),
            );
          }
        }),
      );
    });
  }
}

class _GroupSection extends StatelessWidget {
  final String title;
  final List<ContextItem> items;
  final bool selectable;
  final bool Function(String id) isSelected;
  final void Function(String id, bool checked) onToggle;

  const _GroupSection({
    required this.title,
    required this.items,
    required this.selectable,
    required this.isSelected,
    required this.onToggle,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 8),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
          child: Row(
            children: [
              Text(title,
                  style: const TextStyle(
                      fontSize: 16, fontWeight: FontWeight.w600)),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFF4A90D9),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Text('\${items.length}',
                    style: TextStyle(color: Colors.white, fontSize: 12)),
              ),
            ],
          ),
        ),
        ...items.map((item) {
          final checked = isSelected(item.id);
          return Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
            child: _ContextItemCard(
              item: item,
              selectable: selectable,
              checked: checked,
              onChanged: (v) {
                onToggle(item.id, v ?? false);
              },
            ),
          );
        }),
      ],
    );
  }
}

class _ContextItemCard extends StatelessWidget {
  final ContextItem item;
  final bool selectable;
  final bool checked;
  final ValueChanged<bool?> onChanged;

  const _ContextItemCard({
    required this.item,
    required this.selectable,
    required this.checked,
    required this.onChanged,
  });

  String _subtitle() {
    if (item.title.isNotEmpty) return item.title;
    return item.tags.isNotEmpty ? item.tags.join(', ') : '';
  }

  String _formatDate(DateTime? d) {
    if (d == null) return '';
    return DateFormat('yyyy-MM-dd').format(d.toLocal());
  }

  void _showDetail(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(12)),
      ),
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.only(
            left: 16,
            right: 16,
            top: 16,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(item.title.isNotEmpty ? item.title : '详情',
                  style: const TextStyle(
                      fontSize: 18, fontWeight: FontWeight.w600)),
              const SizedBox(height: 8),
              Text(_formatDate(item.date),
                  style: TextStyle(fontSize: 12, color: Colors.grey[600])),
              const SizedBox(height: 12),
              if (item.tags.isNotEmpty)
                Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children:
                        item.tags.map((t) => Chip(label: Text(t))).toList()),
              const SizedBox(height: 12),
              Text('更多信息请在详情页查看。',
                  style: TextStyle(fontSize: 14, color: Colors.grey[700])),
              const SizedBox(height: 12),
              Align(
                alignment: Alignment.centerRight,
                child: TextButton(
                  onPressed: () => Navigator.of(ctx).pop(),
                  child: const Text('关闭'),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: () => _showDetail(context),
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          boxShadow: const [
            BoxShadow(
                color: Color(0x1F000000), blurRadius: 6, offset: Offset(0, 2))
          ],
        ),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(item.title.isNotEmpty ? item.title : _subtitle(),
                      style: const TextStyle(
                          fontSize: 14, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 6),
                  Text(_formatDate(item.date),
                      style: TextStyle(fontSize: 12, color: Colors.grey[600])),
                  const SizedBox(height: 8),
                  if (item.tags.isNotEmpty)
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: item.tags
                          .map((t) => Chip(
                              label: Text(t),
                              visualDensity: VisualDensity.compact))
                          .toList(),
                    ),
                ],
              ),
            ),
            if (selectable)
              Checkbox(value: checked, onChanged: onChanged)
            else
              const SizedBox(width: 24),
          ],
        ),
      ),
    );
  }
}
