// lib/screens/task/task_edit_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:uuid/uuid.dart';
import 'package:ai_life_recorder/models/check_in_type.dart';
import 'package:ai_life_recorder/models/task.dart';
import 'package:ai_life_recorder/models/task_prefill.dart';
import 'package:ai_life_recorder/repositories/repositories.dart';
import 'package:ai_life_recorder/providers/task_provider.dart';
import 'package:ai_life_recorder/ai/task_ai.dart';
import 'package:ai_life_recorder/ai/ai_client.dart';
import 'package:ai_life_recorder/constants/enums.dart';
import 'package:ai_life_recorder/services/key_repository.dart';

/// 任务编辑页面（新建或编辑）
class TaskEditScreen extends StatefulWidget {
  final Task? task;
  final TaskPrefill? prefill;

  const TaskEditScreen({super.key, this.task, this.prefill});

  @override
  State<TaskEditScreen> createState() => _TaskEditScreenState();
}

class _TaskEditScreenState extends State<TaskEditScreen> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _titleController;
  late TextEditingController _descriptionController;
  TaskCategory? _category;
  TaskPriority? _priority;
  TaskStatus _status = TaskStatus.todo;
  RepeatRule _repeat = RepeatRule.none;
  DateTime? _startTime;
  DateTime? _dueTime;
  DateTime? _reminderTime;
  int? _estimatedMinutes;

  DelayType? _delayType;
  CancelType? _cancelType;
  String? _statusReason;
  int? _executionMinutesInput;
  final TextEditingController _behaviorController = TextEditingController();

  List<TaskStep> _steps = [];
  final TextEditingController _stepInputController = TextEditingController();

  List<String> _checkInTypeIds = [];
  List<CheckInType> _enabledTypes = [];

  bool _isDecomposing = false;
  late TaskAi _taskAi;

  Task? _original;

  @override
  void initState() {
    super.initState();
    _loadCheckInTypes();
    _taskAi = TaskAi(client: AiClient(apiKey: KeyStore.instance.apiKey));
    _original = widget.task;
    _titleController = TextEditingController(
        text: widget.task?.title ?? widget.prefill?.title ?? '');
    _descriptionController = TextEditingController(
        text: widget.task?.description ?? widget.prefill?.description ?? '');
    _category = widget.task?.category ??
        widget.prefill?.defaultCategory ??
        TaskCategory.planning;
    _priority = widget.task?.priority ?? TaskPriority.medium;
    _status = widget.task?.status ?? TaskStatus.todo;
    _repeat = widget.task?.repeatRule ?? RepeatRule.none;
    _startTime = widget.task?.startTime;
    _dueTime = widget.task?.dueTime;
    _reminderTime = widget.task?.reminderTime;
    _estimatedMinutes = widget.task?.estimatedMinutes;
    _steps = widget.task?.steps != null
        ? List<TaskStep>.from(widget.task!.steps)
        : <TaskStep>[];
    _checkInTypeIds = widget.task?.checkInTypeIds.toList() ?? <String>[];
    final fb = widget.task?.feedback;
    _delayType = fb?.delayType;
    _cancelType = fb?.cancelType;
    _statusReason = fb?.reason;
    _executionMinutesInput = fb?.executionDurationMinutes;
    _behaviorController.text = fb?.behaviorImprovement.join('\n') ?? '';
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    _behaviorController.dispose();
    _stepInputController.dispose();
    super.dispose();
  }

  Future<void> _loadCheckInTypes() async {
    final types = await context.read<Repositories>().checkInTypes.listEnabled();
    if (!mounted) return;
    setState(() {
      _enabledTypes = types;
    });
  }

  bool get _isTitleValid => _titleController.text.trim().isNotEmpty;

  Future<DateTime?> _pickDateTime(BuildContext ctx, DateTime? initial) async {
    final date = await showDatePicker(
      context: ctx,
      initialDate: initial ?? DateTime.now(),
      firstDate: DateTime(2000),
      lastDate: DateTime(2100),
    );
    if (date == null || !ctx.mounted) return null;
    final time = await showTimePicker(
        context: ctx,
        initialTime: TimeOfDay.fromDateTime(initial ?? DateTime.now()));
    if (time == null) return DateTime(date.year, date.month, date.day);
    return DateTime(date.year, date.month, date.day, time.hour, time.minute);
  }

  List<TaskStep> _parseStepsFromStrings(List<String> lines) {
    return lines
        .where((s) => s.trim().isNotEmpty)
        .map((s) => TaskStep(content: s.trim(), done: false))
        .toList();
  }

  Future<void> _onDecompose() async {
    if (_titleController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('标题为空，无法使用 AI 拆解')));
      return;
    }
    setState(() => _isDecomposing = true);
    try {
      final res = await _taskAi.decompose(
          title: _titleController.text.trim(),
          description: _descriptionController.text.trim());
      setState(() {
        _steps = _parseStepsFromStrings(res);
      });
    } on AiKeyMissingException catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('请先在设置中填写 AI Key')));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('拆解失败，请手动输入')));
    } finally {
      setState(() => _isDecomposing = false);
    }
  }

  void _addStep() {
    final text = _stepInputController.text.trim();
    if (text.isEmpty) return;
    setState(() {
      _steps.add(TaskStep(content: text, done: false));
      _stepInputController.clear();
    });
  }

  Future<void> _onDelete() async {
    if (_original == null) return;
    final provider = context.read<TaskProvider>();
    final messenger = ScaffoldMessenger.of(context);
    final navigator = Navigator.of(context);
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          title: const Text('删除确认'),
          content: const Text('删除这个任务？'),
          actions: [
            TextButton(
                onPressed: () => Navigator.of(ctx).pop(false),
                child: const Text('取消')),
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(true),
              child: const Text('删除',
                  style: TextStyle(color: Colors.redAccent)),
            ),
          ],
        );
      },
    );
    if (confirm != true) return;
    try {
      await provider.delete(_original!.id);
      if (!mounted) return;
      messenger.showSnackBar(const SnackBar(content: Text('已删除')));
      navigator.pop();
    } catch (e) {
      debugPrint('删除任务失败: $e');
      if (!mounted) return;
      messenger.showSnackBar(const SnackBar(content: Text('删除失败，请重试')));
    }
  }

  Task _buildTaskForSave() {
    final id = _original?.id ?? const Uuid().v4();
    return Task(
      id: id,
      title: _titleController.text.trim(),
      description: _descriptionController.text.trim().isEmpty
          ? null
          : _descriptionController.text.trim(),
      category: _category ?? TaskCategory.planning,
      priority: _priority ?? TaskPriority.medium,
      startTime: _startTime,
      dueTime: _dueTime,
      reminderTime: _reminderTime,
      repeatRule: _repeat,
      estimatedMinutes: _estimatedMinutes,
      status: _status,
      steps: List<TaskStep>.from(_steps),
      sourceReflectionId:
          widget.prefill?.sourceReflectionId ?? widget.task?.sourceReflectionId,
      feedback: _original?.feedback ?? TaskFeedback(),
      checkInTypeIds: _checkInTypeIds.toList(),
      createdAt: _original?.createdAt ?? DateTime.now(),
    );
  }

  Future<void> _onSave() async {
    if (!_formKey.currentState!.validate()) return;
    final provider = context.read<TaskProvider>();
    final newTask = _buildTaskForSave();

    if (newTask.status == TaskStatus.delayed) {
      if (_delayType == null ||
          (_statusReason == null || _statusReason!.isEmpty)) {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('延期需填写类型与原因')));
        return;
      }
    }
    if (newTask.status == TaskStatus.cancelled) {
      if (_cancelType == null ||
          (_statusReason == null || _statusReason!.isEmpty)) {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('取消需填写类型与原因')));
        return;
      }
    }

    if (_original != null && _original!.status != newTask.status) {
      final statusUpdated = await provider.changeStatus(
        _original!,
        newTask.status,
        delayType: _delayType,
        cancelType: _cancelType,
        reason: _statusReason,
        behaviorImprovement: _behaviorController.text.trim().isEmpty
            ? null
            : _behaviorController.text
                .trim()
                .split('\n')
                .where((s) => s.trim().isNotEmpty)
                .toList(),
        now: DateTime.now(),
      );
      final merged = statusUpdated.copyWith(
        title: newTask.title,
        description: newTask.description,
        category: newTask.category,
        priority: newTask.priority,
        startTime: newTask.startTime,
        dueTime: newTask.dueTime,
        reminderTime: newTask.reminderTime,
        repeatRule: newTask.repeatRule,
        estimatedMinutes: newTask.estimatedMinutes,
        steps: newTask.steps,
        checkInTypeIds: newTask.checkInTypeIds,
      );
      await provider.save(merged);
    } else {
      await provider.save(newTask);
    }

    if (!mounted) return;
    ScaffoldMessenger.of(context)
        .showSnackBar(const SnackBar(content: Text('已保存')));
    Navigator.of(context).pop();
  }

  Widget _buildCheckInTypes() {
    if (_enabledTypes.isEmpty) return const SizedBox.shrink();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          '关联打卡类型（可选）',
          style: TextStyle(fontWeight: FontWeight.w600),
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: _enabledTypes.map((t) {
            final selected = _checkInTypeIds.contains(t.id);
            return FilterChip(
              label: Text('${t.symbol} ${t.label}'),
              selected: selected,
              onSelected: (v) {
                setState(() {
                  if (v) {
                    _checkInTypeIds.add(t.id);
                  } else {
                    _checkInTypeIds.remove(t.id);
                  }
                });
              },
            );
          }).toList(),
        ),
      ],
    );
  }

  Widget _buildStatusExtra() {
    if (_status == TaskStatus.delayed) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 12),
          DropdownButtonFormField<DelayType>(
            value: _delayType,
            decoration: const InputDecoration(
                labelText: '延期类型', border: OutlineInputBorder(), isDense: true),
            items: DelayType.values
                .map((d) => DropdownMenuItem(value: d, child: Text(d.value)))
                .toList(),
            onChanged: (v) => setState(() => _delayType = v),
          ),
          const SizedBox(height: 8),
          TextFormField(
            initialValue: _statusReason,
            decoration: const InputDecoration(
                labelText: '延期原因', border: OutlineInputBorder(), isDense: true),
            maxLines: 2,
            onChanged: (v) => _statusReason = v,
          ),
        ],
      );
    } else if (_status == TaskStatus.cancelled) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 12),
          DropdownButtonFormField<CancelType>(
            value: _cancelType,
            decoration: const InputDecoration(
                labelText: '取消类型', border: OutlineInputBorder(), isDense: true),
            items: CancelType.values
                .map((d) => DropdownMenuItem(value: d, child: Text(d.value)))
                .toList(),
            onChanged: (v) => setState(() => _cancelType = v),
          ),
          const SizedBox(height: 8),
          TextFormField(
            initialValue: _statusReason,
            decoration: const InputDecoration(
                labelText: '取消原因', border: OutlineInputBorder(), isDense: true),
            maxLines: 2,
            onChanged: (v) => _statusReason = v,
          ),
        ],
      );
    } else if (_status == TaskStatus.done) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 12),
          TextFormField(
            initialValue: _executionMinutesInput?.toString(),
            decoration: const InputDecoration(
                labelText: '执行时长（分钟，可选）',
                border: OutlineInputBorder(),
                isDense: true),
            keyboardType: TextInputType.number,
            onChanged: (v) => _executionMinutesInput = int.tryParse(v),
          ),
          const SizedBox(height: 8),
          TextFormField(
            controller: _behaviorController,
            decoration: const InputDecoration(
                labelText: '行为改善（换行分隔）',
                border: OutlineInputBorder(),
                isDense: true),
            maxLines: 4,
          ),
        ],
      );
    }
    return const SizedBox.shrink();
  }

  @override
  Widget build(BuildContext context) {
    const primary = Color(0xFF4A90D9);
    return Scaffold(
      appBar: AppBar(
        title: Text(_original == null ? '新建任务' : '编辑任务'),
        actions: _original != null
            ? [
                IconButton(
                  onPressed: _onDelete,
                  icon: const Icon(Icons.delete, color: Colors.redAccent),
                  tooltip: '删除',
                ),
              ]
            : null,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            children: [
              TextFormField(
                controller: _titleController,
                decoration: const InputDecoration(
                    labelText: '标题',
                    border: OutlineInputBorder(),
                    isDense: true),
                validator: (_) =>
                    _titleController.text.trim().isEmpty ? '标题不能为空' : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _descriptionController,
                decoration: const InputDecoration(
                    labelText: '描述（可选）',
                    border: OutlineInputBorder(),
                    isDense: true),
                maxLines: 3,
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: DropdownButtonFormField<TaskCategory>(
                      value: _category,
                      decoration: const InputDecoration(
                          labelText: '分类',
                          border: OutlineInputBorder(),
                          isDense: true),
                      items: TaskCategory.values.map((c) {
                        final idx = TaskCategory.values.indexOf(c);
                        return DropdownMenuItem(
                            value: c,
                            child: Text(TaskCategory.valuesList[idx]));
                      }).toList(),
                      onChanged: (v) => setState(() => _category = v),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: DropdownButtonFormField<TaskPriority>(
                      value: _priority,
                      decoration: const InputDecoration(
                          labelText: '优先级',
                          border: OutlineInputBorder(),
                          isDense: true),
                      items: TaskPriority.values
                          .map((p) =>
                              DropdownMenuItem(value: p, child: Text(p.value)))
                          .toList(),
                      onChanged: (v) => setState(() => _priority = v),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<TaskStatus>(
                value: _status,
                decoration: const InputDecoration(
                    labelText: '状态',
                    border: OutlineInputBorder(),
                    isDense: true),
                items: TaskStatus.values
                    .map((s) => DropdownMenuItem(
                        value: s, child: Text(_statusLabel(s))))
                    .toList(),
                onChanged: (v) =>
                    setState(() => _status = v ?? TaskStatus.todo),
              ),
              _buildStatusExtra(),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: InkWell(
                      onTap: () async {
                        final dt = await _pickDateTime(context, _startTime);
                        setState(() => _startTime = dt);
                      },
                      child: InputDecorator(
                        decoration: const InputDecoration(
                            labelText: '开始时间',
                            border: OutlineInputBorder(),
                            isDense: true),
                        child: Text(_startTime != null
                            ? DateFormat.yMMMd().add_jm().format(_startTime!)
                            : '未设置'),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: InkWell(
                      onTap: () async {
                        final dt = await _pickDateTime(context, _dueTime);
                        setState(() => _dueTime = dt);
                      },
                      child: InputDecorator(
                        decoration: const InputDecoration(
                            labelText: '截止时间',
                            border: OutlineInputBorder(),
                            isDense: true),
                        child: Text(_dueTime != null
                            ? DateFormat.yMMMd().add_jm().format(_dueTime!)
                            : '未设置'),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: InkWell(
                      onTap: () async {
                        final dt = await _pickDateTime(context, _reminderTime);
                        setState(() => _reminderTime = dt);
                      },
                      child: InputDecorator(
                        decoration: const InputDecoration(
                            labelText: '提醒时间',
                            border: OutlineInputBorder(),
                            isDense: true),
                        child: Text(_reminderTime != null
                            ? DateFormat.yMMMd().add_jm().format(_reminderTime!)
                            : '未设置'),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: DropdownButtonFormField<RepeatRule>(
                      value: _repeat,
                      decoration: const InputDecoration(
                          labelText: '重复规则',
                          border: OutlineInputBorder(),
                          isDense: true),
                      items: RepeatRule.values
                          .map((r) =>
                              DropdownMenuItem(value: r, child: Text(r.value)))
                          .toList(),
                      onChanged: (v) =>
                          setState(() => _repeat = v ?? RepeatRule.none),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              _buildCheckInTypes(),
              const SizedBox(height: 12),
              Card(
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12)),
                elevation: 2,
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          const Expanded(
                              child: Text('步骤',
                                  style:
                                      TextStyle(fontWeight: FontWeight.w600))),
                          TextButton.icon(
                            onPressed: _titleController.text.trim().isEmpty ||
                                    _isDecomposing
                                ? null
                                : _onDecompose,
                            icon: _isDecomposing
                                ? const SizedBox(
                                    width: 16,
                                    height: 16,
                                    child: CircularProgressIndicator(
                                        strokeWidth: 2),
                                  )
                                : const Icon(Icons.auto_fix_high),
                            label: const Text('AI 拆解'),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      ..._steps.asMap().entries.map((e) {
                        final idx = e.key;
                        final step = e.value;
                        return ListTile(
                          leading: Checkbox(
                            value: step.done,
                            onChanged: (v) {
                              setState(() => _steps[idx] = TaskStep(
                                  content: step.content, done: v ?? false));
                            },
                          ),
                          title: Text(step.content),
                          trailing: IconButton(
                            icon: const Icon(Icons.delete_outline),
                            onPressed: () =>
                                setState(() => _steps.removeAt(idx)),
                          ),
                        );
                      }),
                      Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: _stepInputController,
                              decoration: const InputDecoration(
                                  hintText: '添加步骤', isDense: true),
                              onSubmitted: (_) => _addStep(),
                            ),
                          ),
                          const SizedBox(width: 8),
                          SizedBox(
                            height: 48,
                            child: ElevatedButton(
                              onPressed: _addStep,
                              style: ElevatedButton.styleFrom(
                                  shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(8))),
                              child: const Text('添加'),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: SizedBox(
                      height: 48,
                      child: ElevatedButton(
                        onPressed: _isTitleValid ? _onSave : null,
                        style: ElevatedButton.styleFrom(
                            backgroundColor: primary,
                            shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(8))),
                        child: const Text('保存'),
                      ),
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

  String _statusLabel(TaskStatus s) {
    switch (s) {
      case TaskStatus.todo:
        return '未开始';
      case TaskStatus.inProgress:
        return '进行中';
      case TaskStatus.done:
        return '已完成';
      case TaskStatus.delayed:
        return '延期';
      case TaskStatus.cancelled:
        return '取消';
    }
  }
}