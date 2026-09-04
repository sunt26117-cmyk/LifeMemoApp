# T03 数据层

## 产出
1. supabase/schema.sql：完整复制 AGENTS.md §9.6（见根目录 supabase/schema.sql）
2. lib/config/env.dart：flutter_dotenv 加载，暴露全部 env 变量，
   缺失时启动即抛清晰中文错误
3. lib/repositories/：每表一个抽象接口 + SupabaseXxxRepo 实现 + InMemoryXxxRepo
   （InMemory 供测试与离线兜底）。接口至少含：
   - memories: upsert/delete/getById/list({tags,keyword,from,to})/updateSummary
   - photos: upsert/listByRange/confirmSummary
   - reflections: upsert/getById/list
   - tasks: upsert/getById/listByStatus/listByCategory/updateFeedback
   - summaries: upsert/getByPeriod(type,start)
   - trends/themes: upsertByName/listAll
4. main.dart 接入 Supabase.initialize（用 env）

## [HUMAN-GATE] 补充：RLS 配置
用户需在 Supabase SQL Editor 执行以下命令（在 schema.sql 之后）：

-- 单用户本地应用，关闭 RLS（最简单方案）
ALTER TABLE memories DISABLE ROW LEVEL SECURITY;
ALTER TABLE photos DISABLE ROW LEVEL SECURITY;
ALTER TABLE reflections DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE summaries DISABLE ROW LEVEL SECURITY;
ALTER TABLE trends DISABLE ROW LEVEL SECURITY;
ALTER TABLE themes DISABLE ROW LEVEL SECURITY;

-- 如果用户未来要多用户，再启用 RLS + auth

## 测试
用 InMemory 实现测接口语义（list 过滤、upsert 覆盖、getByPeriod）

## [HUMAN-GATE]
- 用户需在 Supabase SQL Editor 执行 schema.sql
- 用户需创建 .env 填真实凭据
- 可选：生成 supabase/functions/ai-proxy/index.ts（Deno，转发 /ai 请求到
  AI_BASE_URL 并注入 Key），供上线时代理使用

## 验证
flutter analyze + flutter test 全绿
