// lib/providers/reflection_provider.dart
// 反思 Provider：管理草稿、检索上下文、选择记忆/照片、生成与保存反思
import 'dart:convert';
import 'package:flutter/foundation.dart' hide Summary;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:ai_life_recorder/models/reflection_draft.dart';
import 'package:ai_life_recorder/repositories/repositories.dart';
import 'package:ai_life_recorder/models/context_pack.dart';
import 'package:ai_life_recorder/utils/context_retrieval.dart';
import 'package:ai_life_recorder/models/memory.dart';
import 'package:ai_life_recorder/models/photo.dart';
import 'package:ai_life_recorder/models/task.dart';
import 'package:ai_life_recorder/models/summary.dart';
import 'package:ai_life_recorder/models/reflection.dart';
import 'package:ai_life_recorder/models/reflection_summary.dart';
import 'package:ai_life_recorder/models/generation_result.dart';
import 'package:ai_life_recorder/services/reflection_service.dart';
import 'package:ai_life_recorder/constants/enums.dart';
import 'package:uuid/uuid.dart';

/// 编辑状态枚举
enum ReflectionEditState {
  editing,
  searching,
  contextLoaded,
  contextEmpty,
  error,
}

/// 提交状态枚举
enum ReflectionSubmitState { callingAi, success, needsManualConfirm, aiError }

/// 保存模式（V2 审查：替代无语义 bool userConfirmedPath）
enum ReflectionSaveMode { automatic, manualConfirmation, editedByUser }

/// 反思 Provider
class ReflectionProvider extends ChangeNotifier {
  static const String _draftPrefsKey = 'reflection_draft_json';

  final Repositories repos;
  final ReflectionService? _service;

  ReflectionDraft _draft = ReflectionDraft(eventDescription: '');
  Reflection? _editingReflection;
  Reflection? get editingReflection => _editingReflection;
  bool get isEditingReflection => _editingReflection != null;
  ReflectionEditState _state = ReflectionEditState.editing;
  ContextPack? _pack;
  ReflectionGenerationResult? _lastResult;
  ReflectionSubmitState? _submitState;

  final Set<String> _selectedMemoryIds = <String>{};
  final Set<String> _selectedPhotoIds = <String>{};

  ReflectionProvider({required this.repos, ReflectionService? service})
      : _service = service {
    _loadDraftFromPrefs();
  }

  ReflectionDraft get draft => _draft;
  ReflectionEditState get state => _state;
  ContextPack? get pack => _pack;
  ReflectionSubmitState? get submitState => _submitState;
  set submitState(ReflectionSubmitState? v) {
    _submitState = v;
    notifyListeners();
  }

  ReflectionGenerationResult? get lastResult => _lastResult;

  Set<String> get selectedMemoryIds => Set.unmodifiable(_selectedMemoryIds);
  Set<String> get selectedPhotoIds => Set.unmodifiable(_selectedPhotoIds);

  Future<void> _loadDraftFromPrefs() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_draftPrefsKey);
      if (raw == null || raw.isEmpty) return;
      final decoded = json.decode(raw);
      if (decoded is! Map) return;
      final map = Map<String, dynamic>.from(decoded);
      _draft = ReflectionDraft(
        eventDescription: map['eventDescription'] as String? ?? '',
        emotion: map['emotion'] as String?,
        actionTaken: map['actionTaken'] as String?,
        result: map['result'] as String?,
        tags: (map['tags'] as List<dynamic>?)
                ?.map((e) => e.toString())
                .toList() ??
            <String>[],
      );
      notifyListeners();
    } catch (e) {
      debugPrint('ReflectionProvider._loadDraftFromPrefs error: $e');
    }
  }

  Future<void> _saveDraftToPrefs() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final map = <String, dynamic>{
        'eventDescription': _draft.eventDescription,
        'emotion': _draft.emotion,
        'actionTaken': _draft.actionTaken,
        'result': _draft.result,
        'tags': _draft.tags,
      };
      await prefs.setString(_draftPrefsKey, json.encode(map));
    } catch (e) {
      debugPrint('ReflectionProvider._saveDraftToPrefs error: $e');
    }
  }

  Future<void> _clearDraftPrefs() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_draftPrefsKey);
    } catch (e) {
      debugPrint('ReflectionProvider._clearDraftPrefs error: $e');
    }
  }

  /// 编辑模式：用已有反思预填草稿（Reflection 无 tags，编辑时标签留空由用户重填）
  void loadReflectionIntoDraft(Reflection reflection) {
    _editingReflection = reflection;
    _draft = ReflectionDraft(
      eventDescription: reflection.eventDescription,
      emotion: reflection.emotion,
      actionTaken: reflection.actionTaken,
      result: reflection.result,
      tags: const <String>[],
    );
    notifyListeners();
  }

  void updateDraft({
    String? eventDescription,
    String? emotion,
    String? actionTaken,
    String? result,
    List<String>? tags,
  }) {
    _draft = _draft.copyWith(
      eventDescription: eventDescription,
      emotion: emotion,
      actionTaken: actionTaken,
      result: result,
      tags: tags,
    );
    _state = ReflectionEditState.editing;
    _saveDraftToPrefs();
    notifyListeners();
  }

  Future<void> searchContext() async {
    if (!_draft.isValid) {
      throw StateError('草稿无效');
    }
    _state = ReflectionEditState.searching;
    notifyListeners();
    try {
      final DateTime now = DateTime.now();
      final DateTime from90 = now.subtract(const Duration(days: 90));
      final DateTime from30 = now.subtract(const Duration(days: 30));
      final DateTime to = now;

      final List<Memory> memories =
          await repos.memories.list(from: from90, to: to);
      final List<Photo> photos = await repos.photos.listByRange(from90, to);

      final List<Summary> allSummaries = await repos.summaries.listAll();
      final List<Summary> summaries =
          allSummaries.where((s) => s.createdAt.isAfter(from90)).toList();

      final List<Task> allTasks = await repos.tasks.listByStatus(null);
      final List<Task> tasks = allTasks.where((t) {
        final bool isDone = t.status == TaskStatus.done;
        if (!isDone) {
          return true;
        }
        final DateTime? completedTime = t.feedback.completedTime;
        if (completedTime == null) {
          return false;
        }
        return completedTime.isAfter(from30);
      }).toList();

      final ContextPack resultPack = buildContextPack(
        eventDescription: _draft.eventDescription,
        emotion: _draft.emotion,
        actionTaken: _draft.actionTaken,
        result: _draft.result,
        tags: _draft.tags,
        memories: memories,
        photos: photos,
        tasks: tasks,
        summaries: summaries,
      );

      _pack = resultPack;
      final bool isEmpty = resultPack.memories.isEmpty &&
          resultPack.photos.isEmpty &&
          resultPack.tasks.isEmpty &&
          resultPack.summaries.isEmpty;
      _state = isEmpty
          ? ReflectionEditState.contextEmpty
          : ReflectionEditState.contextLoaded;
      notifyListeners();
    } catch (e) {
      _state = ReflectionEditState.error;
      notifyListeners();
    }
  }

  /// 生成反思：调用服务，按结果流转状态
  Future<void> generateReflection() async {
    if (!_draft.isValid) return;
    if (_service == null) return;

    _submitState = ReflectionSubmitState.callingAi;
    notifyListeners();

    try {
      final ContextPack packToUse = _pack ?? ContextPack();
      final ReflectionGenerationResult result =
          await _service.generate(draft: _draft, pack: packToUse);
      _lastResult = result;

      if (result.outcome == GenerationOutcome.passed &&
          result.summary != null) {
        await saveReflection(
            summary: result.summary!, existingId: _editingReflection?.id);
        _submitState = ReflectionSubmitState.success;
        _clearDraftPrefs();
      } else if (result.outcome == GenerationOutcome.needsManualConfirm) {
        _submitState = ReflectionSubmitState.needsManualConfirm;
      } else {
        _submitState = ReflectionSubmitState.aiError;
      }
      notifyListeners();
    } catch (e) {
      debugPrint('generateReflection 异常: $e');
      _submitState = ReflectionSubmitState.aiError;
      notifyListeners();
    }
  }

  /// 保存反思到仓库；合并 citations 与用户勾选
  /// [existingId]：编辑模式传入原反思 id，upsert 覆盖原记录而非新建（避免历史重复）
  Future<String?> saveReflection({
    required ReflectionSummary summary,
    ReflectionSaveMode mode = ReflectionSaveMode.automatic,
    String? existingId,
  }) async {
    try {
      final List<String> citedMemoryIds = summary.citations.memoryIds;
      final List<String> citedPhotoIds = summary.citations.photoIds;
      final Set<String> relatedMemoryIds = {
        ...citedMemoryIds,
        ..._selectedMemoryIds
      };
      final Set<String> relatedPhotoIds = {
        ...citedPhotoIds,
        ..._selectedPhotoIds
      };

      final Reflection? original = _editingReflection;
      final String id = existingId ?? original?.id ?? const Uuid().v4();
      final Reflection reflection = Reflection(
        id: id,
        eventDescription: _draft.eventDescription,
        emotion: _draft.emotion,
        actionTaken: _draft.actionTaken,
        result: _draft.result,
        aiSummary: summary.toJson(),
        relatedMemoryIds: relatedMemoryIds.toList(),
        relatedPhotoIds: relatedPhotoIds.toList(),
        relatedTaskIds: const [],
        relatedSummaryIds: const [],
        isUserConfirmed: mode == ReflectionSaveMode.manualConfirmation ||
            mode == ReflectionSaveMode.editedByUser,
        createdAt: original?.createdAt ?? DateTime.now(),
      );
      await repos.reflections.upsert(reflection);
      return id;
    } catch (e) {
      debugPrint('saveReflection 异常: $e');
      return null;
    }
  }

  /// 人工确认后保存（userConfirmedPath=true），成功后重置
  Future<void> confirmAndSave(
      {required ReflectionSummary editedSummary}) async {
    try {
      await saveReflection(
          summary: editedSummary, mode: ReflectionSaveMode.manualConfirmation);
      _submitState = ReflectionSubmitState.success;
      reset();
      notifyListeners();
    } catch (e) {
      debugPrint('confirmAndSave 异常: $e');
      _submitState = ReflectionSubmitState.aiError;
      notifyListeners();
    }
  }

  /// 用户编辑 AI 输出后保存（editedByUser，视为人工确认）
  Future<String?> saveEdited(ReflectionSummary summary) =>
      saveReflection(
          summary: summary,
          mode: ReflectionSaveMode.editedByUser,
          existingId: _editingReflection?.id);

  /// aiError 时重试
  Future<void> retryGenerate() async {
    if (_submitState == ReflectionSubmitState.aiError) {
      await generateReflection();
    }
  }

  /// 删除反思
  Future<void> delete(String id) async {
    try {
      await repos.reflections.delete(id);
    } catch (e) {
      debugPrint('ReflectionProvider.delete error: $e');
    }
  }

  void selectMemory(String id) {
    _selectedMemoryIds.add(id);
    notifyListeners();
  }

  void deselectMemory(String id) {
    _selectedMemoryIds.remove(id);
    notifyListeners();
  }

  void selectPhoto(String id) {
    _selectedPhotoIds.add(id);
    notifyListeners();
  }

  void deselectPhoto(String id) {
    _selectedPhotoIds.remove(id);
    notifyListeners();
  }

  void reset() {
    _draft = ReflectionDraft(eventDescription: '');
    _state = ReflectionEditState.editing;
    _pack = null;
    _submitState = null;
    _editingReflection = null;
    _selectedMemoryIds.clear();
    _selectedPhotoIds.clear();
    _clearDraftPrefs();
    notifyListeners();
  }
}