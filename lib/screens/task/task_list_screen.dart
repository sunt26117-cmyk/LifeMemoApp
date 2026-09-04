import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';

import 'package:ai_life_recorder/providers/task_provider.dart';
import 'package:ai_life_recorder/models/task.dart';
import 'package:ai_life_recorder/constants/enums.dart';
import 'package:ai_life_recorder/constants/app_colors.dart';
import 'package:ai_life_recorder/screens/task/task_edit_screen.dart';

enum _TaskTimeFilter {
  today,
  upcoming,
  all,
}

class TaskListScreen extends StatefulWidget {
  const TaskListScreen({super.key});

  @override
  State<TaskListScreen> createState() => _TaskListScreenState();
}

class _TaskListScreenState extends State<TaskListScreen> {
  _TaskTimeFilter _timeFilter = _TaskTimeFilter.today;

  @override
  void initState() {
    super.initState();

    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<TaskProvider>().load();
    });
  }

  DateTime _startOfToday() {
    final now = DateTime.now();
    return DateTime(now.year, now.month, now.day);
  }

  DateTime _endOfToday() {
    return _startOfToday().add(const Duration(days: 1));
  }

  bool _isToday(DateTime value) {
    final local = value.toLocal();
    final start = _startOfToday();
    final end = _endOfToday();
    return !local.isBefore(start) && local.isBefore(end);
  }

  bool _isCompleted(Task task) {
    return task.status == TaskStatus.done ||
        task.status == TaskStatus.cancelled;
  }

  List<Task> _filterByTime(List<Task> source) {
    final end = _endOfToday();

    switch (_timeFilter) {
      case _TaskTimeFilter.today:
        return source.where((task) {
          final dueToday =
              task.dueTime != null && _isToday(task.dueTime!);

          final createdToday = _isToday(task.createdAt);

          return dueToday ||
              (createdToday && !_isCompleted(task));
        }).toList();

      case _TaskTimeFilter.upcoming:
        return source.where((task) {
          final due = task.dueTime;
          return due != null &&
              due.toLocal().isAfter(end.subtract(const Duration(seconds: 1)));
        }).toList();

      case _TaskTimeFilter.all:
        return List<Task>.from(source);
    }
  }

  Map<TaskCategory, List<Task>> _groupByCategory(List<Task> tasks) {
    final result = <TaskCategory, List<Task>>{};

    for (final task in tasks) {
      result.putIfAbsent(task.category, () => <Task>[]).add(task);
    }

    for (final entries in result.entries) {
      entries.value.sort(_compareTask);
    }

    return result;
  }

  int _compareTask(Task a, Task b) {
    final aTime = a.dueTime ?? a.createdAt;
    final bTime = b.dueTime ?? b.createdAt;

    return aTime.compareTo(bTime);
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<TaskProvider>();

    final filteredByTime = _filterByTime(provider.tasks);

    final groups = _groupByCategory(filteredByTime);

    final orderedCategories = TaskCategory.values.where(
      groups.containsKey,
    ).toList();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('任务'),
      ),
      floatingActionButton: FloatingActionButton(
        heroTag: 'task_fab',
        onPressed: () {
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (_) => const TaskEditScreen(),
            ),
          );
        },
        backgroundColor: Colors.transparent,
        elevation: 2,
        shape: const CircleBorder(),
        child: Container(
          width: 56,
          height: 56,
          decoration: const BoxDecoration(
            shape: BoxShape.circle,
            gradient: LinearGradient(
              colors: AppColors.taskGradient,
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
          child: const Icon(
            Icons.add_rounded,
            color: Colors.white,
          ),
        ),
      ),
      body: Padding(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
        child: Column(
          children: [
            _buildTimeTabs(),
            const SizedBox(height: 10),
            _buildFilterBar(provider),
            const SizedBox(height: 8),
            Expanded(
              child: filteredByTime.isEmpty
                  ? _buildEmptyState()
                  : _buildGroupedList(
                      groups: groups,
                      categories: orderedCategories,
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTimeTabs() {
    return SegmentedButton<_TaskTimeFilter>(
      segments: const [
        ButtonSegment(
          value: _TaskTimeFilter.today,
          label: Text('今天'),
        ),
        ButtonSegment(
          value: _TaskTimeFilter.upcoming,
          label: Text('即将到来'),
        ),
        ButtonSegment(
          value: _TaskTimeFilter.all,
          label: Text('全部'),
        ),
      ],
      selected: {_timeFilter},
      onSelectionChanged: (value) {
        setState(() {
          _timeFilter = value.first;
        });
      },
    );
  }

  Widget _buildFilterBar(TaskProvider provider) {
    final status = provider.filterStatus;

    return Row(
      children: [
        Expanded(
          child: DropdownButtonFormField<TaskStatus?>(
            value: status,
            isExpanded: true,
            decoration: InputDecoration(
              labelText: '状态',
              prefixIcon: const Icon(
                Icons.tune_rounded,
                size: 19,
              ),
              filled: true,
              fillColor: Colors.white,
              isDense: true,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide: BorderSide.none,
              ),
            ),
            items: [
              const DropdownMenuItem<TaskStatus?>(
                value: null,
                child: Text('全部'),
              ),
              ...TaskStatus.values.map(
                (item) => DropdownMenuItem<TaskStatus?>(
                  value: item,
                  child: Text(_statusLabel(item)),
                ),
              ),
            ],
            onChanged: provider.setFilterStatus,
          ),
        ),
        const SizedBox(width: 8),
        IconButton(
          tooltip: '分类筛选',
          style: IconButton.styleFrom(
            backgroundColor: Colors.white,
            foregroundColor: AppColors.taskAccent,
          ),
          onPressed: () => _showCategoryFilter(provider),
          icon: Icon(
            provider.filterCategory == null
                ? Icons.category_outlined
                : Icons.category_rounded,
          ),
        ),
      ],
    );
  }

  Future<void> _showCategoryFilter(TaskProvider provider) async {
    final selected = await showModalBottomSheet<TaskCategory?>(
      context: context,
      backgroundColor: AppColors.background,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(
          top: Radius.circular(24),
        ),
      ),
      builder: (context) {
        return SafeArea(
          child: ListView(
            shrinkWrap: true,
            padding: const EdgeInsets.fromLTRB(18, 16, 18, 24),
            children: [
              const Padding(
                padding: EdgeInsets.only(
                  left: 4,
                  bottom: 14,
                ),
                child: Text(
                  '按分类查看',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF3A4557),
                  ),
                ),
              ),
              ListTile(
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 8),
                leading: const CircleAvatar(
                  backgroundColor: Colors.white,
                  child: Icon(
                    Icons.apps_rounded,
                    color: AppColors.taskAccent,
                  ),
                ),
                title: const Text('全部分类'),
                trailing: provider.filterCategory == null
                    ? const Icon(
                        Icons.check_rounded,
                        color: AppColors.taskAccent,
                      )
                    : null,
                onTap: () => Navigator.pop(context, null),
              ),
              ...TaskCategory.values.map(
                (category) {
                  final selected =
                      provider.filterCategory == category;

                  return ListTile(
                    contentPadding:
                        const EdgeInsets.symmetric(horizontal: 8),
                    leading: CircleAvatar(
                      backgroundColor:
                          AppColors.taskAccent.withOpacity(0.12),
                      child: const Icon(
                        Icons.folder_outlined,
                        color: AppColors.taskAccent,
                      ),
                    ),
                    title: Text(_categoryLabel(category)),
                    trailing: selected
                        ? const Icon(
                            Icons.check_rounded,
                            color: AppColors.taskAccent,
                          )
                        : null,
                    onTap: () =>
                        Navigator.pop(context, category),
                  );
                },
              ),
            ],
          ),
        );
      },
    );

    if (!mounted) return;

    provider.setFilterCategory(selected);
  }

  Widget _buildGroupedList({
    required Map<TaskCategory, List<Task>> groups,
    required List<TaskCategory> categories,
  }) {
    final initialExpandedCount =
        categories.length < 2 ? categories.length : 2;

    return ListView.builder(
      padding: const EdgeInsets.only(bottom: 90),
      itemCount: categories.length,
      itemBuilder: (context, index) {
        final category = categories[index];
        final tasks = groups[category] ?? const <Task>[];

        return _TaskCategorySection(
          category: category,
          tasks: tasks,
          initiallyExpanded: index < initialExpandedCount,
          categoryLabel: _categoryLabel(category),
          onTaskTap: (task) {
            Navigator.of(context).push(
              MaterialPageRoute(
                builder: (_) => TaskEditScreen(task: task),
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildEmptyState() {
    String text;

    switch (_timeFilter) {
      case _TaskTimeFilter.today:
        text = '今天还没有需要处理的任务';
      case _TaskTimeFilter.upcoming:
        text = '暂时没有即将到来的任务';
      case _TaskTimeFilter.all:
        text = '还没有任务，先安排一件小事吧';
    }

    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 86,
            height: 86,
            decoration: BoxDecoration(
              color: AppColors.taskAccent.withOpacity(0.12),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.task_alt_rounded,
              size: 38,
              color: AppColors.taskAccent,
            ),
          ),
          const SizedBox(height: 16),
          Text(
            text,
            style: const TextStyle(
              fontSize: 14,
              color: AppColors.neutral,
            ),
          ),
        ],
      ),
    );
  }

  String _statusLabel(TaskStatus status) {
    switch (status) {
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

  String _categoryLabel(TaskCategory category) {
    final index = TaskCategory.values.indexOf(category);
    final labels = TaskCategory.valuesList;

    if (index >= 0 && index < labels.length) {
      return labels[index];
    }

    return category.toString();
  }
}

class _TaskCategorySection extends StatelessWidget {
  const _TaskCategorySection({
    required this.category,
    required this.tasks,
    required this.initiallyExpanded,
    required this.categoryLabel,
    required this.onTaskTap,
  });

  final TaskCategory category;
  final List<Task> tasks;
  final bool initiallyExpanded;
  final String categoryLabel;
  final ValueChanged<Task> onTaskTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      color: Colors.white,
      child: Theme(
        data: Theme.of(context).copyWith(
          dividerColor: Colors.transparent,
        ),
        child: ExpansionTile(
          initiallyExpanded: initiallyExpanded,
          tilePadding: const EdgeInsets.symmetric(
            horizontal: 14,
          ),
          childrenPadding: const EdgeInsets.fromLTRB(
            10,
            0,
            10,
            10,
          ),
          leading: Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: AppColors.taskAccent.withOpacity(0.10),
              borderRadius: BorderRadius.circular(13),
            ),
            child: const Icon(
              Icons.folder_open_rounded,
              size: 20,
              color: AppColors.taskAccent,
            ),
          ),
          title: Text(
            categoryLabel,
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: Color(0xFF3A4557),
            ),
          ),
          subtitle: Text(
            '${tasks.length} 项',
            style: const TextStyle(
              fontSize: 11,
              color: AppColors.neutral,
            ),
          ),
          children: tasks.map(
            (task) {
              return _TaskRow(
                task: task,
                onTap: () => onTaskTap(task),
              );
            },
          ).toList(),
        ),
      ),
    );
  }
}

class _TaskRow extends StatelessWidget {
  const _TaskRow({
    required this.task,
    required this.onTap,
  });

  final Task task;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final priorityColor = _priorityColor(task.priority);
    final statusColor = _statusColor(task.status);

    final due =
        task.dueTime != null
            ? DateFormat(
                'M月d日 HH:mm',
              ).format(task.dueTime!.toLocal())
            : null;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Padding(
        padding: const EdgeInsets.symmetric(
          horizontal: 7,
          vertical: 8,
        ),
        child: Row(
          children: [
            Container(
              width: 9,
              height: 9,
              decoration: BoxDecoration(
                color: priorityColor,
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: 10),
            Container(
              width: 21,
              height: 21,
              decoration: BoxDecoration(
                border: Border.all(
                  color: task.status == TaskStatus.done
                      ? AppColors.success
                      : AppColors.primary,
                  width: 1.5,
                ),
                shape: BoxShape.circle,
              ),
              child: task.status == TaskStatus.done
                  ? const Icon(
                      Icons.check_rounded,
                      size: 14,
                      color: AppColors.success,
                    )
                  : null,
            ),
            const SizedBox(width: 11),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    task.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: const Color(0xFF3A4557),
                      decoration: task.status == TaskStatus.done
                          ? TextDecoration.lineThrough
                          : null,
                    ),
                  ),
                  if (due != null) ...[
                    const SizedBox(height: 4),
                    Text(
                      due,
                      style: const TextStyle(
                        fontSize: 11,
                        color: AppColors.neutral,
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(
                horizontal: 8,
                vertical: 5,
              ),
              decoration: BoxDecoration(
                color: statusColor.withOpacity(0.10),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                _statusLabel(task.status),
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                  color: statusColor,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  static String _statusLabel(TaskStatus status) {
    switch (status) {
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

  static Color _statusColor(TaskStatus status) {
    switch (status) {
      case TaskStatus.todo:
        return AppColors.neutral;
      case TaskStatus.inProgress:
        return AppColors.primary;
      case TaskStatus.done:
        return AppColors.success;
      case TaskStatus.delayed:
        return AppColors.warning;
      case TaskStatus.cancelled:
        return AppColors.error;
    }
  }

  static Color _priorityColor(TaskPriority priority) {
    switch (priority) {
      case TaskPriority.high:
        return AppColors.error;
      case TaskPriority.medium:
        return AppColors.warning;
      case TaskPriority.low:
        return AppColors.neutral;
    }
  }
}