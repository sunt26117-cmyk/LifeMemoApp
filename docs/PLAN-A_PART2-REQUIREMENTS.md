# 方案A 派单 · 文件 2/2：修改要求

> 与「文件 1（现有源码）」配套。请基于文件 1 中的源码修改，输出每个改动文件的完整新版本（非 diff）。

## 目标：发布统一走「写记录」，文字可配图 + 可选定位城市；隐藏照片独立入口（用户确认范围"甲"）
- 像朋友圈：发布入口只有"写记录"，一条记录 = 文字 + 可选照片 + 可选位置。
- 照片仍是独立 Photo 数据（复用压缩/AI摘要能力），用 Memory.relatedMediaIds 关联（字段已存在）。
- 隐藏照片独立发布/浏览入口；照片仍可通过"点开带图记录"进详情（含 AI 摘要确认）。

## 要改的文件及要求

### 1. lib/models/memory.dart —— 不改（relatedMediaIds 已存在，勿改语义）

### 2. lib/providers/memory_provider.dart
- save() 增加可选参数 `List<String>? relatedMediaIds`，构造 Memory 时 `relatedMediaIds: relatedMediaIds ?? const []`。
- 缺省 null → 空数组；不破坏现有调用点与测试。

### 3. lib/screens/memory/memory_edit_screen.dart（重点）
- 在正文输入框与 TagInputWidget 之间加「添加照片」按钮：点击弹底部选择「拍照 / 从相册选」。
- 配图流程（复用现有照片体系）：
  1) ImagePicker().pickImage(source: camera/gallery)；
  2) 压缩：img.decodeImage(bytes) → maxSide>512 时 copyResize 等比 512 → img.encodeJpg(quality:80)；
  3) 存文件：getApplicationDocumentsDirectory() → {dir}/photos/{uuid}.jpg（目录先创建）；
  4) 构造 Photo(id: uuid, localPath, takenAt: DateTime.now().toUtc(), aiSummary: null, summaryConfirmed: false, tags: const [], relatedMemoryIds: const [], metadata: const {}, createdAt: now)，await context.read<PhotoProvider>().addPhoto(photo)；
  5) photo.id 加入本页待保存列表，UI 缩略图预览（Image.file），可多张上限 3；每张删除按钮（仅移出列表，不删 Photo 记录）。
  - 编辑已有记忆：initState 若 relatedMediaIds 非空，逐个 PhotoProvider.byId 加载预览（null 跳过）；用户无增删时保持原列表。
  - _onSave：传 relatedMediaIds: _pendingPhotoIds。
  - import（白名单内）：image_picker/image as img/path_provider/uuid + dart:io + models/photo.dart + providers/photo_provider.dart。

### 4. lib/screens/record/records_screen.dart
- SegmentedButton 3 段改 2 段：全部 / 文字（删「照片」段）；IndexedStack children 去掉 PhotoTimelineScreen。
- AppBar PopupMenuButton 删 value=="photo" 分支与「拍照片」菜单项。
- FAB：删 if (_segment == 2) 分支，统一 push MemoryEditScreen。
- _MixedRecordsView 去重：被某条 Memory.relatedMediaIds 引用的照片不再以独立 _PhotoRecordTile 出现（过滤 photos）。
- _MemoryRecordTile：relatedMediaIds 非空时取第一张（PhotoProvider.byId）在文字下方显示缩略图（高 150-180、ClipRRect 圆角、Image.file）；点缩略图 → PhotoDetailScreen(photo)；点主体仍进 MemoryDetailScreen；文件加载失败显示灰底占位图标。

### 5. lib/screens/home/home_screen.dart
- 删除「拍一张照片」_quickAction 块（icon: photo_camera_rounded、title: '拍一张照片' 的 Expanded 子项）及其 Navigator.push 与后续 provider.load；
- 保留「写一条」「打卡」两卡（Row 内两 Expanded 等分）；
- 清理不再使用的 import（PhotoTimelineScreen 若仅此处引用则删；PhotoProvider 若仍用于其它区域则保留，以 analyze 为准）。

## 禁止
- 不新建"图片嵌入 Memory 表"、不改 Photo 表结构——照片仍是独立 Photo 记录，relatedMediaIds 只存 id。
- 不删除 PhotoTimelineScreen/PhotoDetailScreen 文件、不删 PhotoProvider/PhotoRepository 能力。
- 不改 schema.sql / pubspec.yaml / 依赖白名单。
- UI 层不接触原始 Map（R10）。
- 配图照片仍以独立照片卡重复出现在混合流（违反去重要求）。

## 验收（本地自测后报告）
- flutter analyze 0 issues（0 error 0 warning 0 info）。
- flutter test 全绿（现有 277；save 新参数可选缺省 null 不应破坏）。
- 交付：改动文件清单 + 每个改动文件完整新版本（非 diff），文件头保留 // lib/... 注释；未改动文件不要重发。
