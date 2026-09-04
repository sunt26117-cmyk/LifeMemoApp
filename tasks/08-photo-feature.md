# T08 照片功能

## 产出
- image_picker 拍照/选图 → 用 image 包压缩最长边 512px 存应用文档目录 →
  local_path 入库
- screens/photo/：时间轴（按日分组，可切换日/周/月）、详情页
- 摘要确认流：手动点「生成摘要」→ aiSummary 置为待确认（summary_confirmed=false）
  → 用户可编辑 → 点「确认」→ summary_confirmed=true（此后才可被反思引用）

## Android 权限与存储路径
- AndroidManifest.xml 添加：
  <uses-permission android:name="android.permission.CAMERA"/>
  <uses-permission android:name="android.permission.READ_MEDIA_IMAGES"/>
- 照片存储路径：
  使用 path_provider 的 getApplicationDocumentsDirectory()
  子目录：/photos/{uuid}.jpg
- 不申请外部存储权限（Android 13+ 不需要）
- image_picker 拍照用 takePicture，选图用 pickImage
- 压缩：image 包，最长边 512px，JPEG quality 80

## 约束
- 原图永不上传；视觉 AI 默认不自动触发

## 测试
时间轴分组逻辑单测；待确认照片在检索中不可见的集成测试（配合 T06）

## 验证
flutter analyze + flutter test 全绿
