import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import 'package:ai_life_recorder/constants/app_colors.dart';
import 'package:ai_life_recorder/constants/enums.dart';
import 'package:ai_life_recorder/models/memory.dart';
import 'package:ai_life_recorder/models/photo.dart';
import 'package:ai_life_recorder/models/reflection.dart';
import 'package:ai_life_recorder/models/task.dart';
import 'package:ai_life_recorder/models/note.dart';
import 'package:ai_life_recorder/providers/memory_provider.dart';
import 'package:ai_life_recorder/providers/note_provider.dart';
import 'package:ai_life_recorder/providers/photo_provider.dart';
import 'package:ai_life_recorder/providers/task_provider.dart';
import 'package:ai_life_recorder/repositories/reflection_repository.dart';
import 'package:ai_life_recorder/services/biometric_gate.dart';
import 'package:ai_life_recorder/screens/checkin/check_in_calendar_screen.dart';
import 'package:ai_life_recorder/screens/memory/memory_edit_screen.dart';
import 'package:ai_life_recorder/screens/note/note_list_screen.dart';
import 'package:ai_life_recorder/screens/reflection/reflection_list_screen.dart';
import 'package:ai_life_recorder/screens/settings/settings_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({
    super.key,
    required this.onNavigateToTab,
    required this.reflectionRepository,
    this.biometricGate,
  });

  final void Function(int index) onNavigateToTab;
  final ReflectionRepository reflectionRepository;

  /// EXT-10：进入反思前验证用（测试注入假实现；不传则用系统生物识别）。
  final BiometricGate? biometricGate;

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  List<Reflection> _reflections = <Reflection>[];
  bool _reflectionLoading = true;
  late final BiometricGate _biometricGate =
      widget.biometricGate ?? LocalBiometricGate();

  @override
  void initState() {
    super.initState();

    WidgetsBinding.instance.addPostFrameCallback((_) async {
      final memoryProvider = context.read<MemoryProvider>();
      final photoProvider = context.read<PhotoProvider>();
      final taskProvider = context.read<TaskProvider>();
      final noteProvider = context.read<NoteProvider>();
      await memoryProvider.load();
      await photoProvider.load();
      await taskProvider.load();
      await noteProvider.load();
      await _loadReflections();
    });
  }

  Future<void> _loadReflections() async {
    try {
      final items = await widget.reflectionRepository.list();

      items.sort(
        (a, b) => b.createdAt.compareTo(a.createdAt),
      );

      if (!mounted) return;

      setState(() {
        _reflections = items;
        _reflectionLoading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _reflectionLoading = false;
      });
    }
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

  List<Task> _todayTasks(List<Task> tasks) {
    final result = tasks.where((task) {
      final dueToday = task.dueTime != null && _isToday(task.dueTime!);

      final createdToday = _isToday(task.createdAt);

      return dueToday || (createdToday && !_isCompleted(task));
    }).toList();

    result.sort((a, b) {
      final aTime = a.dueTime ?? a.createdAt;
      final bTime = b.dueTime ?? b.createdAt;
      return aTime.compareTo(bTime);
    });

    return result.take(3).toList();
  }

  List<Memory> _recentMemories(List<Memory> memories) {
    final result = List<Memory>.from(memories)
      ..sort(
        (a, b) => b.createdAt.compareTo(a.createdAt),
      );

    return result.take(3).toList();
  }

  List<Photo> _recentPhotos(List<Photo> photos) {
    final result = List<Photo>.from(photos)
      ..sort(
        (a, b) => b.takenAt.compareTo(a.takenAt),
      );

    return result.take(4).toList();
  }

  String _reflectionSummary(Reflection reflection) {
    if (reflection.aiSummary is Map<String, dynamic>) {
      final map = Map<String, dynamic>.from(
        reflection.aiSummary!,
      );

      final value = map['eventSummary'];

      if (value != null && value.toString().trim().isNotEmpty) {
        return value.toString().trim();
      }
    }

    return reflection.eventDescription.trim();
  }

  @override
  Widget build(BuildContext context) {
    final memoryProvider = context.watch<MemoryProvider>();
    final photoProvider = context.watch<PhotoProvider>();
    final taskProvider = context.watch<TaskProvider>();
    final noteProvider = context.watch<NoteProvider>();

    final todayTasks = _todayTasks(taskProvider.tasks);
    final recentMemories = _recentMemories(memoryProvider.memories);
    final recentPhotos = _recentPhotos(photoProvider.photos);

    final recentReflection =
        _reflections.isNotEmpty ? _reflections.first : null;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('今天'),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings_rounded),
            tooltip: '设置',
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => const SettingsScreen(),
                ),
              );
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          await memoryProvider.load();
          await photoProvider.load();
          await taskProvider.load();
          await noteProvider.load();
          await _loadReflections();
        },
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
          children: [
            _buildDateHeader(),
            const SizedBox(height: 18),
            _buildQuickCapture(),
            const SizedBox(height: 22),
            _buildSectionTitle(
              title: '今天的任务',
              trailing: todayTasks.isEmpty ? null : '${todayTasks.length} 项',
            ),
            const SizedBox(height: 10),
            _buildTodayTasks(todayTasks),
            const SizedBox(height: 22),
            _buildSectionTitle(
              title: '小记',
              trailing: noteProvider.notes.isEmpty
                  ? null
                  : '${noteProvider.notes.length} 条',
            ),
            const SizedBox(height: 10),
            _buildRecentNotes(noteProvider.notes),
            const SizedBox(height: 22),
            _buildSectionTitle(title: '最近发生'),
            const SizedBox(height: 10),
            _buildRecentActivity(
              memories: recentMemories,
              photos: recentPhotos,
            ),
            const SizedBox(height: 22),
            _buildSectionTitle(title: '最近反思'),
            const SizedBox(height: 10),
            _buildRecentReflection(recentReflection),
            const SizedBox(height: 22),
            _buildSectionTitle(title: '这段时间'),
            const SizedBox(height: 10),
            _buildPeriodOverview(
              memoryCount: memoryProvider.memories.length,
              reflectionCount: _reflections.length,
              completedTaskCount: taskProvider.tasks
                  .where((task) => task.status == TaskStatus.done)
                  .length,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDateHeader() {
    final now = DateTime.now();

    final date = DateFormat(
      'yyyy年M月d日 · EEEE',
      'zh_CN',
    ).format(now);

    return Padding(
      padding: const EdgeInsets.only(
        left: 4,
        right: 4,
        top: 4,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            date,
            style: const TextStyle(
              fontSize: 25,
              fontWeight: FontWeight.w800,
              color: Color(0xFF3A4557),
              height: 1.2,
            ),
          ),
          const SizedBox(height: 6),
          const Text(
            '今天也留一点空间给自己 🌿',
            style: TextStyle(
              fontSize: 13,
              color: Color(0xFF8A93A6),
            ),
          ),
        ],
      ),
    ).animate().fadeIn(duration: 260.ms).slideY(
          begin: 0.05,
          end: 0,
        );
  }

  Widget _buildQuickCapture() {
    return Row(
      children: [
        Expanded(
          child: _quickAction(
            icon: Icons.edit_note_rounded,
            title: '写下此刻',
            subtitle: '记录一个念头',
            gradient: AppColors.memoryGradient,
            onTap: () async {
              await Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => const MemoryEditScreen(),
                ),
              );

              if (mounted) {
                await context.read<MemoryProvider>().load();
              }
            },
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _quickAction(
            icon: Icons.fact_check_rounded,
            title: '打卡',
            subtitle: '记录今天',
            gradient: AppColors.taskGradient,
            onTap: () async {
              await Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => const CheckInCalendarScreen(),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _quickAction({
    required IconData icon,
    required String title,
    required String subtitle,
    required List<Color> gradient,
    required VoidCallback onTap,
  }) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(20),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(20),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(20),
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                Colors.white,
                Color.lerp(
                  Colors.white,
                  gradient.first,
                  0.30,
                )!,
              ],
            ),
          ),
          child: Row(
            children: [
              Container(
                width: 46,
                height: 46,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(15),
                  gradient: LinearGradient(
                    colors: gradient,
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                ),
                child: Icon(
                  icon,
                  color: Colors.white,
                  size: 24,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF3A4557),
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      subtitle,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 11,
                        color: Color(0xFF8A93A6),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSectionTitle({
    required String title,
    String? trailing,
  }) {
    return Row(
      children: [
        Text(
          title,
          style: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: Color(0xFF3A4557),
          ),
        ),
        if (trailing != null) ...[
          const SizedBox(width: 8),
          Text(
            trailing,
            style: const TextStyle(
              fontSize: 12,
              color: AppColors.neutral,
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildTodayTasks(List<Task> tasks) {
    if (tasks.isEmpty) {
      return _softEmptyCard(
        icon: Icons.check_circle_outline_rounded,
        text: '今天暂时没有需要处理的事',
      );
    }

    return Column(
      children: [
        ...tasks.map(
          (task) => Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: _todayTaskRow(task),
          ),
        ),
        Align(
          alignment: Alignment.centerRight,
          child: TextButton(
            onPressed: () => widget.onNavigateToTab(2),
            child: const Text('查看全部 →'),
          ),
        ),
      ],
    );
  }

  Widget _todayTaskRow(Task task) {
    final isDone = task.status == TaskStatus.done;

    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: () => widget.onNavigateToTab(2),
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.symmetric(
            horizontal: 14,
            vertical: 12,
          ),
          child: Row(
            children: [
              Container(
                width: 22,
                height: 22,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: isDone ? AppColors.success : AppColors.primary,
                    width: 1.6,
                  ),
                  color: isDone
                      ? AppColors.success.withOpacity(0.14)
                      : Colors.transparent,
                ),
                child: isDone
                    ? const Icon(
                        Icons.check_rounded,
                        size: 15,
                        color: AppColors.success,
                      )
                    : null,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  task.title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: const Color(0xFF3A4557),
                    decoration: isDone ? TextDecoration.lineThrough : null,
                  ),
                ),
              ),
              const Icon(
                Icons.chevron_right_rounded,
                size: 20,
                color: AppColors.mutedIcon,
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// 进入小记列表/新建页。
  Future<void> _openNoteList() async {
    await Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => const NoteListScreen()),
    );
    if (mounted) await context.read<NoteProvider>().load();
  }

  /// 小记区块：展示最近 2 条，点击进入小记列表/新建。
  Widget _buildRecentNotes(List<Note> notes) {
    final recent = notes.take(2).toList();
    // 空态也可点：直接进小记页新建
    if (recent.isEmpty) {
      return Material(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        child: InkWell(
          borderRadius: BorderRadius.circular(18),
          onTap: () => _openNoteList(),
          child: const Padding(
            padding: EdgeInsets.symmetric(horizontal: 16, vertical: 20),
            child: Row(
              children: [
                Icon(Icons.edit_note_rounded,
                    color: AppColors.mutedIcon, size: 23),
                SizedBox(width: 10),
                Expanded(
                  child: Text('还没有小记，点这里写一条',
                      style: TextStyle(fontSize: 13, color: AppColors.neutral)),
                ),
                Icon(Icons.chevron_right_rounded,
                    color: AppColors.mutedIcon, size: 20),
              ],
            ),
          ),
        ),
      );
    }
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(18),
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: () => _openNoteList(),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 15, vertical: 10),
          child: Column(
            children: [
              for (final note in recent) ...[
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 6),
                  child: Row(
                    children: [
                      Container(
                        width: 34,
                        height: 34,
                        decoration: BoxDecoration(
                          color: AppColors.lavender.withOpacity(0.14),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.edit_note_rounded,
                            size: 17, color: Color(0xFF7C6BB0)),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              (note.title == null || note.title!.isEmpty)
                                  ? '无标题小记'
                                  : note.title!,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600,
                                  color: Color(0xFF3A4557)),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              note.content,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                  fontSize: 12, color: AppColors.neutral),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildRecentActivity({
    required List<Memory> memories,
    required List<Photo> photos,
  }) {
    if (memories.isEmpty && photos.isEmpty) {
      return _softEmptyCard(
        icon: Icons.auto_stories_outlined,
        text: '还没有记录，写下一点今天发生的事吧',
      );
    }

    final items = <_RecentItem>[];

    for (final memory in memories) {
      items.add(
        _RecentItem.memory(memory),
      );
    }

    for (final photo in photos) {
      items.add(
        _RecentItem.photo(photo),
      );
    }

    items.sort(
      (a, b) => b.time.compareTo(a.time),
    );

    final visibleItems = items.take(3).toList();

    return Column(
      children: [
        ...visibleItems.map(
          (item) => Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: item.type == _RecentType.memory
                ? _memoryActivityRow(item.memory!)
                : _photoActivityRow(item.photo!),
          ),
        ),
        Align(
          alignment: Alignment.centerRight,
          child: TextButton(
            onPressed: () => widget.onNavigateToTab(1),
            child: const Text('查看记录 →'),
          ),
        ),
      ],
    );
  }

  Widget _memoryActivityRow(Memory memory) {
    final summary = memory.content.trim();
    final preview =
        summary.length <= 56 ? summary : '${summary.substring(0, 56)}…';

    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: () => widget.onNavigateToTab(1),
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(13),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(
                Icons.edit_note_rounded,
                color: AppColors.memoryAccent,
                size: 22,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      DateFormat.Hm().format(
                        memory.createdAt.toLocal(),
                      ),
                      style: const TextStyle(
                        fontSize: 11,
                        color: AppColors.neutral,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      preview,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 13,
                        height: 1.4,
                        color: Color(0xFF3A4557),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _photoActivityRow(Photo photo) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: () => widget.onNavigateToTab(1),
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(8),
          child: Row(
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: SizedBox(
                  width: 52,
                  height: 52,
                  child: _photoPreview(photo),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  DateFormat(
                    'M月d日 HH:mm',
                  ).format(photo.takenAt.toLocal()),
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppColors.neutral,
                  ),
                ),
              ),
              const Icon(
                Icons.chevron_right_rounded,
                color: AppColors.mutedIcon,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _photoPreview(Photo photo) {
    final file = File(photo.localPath);
    if (!file.existsSync()) {
      return const ColoredBox(
        color: Color(0xFFF1F1F1),
        child: Icon(Icons.photo_rounded, color: AppColors.photoAccent),
      );
    }
    return Image.file(file, fit: BoxFit.cover);
  }

  Widget _buildRecentReflection(Reflection? reflection) {
    if (_reflectionLoading) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 12),
        child: Center(
          child: SizedBox(
            width: 18,
            height: 18,
            child: CircularProgressIndicator(strokeWidth: 2),
          ),
        ),
      );
    }

    if (reflection == null) {
      return _softEmptyCard(
        icon: Icons.lightbulb_outline_rounded,
        text: '还没有反思记录',
      );
    }

    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(18),
      child: InkWell(
        onTap: () async {
          // EXT-10：进入反思前系统生物识别验证，失败不进入并提示原因
          final result = await _biometricGate.authenticate();
          if (!result.success) {
            if (mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text(result.failReason ?? '验证失败，请重试')),
              );
            }
            return;
          }
          if (!mounted) return;
          await Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => ReflectionListScreen(
                repository: widget.reflectionRepository,
              ),
            ),
          );

          if (mounted) {
            await _loadReflections();
          }
        },
        borderRadius: BorderRadius.circular(18),
        child: Padding(
          padding: const EdgeInsets.all(15),
          child: Row(
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppColors.reflectionAccent.withOpacity(0.14),
                ),
                child: const Icon(
                  Icons.lightbulb_rounded,
                  color: AppColors.reflectionAccent,
                ),
              ),
              const SizedBox(width: 11),
              Expanded(
                child: Text(
                  _reflectionSummary(reflection),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 13,
                    height: 1.4,
                    color: Color(0xFF3A4557),
                  ),
                ),
              ),
              const SizedBox(width: 5),
              const Icon(
                Icons.chevron_right_rounded,
                color: AppColors.mutedIcon,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPeriodOverview({
    required int memoryCount,
    required int reflectionCount,
    required int completedTaskCount,
  }) {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.symmetric(
            horizontal: 14,
            vertical: 16,
          ),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(18),
          ),
          child: Row(
            children: [
              Expanded(
                child: _statItem(
                  value: '$memoryCount',
                  label: '次记录',
                  color: AppColors.memoryAccent,
                ),
              ),
              _verticalDivider(),
              Expanded(
                child: _statItem(
                  value: '$reflectionCount',
                  label: '次反思',
                  color: AppColors.reflectionAccent,
                ),
              ),
              _verticalDivider(),
              Expanded(
                child: _statItem(
                  value: '$completedTaskCount',
                  label: '项已完成',
                  color: AppColors.taskAccent,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 8),
        Align(
          alignment: Alignment.centerRight,
          child: TextButton(
            onPressed: () => widget.onNavigateToTab(3),
            child: const Text('查看回顾 →'),
          ),
        ),
      ],
    );
  }

  Widget _statItem({
    required String value,
    required String label,
    required Color color,
  }) {
    return Column(
      children: [
        Text(
          value,
          style: TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.w800,
            color: color,
          ),
        ),
        const SizedBox(height: 3),
        Text(
          label,
          style: const TextStyle(
            fontSize: 11,
            color: AppColors.neutral,
          ),
        ),
      ],
    );
  }

  Widget _verticalDivider() {
    return Container(
      width: 1,
      height: 34,
      color: const Color(0xFFECEFF4),
    );
  }

  Widget _softEmptyCard({
    required IconData icon,
    required String text,
  }) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(
        horizontal: 16,
        vertical: 20,
      ),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.72),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Row(
        children: [
          Icon(
            icon,
            color: AppColors.mutedIcon,
            size: 23,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(
                fontSize: 13,
                color: AppColors.neutral,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

enum _RecentType {
  memory,
  photo,
}

class _RecentItem {
  const _RecentItem._({
    required this.type,
    required this.time,
    this.memory,
    this.photo,
  });

  factory _RecentItem.memory(Memory memory) {
    return _RecentItem._(
      type: _RecentType.memory,
      time: memory.createdAt,
      memory: memory,
    );
  }

  factory _RecentItem.photo(Photo photo) {
    return _RecentItem._(
      type: _RecentType.photo,
      time: photo.takenAt,
      photo: photo,
    );
  }

  final _RecentType type;
  final DateTime time;
  final Memory? memory;
  final Photo? photo;
}
