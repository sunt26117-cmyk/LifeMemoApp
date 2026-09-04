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


═══════════════════════════════════════
# Claude 任务执行指引（TASK-EXT 拆解版）

配合 API-SIGNATURES-REFERENCE.md 使用。以下是交给 Claude 执行的 7 个任务，每个给出：
- 涉及/新建文件
- 需复用的现有 API（已在签名文档）
- 关键实现要点
- 测试要求
通用约束：开工先读现有代码；不引新状态管理；不破坏现有功能；DB 兼容迁移；不确定写注释疑问。

═══════════════════════════════════════
## TASK-EXT-01｜打卡类型与打卡记录数据模型 + Supabase schema

新建文件：
- lib/models/check_in_type.dart → class CheckInType
- lib/models/check_in_record.dart → class CheckInRecord
- lib/repositories/check_in_repository.dart → CheckInRepository + SupabaseCheckInRepository + InMemoryCheckInRepository
修改：lib/repositories/repositories.dart（加 final CheckInRepository checkIns; + 两工厂）+ supabase/schema.sql（新增表）

类设计（字段为 snake_case DB 键）：
class CheckInType {
  final String id; final String symbol; // emoji 如 📖
  final String label; // 中文，限 3 字符，数据层+UI 层校验
  final int sortOrder; final bool enabled; final DateTime createdAt; final DateTime updatedAt;
  // 无物理删除——只有 enabled 切换 + 编辑 symbol/label/sortOrder
}
class CheckInRecord {
  final String id; final DateTime date; // 打卡日期（存 UTC 或 localDate，注释说明选择）
  final String typeId; final String? taskId; // 来源标记，非外键生命周期
  final String symbolSnapshot; final String labelSnapshot; // 防类型改名后历史漂移
  final DateTime createdAt; final DateTime updatedAt;
}

Supabase 新增表（不删不改现有列）：
create table if not exists check_in_types (
  id uuid primary key default gen_random_uuid(),
  symbol text not null, label text not null, sort_order int default 0,
  enabled boolean default true, created_at timestamptz default now(), updated_at timestamptz default now());
create table if not exists check_in_records (
  id uuid primary key default gen_random_uuid(),
  date date not null, type_id uuid not null, task_id uuid,
  symbol_snapshot text not null, label_snapshot text not null,
  created_at timestamptz default now(), updated_at timestamptz default now());
alter table check_in_types disable row level security;
alter table check_in_records disable row level security;
（不建 task_id 外键级联——删除任务不得级联删打卡记录，task_id 仅作来源标记，代码注释说明）

核心业务规则：
1. 系统初始化 5 个默认类型：📖学习 🏃运动 🚶散步 🧘冥想 📚阅读（App 首次启动/工厂初始化时 seed）
2. 同一天同一 typeId 只能一条最终记录——写入时按 (date, type_id) upsert 覆盖，不追加
3. 停用类型不禁用历史查询（record 存 snapshot，查询记录不需要类型 enabled）
4. CheckInRecord 物理删除仅当用户清空当天打卡（不是删除类型）

测试要求：
- 初始化 5 类型（含 label 排序/去重）
- label 超 3 字符（如"学习打卡"4字）校验失败（model 层抛/返回 false）
- 停用后仍可通过历史记录查到 symbolSnapshot
- 同一天同 typeId 二次写入 → 覆盖而非新增行（InMemory + Supabase 都测）

═══════════════════════════════════════
## TASK-EXT-02｜打卡类型管理 UI（编辑/停用/启用）

新建：lib/screens/checkin/check_in_manage_screen.dart
修改：入口从设置或首页挂入（建议 SettingsScreen 加一项"打卡管理"，注释说明挂哪）

页面：
- 列表展示 CheckInType（symbol + label + enabled 状态）
- 点击编辑：改 symbol（emoji）/label（≤3字校验）→ 保存
- 停用/启用按钮切换 enabled
- 无"删除"入口（关键约束）

逻辑：
- 选择面板（TASK-EXT-03 用）只显示 enabled=true 的类型
- 停用后历史记录查询照常（不依赖 enabled）
- 重新启用后可再次被选择

测试：停用后选择面板不含该类型；停用不影响历史查询；启用后可再选。

═══════════════════════════════════════
## TASK-EXT-03｜日历打卡交互与日期权限

新建：lib/screens/checkin/check_in_calendar_screen.dart（或作为首页区块）
涉及：home_screen.dart 的"今天"页可加"打卡"入口（onNavigateToTab 已有；可 push 新页）

核心规则（精确实现，勿简化）：
1. 日历点击某天 → 弹出**底部多选面板**（只显示 symbol 不显示文字，多个类型 chip 可多选）
2. **覆盖式提交**：提交 = 完全替换当天集合；全部取消 = 清空当天
   - 实现：读当天已有 records → 用户选中集合 → 差异处理：新增缺的、删除多的（或直接删除当天全部再插入选中集合，二选一注释说明）
3. **今天**：可增/改/清空
4. **过去**：只读——点击过去日期可查看当天打卡（显示 symbol），但 UI 不进编辑态（不弹多选/禁用提交）
5. **未来**：不可打卡——点击未来日期提示不可用（或入口禁用）
6. 日历下显示当天已打卡 symbol 集合（只显示符号）

UI：日历可用 table_calendar ？不在白名单 → **用 Flutter 原生自己画月历**（GridView 7列，简洁月历组件），不引新包。若太复杂可先做"今天打卡面板"（今天的多选+符号展示）作为第一步，日历浏览后续（注释说明分期）。

测试：今天多选提交后日历下显示符号；今天二次选择覆盖旧态；全部取消清空；点过去只读不可编辑；点未来禁打。

═══════════════════════════════════════
## TASK-EXT-04｜任务-打卡关联 + 自动打卡 + 删除任务保护历史 + 移除预计时长

修改文件：
- lib/models/task.dart（Task 加字段 List<String> checkInTypeIds 默认 []，toJson/fromJson/copyWith 同步）——DB 不动（存 task 内 jsonb 不需要；若 tasks 表有该列需求才加列，优先复用 steps/feedback 同款 jsonb 思路注释说明）
- lib/screens/task/task_edit_screen.dart（表单加"打卡类型"多选）
- lib/services/task_service.dart（完成状态 changeStatus → done 分支：若 task.checkInTypeIds 非空 → 为每个 typeId 生成当天 CheckInRecord，taskId 指向该 task；通过新注入的 onCheckInGenerated 回调或直接经 repository——不破坏现有 onTaskEventHandler）
- lib/repositories/repositories.dart（TaskService 可能需要 CheckInRepository 依赖——设计注入方式，注释说明）
- UI 移除"预计时长(estimated_minutes)"输入/展示（保留字段不删，仅不展示）

关键约束：
1. 任务编辑页"打卡类型"多选（从 CheckInType enabled 类型里选，默认不选）
2. 任务状态→已完成时：关联了打卡类型 → 自动为当天生成 CheckInRecord(taskId=该task)。用户仍可日历独立打卡，互不阻塞（同 typeId 同天 upsert 覆盖，自动和手动都走同一去重）
3. 删除任务（TaskProvider.delete/TaskRepository.delete）**不级联删 CheckInRecord**——taskId 保留，无外键
4. 预计时长字段：任务表单移除展示；模型字段保留兼容旧数据

测试：任务完成→生成对应打卡记录；删除任务后原 CheckInRecord 仍可查且字段完整；UI 无"预计时长"；含旧 estimated_minutes 数据任务正常读取。

═══════════════════════════════════════
## TASK-EXT-06｜成长曲线可视化（周/月/年）+ AI 自然语言成长分析

修改：lib/services/annual_service.dart 模式参考（现有 AI 链）；新建 lib/services/growth_visualizer.dart / lib/screens/trend/（可复用现有 trend 屏风格）
说明：本任务依赖 TASK-EXT-05 GrowthScore（已由 Claude 单独交付，GrowthScore ∈ [-100,100] 序列驱动）。请按你已写的 GrowthScore API 对接，勿重复实现引擎。

要求：
1. 周视图（近几周坡度曲线）/月视图（每周连成曲线）/年视图（每月连成曲线）——**平滑曲线**，禁热力图/打卡图/多线堆叠/密集坐标轴
2. 用 fl_chart（已依赖，LineChart 平滑 via isCurved）
3. AI 自然语言分析：走现有 AI 调用链（见 ai_client/prompts 模式），输出温和文本，无"落后/失败"压力词

测试：三档聚合函数计算正确；AI 文本非空且不含黑名单词。

═══════════════════════════════════════
## TASK-EXT-07｜照片发布可选定位

修改：lib/models/photo.dart（可选加 address/coords 存 metadata 或新字段——倾向放 metadata jsonb 不加列，注释说明）；lib/screens/photo/photo_timeline_screen.dart（发布流程）
依赖：定位权限 geolocator 不在白名单 → 需新增依赖，**先注明待用户批准**；或用现有 permission_handler 判断定位权限（可查 permission_handler 是否支持 location——支持则用现有包）
规则：
1. 只有用户点"添加位置"才请求定位权限（启动/进发布页不请求）
2. 拒绝定位 → 允许手动输入地址文本
3. 不加地址也能保存照片（定位完全可选）

═══════════════════════════════════════
## TASK-EXT-10｜反思生物识别锁

依赖：local_auth 不在白名单 → 需新增依赖，**先注明待批准**
修改：反思入口（HomeScreen"最近反思"按钮 push ReflectionListScreen 前）调生物识别
规则：验证成功才进入反思；失败不进入；不自制指纹 UI；不保存生物特征
测试：mock local_auth 失败不跳转；成功正常跳转。
