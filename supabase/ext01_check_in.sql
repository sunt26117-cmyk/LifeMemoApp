-- TASK-EXT-01 打卡子系统（增量迁移：只新增表/约束/种子，不删不改旧表旧列）
-- 在 Supabase Dashboard SQL Editor 执行；单用户应用，执行后同样关闭 RLS。

-- 打卡类型：只能编辑/停用/启用，禁止物理删除
create table if not exists check_in_types (
  id uuid primary key,
  symbol text not null,
  label text not null,
  sort_order int not null default 0,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 打卡记录：同一天(date)同一类型(type_id)仅一条最终记录（覆盖式提交的数据层保证）
-- task_id 只是来源标记（EXT-04 任务完成自动打卡），不做外键级联：
-- 删除任务时任务行被删，但打卡记录保留（task_id 无 FK 指向 tasks，天然不会级联）。
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

create unique index if not exists uq_check_in_records_day_type
  on check_in_records(date, type_id);

alter table public.check_in_types disable row level security;
alter table public.check_in_records disable row level security;

-- 系统初始化 5 个默认类型（id 与 CheckInType.defaults() 固定一致，幂等 seed）
insert into check_in_types (id, symbol, label, sort_order, enabled, created_at, updated_at) values
  ('00000000-0000-4000-8000-000000000001', '📖', '学习', 0, true, now(), now()),
  ('00000000-0000-4000-8000-000000000002', '🏃', '运动', 1, true, now(), now()),
  ('00000000-0000-4000-8000-000000000003', '🚶', '散步', 2, true, now(), now()),
  ('00000000-0000-4000-8000-000000000004', '🧘', '冥想', 3, true, now(), now()),
  ('00000000-0000-4000-8000-000000000005', '📚', '阅读', 4, true, now(), now())
on conflict (id) do nothing;
