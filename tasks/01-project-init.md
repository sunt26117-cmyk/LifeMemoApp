# T01 项目初始化

## 产出
1. 执行 `flutter create . --platforms=android --project-name ai_life_recorder`
2. pubspec.yaml：白名单全部依赖（见 AGENTS.md §4）
3. 目录骨架按 AGENTS.md §9.8 创建（空文件可先不建）
4. lib/constants/enums.dart：严格按 AGENTS.md §5 实现 + fromString
5. lib/constants/app_colors.dart：主色系（AGENTS.md §6）
6. lib/main.dart：底部导航 5 Tab（首页/记忆/反思/任务/总结），
   各 Tab 为占位页，MaterialApp 包 MaterialApp.router 不需要、直接 home
7. .env.example（SUPABASE_URL / SUPABASE_ANON_KEY / AI_BASE_URL / AI_API_KEY /
   AI_MODEL / AI_MODE=direct）+ .gitignore 加入 .env
8. test/constants/enums_test.dart：验证每个枚举值齐全、fromString 对未知值抛异常

## 应用基本信息
- 应用名称（中文）：生活记录
- 包名：com.tom.liferecorder
- 启动画面：纯色背景（主色 #4A90D9）+ 白色文字「生活记录」
- 应用图标：暂用默认，标记 [HUMAN-GATE] 用户后续自行替换

## Android 配置
- android/app/src/main/AndroidManifest.xml:
  android:label="生活记录"
- applicationId: "com.tom.liferecorder"

## 验证
flutter analyze → 0 issues；flutter test → 全绿

## 完成条件
真机/模拟器可运行的导航骨架（无法验证真机时只需 analyze+test 通过，标记 HUMAN-GATE 设备验证）
