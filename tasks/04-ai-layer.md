# T04 AI 封装层

## 产出
1. lib/ai/ai_client.dart：Dio 封装，baseUrl=AI_BASE_URL，路径 /chat/completions，
   支持 json_mode 参数，超时 60s，5xx/网络错误重试 1 次；
   限流：连续调用间隔 ≥2 秒（免费额度 10 RPM）；
   错误码处理：402 直接抛异常；429/500 重试 1 次，间隔 3 秒；
   解析工具：剥离 ```json 围栏、提取纯 JSON；失败抛 AiParseException（含原始文本）
2. lib/ai/prompts.dart：AGENTS.md §9.5 全部模板（纯字符串常量 + 占位符替换函数）
3. 角色：memory_ai.dart（返回 String）、reflection_ai.dart（JSON mode→ReflectionSummary，
   严格按 §9.1）、task_ai.dart（拆解→List<String> 3-5 步）、summary_ai.dart（周/月→Summary 草稿）

## 关键约束
- 所有 AI 调用只允许出现在 lib/ai/ 内
- 网络不可用/解析失败不得崩溃，抛类型化异常由上层 UI 兜底

## 测试（mocktail mock AiClient，禁止真实网络）
- 合法 JSON 解析成功
- 带 ```json 围栏的解析成功
- 非法 JSON → AiParseException
- 反思 AI 输出缺字段 → AiParseException
- 重试逻辑：首次 500 第二次成功 → 返回结果
- 429 限流 → 等待 3 秒后重试成功
- 402 余额不足 → 直接抛异常不重试

## 验证
flutter analyze + flutter test 全绿
