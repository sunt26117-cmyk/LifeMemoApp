-- TASK-EXT-08 小记功能（增量迁移：只新增表，不删不改旧表旧列）
-- 在 Supabase Dashboard SQL Editor 执行

create table if not exists notes (
  id uuid primary key,
  title text,
  content text not null,
  ai_organized text,
  ai_status text not null default 'none',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_notes_created on notes(created_at desc);

alter table public.notes disable row level security;
