-- 一键清理 Supabase 云端重复习惯标签与补全缺失列脚本
-- 在 Supabase Dashboard -> SQL Editor 中粘贴运行本脚本

-- 1. 补齐所有表缺失的状态列（支持本地瘦身与软删除）
ALTER TABLE IF EXISTS memories ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;
ALTER TABLE IF EXISTS memories ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false;
ALTER TABLE IF EXISTS memories ADD COLUMN IF NOT EXISTS local_storage_status text DEFAULT 'downloaded';

ALTER TABLE IF EXISTS photos ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false;
ALTER TABLE IF EXISTS photos ADD COLUMN IF NOT EXISTS local_storage_status text DEFAULT 'downloaded';

ALTER TABLE IF EXISTS notes ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false;
ALTER TABLE IF EXISTS notes ADD COLUMN IF NOT EXISTS local_storage_status text DEFAULT 'downloaded';

ALTER TABLE IF EXISTS reflections ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false;
ALTER TABLE IF EXISTS reflections ADD COLUMN IF NOT EXISTS local_storage_status text DEFAULT 'downloaded';

ALTER TABLE IF EXISTS tasks ADD COLUMN IF NOT EXISTS check_in_type_ids uuid[] DEFAULT '{}';
ALTER TABLE IF EXISTS tasks ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false;
ALTER TABLE IF EXISTS tasks ADD COLUMN IF NOT EXISTS local_storage_status text DEFAULT 'downloaded';

ALTER TABLE IF EXISTS summaries ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false;
ALTER TABLE IF EXISTS summaries ADD COLUMN IF NOT EXISTS local_storage_status text DEFAULT 'downloaded';

-- 2. 清理 check_in_types 中的多余重复行，仅保留每种 label 最早创建或默认的 1 条
DELETE FROM check_in_types
WHERE id NOT IN (
  SELECT DISTINCT ON (label) id
  FROM check_in_types
  ORDER BY label, created_at ASC
);

-- 3. 建立唯一索引，彻底杜绝未来在云端产生同名习惯
CREATE UNIQUE INDEX IF NOT EXISTS uq_check_in_types_label ON check_in_types(label);

-- 4. 确保所有 10 张表关闭 RLS
ALTER TABLE IF EXISTS public.memories DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.photos DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notes DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.reflections DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.check_in_types DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.check_in_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.summaries DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.trends DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.themes DISABLE ROW LEVEL SECURITY;
