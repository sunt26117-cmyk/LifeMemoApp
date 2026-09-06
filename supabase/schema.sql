-- AI 生活记录系统完整数据库 Schema
-- 单用户本地应用，执行后关闭全部表的行级安全（RLS），允许客户端直接读写

create table if not exists memories (
  id uuid primary key default gen_random_uuid(),
  title text, content text not null,
  tags text[] default '{}', ai_summary text,
  related_media_ids uuid[] default '{}',
  metadata jsonb default '{}'::jsonb,
  is_deleted boolean default false,
  local_storage_status text default 'downloaded',
  created_at timestamptz default now());
create index if not exists idx_mem_tags on memories using gin(tags);
create index if not exists idx_mem_created on memories(created_at desc);

create table if not exists photos (
  id uuid primary key default gen_random_uuid(),
  local_path text not null, taken_at timestamptz not null,
  ai_summary text, summary_confirmed boolean default false,
  tags text[] default '{}', related_memory_ids uuid[] default '{}',
  metadata jsonb default '{}',
  is_deleted boolean default false,
  local_storage_status text default 'downloaded',
  created_at timestamptz default now());
create index if not exists idx_photos_taken on photos(taken_at desc);

create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  title text,
  content text not null,
  ai_organized text,
  ai_status text not null default 'none',
  is_deleted boolean default false,
  local_storage_status text default 'downloaded',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now());
create index if not exists idx_notes_created on notes(created_at desc);

create table if not exists reflections (
  id uuid primary key default gen_random_uuid(),
  event_description text not null, emotion text,
  action_taken text, result text,
  ai_summary jsonb,
  related_memory_ids uuid[] default '{}',
  related_photo_ids uuid[] default '{}',
  related_task_ids uuid[] default '{}',
  related_summary_ids uuid[] default '{}',
  is_user_confirmed boolean default false,
  is_deleted boolean default false,
  local_storage_status text default 'downloaded',
  created_at timestamptz default now());

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null, description text,
  category text not null, priority text default '中',
  start_time timestamptz, due_time timestamptz, reminder_time timestamptz,
  repeat_rule text default '无', estimated_minutes int,
  status text default '未开始',
  steps jsonb default '[]',
  source_reflection_id uuid,
  feedback jsonb default '{}',
  check_in_type_ids uuid[] default '{}',
  is_deleted boolean default false,
  local_storage_status text default 'downloaded',
  created_at timestamptz default now());
create index if not exists idx_tasks_status on tasks(status);
create index if not exists idx_tasks_cat on tasks(category);

create table if not exists check_in_types (
  id uuid primary key default gen_random_uuid(),
  symbol text not null,
  label text not null,
  sort_order int not null default 0,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists uq_check_in_types_label on check_in_types(label);

create table if not exists check_in_records (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  type_id uuid not null references check_in_types(id),
  task_id uuid,
  symbol_snapshot text not null,
  label_snapshot text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists uq_check_in_records_day_type on check_in_records(date, type_id);

create table if not exists summaries (
  id uuid primary key default gen_random_uuid(),
  type text not null, period_start date not null, period_end date not null,
  content text, themes text[] default '{}',
  trends jsonb default '{}', highlights text[] default '{}',
  task_suggestions text[] default '{}',
  chart_data jsonb default '{}',
  is_deleted boolean default false,
  local_storage_status text default 'downloaded',
  created_at timestamptz default now());

create table if not exists trends (
  id uuid primary key default gen_random_uuid(),
  trend_name text not null, category text not null,
  score numeric default 0, direction text default '稳定',
  weight numeric default 0,
  evidence jsonb default '[]', cluster text,
  updated_at timestamptz default now());

create table if not exists themes (
  id uuid primary key default gen_random_uuid(),
  theme_name text not null,
  weight numeric default 0, direction text default '稳定',
  evidence jsonb default '[]',
  cluster_names text[] default '{}', trend_names text[] default '{}',
  updated_at timestamptz default now());

-- 单用户应用：关闭全部 10 张表的 RLS，允许客户端直接读写
alter table public.memories disable row level security;
alter table public.photos disable row level security;
alter table public.notes disable row level security;
alter table public.reflections disable row level security;
alter table public.tasks disable row level security;
alter table public.check_in_types disable row level security;
alter table public.check_in_records disable row level security;
alter table public.summaries disable row level security;
alter table public.trends disable row level security;
alter table public.themes disable row level security;

-- 系统预置默认打卡类型（幂等写入）
insert into check_in_types (id, symbol, label, sort_order, enabled, created_at, updated_at) values
  ('00000000-0000-4000-8000-000000000001', '📖', '学习', 0, true, now(), now()),
  ('00000000-0000-4000-8000-000000000002', '🏃', '运动', 1, true, now(), now()),
  ('00000000-0000-4000-8000-000000000003', '🚶', '散步', 2, true, now(), now()),
  ('00000000-0000-4000-8000-000000000004', '⏰', '早起', 3, true, now(), now()),
  ('00000000-0000-4000-8000-000000000005', '🧘', '冥想', 4, true, now(), now()),
  ('00000000-0000-4000-8000-000000000006', '💧', '喝水', 5, true, now(), now())
on conflict (id) do nothing;

