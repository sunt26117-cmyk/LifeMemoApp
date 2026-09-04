# 重构派单：4 Tab 信息架构改版（今天/记录/任务/回顾）

项目：AI Life Recorder 生活记录（Flutter 3.22 / Dart 3.4 / Provider / Supabase）

## 0. 背景与动机（为什么改）
用户（App 实际使用者）反馈了当前版本的三个核心痛点：
1. 首页太空：首页只有 记忆/照片 两张入口卡片，打开 App 没有'这是我的生活空间'的感觉，看不到今天的任务、最近的记录，利用率低。
2. 总结太乱：周/月/年三种总结混在一个列表，卡片只显示日期范围，分不清哪个是第几周/哪个月/哪年，无法回看某段时间的自己。
3. 任务分类乱：7 类任务（沟通/学习/健康/项目/情绪/习惯/规划）+ 6 状态全平铺一页，长期/短期/周期任务没有组织逻辑，看着乱。

本次改版目标：把 App 从'功能堆叠'变成个人生活空间——打开就能看到'我的今天'，记录和回顾有清晰归属，任务有逻辑地组织。这不是功能大改，是信息架构 + UI 重组。

（详细设计方案见下，请完整阅读后按第 8 节顺序实现）


项目：AI Life Recorder 生活记录（Flutter 3.22 / Dart 3.4 / Provider / Supabase）
性质：**UI 与信息架构重构**。禁止改动数据层（Model/Repository/Supabase schema/Provider 数据方法），只重组页面、导航与展示。

## 一、产品定位
私人生活记录 App，不是生产力工具/纯 Todo。
核心：记录生活 → 留住回忆 → 反思自己 → 回顾变化 → 下一步行动。
视觉：私人、轻量、有生活感、安静自然、低信息密度。
**不要做成 Notion/Todoist/项目管理 Dashboard。**

## 二、导航改版（main.dart HomeShell）
现在 5 Tab：首页/记忆/反思/任务/总结
改为 **4 Tab**：

```text
今天 | 记录 | 任务 | 回顾
```

- **今天** = 重做首页（见 §3）
- **记录** = 记忆 + 照片统一入口（见 §4）
- **任务** = 任务列表重排（见 §5）
- **回顾** = 原"总结"页升级（见 §6-10）

反思页不再是独立 Tab：反思从"记录"和"今天/最近反思"入口进入（ReflectionListScreen 保留，通过入口 push 进入）。

现有文件/类（可直接引用）：
- lib/screens/home/home_screen.dart → 重做为"今天"
- lib/screens/memory/memory_list_screen.dart（记忆列表，含搜索/标签/分页）
- lib/screens/photo/photo_timeline_screen.dart（照片时间轴，const 无参）
- lib/screens/reflection/reflection_list_screen.dart（反思列表，构造需 repository）
- lib/screens/task/task_list_screen.dart → 任务重排
- lib/screens/summary/summary_list_screen.dart（现总结列表，构造需 repository + service）→ 升级为"回顾"
- MemoryEditScreen()（记忆编辑，快速记录跳它）
- PhotoTimelineScreen()
- main.dart 的 HomeShell：IndexedStack + NavigationBar（当前 5 destination，需改 4）
- 现有 Provider：MemoryProvider/PhotoProvider/TaskProvider/ReflectionProvider/SummaryService/AnnualService

## 三、"今天"首页（原 home_screen 重做）
不要 Dashboard。核心"我的今天"。

结构（从上到下）：
1. 日期标题：2026年9月2日 · 星期三（intl）
2. **快速记录区**：两个并排操作 [写下此刻]（push MemoryEditScreen()）[拍一张照片]（push/触发照片流程）；替代原来两个大入口卡片
3. **今天的任务**：今日到期/今日相关任务数 + 前 2-3 条预览（checkbox 样式），"查看全部 →" 切到任务 Tab
4. **最近发生**：最近 2-3 条记忆 + 最近照片缩略；每条显示时间+内容摘要；"查看记录 →" 切到记录 Tab
5. **最近反思**（P1）：最近一次反思的 eventSummary 一句话；"查看反思 →" push ReflectionListScreen
6. **这段时间**（P1 简单概况）：计数行，如 12 次记录 · 4 次反思 · 18 项任务已完成；"查看回顾 →" 切回顾 Tab

实现提示：
- "今日任务"取 tasks 中 dueTime/今天相关的进行中/未开始任务（用现有 TaskProvider 数据，不要新增字段；若 dueTime 为空可用 createdAt 判断今天创建的）
- "最近发生"用 MemoryProvider.photos + photos，取最近 N 条
- 首页需要能切 Tab：HomeShell 提供切换回调（onNavigateToTab(int)）传入 HomeScreen
- 保持马卡龙可爱风（现有 AppColors 色系）

## 四、"记录"页（新增或重组）
把记忆+照片统一为"我的生活记录"，不让用户觉得是两个系统。
简单方案（不强制复杂时间轴）：一个页面，顶部 [全部] [文字] [照片] 分段，下面显示对应内容：
- 全部：记忆+照片混合时间轴（简化版：按时间倒序排文字记忆卡片和照片缩略）
- 文字：MemoryListScreen 内容
- 照片：PhotoTimelineScreen 内容

若混合时间轴实现复杂，第一阶段可用 **Tab 内嵌两个现有页面**：顶部 SegmentedButton（全部/文字/照片），文字→MemoryListScreen、照片→PhotoTimelineScreen、全部→简单混合列表。
现有入口：记忆/照片原本是各自列表页，现在都从"记录"进入；顶部可放"写记录/拍照片"快捷按钮。

## 五、"任务"页重排（task_list_screen 大改）
原则：任务是"生活中的下一步行动"，不是项目管理。

第一层：**时间** —— [今天] [即将到来] [全部] 分段，默认"今天"：
- 今天 = dueTime 在今天（或今天创建的未完成）
- 即将到来 = dueTime 在未来
- 全部 = 所有
（用现有 dueTime/createdAt，不新增字段；无 dueTime 的任务归入"全部"和"即将到来"的末尾？请定义清楚规则，倾向：无 dueTime 未完成任务放"全部"）

第二层：**状态筛选** —— 保留 6 状态但收敛为 状态：全部 ▼ 下拉（或窄 chips），不长期占满页面。

第三层：**分类 Accordion 分组** —— 保留 7 类 TaskCategory（沟通/学习/健康/项目/情绪/习惯/规划），用可折叠分组：
```text
▼ 项目  3
  □ 任务 A
  □ 任务 B
▼ 健康  1
  □ 跑步
▶ 学习  2
```
规则：
- 无任务的分类不显示
- 默认只展开前 1-2 个有内容的分类（其余折叠）
- 点分类标题展开/收起（Accordion/ExpansionTile 风格）
- 分类只是组织方式，不做 7 个一级 Tab

**组合筛选**：时间范围 → 状态过滤 → 分类过滤 → 按分类 GroupBy → 展示。例如"状态=进行中 + 分类=全部" → 按分类分组显示进行中任务。

**优先级**：只作为卡片视觉提示（高=明显红点/标记，中=正常，低=弱化），不加筛选层。

现有：TaskCategory 7 类枚举、TaskStatus 6 态、TaskPriority 3 级、Task 有 dueTime/createdAt/status/category/priority/steps/feedback。
（注意：TaskProvider 现有 tasks/filterStatus/filterCategory/sortBy 方法可复用或扩展，但别破坏现有状态机逻辑。）

## 六、"回顾"页（原总结升级，summary_list_screen 大改）
把"总结"概念升级为"回顾"，顶部三个 Tab：**[周] [月] [年]**，**绝不再混合列表**。

周/月/年分别展示，且按自然语言分组、日期人类可读（不要只显示 2026-08-24 ~ 2026-08-30）：

### 周回顾
按月份分组：
```text
周回顾
2026年9月
  2026年第35周  8月24日 — 8月30日
  2026年第34周  8月17日 — 8月23日
2026年8月
  第33周 ...
```
需要把 Summary.periodStart 换算成"ISO 周号 + 周一起止日期"的人类标题。用 intl 的 DateFormat + 自己算周号。

### 月回顾
按年份分组：
```text
2026年
  2026年8月（8月1日—8月31日）
  2026年7月
```

### 年回顾
直接按年份列表：2026年/2025年...

### Summary 卡片
不要只有 [周] 2026-08-25~31。改成人话标题 + 摘要预览：
```text
本周
2026年第35周 · 8月24日—8月30日
[content 摘要 2-3 行]
亮点：……
查看完整回顾 →   ← push 现有 SummaryDetailScreen/AnnualScreen
```
生成按钮保留：周/月/年各自的"生成"入口移到对应 Tab 内（原 PopupMenu 可保留但放到对应 tab）。

现有：SummaryType(weekly/monthly/yearly)、SummaryRepository.getByPeriod/listAll、SummaryService.generateWeekly/Monthly、AnnualService.generateAnnualSummary、SummaryDetailScreen(summary:)、AnnualScreen(summary:)、Summary 有 type/periodStart/periodEnd/content/themes/highlights/taskSuggestions/chartData/trends。

## 七、周/月/年内容定位（AI 输出侧，不改 schema）
- 周：这一周发生了什么（事件/经历/问题/行动）
- 月：这个月反复出现什么（模式/情绪/习惯/变化）
- 年：这一年变化（成长/重要事件/长期模式/年度回望）
（若现有 prompt 已接近则可微调 prompts.dart，非必须）

## 八、实施顺序建议
1. main.dart HomeShell：5 Tab → 4 Tab（今天/记录/任务/回顾）+ 页面数组重组 + Tab 切换回调
2. "今天"首页（home_screen 重做）
3. "记录"页（新页面或 Tab 容器）
4. "任务"页重排（Accordion）
5. "回顾"页重排（周/月/年 Tab）
6. 反思入口调整（从今天/记录进，删底部反思 Tab）
7. analyze 0 issues + flutter test 全绿（widget_test 的 5 Tab 断言需同步改为 4 Tab！）

## 九、重要约束
1. 不推翻 Flutter+Provider+Supabase 架构；优先复用现有 Model/Provider/Repository/API。
2. 不新增数据表/数据库字段；不改字段语义。
3. 不做复杂项目管理 UI；不做数据 Dashboard。
4. 状态+分类+优先级不要同时三层常驻筛选。
5. UI 保持私人生活感 + 现有马卡龙可爱配色（AppColors：primary/memoryAccent/photoAccent/reflectionAccent/taskAccent/summaryAccent 等）。
6. flutter analyze 0 issues；flutter test 全绿；**test/widget_test.dart 当前断言 5 个底部 Tab，需改为 4 Tab**；若其他测试断言了旧导航/页面结构，一并同步（列出改动）。
7. 输出每个改动文件的完整代码（不是 diff），用「文件路径：」标记分隔。落地后我会跑 analyze/test，报错清单回传。

## 十、已知会影响的测试
- test/widget_test.dart：启动后显示底部 5 个 Tab 断言 5 个 label（首页/记忆/反思/任务/总结）→ 改 4 Tab（今天/记录/任务/回顾）；点击任务 Tab 相关选择器可能变。
- 请先看这些测试再改，或在回复中说明你假设的测试改动点。



═══════════════════════════
## 附：重构涉及页面的【当前完整源码】（只读参考，基于此修改）

### 文件路径：lib/main.dart
```dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:ai_life_recorder/config/env.dart';
import 'package:ai_life_recorder/repositories/repositories.dart';
import 'package:ai_life_recorder/providers/memory_provider.dart';
import 'package:ai_life_recorder/ai/memory_ai.dart';
import 'package:ai_life_recorder/ai/photo_ai.dart';
import 'package:ai_life_recorder/ai/ai_client.dart';
import 'package:ai_life_recorder/screens/memory/memory_list_screen.dart';
import 'package:ai_life_recorder/providers/photo_provider.dart';
import 'package:ai_life_recorder/screens/home/home_screen.dart';
import 'package:ai_life_recorder/constants/app_colors.dart';
import 'package:ai_life_recorder/providers/task_provider.dart';
import 'package:ai_life_recorder/services/task_service.dart';
import 'package:ai_life_recorder/screens/task/task_list_screen.dart';
import 'package:ai_life_recorder/screens/reflection/reflection_list_screen.dart';
import 'package:ai_life_recorder/screens/summary/summary_list_screen.dart';
import 'package:ai_life_recorder/ai/summary_ai.dart';
import 'package:ai_life_recorder/services/summary_service.dart';
import 'package:ai_life_recorder/services/trend_engine.dart';
import 'package:ai_life_recorder/services/annual_service.dart';
import 'package:ai_life_recorder/services/key_repository.dart';
import 'package:ai_life_recorder/providers/reflection_provider.dart';
import 'package:ai_life_recorder/services/reflection_service.dart';
import 'package:ai_life_recorder/ai/reflection_ai.dart';
import 'package:ai_life_recorder/utils/validator.dart';

class AppState extends ChangeNotifier {
  bool offline;
  AppState({this.offline = false});
  void setOffline(bool v) {
    if (offline == v) return;
    offline = v;
    notifyListeners();
  }
}

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Env.load();
  await KeyStore.instance.init();
  bool online =
      Env.available && Env.supabaseUrl != null && Env.supabaseAnonKey != null;
  Repositories repos;
  try {
    if (online) {
      await Supabase.initialize(
          url: Env.supabaseUrl!, publishableKey: Env.supabaseAnonKey!);
      repos = Repositories.supabase();
    } else {
      repos = Repositories.inMemory();
    }
  } catch (_) {
    repos = Repositories.inMemory();
    online = false;
  }
  runApp(
    MultiProvider(
      providers: [
        Provider<Repositories>.value(value: repos),
        ChangeNotifierProvider<AppState>(
            create: (_) => AppState(offline: !online)),
        ChangeNotifierProvider<MemoryProvider>(
          create: (ctx) => MemoryProvider(
            repository: ctx.read<Repositories>().memories,
            memoryAi:
                MemoryAi(client: AiClient(apiKey: KeyStore.instance.apiKey)),
          ),
        ),
        ChangeNotifierProvider<PhotoProvider>(
          create: (ctx) => PhotoProvider(
            repository: ctx.read<Repositories>().photos,
            summaryGenerator: (photo) {
              final photoAi = PhotoAi(
                  client: AiClient(apiKey: KeyStore.instance.apiKey));
              return photoAi.generateSummary(
                takenAt: photo.takenAt.toIso8601String(),
                tags: photo.tags,
              );
            },
          ),
        ),
        ChangeNotifierProvider<TaskProvider>(
          create: (ctx) => TaskProvider(
            repository: ctx.read<Repositories>().tasks,
            service: TaskService(
              repository: ctx.read<Repositories>().tasks,
              onTaskEventHandler: (ev) {
                ctx.read<TrendEngine>().handleTaskEvent(ev);
              },
            ),
          ),
        ),
        Provider<SummaryService>(
          create: (ctx) => SummaryService(
            repos: ctx.read<Repositories>(),
            summaryAi:
                SummaryAi(client: AiClient(apiKey: KeyStore.instance.apiKey)),
            nowMillis: () => DateTime.now().millisecondsSinceEpoch,
          ),
        ),
        Provider<TrendEngine>(
          create: (ctx) => TrendEngine(
            trendRepo: ctx.read<Repositories>().trends,
            themeRepo: ctx.read<Repositories>().themes,
          ),
        ),
        ChangeNotifierProvider<ReflectionProvider>(
          create: (ctx) => ReflectionProvider(
            repos: ctx.read<Repositories>(),
            service: ReflectionService(
              reflectionAi: ReflectionAi(
                  client: AiClient(apiKey: KeyStore.instance.apiKey)),
              validator: validate,
            ),
          ),
        ),
        Provider<AnnualService>(
          create: (ctx) => AnnualService(
            repos: ctx.read<Repositories>(),
            summaryAi:
                SummaryAi(client: AiClient(apiKey: KeyStore.instance.apiKey)),
            nowMillis: () => DateTime.now().millisecondsSinceEpoch,
          ),
        ),
      ],
      child: const LifeRecorderApp(),
    ),
  );
}

class LifeRecorderApp extends StatelessWidget {
  const LifeRecorderApp({super.key});
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: '生活记录',
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: AppColors.primary,
          brightness: Brightness.light,
        ).copyWith(
          primary: AppColors.primary,
          secondary: AppColors.softPink,
          tertiary: AppColors.lavender,
          surface: Colors.white,
        ),
        scaffoldBackgroundColor: AppColors.background,
        appBarTheme: const AppBarTheme(
          centerTitle: true,
          backgroundColor: Colors.transparent,
          foregroundColor: Color(0xFF3A4557),
          elevation: 0,
          scrolledUnderElevation: 0,
          surfaceTintColor: Colors.transparent,
          titleTextStyle: TextStyle(
            color: Color(0xFF3A4557),
            fontSize: 20,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.2,
          ),
        ),
        cardTheme: CardTheme(
          elevation: 0,
          color: Colors.white,
          surfaceTintColor: Colors.white,
          shadowColor: AppColors.primary.withOpacity(0.10),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
          ),
        ),
        navigationBarTheme: NavigationBarThemeData(
          height: 66,
          backgroundColor: Colors.white,
          surfaceTintColor: Colors.white,
          indicatorColor: AppColors.primary.withOpacity(0.14),
          indicatorShape: const StadiumBorder(),
          elevation: 0,
        ),
        floatingActionButtonTheme: FloatingActionButtonThemeData(
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
          elevation: 2,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
          ),
        ),
        chipTheme: ChipThemeData(
          backgroundColor: AppColors.background,
          selectedColor: AppColors.primary,
          labelStyle: const TextStyle(fontSize: 12, color: Color(0xFF3A4557)),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
          ),
          side: BorderSide.none,
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            elevation: 0,
            backgroundColor: AppColors.primary,
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
          ),
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: Colors.white,
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(16),
            borderSide: BorderSide.none,
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(16),
            borderSide: BorderSide.none,
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(16),
            borderSide: const BorderSide(color: AppColors.primary, width: 1.4),
          ),
        ),
      ),
      home: const HomeShell(),
    );
  }
}

class HomeShell extends StatefulWidget {
  const HomeShell({super.key});
  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _index = 0;

  static const List<_NavItemStyle> _navStyles = [
    _NavItemStyle(
      outlined: Icons.home_outlined,
      filled: Icons.home_rounded,
      color: AppColors.primary,
    ),
    _NavItemStyle(
      outlined: Icons.menu_book_outlined,
      filled: Icons.menu_book_rounded,
      color: AppColors.memoryAccent,
    ),
    _NavItemStyle(
      outlined: Icons.lightbulb_outline,
      filled: Icons.lightbulb_rounded,
      color: AppColors.reflectionAccent,
    ),
    _NavItemStyle(
      outlined: Icons.check_circle_outline,
      filled: Icons.check_circle_rounded,
      color: AppColors.taskAccent,
    ),
    _NavItemStyle(
      outlined: Icons.auto_awesome_outlined,
      filled: Icons.auto_awesome_rounded,
      color: AppColors.summaryAccent,
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final offline = context.watch<AppState>().offline;
    final repos = context.read<Repositories>();
    final List<Widget> pages = <Widget>[
      const HomeScreen(),
      const MemoryListScreen(),
      ReflectionListScreen(repository: repos.reflections),
      const TaskListScreen(),
      SummaryListScreen(
          repository: repos.summaries, service: context.read<SummaryService>()),
    ];
    return Scaffold(
      body: Column(
        children: [
          if (offline)
            Container(
              width: double.infinity,
              decoration: const BoxDecoration(
                color: AppColors.warning,
                borderRadius: BorderRadius.only(
                  bottomLeft: Radius.circular(16),
                  bottomRight: Radius.circular(16),
                ),
              ),
              padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
              child: const SafeArea(
                bottom: false,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.cloud_off_rounded,
                        size: 16, color: Colors.white),
                    SizedBox(width: 6),
                    Text(
                      '离线模式，数据仅保存在本机',
                      style: TextStyle(color: Colors.white, fontSize: 14),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
            ).animate().fadeIn(duration: 250.ms).slideY(begin: -0.3, end: 0),
          Expanded(
            child: IndexedStack(
              index: _index,
              children: pages,
            ),
          ),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: [
          _buildDestination(0, '首页'),
          _buildDestination(1, '记忆'),
          _buildDestination(2, '反思'),
          _buildDestination(3, '任务'),
          _buildDestination(4, '总结'),
        ],
      ),
    );
  }

  NavigationDestination _buildDestination(int index, String label) {
    final style = _navStyles[index];
    return NavigationDestination(
      icon: Icon(style.outlined, color: AppColors.mutedIcon),
      selectedIcon: Icon(style.filled, color: style.color),
      label: label,
    );
  }
}

class _NavItemStyle {
  final IconData outlined;
  final IconData filled;
  final Color color;
  const _NavItemStyle({
    required this.outlined,
    required this.filled,
    required this.color,
  });
}

```

### 文件路径：lib/screens/home/home_screen.dart
```dart
// lib/screens/home/home_screen.dart
// 首页仪表盘，包含记忆与照片入口卡片
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:ai_life_recorder/screens/memory/memory_list_screen.dart';
import 'package:ai_life_recorder/screens/photo/photo_timeline_screen.dart';
import 'package:ai_life_recorder/screens/settings/settings_screen.dart';
import 'package:ai_life_recorder/constants/app_colors.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  Widget _buildEntryCard({
    required BuildContext context,
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
    required List<Color> accentGradient,
    int animationDelayMs = 0,
  }) {
    final Color accent = accentGradient.last;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(22),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Colors.white,
              Color.lerp(Colors.white, accentGradient.first, 0.35)!,
            ],
          ),
          borderRadius: BorderRadius.circular(22),
          boxShadow: [
            BoxShadow(
              color: accent.withOpacity(0.22),
              blurRadius: 18,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: accentGradient,
                ),
                borderRadius: BorderRadius.circular(18),
              ),
              child: Icon(icon, size: 28, color: Colors.white),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF3A4557),
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    subtitle,
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey[600],
                    ),
                  ),
                ],
              ),
            ),
            Icon(Icons.chevron_right_rounded, color: accent.withOpacity(0.7)),
          ],
        ),
      ),
    )
        .animate(delay: Duration(milliseconds: animationDelayMs))
        .fadeIn(duration: 320.ms)
        .slideY(begin: 0.08, end: 0);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('生活记录'),
        centerTitle: true,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.settings_rounded),
            tooltip: '设置',
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const SettingsScreen()),
              );
            },
          ),
        ],
      ),
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: AppColors.pageBackgroundGradient,
          ),
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Padding(
                  padding: EdgeInsets.only(left: 4, bottom: 16),
                  child: Text(
                    '记录生活里的小美好 🌿',
                    style: TextStyle(
                      fontSize: 13,
                      color: Color(0xFF8A93A6),
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
                _buildEntryCard(
                  context: context,
                  icon: Icons.menu_book_rounded,
                  title: '记忆',
                  subtitle: '记录想法与事件',
                  accentGradient: AppColors.memoryGradient,
                  animationDelayMs: 0,
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => const MemoryListScreen(),
                      ),
                    );
                  },
                ),
                const SizedBox(height: 14),
                _buildEntryCard(
                  context: context,
                  icon: Icons.photo_library_rounded,
                  title: '照片',
                  subtitle: '照片时间轴',
                  accentGradient: AppColors.photoGradient,
                  animationDelayMs: 90,
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => const PhotoTimelineScreen(),
                      ),
                    );
                  },
                ),
              ],
            ),
          ),
        ),
      ),
      backgroundColor: AppColors.background,
    );
  }
}

```

### 文件路径：lib/screens/memory/memory_list_screen.dart
```dart
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:ai_life_recorder/providers/memory_provider.dart';
import 'package:ai_life_recorder/models/memory.dart';
import 'package:ai_life_recorder/constants/app_colors.dart';
import 'memory_edit_screen.dart';
import 'memory_detail_screen.dart';

class MemoryListScreen extends StatefulWidget {
  const MemoryListScreen({super.key});
  @override
  State<MemoryListScreen> createState() => _MemoryListScreenState();
}

class _MemoryListScreenState extends State<MemoryListScreen> {
  final TextEditingController _searchController = TextEditingController();
  final DateFormat _dateFmt = DateFormat('yyyy-MM-dd');
  final Set<String> _selectedTags = <String>{};
  final ScrollController _scrollController = ScrollController();
  Timer? _searchDebounce;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final provider = context.read<MemoryProvider>();
      provider.load();
    });
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _searchController.dispose();
    _searchDebounce?.cancel();
    _scrollController.removeListener(_onScroll);
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (!_scrollController.hasClients) return;
    final threshold = _scrollController.position.maxScrollExtent - 200;
    if (_scrollController.position.pixels >= threshold) {
      context.read<MemoryProvider>().loadMore();
    }
  }

  void _onToggleTag(String tag) {
    setState(() {
      if (_selectedTags.contains(tag)) {
        _selectedTags.remove(tag);
      } else {
        _selectedTags.add(tag);
      }
    });
    context.read<MemoryProvider>().toggleTag(tag);
  }

  void _onSearchChanged(String v, MemoryProvider provider) {
    if (_searchDebounce?.isActive ?? false) _searchDebounce!.cancel();
    _searchDebounce = Timer(const Duration(milliseconds: 300), () {
      provider.setKeyword(v);
    });
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<MemoryProvider>();
    final memories = provider.memories;
    final allTags = provider.allTags;
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('记忆',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
        actions: [
          IconButton(
            tooltip: '清除筛选',
            icon: const Icon(Icons.clear),
            onPressed: () {
              setState(() {
                _selectedTags.clear();
                _searchController.clear();
              });
              provider.clearFilters();
            },
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: '搜索记忆…',
                prefixIcon: const Icon(Icons.search),
                border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8.0)),
                isDense: true,
              ),
              onChanged: (v) => _onSearchChanged(v, provider),
            ),
            const SizedBox(height: 12),
            SizedBox(
              height: 40,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: allTags.length,
                separatorBuilder: (_, __) => const SizedBox(width: 8),
                itemBuilder: (context, index) {
                  final tag = allTags[index];
                  final selected = _selectedTags.contains(tag);
                  return FilterChip(
                    label: Text(tag),
                    selected: selected,
                    onSelected: (_) => _onToggleTag(tag),
                    selectedColor: AppColors.primary,
                    checkmarkColor: Colors.white,
                    backgroundColor: Colors.white,
                    labelStyle: TextStyle(
                      color: selected ? Colors.white : AppColors.neutral,
                    ),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(20)),
                  );
                },
              ),
            ),
            const SizedBox(height: 12),
            Expanded(
              child: memories.isEmpty
                  ? const Center(
                      child: Text(
                        '还没有记忆，点击右下角 + 新建',
                        style:
                            TextStyle(fontSize: 14, color: AppColors.neutral),
                      ),
                    )
                  : ListView.separated(
                      controller: _scrollController,
                      itemCount:
                          memories.length + (provider.isLoadingMore ? 1 : 0),
                      separatorBuilder: (_, __) => const SizedBox(height: 12),
                      itemBuilder: (context, index) {
                        if (index >= memories.length) {
                          return const Padding(
                            padding: EdgeInsets.symmetric(vertical: 16),
                            child: Center(
                              child: SizedBox(
                                width: 20,
                                height: 20,
                                child:
                                    CircularProgressIndicator(strokeWidth: 2),
                              ),
                            ),
                          );
                        }
                        final m = memories[index];
                        return _buildMemoryCard(context, m, provider);
                      },
                    ),
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton(
        heroTag: 'memory_fab',
        onPressed: () async {
          await Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const MemoryEditScreen()));
          await provider.load();
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
              colors: AppColors.memoryGradient,
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
          child: const Icon(Icons.add_rounded, color: Colors.white),
        ),
      ),
    );
  }

  Widget _buildMemoryCard(
      BuildContext context, Memory m, MemoryProvider provider) {
    final title = (m.title != null && m.title!.trim().isNotEmpty)
        ? m.title!
        : (m.content.length <= 20
            ? m.content
            : '${m.content.substring(0, 20)}...');
    final contentPreview = m.content;
    final dateStr = _dateFmt.format(m.createdAt.toLocal());
    final status = provider.summaryStatusOf(m.id);
    Widget summaryWidget;
    switch (status) {
      case MemorySummaryStatus.generating:
        summaryWidget = const SizedBox(
          height: 16,
          width: 16,
          child: CircularProgressIndicator(strokeWidth: 2),
        );
        break;
      case MemorySummaryStatus.failed:
        summaryWidget = Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('摘要失败',
                style: TextStyle(color: AppColors.error, fontSize: 12)),
            const SizedBox(width: 8),
            GestureDetector(
              onTap: () => provider.retrySummary(m.id),
              child: const Text('重试',
                  style: TextStyle(color: AppColors.primary, fontSize: 12)),
            ),
          ],
        );
        break;
      case MemorySummaryStatus.success:
        if (m.aiSummary != null && m.aiSummary!.trim().isNotEmpty) {
          summaryWidget = Row(
            children: [
              const Icon(Icons.check_circle,
                  color: AppColors.success, size: 16),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  m.aiSummary!.split('\n').first,
                  style: const TextStyle(fontSize: 12),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          );
        } else {
          summaryWidget = const Text('暂无摘要',
              style: TextStyle(color: AppColors.neutral, fontSize: 12));
        }
        break;
      case MemorySummaryStatus.none:
      default:
        summaryWidget = const Text('暂无摘要',
            style: TextStyle(color: AppColors.neutral, fontSize: 12));
    }
    return InkWell(
      onTap: () async {
        await Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => MemoryDetailScreen(memory: m)));
        await provider.load();
      },
      child: Card(
        color: Colors.white,
        elevation: 2,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        surfaceTintColor: Colors.white,
        shadowColor: AppColors.memoryAccent.withOpacity(0.16),
        child: Padding(
          padding: const EdgeInsets.all(12.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Text(title,
                        style: const TextStyle(
                            fontSize: 16, fontWeight: FontWeight.w600)),
                  ),
                  Text(dateStr,
                      style: const TextStyle(fontSize: 12, color: Colors.grey)),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                contentPreview,
                style: const TextStyle(fontSize: 14),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 6,
                children: m.tags.map((t) {
                  return Chip(
                    label: Text(t, style: const TextStyle(fontSize: 12)),
                    backgroundColor: AppColors.background,
                  );
                }).toList(),
              ),
              const SizedBox(height: 8),
              Align(alignment: Alignment.centerLeft, child: summaryWidget),
            ],
          ),
        ),
      ),
    );
  }
}

```

### 文件路径：lib/screens/photo/photo_timeline_screen.dart
```dart
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';
import 'package:image/image.dart' as img;
import 'package:path_provider/path_provider.dart';
import 'package:uuid/uuid.dart';
import 'package:ai_life_recorder/providers/photo_provider.dart';
import 'package:ai_life_recorder/models/photo.dart';
import 'package:ai_life_recorder/utils/photo_timeline.dart';
import 'package:ai_life_recorder/screens/photo/photo_detail_screen.dart';
import 'package:ai_life_recorder/constants/app_colors.dart';

class PhotoTimelineScreen extends StatefulWidget {
  const PhotoTimelineScreen({super.key});
  @override
  State<PhotoTimelineScreen> createState() => _PhotoTimelineScreenState();
}

class _PhotoTimelineScreenState extends State<PhotoTimelineScreen> {
  TimelineGranularity _granularity = TimelineGranularity.day;
  final ImagePicker _picker = ImagePicker();
  final Uuid _uuid = const Uuid();
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<PhotoProvider>().load();
    });
  }

  Future<void> _capturePhoto(bool fromGallery) async {
    final provider = context.read<PhotoProvider>();
    try {
      final XFile? picked = await _picker.pickImage(
        source: fromGallery ? ImageSource.gallery : ImageSource.camera,
        maxWidth: fromGallery ? 1600 : null,
        maxHeight: fromGallery ? 1600 : null,
        imageQuality: fromGallery ? 85 : null,
      );
      if (picked == null) return;
      final bytes = await picked.readAsBytes();
      img.Image? decoded = img.decodeImage(bytes);
      if (decoded == null) {
        throw Exception('无法解码图片');
      }
      final int maxSide =
          decoded.width > decoded.height ? decoded.width : decoded.height;
      img.Image resized = decoded;
      if (maxSide > 512) {
        final ratio = 512 / maxSide;
        final newW = (decoded.width * ratio).round();
        final newH = (decoded.height * ratio).round();
        resized = img.copyResize(decoded, width: newW, height: newH);
      }
      final jpg = img.encodeJpg(resized, quality: 80);
      final dir = await getApplicationDocumentsDirectory();
      final photosDir = Directory('${dir.path}/photos');
      if (!await photosDir.exists()) {
        await photosDir.create(recursive: true);
      }
      final id = _uuid.v4();
      final filePath = '${photosDir.path}/$id.jpg';
      final file = File(filePath);
      await file.writeAsBytes(jpg);
      final photo = Photo(
        id: id,
        localPath: file.path,
        takenAt: DateTime.now().toUtc(),
        aiSummary: null,
        summaryConfirmed: false,
        tags: const [],
        relatedMemoryIds: const [],
        metadata: <String, dynamic>{},
        createdAt: DateTime.now().toUtc(),
      );
      await provider.addPhoto(photo);
    } catch (e) {
      debugPrint('添加照片失败: $e');
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('添加照片失败，请重试')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<PhotoProvider>();
    final photos = provider.photos;
    final groups = groupPhotos(photos, _granularity);
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('照片',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
        actions: [
          IconButton(
            icon: const Icon(Icons.photo_camera),
            tooltip: '拍照',
            onPressed: () => _capturePhoto(false),
          ),
          IconButton(
            icon: const Icon(Icons.photo_library),
            tooltip: '选图',
            onPressed: () => _capturePhoto(true),
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            SegmentedButton<TimelineGranularity>(
              segments: const <ButtonSegment<TimelineGranularity>>[
                ButtonSegment(value: TimelineGranularity.day, label: Text('日')),
                ButtonSegment(
                    value: TimelineGranularity.week, label: Text('周')),
                ButtonSegment(
                    value: TimelineGranularity.month, label: Text('月')),
              ],
              selected: <TimelineGranularity>{_granularity},
              onSelectionChanged: (s) {
                setState(() {
                  _granularity = s.first;
                });
              },
            ),
            const SizedBox(height: 12),
            if (photos.isEmpty)
              const Expanded(
                child: Center(
                  child: Text('还没有照片，点击右上角添加',
                      style: TextStyle(color: AppColors.neutral)),
                ),
              )
            else
              Expanded(
                child: ListView.separated(
                  itemCount: groups.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (context, idx) {
                    final group = groups[idx];
                    final title = groupTitle(group.start, _granularity);
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(title,
                            style: const TextStyle(
                                fontSize: 16, fontWeight: FontWeight.w600)),
                        const SizedBox(height: 8),
                        SizedBox(
                          height: 110,
                          child: ListView.separated(
                            scrollDirection: Axis.horizontal,
                            itemCount: group.photos.length,
                            separatorBuilder: (_, __) =>
                                const SizedBox(width: 8),
                            itemBuilder: (context, i) {
                              final p = group.photos[i];
                              return GestureDetector(
                                onTap: () async {
                                  await Navigator.of(context)
                                      .push(MaterialPageRoute(
                                    builder: (_) => PhotoDetailScreen(photo: p),
                                  ));
                                  await provider.load();
                                },
                                child: ClipRRect(
                                  borderRadius: BorderRadius.circular(8),
                                  child: Container(
                                    width: 100,
                                    height: 100,
                                    color: Colors.grey.shade200,
                                    child: _buildImage(p),
                                  ),
                                ),
                              );
                            },
                          ),
                        ),
                      ],
                    );
                  },
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildImage(Photo p) {
    try {
      final file = File(p.localPath);
      if (!file.existsSync()) {
        return const Center(
            child: Icon(Icons.broken_image, size: 40, color: Colors.grey));
      }
      return Image.file(file, fit: BoxFit.cover, width: 100, height: 100);
    } catch (e) {
      debugPrint('加载图片失败: $e');
      return const Center(
          child: Icon(Icons.broken_image, size: 40, color: Colors.grey));
    }
  }
}


```

### 文件路径：lib/screens/task/task_list_screen.dart
```dart
// lib/screens/task/task_list_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:ai_life_recorder/providers/task_provider.dart';
import 'package:ai_life_recorder/models/task.dart';
import 'package:ai_life_recorder/constants/enums.dart';
import 'package:ai_life_recorder/constants/app_colors.dart';
import 'package:ai_life_recorder/screens/task/task_edit_screen.dart';

/// 任务列表页面
class TaskListScreen extends StatefulWidget {
  const TaskListScreen({super.key});

  @override
  State<TaskListScreen> createState() => _TaskListScreenState();
}

class _TaskListScreenState extends State<TaskListScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<TaskProvider>().load();
    });
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<TaskProvider>();
    final tasks = provider.tasks;

    return Scaffold(
      appBar: AppBar(title: const Text('任务')),
      floatingActionButton: FloatingActionButton(
        heroTag: 'task_fab',
        onPressed: () {
          Navigator.of(context)
              .push(MaterialPageRoute(builder: (_) => const TaskEditScreen()));
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
          child: const Icon(Icons.add_rounded, color: Colors.white),
        ),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            _buildStatusChips(context, provider),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(child: _buildCategoryDropdown(context, provider)),
                const SizedBox(width: 12),
                IconButton(
                  tooltip: '切换排序',
                  icon: Icon(provider.sortBy == TaskSort.createdAt
                      ? Icons.sort_by_alpha
                      : Icons.access_time),
                  onPressed: () {
                    provider.setSortBy(provider.sortBy == TaskSort.createdAt
                        ? TaskSort.priority
                        : TaskSort.createdAt);
                  },
                ),
              ],
            ),
            const SizedBox(height: 12),
            Expanded(
              child: tasks.isEmpty
                  ? _buildEmptyState()
                  : ListView.separated(
                      itemCount: tasks.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 12),
                      itemBuilder: (context, index) =>
                          _buildTaskCard(context, tasks[index]),
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusChips(BuildContext context, TaskProvider provider) {
    final statuses = provider.allStatuses;
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: statuses.map((s) {
          final isAll = s == null;
          final label = isAll ? '全部' : _statusLabel(s);
          final count = isAll ? provider.tasks.length : provider.countOf(s);
          final selected = provider.filterStatus == s;
          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: ChoiceChip(
              label: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(label),
                  const SizedBox(width: 6),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: Colors.black12,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text('$count', style: const TextStyle(fontSize: 12)),
                  ),
                ],
              ),
              selected: selected,
              onSelected: (_) {
                provider.setFilterStatus(s);
              },
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildCategoryDropdown(BuildContext context, TaskProvider provider) {
    const categories = TaskCategory.values;
    final labels = TaskCategory.valuesList;
    return DropdownButtonFormField<TaskCategory?>(
      value: provider.filterCategory,
      decoration: const InputDecoration(
        labelText: '分类',
        border: OutlineInputBorder(),
        isDense: true,
        contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 14),
      ),
      items: [
        const DropdownMenuItem<TaskCategory?>(value: null, child: Text('全部')),
        ...List.generate(categories.length, (i) {
          return DropdownMenuItem<TaskCategory?>(
            value: categories[i],
            child: Text(labels[i]),
          );
        }),
      ],
      onChanged: (v) => provider.setFilterCategory(v),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 88,
            height: 88,
            decoration: BoxDecoration(
              color: AppColors.taskAccent.withOpacity(0.12),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.task_alt_rounded,
                size: 40, color: AppColors.taskAccent),
          ),
          const SizedBox(height: 16),
          const Text('当前没有任务，点击右下角新建任务',
              style: TextStyle(color: AppColors.neutral)),
        ],
      ),
    );
  }

  Future<void> _onDeleteTask(BuildContext context, Task t) async {
    final messenger = ScaffoldMessenger.of(context);
    final provider = context.read<TaskProvider>();
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          title: const Text('删除确认'),
          content: Text('删除任务"${t.title}"？'),
          actions: [
            TextButton(
                onPressed: () => Navigator.of(ctx).pop(false),
                child: const Text('取消')),
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(true),
              child:
                  const Text('删除', style: TextStyle(color: AppColors.error)),
            ),
          ],
        );
      },
    );
    if (confirm != true) return;
    try {
      await provider.delete(t.id);
      messenger.showSnackBar(const SnackBar(content: Text('已删除')));
    } catch (e) {
      debugPrint('删除任务失败: $e');
      messenger.showSnackBar(const SnackBar(content: Text('删除失败，请重试')));
    }
  }

  Widget _buildTaskCard(BuildContext context, Task t) {
    final statusColor = _statusColor(t.status);
    final priorityDot = _priorityColor(t.priority);
    final dueText =
        t.dueTime != null ? DateFormat.yMMMd().format(t.dueTime!) : null;

    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      elevation: 2,
      color: AppColors.card,
      surfaceTintColor: Colors.white,
      shadowColor: AppColors.taskAccent.withOpacity(0.16),
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: () {
          Navigator.of(context)
              .push(MaterialPageRoute(builder: (_) => TaskEditScreen(task: t)));
        },
        onLongPress: () => _onDeleteTask(context, t),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              Container(
                width: 10,
                height: 10,
                decoration:
                    BoxDecoration(color: priorityDot, shape: BoxShape.circle),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(t.title,
                        style: const TextStyle(
                            fontSize: 16, fontWeight: FontWeight.w600)),
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        Chip(
                          label: Text(
                            _categoryLabel(t.category),
                            style: const TextStyle(
                                color: AppColors.taskAccent, fontSize: 12),
                          ),
                          backgroundColor:
                              AppColors.taskAccent.withOpacity(0.12),
                          side: BorderSide.none,
                          shape: const StadiumBorder(),
                          visualDensity: VisualDensity.compact,
                        ),
                        const SizedBox(width: 8),
                        if (dueText != null)
                          Text(dueText,
                              style: TextStyle(color: Colors.grey[600])),
                      ],
                    ),
                  ],
                ),
              ),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                    color: statusColor.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(12)),
                child: Text(
                  _statusLabel(t.status),
                  style: TextStyle(
                      color: statusColor, fontWeight: FontWeight.w600),
                ),
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

  String _categoryLabel(TaskCategory c) {
    final idx = TaskCategory.values.indexOf(c);
    final labels = TaskCategory.valuesList;
    if (idx >= 0 && idx < labels.length) return labels[idx];
    return c.toString();
  }

  Color _statusColor(TaskStatus s) {
    switch (s) {
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

  Color _priorityColor(TaskPriority p) {
    switch (p) {
      case TaskPriority.high:
        return AppColors.error;
      case TaskPriority.medium:
        return AppColors.warning;
      case TaskPriority.low:
        return AppColors.neutral;
    }
  }
}

```

### 文件路径：lib/screens/summary/summary_list_screen.dart
```dart
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import 'package:ai_life_recorder/constants/enums.dart';
import 'package:ai_life_recorder/models/summary.dart';
import 'package:ai_life_recorder/repositories/summary_repository.dart';
import 'package:ai_life_recorder/screens/summary/summary_detail_screen.dart';
import 'package:ai_life_recorder/services/summary_service.dart';
import 'package:ai_life_recorder/constants/app_colors.dart';
import 'package:ai_life_recorder/screens/annual/annual_screen.dart';
import 'package:ai_life_recorder/services/annual_service.dart';
import 'package:provider/provider.dart';

class SummaryListScreen extends StatefulWidget {
  const SummaryListScreen({
    super.key,
    required this.repository,
    required this.service,
  });

  final SummaryRepository repository;
  final SummaryService service;

  @override
  State<SummaryListScreen> createState() => _SummaryListScreenState();
}

class _SummaryListScreenState extends State<SummaryListScreen> {
  bool _loading = true;
  String? _error;
  List<Summary> _summaries = <Summary>[];
  bool _generating = false;

  @override
  void initState() {
    super.initState();
    _loadSummaries();
  }

  Future<void> _loadSummaries() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final summaries = await widget.repository.listAll();

      summaries.sort(
        (a, b) => b.createdAt.compareTo(a.createdAt),
      );

      if (!mounted) {
        return;
      }

      setState(() {
        _summaries = summaries;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) {
        return;
      }

      setState(() {
        _loading = false;
        _error = '加载失败';
      });
    }
  }

  Future<void> _generate(SummaryType type) async {
    if (_generating) {
      return;
    }

    setState(() {
      _generating = true;
    });

    try {
      if (type == SummaryType.weekly) {
        await widget.service.generateWeekly();
      } else {
        await widget.service.generateMonthly();
      }

      await _loadSummaries();

      if (!mounted) {
        return;
      }

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('${type.value}总结已生成'),
        ),
      );
    } catch (_) {
      if (!mounted) {
        return;
      }

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('生成失败：网络异常，请重试'),
        ),
      );
    } finally {
      if (mounted) {
        setState(() {
          _generating = false;
        });
      }
    }
  }

  Future<void> _generateAnnualSummary() async {
    if (_generating) {
      return;
    }
    setState(() {
      _generating = true;
    });
    try {
      final AnnualService annualService = context.read<AnnualService>();
      final DateTime now = DateTime.now();
      final DateTime periodStart = DateTime(now.year, 1, 1);
      final DateTime periodEnd = DateTime(now.year, 12, 31, 23, 59, 59);
      final Summary summary = await annualService.generateAnnualSummary(
        periodStart: periodStart,
        periodEnd: periodEnd,
      );
      if (!mounted) {
        return;
      }
      await Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (BuildContext context) {
            return AnnualScreen(summary: summary);
          },
        ),
      );
    } catch (_) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('生成失败：网络异常，请重试'),
        ),
      );
    } finally {
      if (mounted) {
        setState(() {
          _generating = false;
        });
      }
    }
  }

  Future<void> _onDeleteSummary(Summary summary) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (BuildContext ctx) {
        return AlertDialog(
          title: const Text('删除确认'),
          content: const Text('删除这条总结？'),
          actions: <Widget>[
            TextButton(
                onPressed: () => Navigator.of(ctx).pop(false),
                child: const Text('取消')),
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(true),
              child: const Text('删除', style: TextStyle(color: AppColors.error)),
            ),
          ],
        );
      },
    );
    if (confirm != true) return;
    try {
      await widget.repository.delete(summary.id);
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('已删除')));
      await _loadSummaries();
    } catch (e) {
      debugPrint('删除总结失败: $e');
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('删除失败，请重试')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('总结'),
        actions: <Widget>[
          PopupMenuButton<SummaryType>(
            enabled: !_generating,
            onSelected: _generate,
            itemBuilder: (BuildContext context) {
              return <PopupMenuEntry<SummaryType>>[
                const PopupMenuItem<SummaryType>(
                  value: SummaryType.weekly,
                  child: Text('生成周总结'),
                ),
                const PopupMenuItem<SummaryType>(
                  value: SummaryType.monthly,
                  child: Text('生成月总结'),
                ),
              ];
            },
          ),
          IconButton(
            tooltip: '年度总结',
            icon: const Icon(Icons.calendar_month_outlined),
            onPressed: _generating ? null : _generateAnnualSummary,
          ),
        ],
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_loading) {
      return const Center(
        child: CircularProgressIndicator(),
      );
    }

    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              const Text(
                '加载失败，请重试',
                style: TextStyle(
                  fontSize: 14,
                ),
              ),
              const SizedBox(height: 12),
              SizedBox(
                height: 48,
                child: ElevatedButton(
                  onPressed: _loadSummaries,
                  child: const Text('重试'),
                ),
              ),
            ],
          ),
        ),
      );
    }

    if (_summaries.isEmpty) {
      return const Center(
        child: Text(
          '暂无总结，点击右上角生成',
          style: TextStyle(
            fontSize: 14,
            color: Colors.grey,
          ),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadSummaries,
      child: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: _summaries.length,
        separatorBuilder: (BuildContext context, int index) {
          return const SizedBox(height: 12);
        },
        itemBuilder: (BuildContext context, int index) {
          final summary = _summaries[index];
          return _SummaryCard(
            summary: summary,
            onTap: () {
              Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (BuildContext context) {
                    return SummaryDetailScreen(summary: summary);
                  },
                ),
              );
            },
            onLongPress: () => _onDeleteSummary(summary),
          );
        },
      ),
    );
  }
}

class _SummaryCard extends StatelessWidget {
  const _SummaryCard({
    required this.summary,
    required this.onTap,
    required this.onLongPress,
  });

  final Summary summary;
  final VoidCallback onTap;
  final VoidCallback onLongPress;

  @override
  Widget build(BuildContext context) {
    final createdAt = summary.createdAt;

    return Card(
      color: Colors.white,
      elevation: 2,
      surfaceTintColor: Colors.white,
      shadowColor: AppColors.summaryAccent.withOpacity(0.2),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: onTap,
        onLongPress: onLongPress,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Row(
                children: <Widget>[
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 5,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.summaryAccent.withOpacity(0.22),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      summary.type.value,
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFFCB8A00),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      _formatPeriod(summary),
                      style: const TextStyle(
                        fontSize: 12,
                        color: Colors.grey,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                summary.content ?? '',
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontSize: 14,
                  height: 1.5,
                ),
              ),
              const SizedBox(height: 10),
              Text(
                '创建于 ${DateFormat.yMMMd().format(createdAt.toLocal())}',
                style: const TextStyle(
                  fontSize: 12,
                  color: Colors.grey,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _formatPeriod(Summary summary) {
    final formatter = DateFormat.yMMMd();

    return '${formatter.format(summary.periodStart.toLocal())}'
        ' ~ '
        '${formatter.format(summary.periodEnd.toLocal())}';
  }
}

```

### 文件路径：lib/screens/reflection/reflection_list_screen.dart
```dart
// lib/screens/reflection/reflection_list_screen.dart
// 反思列表页：从仓库加载反思并按时间倒序展示，点击进入详情
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:ai_life_recorder/models/reflection.dart';
import 'package:ai_life_recorder/models/memory.dart';
import 'package:ai_life_recorder/models/photo.dart';
import 'package:ai_life_recorder/screens/reflection/reflection_detail_screen.dart';
import 'package:ai_life_recorder/screens/reflection/reflection_edit_screen.dart';
import 'package:ai_life_recorder/repositories/reflection_repository.dart';
import 'package:ai_life_recorder/constants/app_colors.dart';

/// 反思列表页（按 createdAt 倒序）
class ReflectionListScreen extends StatefulWidget {
  final ReflectionRepository repository;
  final List<Memory>? memories;
  final List<Photo>? photos;

  const ReflectionListScreen({
    super.key,
    required this.repository,
    this.memories,
    this.photos,
  });

  @override
  State<ReflectionListScreen> createState() => _ReflectionListScreenState();
}

class _ReflectionListScreenState extends State<ReflectionListScreen> {
  bool _loading = true;
  String? _error;
  List<Reflection> _list = [];

  @override
  void initState() {
    super.initState();
    _loadList();
  }

  Future<void> _loadList() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final items = await widget.repository.list();
      // 按 createdAt 倒序（新到旧）
      items.sort((a, b) => b.createdAt.compareTo(a.createdAt));
      setState(() {
        _list = items;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = '加载失败';
        _loading = false;
      });
    }
  }

  Future<void> _onDeleteReflection(BuildContext context, Reflection r) async {
    final messenger = ScaffoldMessenger.of(context);
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          title: const Text('删除确认'),
          content: const Text('删除这条反思？'),
          actions: [
            TextButton(
                onPressed: () => Navigator.of(ctx).pop(false),
                child: const Text('取消')),
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(true),
              child: const Text('删除', style: TextStyle(color: AppColors.error)),
            ),
          ],
        );
      },
    );
    if (confirm != true) return;
    try {
      await widget.repository.delete(r.id);
      if (!mounted) return;
      messenger.showSnackBar(const SnackBar(content: Text('已删除')));
      await _loadList();
    } catch (e) {
      debugPrint('删除反思失败: $e');
      if (!mounted) return;
      messenger.showSnackBar(const SnackBar(content: Text('删除失败，请重试')));
    }
  }

  Widget _buildCard(BuildContext context, Reflection r) {
    final dateFmt = DateFormat.yMMMd();
    // 标题优先使用 aiSummary.eventSummary
    String title = r.eventDescription;
    if (r.aiSummary != null && r.aiSummary is Map<String, dynamic>) {
      final map = Map<String, dynamic>.from(r.aiSummary!);
      final es = map['eventSummary'];
      if (es != null && es.toString().trim().isNotEmpty) {
        title = es.toString();
      }
    }
    final emotionText = r.emotion;
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      elevation: 2,
      color: AppColors.card,
      surfaceTintColor: Colors.white,
      shadowColor: AppColors.reflectionAccent.withOpacity(0.16),
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: () async {
          await Navigator.of(context).push(MaterialPageRoute(
            builder: (_) => ReflectionDetailScreen(
                reflection: r,
                repository: widget.repository,
                memories: widget.memories,
                photos: widget.photos),
          ));
          if (mounted) await _loadList();
        },
        onLongPress: () => _onDeleteReflection(context, r),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 标题与情绪/日期/人工确认
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Text(
                      title,
                      style: const TextStyle(
                          fontSize: 18, fontWeight: FontWeight.w600),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(dateFmt.format(r.createdAt),
                          style:
                              TextStyle(fontSize: 12, color: Colors.grey[600])),
                      const SizedBox(height: 6),
                      if (r.isUserConfirmed)
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                              color: Colors.grey.withOpacity(0.15),
                              borderRadius: BorderRadius.circular(8)),
                          child: const Text('人工确认',
                              style: TextStyle(
                                  fontSize: 12, color: Colors.black54)),
                        ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 8),
              // 情绪 chip
              if (emotionText != null && emotionText.isNotEmpty)
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                      color: AppColors.reflectionAccent.withOpacity(0.14),
                      borderRadius: BorderRadius.circular(14)),
                  child: Text(emotionText,
                      style: const TextStyle(
                          color: AppColors.reflectionAccent,
                          fontWeight: FontWeight.w600)),
                ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return Scaffold(
        appBar: AppBar(title: const Text('反思')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (_error != null) {
      return Scaffold(
        appBar: AppBar(title: const Text('反思')),
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(_error!,
                  style: const TextStyle(fontSize: 14, color: Colors.red)),
              const SizedBox(height: 12),
              ElevatedButton(
                onPressed: _loadList,
                child: const Text('重试'),
              ),
            ],
          ),
        ),
      );
    }

    if (_list.isEmpty) {
      return Scaffold(
        appBar: AppBar(title: const Text('反思')),
        body: Center(
            child: Text('暂无反思记录',
                style: TextStyle(fontSize: 14, color: Colors.grey[600]))),
        floatingActionButton: _buildFab(context),
      );
    }

    return Scaffold(
      appBar: AppBar(title: const Text('反思')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: ListView.separated(
          itemCount: _list.length,
          separatorBuilder: (_, __) => const SizedBox(height: 12),
          itemBuilder: (context, index) {
            final r = _list[index];
            return _buildCard(context, r);
          },
        ),
      ),
      floatingActionButton: _buildFab(context),
    );
  }

  Widget _buildFab(BuildContext context) {
    return FloatingActionButton(
      heroTag: 'reflection_fab',
      onPressed: () async {
        await Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => const ReflectionEditScreen()),
        );
        if (mounted) await _loadList();
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
            colors: AppColors.reflectionGradient,
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: const Icon(Icons.add_rounded, color: Colors.white),
      ),
    );
  }
}

```

### 文件路径：lib/constants/app_colors.dart
```dart
// lib/constants/app_colors.dart
//
// 应用色彩体系。
import 'package:flutter/material.dart';

class AppColors {
  AppColors._();

  // ================= 原有字段（保留字段名，兼容现有引用） =================

  /// 主色：清爽天蓝 / 湖蓝
  static const Color primary = Color(0xFF57B8E3);

  /// 全局背景：柔和奶白（带一点暖调）
  static const Color background = Color(0xFFFFF8F2);

  /// 次要文字 / 中性色：柔和灰蓝
  static const Color neutral = Color(0xFF98A3B3);

  /// 卡片底色
  static const Color card = Colors.white;

  /// 成功色：薄荷绿系
  static const Color success = Color(0xFF4FBF95);

  /// 警示色：奶油橙系
  static const Color warning = Color(0xFFFF9A5A);

  /// 错误色：柔和珊瑚红
  static const Color error = Color(0xFFFF6B81);

  /// 强调/高亮（紫）——保留兼容
  static const Color accent = Color(0xFFB39DDB);

  // ================= 新增：马卡龙 / 奶昔可爱辅助色 =================

  static const Color softPink = Color(0xFFFF9EC5);
  static const Color softYellow = Color(0xFFFFD76A);
  static const Color mint = Color(0xFF7ED9B7);
  static const Color creamOrange = Color(0xFFFFB07C);
  static const Color lavender = Color(0xFFB39DDB);

  /// 主色浅色版本，用于高亮 / 渐变背景
  static const Color primaryLight = Color(0xFFAEE3F5);

  /// 底部导航未选中态使用的柔和灰蓝（而非死灰）
  static const Color mutedIcon = Color(0xFFB9C4D6);

  // ================= 各模块主题色（让每类内容都有记忆点） =================

  /// 记忆 = 薄荷绿系
  static const Color memoryAccent = mint;

  /// 照片 = 奶油橙系
  static const Color photoAccent = creamOrange;

  /// 反思 = 薰衣草紫系
  static const Color reflectionAccent = lavender;

  /// 任务 = 天蓝系
  static const Color taskAccent = primary;

  /// 总结 = 暖黄系
  static const Color summaryAccent = softYellow;

  // ================= 渐变色组 =================

  static const List<Color> primaryGradient = [
    Color(0xFF82D3F0),
    Color(0xFF4AA8D8),
  ];

  static const List<Color> memoryGradient = [
    Color(0xFFB2EBD4),
    Color(0xFF6BC9A0),
  ];

  static const List<Color> photoGradient = [
    Color(0xFFFFD6B0),
    Color(0xFFFF9F6E),
  ];

  static const List<Color> reflectionGradient = [
    Color(0xFFDBCBF6),
    Color(0xFFAE91DF),
  ];

  static const List<Color> taskGradient = [
    Color(0xFFC1E8F8),
    Color(0xFF60B5DD),
  ];

  static const List<Color> summaryGradient = [
    Color(0xFFFFEDB0),
    Color(0xFFFFCE68),
  ];

  /// 页面整体柔和背景渐变（奶白 → 浅粉蓝）
  static const List<Color> pageBackgroundGradient = [
    Color(0xFFFFFBF6),
    Color(0xFFF1F7FF),
  ];
}

```
