-- TASK 方案A+定位：memories 表加 metadata jsonb 列（存 地址/经纬度 等附加信息）
-- 纯增量：只加列，不改旧列。Supabase Dashboard SQL Editor 执行。

ALTER TABLE memories
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;
