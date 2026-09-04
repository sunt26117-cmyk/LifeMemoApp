-- 单用户本地应用，执行后需关闭 RLS（见 T03 说明）

create table memories (
  id uuid primary key default gen_random_uuid(),
  title text, content text not null,
  tags text[] default '{}', ai_summary text,
  related_media_ids uuid[] default '{}',
  created_at timestamptz default now());
create index idx_mem_tags on memories using gin(tags);
create index idx_mem_created on memories(created_at desc);

create table photos (
  id uuid primary key default gen_random_uuid(),
  local_path text not null, taken_at timestamptz not null,
  ai_summary text, summary_confirmed boolean default false,
  tags text[] default '{}', related_memory_ids uuid[] default '{}',
  metadata jsonb default '{}', created_at timestamptz default now());
create index idx_photos_taken on photos(taken_at desc);

create table reflections (
  id uuid primary key default gen_random_uuid(),
  event_description text not null, emotion text,
  action_taken text, result text,
  ai_summary jsonb,
  related_memory_ids uuid[] default '{}',
  related_photo_ids uuid[] default '{}',
  related_task_ids uuid[] default '{}',
  related_summary_ids uuid[] default '{}',
  is_user_confirmed boolean default false,
  created_at timestamptz default now());

create table tasks (
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
  created_at timestamptz default now());
create index idx_tasks_status on tasks(status);
create index idx_tasks_cat on tasks(category);

create table summaries (
  id uuid primary key default gen_random_uuid(),
  type text not null, period_start date not null, period_end date not null,
  content text, themes text[] default '{}',
  trends jsonb default '{}', highlights text[] default '{}',
  task_suggestions text[] default '{}',
  chart_data jsonb default '{}',
  created_at timestamptz default now());

create table trends (
  id uuid primary key default gen_random_uuid(),
  trend_name text not null, category text not null,
  score numeric default 0, direction text default '稳定',
  weight numeric default 0,
  evidence jsonb default '[]', cluster text,
  updated_at timestamptz default now());

create table themes (
  id uuid primary key default gen_random_uuid(),
  theme_name text not null,
  weight numeric default 0, direction text default '稳定',
  evidence jsonb default '[]',
  cluster_names text[] default '{}', trend_names text[] default '{}',
  updated_at timestamptz default now());

-- 单用户应用：关闭全部表 RLS，允许 anon key 直接读写
alter table public.memories disable row level security;
alter table public.photos disable row level security;
alter table public.reflections disable row level security;
alter table public.tasks disable row level security;
alter table public.summaries disable row level security;
alter table public.trends disable row level security;
alter table public.themes disable row level security;
