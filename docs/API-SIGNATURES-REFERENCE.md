# 项目现有 API 签名速查（供 Claude 编写 TASK-EXT-01/02/03/04/06/07/10 参考）

项目：AI Life Recorder（Flutter 3.22 / Dart 3.4 / Provider / Supabase）
说明：以下是从真实源码提取的现有类/构造/方法签名，写"改动段"代码时**必须复用这些签名，不得臆造**。
通用约束：不引入 Bloc/Riverpod/GetX/Redux；继续 Provider+Repository+Service；不破坏现有功能；数据库变更做兼容迁移；不确定写注释疑问。

═══════════════════════════════════════
## 0. 技术栈与依赖（pubspec.yaml 白名单）
provider, dio, supabase_flutter, shared_preferences, intl, image_picker, image, path_provider, permission_handler, uuid, flutter_dotenv, fl_chart, flutter_animate
测试：flutter_test, mocktail
（TASK-EXT-07 照片定位 / TASK-EXT-10 生物识别 若需新依赖如 geolocator/local_auth，先注明再评估，不擅自加）

## 1. 枚举（lib/constants/enums.dart）
enum TaskCategory { communication('沟通'), learning('学习'), health('健康'), project('项目'), emotion('情绪'), habit('习惯'), planning('规划'); ... }
  - 每个枚举有: const Xxx(this.value); final String value; static Xxx fromString(String s); static List<String> get valuesList
enum TaskStatus { todo('未开始'), inProgress('进行中'), done('已完成'), delayed('延期'), cancelled('取消'); }
enum TaskPriority { high('高'), medium('中'), low('低'); }
enum RepeatRule { none('无'), daily('每天'), weekly('每周'), monthly('每月'), custom('自定义'); }
enum Emotion { calm('平静'), happy('开心'), nervous('紧张'), anxious('焦虑'), angry('愤怒'), sad('难过'), tired('疲惫'), excited('兴奋'), satisfied('满足'), other('其他'); }
enum SummaryType { weekly('周'), monthly('月'), yearly('年'); }
enum DelayType { external('外部'), internal('内部'), avoidance('逃避'); }
enum CancelType { proactive('主动'), passive('被动'), avoidance('逃避'); }
enum ThemeDirection { improving('改善'), stable('稳定'), worsening('恶化'); }

## 2. 颜色（lib/constants/app_colors.dart）
class AppColors { AppColors._();
  static const Color primary = Color(0xFF57B8E3);  // 天蓝
  static const Color background = Color(0xFFFFF8F2); // 奶白
  static const Color neutral = Color(0xFF98A3B3);
  static const Color card = Colors.white;
  static const Color success = Color(0xFF4FBF95);  // 薄荷绿
  static const Color warning = Color(0xFFFF9A5A);
  static const Color error = Color(0xFFFF6B81);
  static const Color accent = Color(0xFFB39DDB);
  static const Color softPink = Color(0xFFFF9EC5);
  static const Color softYellow = Color(0xFFFFD76A);
  static const Color mint = Color(0xFF7ED9B7);
  static const Color creamOrange = Color(0xFFFFB07C);
  static const Color lavender = Color(0xFFB39DDB);
  static const Color primaryLight = Color(0xFFAEE3F5);
  static const Color mutedIcon = Color(0xFFB9C4D6);
  static const Color memoryAccent = mint;       // 记忆=薄荷绿
  static const Color photoAccent = creamOrange; // 照片=奶油橙
  static const Color reflectionAccent = lavender;
  static const Color taskAccent = primary;
  static const Color summaryAccent = softYellow;
  static const List<Color> primaryGradient = [Color(0xFF82D3F0), Color(0xFF4AA8D8)];
  static const List<Color> memoryGradient = [Color(0xFFB2EBD4), Color(0xFF6BC9A0)];
  static const List<Color> photoGradient = [Color(0xFFFFD6B0), Color(0xFFFF9F6E)];
  static const List<Color> reflectionGradient = [Color(0xFFDBCBF6), Color(0xFFAE91DF)];
  static const List<Color> taskGradient = [Color(0xFFC1E8F8), Color(0xFF60B5DD)];
  static const List<Color> summaryGradient = [Color(0xFFFFEDB0), Color(0xFFFFCE68)];
  static const List<Color> pageBackgroundGradient = [Color(0xFFFFFBF6), Color(0xFFF1F7FF)];
}

═══════════════════════════════════════
## 3. 模型（lib/models/）

### task.dart
class TaskStep { final String content; final bool done; TaskStep({required this.content, this.done=false}); factory TaskStep.fromJson(Map); Map toJson(); TaskStep copyWith({content, done}); }
class TaskFeedback {
  final DelayType? delayType; final CancelType? cancelType; final String? reason;
  final DateTime? actualStartTime; final DateTime? completedTime; final int? executionDurationMinutes;
  final List<String> behaviorImprovement;
  TaskFeedback({delayType, cancelType, reason, actualStartTime, completedTime, executionDurationMinutes, List<String>? behaviorImprovement});
  factory TaskFeedback.fromJson(Map?); Map toJson(); TaskFeedback copyWith({...});
}
class Task {
  final String id; final String title; final String? description; final TaskCategory category;
  final TaskPriority priority; final DateTime? startTime; final DateTime? dueTime; final DateTime? reminderTime;
  final RepeatRule repeatRule; final int? estimatedMinutes; final TaskStatus status;
  final List<TaskStep> steps; final String? sourceReflectionId; final TaskFeedback feedback; final DateTime createdAt;
  Task({required id, required title, description, required category, required priority, startTime, dueTime, reminderTime,
       required repeatRule, estimatedMinutes, required status, List<TaskStep>? steps, sourceReflectionId, TaskFeedback? feedback, DateTime? createdAt});
  factory Task.fromJson(Map<String, dynamic> map); Map<String, dynamic> toJson(); Task copyWith({...});
}

### memory.dart
class Memory { final String id; final String? title; final String content; final List<String> tags; final String? aiSummary; final List<String> relatedMediaIds; final DateTime createdAt; Memory({...}); factory fromJson; Map toJson; copyWith; }

### photo.dart
class Photo {
  final String id; final String localPath; final DateTime takenAt; final String? aiSummary;
  final bool summaryConfirmed; final List<String> tags; final List<String> relatedMemoryIds;
  final Map<String, dynamic> metadata; final DateTime createdAt;
  Photo({required id, required localPath, required takenAt, aiSummary, summaryConfirmed=false, tags, relatedMemoryIds, metadata, createdAt});
  factory fromJson; Map toJson; Photo copyWith({...});
}

### reflection.dart / summary.dart / trend.dart / theme.dart
Reflection: id, eventDescription, emotion?, actionTaken?, result?, aiSummary(Map?) , relatedMemoryIds/PhotoIds/TaskIds/SummaryIds, isUserConfirmed, createdAt
Summary: id, type(SummaryType), periodStart, periodEnd, content?, themes[], trends(Map), highlights[], taskSuggestions[], chartData(Map), createdAt
Trend/Theme: 各含 id/name/category(theme)/score/direction/weight/evidence/cluster/updatedAt

═══════════════════════════════════════
## 4. Repository 层（lib/repositories/）— 唯一允许 import supabase 的层

### task_repository.dart
abstract class TaskRepository {
  Future<void> upsert(Task t); Future<void> delete(String id); Future<Task?> getById(String id);
  Future<List<Task>> listByStatus(TaskStatus? status); Future<List<Task>> listByCategory(TaskCategory? category);
  Future<void> updateFeedback(String id, TaskFeedback feedback); Future<List<Task>> list({DateTime? from, DateTime? to});
}
class SupabaseTaskRepository implements TaskRepository { SupabaseTaskRepository(this.client); final SupabaseClient client; /* postgrest 直接 await，无 .execute() */ }
class InMemoryTaskRepository implements TaskRepository { final List<Task> _store = []; }

### memory/photo/reflection/summary/trend/theme_repository.dart — 同模式
MemoryRepository: upsert/delete/getById/list({tags,keyword,from,to,limit,offset})/updateSummary
PhotoRepository: upsert/delete/listByRange(from,to)/confirmSummary
ReflectionRepository: upsert/delete/getById/list({from,to})
SummaryRepository: upsert/delete/getByPeriod(type,periodStart)/listAll
ThemeRepository: upsertByName(ThemeItem)/listAll
TrendRepository: upsertByName(Trend)/listAll

### repositories.dart（聚合工厂）
class Repositories {
  final MemoryRepository memories; final PhotoRepository photos; final ReflectionRepository reflections;
  final TaskRepository tasks; final SummaryRepository summaries; final TrendRepository trends; final ThemeRepository themes;
  Repositories({required ...});  // 7 个都 required
  factory Repositories.supabase();   // 用 Supabase.instance.client
  factory Repositories.inMemory();   // 全部 InMemory
}

═══════════════════════════════════════
## 5. Provider 层（lib/providers/）

### task_provider.dart
class TaskProvider extends ChangeNotifier {
  TaskProvider({required TaskRepository repository, TaskService? service});
  List<Task> get tasks;  // 过滤 status/category + 排序后的列表
  Future<void> load(); Future<void> refresh(); Future<void> save(Task task); Future<void> delete(String id);
  Future<Task> changeStatus(Task task, TaskStatus to, {DelayType? delayType, CancelType? cancelType, String? reason, List<String>? behaviorImprovement, DateTime? now});
  void setFilterStatus(TaskStatus?); void setFilterCategory(TaskCategory?); void setSortBy(TaskSort);
}

### memory_provider.dart
class MemoryProvider extends ChangeNotifier {
  MemoryProvider({required MemoryRepository repository, MemoryAi? memoryAi});
  List<Memory> get memories; List<String> get allTags;
  Future<void> load(); Future<void> loadMore(); Future<Memory?> save({String? id, String? title, required String content, required List<String> tags});
  Future<void> retrySummary(String id); Future<void> delete(String id); Future<void> updateSummary(String id, String aiSummary);
}

### photo_provider.dart
class PhotoProvider extends ChangeNotifier {
  PhotoProvider({required PhotoRepository repository, Future<String> Function(Photo photo)? summaryGenerator});
  List<Photo> get photos; Photo? byId(String id);
  Future<void> load(); Future<void> addPhoto(Photo p); Future<void> deletePhoto(String id);
  Future<void> setSummary(String id, String summary); Future<void> confirmSummary(String id); Future<void> generateSummary(Photo p);
}

═══════════════════════════════════════
## 6. Service 层（lib/services/）

### task_service.dart
class TaskTransitionEvent { TaskTransitionEvent({...}); }  // 事件含 eventId/taskId/taskTitle/fromStatus/toStatus/delayType/cancelType/categoryValue/behaviorImprovement/time
class TaskService {
  TaskService({required TaskRepository repository, void Function(TaskTransitionEvent event)? onTaskEventHandler});
  void Function(TaskTransitionEvent event)? onTaskEvent;
  Future<Task> changeStatus(Task task, TaskStatus to, {DelayType? delayType, CancelType? cancelType, String? reason, List<String>? behaviorImprovement, DateTime? now});
  // 状态机：合法转换（未开始→进行中/已完成/延期/取消；进行中→已完成/延期/取消；延期→进行中/取消；已完成/取消=终态）；非法抛 InvalidTransitionException
  // 副作用：→进行中记 actualStartTime；→已完成记 completedTime/executionDuration/behaviorImprovement；→延期必填 DelayType+原因；→取消必填 CancelType+原因
}

═══════════════════════════════════════
## 7. main.dart（lib/main.dart）
- main(): await Env.load() → await KeyStore.instance.init() → 判断 online → Supabase.initialize(url, publishableKey) → Repositories.supabase()/inMemory()
- MultiProvider providers 顺序：
  Provider<Repositories>.value, ChangeNotifierProvider<AppState>, ChangeNotifierProvider<MemoryProvider>, ChangeNotifierProvider<PhotoProvider>, ChangeNotifierProvider<TaskProvider>, Provider<SummaryService>, Provider<TrendEngine>, ChangeNotifierProvider<ReflectionProvider>, Provider<AnnualService>
- AI 注入统一用 AiClient(apiKey: KeyStore.instance.apiKey)
- 4 Tab：今天(HomeScreen)/记录(RecordsScreen)/任务(TaskListScreen)/回顾(SummaryListScreen)
- HomeShell: NavigationBar 4 destination，_navigateToTab(int) 切 Tab，IndexedStack

═══════════════════════════════════════
## 8. Supabase schema（supabase/schema.sql，已有表）
memories(id uuid pk default gen_random_uuid, title text, content text not null, tags text[] default '{}', ai_summary text, related_media_ids uuid[] default '{}', created_at timestamptz)
photos(id uuid pk, local_path text not null, taken_at timestamptz not null, ai_summary text, summary_confirmed boolean default false, tags text[] default '{}', related_memory_ids uuid[] default '{}', metadata jsonb default '{}', created_at timestamptz)
reflections(id uuid pk, event_description text not null, emotion text, action_taken text, result text, ai_summary jsonb, related_memory_ids/photo_ids/task_ids/summary_ids uuid[] default '{}', is_user_confirmed boolean default false, created_at timestamptz)
tasks(id uuid pk, title text not null, description text, category text not null, priority text default '中', start_time/due_time/reminder_time timestamptz, repeat_rule text default '无', estimated_minutes int, status text default '未开始', steps jsonb default '[]', source_reflection_id uuid, feedback jsonb default '{}', created_at timestamptz)
summaries(id uuid pk, type text not null, period_start date not null, period_end date not null, content text, themes text[] default '{}', trends jsonb default '{}', highlights text[] default '{}', task_suggestions text[] default '{}', chart_data jsonb default '{}', created_at timestamptz)
trends / themes: id pk, name/trend_name, category, score numeric default 0, direction text default '稳定', weight numeric default 0, evidence jsonb default '[]', updated_at
（RLS 已全部关闭；新表若加建议同款 disable row level security）

═══════════════════════════════════════
## 9. 页面结构（lib/screens/）— 新功能页面的接入点
- home/  : HomeScreen（今天页，含"最近发生/今日任务"等，新增打卡入口可从这挂）
- record/ : RecordsScreen（记录页：全部/文字/照片 分段）
- task/  : TaskListScreen（今天/即将/全部+分类折叠）、TaskEditScreen（编辑，12字段表单，任务01-04会改这里）
- summary/: SummaryListScreen（回顾：周/月/年Tab）
- reflection/: ReflectionEditScreen/ListScreen/DetailScreen
- settings/ : SettingsScreen
- 导航：HomeShell 4 Tab；页面间 push MaterialPageRoute
