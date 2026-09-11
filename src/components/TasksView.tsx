// src/components/TasksView.tsx
import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus,
  Settings,
  Search,
  ArrowUpDown,
  X,
  ListTodo,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Task, TaskCategory, TaskPriority, TaskStatus } from '../types';
import { getThemeColors } from '../utils/themeStyles';
import { DeleteConfirmationModal } from './records/DeleteConfirmationModal';
import { computeStepsTimeline } from '../utils/taskTimeUtil';
import { ListPaginationControl } from './ListPaginationControl';
import { TaskMetricsBar } from './tasks/TaskMetricsBar';
import { TaskCard } from './tasks/TaskCard';

interface TasksViewProps {
  onOpenTaskCreate: (category?: TaskCategory) => void;
  onOpenTaskEdit: (task: Task) => void;
  onOpenTaskStatus: (task: Task, targetStatus: TaskStatus) => void;
}

const STATUS_FILTERS: ('全部' | TaskStatus)[] = [
  '全部',
  '进行中',
  '未开始',
  '延期',
  '已完成',
  '取消',
];

export const TasksView: React.FC<TasksViewProps> = ({
  onOpenTaskCreate,
  onOpenTaskEdit,
  onOpenTaskStatus,
}) => {
  const {
    tasks,
    updateTask,
    offloadItem,
    permanentDeleteItem,
    changeTaskStatus,
    taskCategories,
    setSettingsOpen,
    theme,
  } = useApp();
  const themeColors = getThemeColors(theme);

  const [selectedCategory, setSelectedCategory] = useState<'全部' | TaskCategory>('全部');
  const [selectedStatus, setSelectedStatus] = useState<'全部' | TaskStatus>('全部');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'default' | 'startTime' | 'dueTime' | 'priority'>('default');
  const [onlyDelayed, setOnlyDelayed] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    title: string;
    description?: string;
  } | null>(null);

  // Pagination state: >10 items auto-hide with Show More / Collapse
  const [tasksVisibleCount, setTasksVisibleCount] = useState(10);

  // Reset pagination on filter or search changes
  useEffect(() => {
    setTasksVisibleCount(10);
  }, [selectedCategory, selectedStatus, searchQuery, sortBy, onlyDelayed]);

  const handleToggleTaskStepInline = (task: Task, stepIdx: number) => {
    if (!task.steps || !task.steps[stepIdx]) return;
    const newSteps = [...task.steps];
    newSteps[stepIdx] = { ...newSteps[stepIdx], done: !newSteps[stepIdx].done };
    const computed = computeStepsTimeline(task.startTime, newSteps);
    updateTask({ ...task, steps: computed });
  };

  const categoriesList = useMemo<('全部' | TaskCategory)[]>(() => {
    return ['全部', ...taskCategories.filter((c) => c !== '习惯' && c !== '习惯打卡')];
  }, [taskCategories]);

  useEffect(() => {
    if (selectedCategory !== '全部' && !taskCategories.includes(selectedCategory)) {
      setSelectedCategory('全部');
    }
  }, [taskCategories, selectedCategory]);

  const filteredTasks = useMemo(() => {
    const list = tasks.filter((t) => {
      if (selectedCategory !== '全部' && t.category !== selectedCategory) return false;
      if (selectedStatus !== '全部' && t.status !== selectedStatus) return false;
      if (onlyDelayed) {
        const hasDelayedStep = t.steps?.some((s) => !s.done && s.isDelayed);
        if (!hasDelayedStep && t.status !== '延期') return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = t.title.toLowerCase().includes(q);
        const matchDesc = (t.description || '').toLowerCase().includes(q);
        if (!matchTitle && !matchDesc) return false;
      }
      return true;
    });

    if (sortBy === 'startTime') {
      return [...list].sort((a, b) => {
        if (!a.startTime) return 1;
        if (!b.startTime) return -1;
        return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
      });
    }

    if (sortBy === 'dueTime') {
      return [...list].sort((a, b) => {
        if (!a.dueTime) return 1;
        if (!b.dueTime) return -1;
        return new Date(a.dueTime).getTime() - new Date(b.dueTime).getTime();
      });
    }

    if (sortBy === 'priority') {
      const pWeights: Record<TaskPriority, number> = { 高: 3, 中: 2, 低: 1 };
      return [...list].sort((a, b) => (pWeights[b.priority] || 0) - (pWeights[a.priority] || 0));
    }

    return list;
  }, [tasks, selectedCategory, selectedStatus, searchQuery, onlyDelayed, sortBy]);

  return (
    <div className="space-y-4 pb-20">
      {/* Top Header & Fast Action */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-base font-semibold ${themeColors.textMain}`}>待办任务执行舱</h2>
          <p className={`text-xs ${themeColors.textSub}`}>明确优先级 · 闭环追踪 · 行为沉淀</p>
        </div>
        <button
          onClick={() => onOpenTaskCreate(selectedCategory === '全部' ? undefined : selectedCategory)}
          className={`flex items-center gap-1.5 px-3 py-1.5 ${themeColors.actionBtn} text-white text-xs font-medium rounded-xl shadow-xs hover:opacity-90 transition-all`}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>新建待办</span>
        </button>
      </div>

      {/* Modern Execution Metrics Bar */}
      <TaskMetricsBar
        tasks={tasks}
        themeColors={themeColors}
        onlyDelayed={onlyDelayed}
        onToggleDelayedOnly={() => setOnlyDelayed(!onlyDelayed)}
      />

      {/* Category Chips with count pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
        {categoriesList.map((cat) => {
          const catCount =
            cat === '全部' ? tasks.length : tasks.filter((t) => t.category === cat).length;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl font-medium shrink-0 transition-all flex items-center gap-1.5 ${
                selectedCategory === cat
                  ? `${themeColors.primaryBg} text-white shadow-xs`
                  : `${themeColors.cardBg} border ${themeColors.cardBorder} ${themeColors.textMain} hover:border-slate-300`
              }`}
            >
              <span>{cat}</span>
              <span
                className={`text-[10px] px-1 py-0.2 rounded-full font-mono ${
                  selectedCategory === cat ? 'bg-white/20 text-white' : `${themeColors.subtleBg} ${themeColors.textSub}`
                }`}
              >
                {catCount}
              </span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className={`px-2.5 py-1.5 rounded-xl ${themeColors.textSub} hover:${themeColors.textMain} border border-dashed ${themeColors.cardBorder} hover:border-slate-300 font-medium shrink-0 transition-all flex items-center gap-1`}
          title="管理生活任务分类"
        >
          <Settings className="w-3 h-3" />
          <span>分类管理</span>
        </button>
      </div>

      {/* Status Filter Segment */}
      <div className={`flex gap-1 overflow-x-auto p-1 ${themeColors.segmentBg} rounded-xl text-xs no-scrollbar`}>
        {STATUS_FILTERS.map((st) => (
          <button
            key={st}
            onClick={() => setSelectedStatus(st)}
            className={`px-2.5 py-1 rounded-lg font-medium shrink-0 transition-all ${
              selectedStatus === st
                ? `${themeColors.segmentActiveBg} ${themeColors.segmentActiveText} font-semibold shadow-xs`
                : `${themeColors.textMuted} hover:${themeColors.textMain}`
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Search & Sort Toolbar */}
      <div className="flex items-center gap-2 text-xs">
        <div className={`flex-1 flex items-center gap-1.5 px-3 py-1.5 ${themeColors.cardBg} border ${themeColors.cardBorder} rounded-xl shadow-2xs`}>
          <Search className={`w-3.5 h-3.5 ${themeColors.textMuted} shrink-0`} />
          <input
            type="text"
            placeholder="搜索待办标题、步骤、备注..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`flex-1 bg-transparent text-xs ${themeColors.textMain} placeholder:${themeColors.textMuted} focus:outline-none`}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className={`p-0.5 ${themeColors.textMuted} hover:${themeColors.textMain} rounded-full`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Sort Selector */}
        <div className="relative shrink-0">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className={`py-1.5 pl-2.5 pr-6 ${themeColors.cardBg} border ${themeColors.cardBorder} rounded-xl text-xs font-medium ${themeColors.textMain} focus:outline-none cursor-pointer appearance-none shadow-2xs`}
          >
            <option value="default">智能排序</option>
            <option value="priority">按优先级</option>
            <option value="dueTime">按截止时间</option>
            <option value="startTime">按开始时间</option>
          </select>
          <ArrowUpDown className={`w-3 h-3 ${themeColors.textMuted} absolute right-2 top-2 pointer-events-none`} />
        </div>
      </div>

      {/* Tasks List */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className={`${themeColors.cardBg} p-8 rounded-2xl border ${themeColors.cardBorder} text-center space-y-2`}>
            <ListTodo className="w-8 h-8 text-slate-300 mx-auto" />
            <div className={`text-xs font-medium ${themeColors.textMain}`}>暂无匹配的待办任务</div>
            <p className={`text-[11px] ${themeColors.textSub}`}>
              {searchQuery || selectedCategory !== '全部' || selectedStatus !== '全部'
                ? '可以尝试清除筛选条件或关键词'
                : '点击上方「新建待办」规划新任务'}
            </p>
          </div>
        ) : (
          <>
            {filteredTasks.slice(0, tasksVisibleCount).map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                themeColors={themeColors}
                onOpenEdit={onOpenTaskEdit}
                onOpenStatusModal={onOpenTaskStatus}
                onStatusChange={(id, st) => changeTaskStatus({ taskId: id, newStatus: st })}
                onDeleteRequest={(t) =>
                  setDeleteTarget({
                    id: t.id,
                    title: '删除待办任务',
                    description: `【${t.category} · 优先级:${t.priority}】${t.title}`,
                  })
                }
                onToggleStep={handleToggleTaskStepInline}
              />
            ))}

            {/* Pagination Controls */}
            <ListPaginationControl
              totalCount={filteredTasks.length}
              visibleCount={tasksVisibleCount}
              onShowMore={() => setTasksVisibleCount((prev) => prev + 10)}
              onCollapse={() => setTasksVisibleCount(10)}
              itemName="项待办任务"
            />
          </>
        )}
      </div>

      {/* Dual-Track Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={!!deleteTarget}
        title={deleteTarget?.title || '删除待办任务'}
        itemDescription={deleteTarget?.description}
        onClose={() => setDeleteTarget(null)}
        onOffload={() => {
          if (deleteTarget) {
            offloadItem('tasks', deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
        onPermanentDelete={() => {
          if (deleteTarget) {
            permanentDeleteItem('tasks', deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
      />
    </div>
  );
};
