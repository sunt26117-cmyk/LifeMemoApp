-- 修复：关闭所有表的 RLS（行级安全），让 anon key 可读写
-- 在 Supabase Dashboard -> SQL Editor 中执行本文件

alter table public.memories disable row level security;
alter table public.photos disable row level security;
alter table public.reflections disable row level security;
alter table public.tasks disable row level security;
alter table public.summaries disable row level security;
alter table public.trends disable row level security;
alter table public.themes disable row level security;

-- 确认结果：应显示 7 行 relrowsecurity = false
select tablename, relrowsecurity
from pg_tables
join pg_class on pg_class.relname = pg_tables.tablename
where schemaname = 'public'
order by tablename;
