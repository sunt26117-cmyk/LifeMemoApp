-- TASK-EXT-04：任务与打卡类型关联
-- 给 tasks 表增加 check_in_type_ids 列，用于保存任务关联的打卡类型 id 列表。
-- 兼容旧数据：NULL 或缺失时设为默认值 '{}'.

ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS check_in_type_ids uuid[] DEFAULT '{}';

UPDATE tasks
SET check_in_type_ids = '{}'
WHERE check_in_type_ids IS NULL;
