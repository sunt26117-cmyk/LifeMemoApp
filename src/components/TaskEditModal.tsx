// src/components/TaskEditModal.tsx
import React, { useState } from 'react';
import { X, Sparkles, Plus, Trash2, CheckCircle2, Circle } from 'lucide-react';
import { RepeatRule, Task, TaskCategory, TaskPriority, TaskStep } from '../types';
import { useApp } from '../context/AppContext';
import { AiService } from '../services/aiService';

interface TaskEditModalProps {
  isOpen: boolean;
  task?: Task | null;
  initialTitle?: string;
  initialCategory?: TaskCategory;
  onClose: () => void;
}

const CATEGORIES: TaskCategory[] = ['沟通', '学习', '健康', '项目', '情绪', '习惯', '规划'];
const PRIORITIES: TaskPriority[] = ['高', '中', '低'];
const REPEAT_RULES: RepeatRule[] = ['无', '每天', '每周', '每月', '自定义'];

export const TaskEditModal: React.FC<TaskEditModalProps> = ({
  isOpen,
  task,
  initialTitle = '',
  initialCategory = '项目',
  onClose,
}) => {
  const { addTask, updateTask, checkInTypes } = useApp();

  const [title, setTitle] = useState(task?.title || initialTitle);
  const [description, setDescription] = useState(task?.description || '');
  const [category, setCategory] = useState<TaskCategory>(task?.category || initialCategory);
  const [priority, setPriority] = useState<TaskPriority>(task?.priority || '中');
  const [dueTime, setDueTime] = useState(task?.dueTime ? task.dueTime.slice(0, 16) : '');
  const [repeatRule, setRepeatRule] = useState<RepeatRule>(task?.repeatRule || '无');
  const [estimatedMinutes, setEstimatedMinutes] = useState<number>(task?.estimatedMinutes || 30);
  const [checkInTypeId, setCheckInTypeId] = useState<string>(task?.checkInTypeId || '');
  const [steps, setSteps] = useState<TaskStep[]>(task?.steps || []);
  const [newStepText, setNewStepText] = useState('');
  const [decomposing, setDecomposing] = useState(false);

  if (!isOpen) return null;

  const handleAddStep = () => {
    if (newStepText.trim()) {
      setSteps([...steps, { content: newStepText.trim(), done: false }]);
      setNewStepText('');
    }
  };

  const handleToggleStep = (index: number) => {
    const updated = [...steps];
    updated[index].done = !updated[index].done;
    setSteps(updated);
  };

  const handleDeleteStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

  const handleAiDecompose = async () => {
    if (!title.trim()) return;
    setDecomposing(true);
    try {
      const generatedSteps = await AiService.decomposeTask(title, description);
      const mappedSteps: TaskStep[] = generatedSteps.map((s) => ({ content: s, done: false }));
      setSteps([...steps, ...mappedSteps]);
    } finally {
      setDecomposing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (task) {
      updateTask({
        ...task,
        title: title.trim(),
        description: description.trim(),
        category,
        priority,
        dueTime: dueTime ? new Date(dueTime).toISOString() : null,
        repeatRule,
        estimatedMinutes,
        checkInTypeId: checkInTypeId || null,
        steps,
      });
    } else {
      addTask({
        title: title.trim(),
        description: description.trim(),
        category,
        priority,
        status: '未开始',
        dueTime: dueTime ? new Date(dueTime).toISOString() : null,
        repeatRule,
        estimatedMinutes,
        checkInTypeId: checkInTypeId || null,
        steps,
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl p-6 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 rounded-full"
        >
          <X className="w-4 h-4" />
        </button>

        <h3 className="text-base font-semibold text-slate-800 mb-4">
          {task ? '编辑待办任务' : '新建待办任务'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              任务标题 <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="例如：整理项目上线架构图与验收清单"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#57B8E3]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              详细说明
            </label>
            <textarea
              rows={2}
              placeholder="补充任务背景、注意事项或交付指标..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#57B8E3]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">所属分类</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TaskCategory)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#57B8E3]"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">优先级</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#57B8E3]"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}优先级
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">截止时间</label>
              <input
                type="datetime-local"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#57B8E3]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">重复规则</label>
              <select
                value={repeatRule}
                onChange={(e) => setRepeatRule(e.target.value as RepeatRule)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#57B8E3]"
              >
                {REPEAT_RULES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">预估用时（分钟）</label>
              <input
                type="number"
                min={5}
                step={5}
                value={estimatedMinutes}
                onChange={(e) => setEstimatedMinutes(parseInt(e.target.value) || 30)}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#57B8E3]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">关联打卡习惯</label>
              <select
                value={checkInTypeId}
                onChange={(e) => setCheckInTypeId(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#57B8E3]"
              >
                <option value="">不关联</option>
                {checkInTypes.filter((c) => c.enabled).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.symbol} {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Sub-steps & AI Breakdown */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-700">执行子步骤</label>
              <button
                type="button"
                onClick={handleAiDecompose}
                disabled={decomposing || !title.trim()}
                className="flex items-center gap-1 text-[11px] px-2.5 py-1 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                <Sparkles className="w-3 h-3" />
                <span>{decomposing ? '拆解中...' : 'AI 拆解步骤'}</span>
              </button>
            </div>

            <div className="space-y-1.5 mb-2.5">
              {steps.map((step, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs"
                >
                  <button
                    type="button"
                    onClick={() => handleToggleStep(idx)}
                    className="flex items-center gap-2 text-left flex-1"
                  >
                    {step.done ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                    <span className={step.done ? 'line-through text-slate-400' : 'text-slate-700'}>
                      {step.content}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteStep(idx)}
                    className="p-1 text-slate-400 hover:text-rose-500 ml-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="添加单个执行步骤..."
                value={newStepText}
                onChange={(e) => setNewStepText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddStep())}
                className="flex-1 text-xs py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#57B8E3]"
              />
              <button
                type="button"
                onClick={handleAddStep}
                className="flex items-center gap-1 text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>添加</span>
              </button>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#57B8E3] hover:bg-[#46a5d0] text-white text-xs font-medium rounded-xl transition-colors shadow-xs"
            >
              {task ? '保存修改' : '创建任务'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
