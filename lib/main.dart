import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:ai_life_recorder/config/env.dart';
import 'package:ai_life_recorder/repositories/repositories.dart';
import 'package:ai_life_recorder/providers/memory_provider.dart';
import 'package:ai_life_recorder/ai/memory_ai.dart';
import 'package:ai_life_recorder/ai/photo_ai.dart';
import 'package:ai_life_recorder/ai/ai_client.dart';
import 'package:ai_life_recorder/providers/photo_provider.dart';
import 'package:ai_life_recorder/screens/home/home_screen.dart';
import 'package:ai_life_recorder/screens/record/records_screen.dart';
import 'package:ai_life_recorder/constants/app_colors.dart';
import 'package:ai_life_recorder/providers/task_provider.dart';
import 'package:ai_life_recorder/services/task_service.dart';
import 'package:ai_life_recorder/screens/task/task_list_screen.dart';
import 'package:ai_life_recorder/screens/summary/summary_list_screen.dart';
import 'package:ai_life_recorder/ai/summary_ai.dart';
import 'package:ai_life_recorder/ai/growth_ai.dart';
import 'package:ai_life_recorder/services/summary_service.dart';
import 'package:ai_life_recorder/services/trend_engine.dart';
import 'package:ai_life_recorder/services/annual_service.dart';
import 'package:ai_life_recorder/services/key_repository.dart';
import 'package:ai_life_recorder/providers/reflection_provider.dart';
import 'package:ai_life_recorder/services/reflection_service.dart';
import 'package:ai_life_recorder/ai/reflection_ai.dart';
import 'package:ai_life_recorder/utils/validator.dart';
import 'package:ai_life_recorder/providers/note_provider.dart';
import 'package:ai_life_recorder/ai/note_ai.dart';

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
  await initializeDateFormatting('zh_CN');
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
  // TASK-EXT-01/04：初始化默认打卡类型（幂等）
  await repos.checkInTypes.seedDefaults();
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
              final photoAi =
                  PhotoAi(client: AiClient(apiKey: KeyStore.instance.apiKey));
              return photoAi.generateSummary(
                takenAt: photo.takenAt.toIso8601String(),
                tags: photo.tags,
              );
            },
          ),
        ),
        ChangeNotifierProvider<NoteProvider>(
          create: (ctx) => NoteProvider(
            repository: ctx.read<Repositories>().notes,
            noteAi: NoteAi(client: AiClient(apiKey: KeyStore.instance.apiKey)),
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
              checkInTypeRepository: ctx.read<Repositories>().checkInTypes,
              checkInRecordRepository: ctx.read<Repositories>().checkInRecords,
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
        Provider<GrowthAi>(
          create: (ctx) =>
              GrowthAi(client: AiClient(apiKey: KeyStore.instance.apiKey)),
        ),
        Provider<AnnualService>(
          create: (ctx) => AnnualService(
            repos: ctx.read<Repositories>(),
            summaryAi:
                SummaryAi(client: AiClient(apiKey: KeyStore.instance.apiKey)),
            nowMillis: () => DateTime.now().millisecondsSinceEpoch,
          ),
        ),
        Provider<GrowthAi>(
          create: (_) => GrowthAi(
            client: AiClient(apiKey: KeyStore.instance.apiKey),
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
      outlined: Icons.wb_sunny_outlined,
      filled: Icons.wb_sunny_rounded,
      color: AppColors.primary,
    ),
    _NavItemStyle(
      outlined: Icons.auto_stories_outlined,
      filled: Icons.auto_stories_rounded,
      color: AppColors.memoryAccent,
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

  void _navigateToTab(int index) {
    if (index < 0 || index > 3) return;
    setState(() => _index = index);
  }

  @override
  Widget build(BuildContext context) {
    final offline = context.watch<AppState>().offline;
    final repos = context.read<Repositories>();
    final List<Widget> pages = <Widget>[
      HomeScreen(
        onNavigateToTab: _navigateToTab,
        reflectionRepository: repos.reflections,
      ),
      const RecordsScreen(),
      const TaskListScreen(),
      SummaryListScreen(
        repository: repos.summaries,
        service: context.read<SummaryService>(),
      ),
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
        onDestinationSelected: _navigateToTab,
        destinations: [
          _buildDestination(0, '今天'),
          _buildDestination(1, '记录'),
          _buildDestination(2, '任务'),
          _buildDestination(3, '回顾'),
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
