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
