# 派单：方案 A —— 发布统一走"写记录"（文字可配图 + 定位城市名），隐藏独立照片发布入口

> 给 Claude/Copilot。开工前必须读真实文件，禁止臆造 API/类名/字段。改动集中在发布与记录流，
> 数据层沿用现有 Memory/Photo 双模型 + relatedMediaIds 关联（字段已存在，只是 UI 未接线）。

## 用户已确认的产品方向
- 像"朋友圈"：发布入口只有"写记录"，一条记录 = 文字 + 可选照片 + 可选位置（显示城市名）。
- 照片作为独立数据存进 Photo 表（复用照片压缩/AI摘要/定位能力），用 Memory.relatedMediaIds 关联。
- **隐藏**照片独立发布/浏览入口，但照片仍可通过"点开带图记录"查看详情（含 AI 摘要确认）。
- 隐藏范围（用户选"甲"）：记录页「照片」分段、首页「拍一张照片」卡、记录页右上「拍照片」菜单；
  PhotoTimelineScreen 页面文件可保留但不再从上述入口直达（可改由"带图记录的照片详情"内部入口进时间轴，或直接不再导航）。

## 要改的文件（真实现状已核对）
1. lib/screens/memory/memory_edit_screen.dart（145 行）——加"添加照片"
2. lib/providers/memory_provider.dart——save() 增加 relatedMediaIds 参数
3. lib/screens/record/records_screen.dart（361 行）——删照片分段/菜单/FAB分支；混合流记忆卡显示缩略图；照片条目去重
4. lib/screens/home/home_screen.dart——删「拍一张照片」快捷卡（保留"写一条"/"打卡"两张卡）
5. （参考）lib/screens/photo/photo_timeline_screen.dart——拍照压缩存 Photo 的现成逻辑（L66-141 附近 _capturePhoto），
   编辑页配图应复用同样的"选图/拍照→压缩512→存 documents/photos→Photo 记录→PhotoProvider.addPhoto"流程
6. （参考）lib/screens/photo/photo_detail_screen.dart——照片详情页（含 AI 摘要生成/确认），带图记录点图进入此页

## 现有 API 事实（必须一字不差使用，先读文件）
- Memory 模型（lib/models/memory.dart）：id/title?/content/tags/aiSummary?/relatedMediaIds(List<String>)/createdAt；
  fromJson/toJson/copyWith 已存在，relatedMediaIds 字段现成（目前 UI 从未写入，一直是 []）。
- MemoryProvider.save（lib/providers/memory_provider.dart L100 附近）签名：
  Future<Memory?> save({String? id, String? title, required String content, required List<String> tags})
  → 需要加 {List<String>? relatedMediaIds}，构造 Memory 时传入（缺省保持 []，旧数据兼容）。
- Photo 模型（lib/models/photo.dart）：id/localPath/takenAt/aiSummary?/summaryConfirmed/tags/relatedMemoryIds/metadata(Map)/createdAt。
- PhotoProvider（lib/providers/photo_provider.dart）：addPhoto(Photo)、byId(String id)→Photo?、updatePhoto、photos 列表、load()。
- Memory 列表/混合流：lib/screens/record/records_screen.dart _MixedRecordsView 同时 watch MemoryProvider.memories 和
  PhotoProvider.photos，按时间排序混排；_MemoryRecordTile（文字卡）与 _PhotoRecordTile（照片卡）是两个独立 tile。
- 记忆详情页：lib/screens/memory/memory_detail_screen.dart（MemoryDetailScreen(memory:)）；照片详情：PhotoDetailScreen(photo:)。
- 照片压缩存本地的现成模式（photo_timeline_screen.dart _capturePhoto）：
  ImagePicker().pickImage(source: camera/gallery) → readAsBytes → img.decodeImage → maxSide>512 时 copyResize 512 →
  encodeJpg(quality:80) → getApplicationDocumentsDirectory()/photos/{uuid}.jpg → Photo(id:uuid, localPath, takenAt: now, ...) → provider.addPhoto(photo)
  （依赖白名单包 image_picker/image/path_provider/uuid，均已存在）

## 实现要求（逐条）
1. **memory_edit_screen 加"添加照片"**：
   - 正文下方加一行按钮「添加照片」（可选）：点开底部选择 拍照/从相册选（参考 PhotoTimelineScreen 的 ImagePicker 用法）。
   - 选图后走上述压缩流程创建 Photo 记录并 addPhoto，UI 显示缩略图预览（可多张，上限 3 张，删掉预览即删除该关联）。
   - 编辑已有记忆时若已有 relatedMediaIds，initState 从 PhotoProvider.byId 加载预览。
   - 保存（_onSave）时把选中的 photoId 列表传给 MemoryProvider.save(relatedMediaIds: [...])。
2. **MemoryProvider.save 加 relatedMediaIds 参数**（缺省 []，不破坏现有调用/测试）。
3. **records_screen 改动**：
   - SegmentedButton 从 3 段改 2 段：全部 / 文字（删「照片」段）；IndexedStack children 相应去掉 PhotoTimelineScreen。
   - AppBar PopupMenu 删「拍照片」项（只留「写记录」→ MemoryEditScreen）；FAB 不再按段分支，统一进 MemoryEditScreen。
   - _MixedRecordsView：记忆卡 _MemoryRecordTile 若 memory.relatedMediaIds 非空，在文字下方显示第一张照片缩略图
     （横向小图，点击缩略图 → PhotoDetailScreen(photo)；点击卡主体仍进 MemoryDetailScreen）。
   - **去重**：照片若被某条记忆的 relatedMediaIds 引用（即"配图"），它不应再作为独立 _PhotoRecordTile 重复出现在混合流里；
     只有未被任何记忆引用的照片才单独显示为照片卡（在 _MixedRecordsView 里过滤 photos：排除被记忆引用的 id）。
4. **home_screen 删「拍一张照片」快捷卡**：删对应 _quickAction 块与 import（保留 写一条记忆/打卡 两卡，布局 2 卡等分即可）。
5. **不变**：Photo 表/模型/PhotoProvider 全保留；照片 AI 摘要生成+确认保留在 PhotoDetailScreen；反思引用照片逻辑不动；
   records_screen 里「文字」分段显示 MemoryListScreen 不动。
6. 无配图时记忆保存行为与旧版完全一致（relatedMediaIds=[]）。

## 反例（禁止）
- 禁止新建"图片嵌入 Memory 表"或改 Photo 表结构——照片仍是独立 Photo 记录，记忆只存 id 关联。
- 禁止删除 PhotoTimelineScreen/PhotoDetailScreen 文件或 PhotoProvider 能力（照片管理/AI摘要/反思引用仍依赖）。
- 禁止改 lib/models/memory.dart 的既有字段语义（relatedMediaIds 已是 List<String> id 关联，勿改成存文件路径）。
- 禁止动 schema.sql / pubspec.yaml / 白名单。
- 禁止为省事让配图照片仍以独立照片卡出现在混合流造成重复（见要求 3 去重）。

## 验收（本地自测后报告）
- flutter analyze 0 issues（0 error 0 warning 0 info）。
- flutter test 全绿（现有 277 测试；memory_provider 相关测试若因 save 签名变化需兼容——参数可选缺省 []，不应破坏）。
- 交付：改动文件清单 + 每个文件的完整新版本（非 diff）。

## 交付格式
- 完整文件输出，文件头保留 `// lib/...` 注释。无 @@/UI 残留/占位包名。
