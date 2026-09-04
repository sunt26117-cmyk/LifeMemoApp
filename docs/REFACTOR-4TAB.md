# 重构派单：4 Tab 信息架构改版（今天/记录/任务/回顾）

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
