// src/components/TaskEditModal.tsx
import React, { useState, useEffect } from 'react';
import { X, Sparkles, Plus, Trash2, CheckCircle2, Circle, Clock, Calendar, AlertTriangle, Info } from 'lucide-react';
import { RepeatRule, Task, TaskCategory, TaskPriority, TaskStep, TimeUnit } from '../types';
import { useApp } from '../context/AppContext';
import { AiService } from '../services/aiService';
import { getThemeColors } from '../utils/themeStyles';
import { computeStepsTimeline, durationToMinutes, formatFriendlyDateTime, getStepTimeStatus } from '../utils/taskTimeUtil';

interface TaskEditModalProps {
  isOpen: boolean;
  task?: Task | null;
  initialTitle?: string;
  initialCategory?: TaskCategory;
  onClose: () => void;
}

const PRIORITIES: TaskPriority[] = ['高', '中', '低'];
const REPEAT_RULES: RepeatRule[] = ['无', '每天', '每周', '每月', '自定义'];
const TIME_UNITS: TimeUnit[] = ['天', '周', '月'];

const getLocalISOString = (d: Date = new Date()): string => {
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
};

export const TaskEditModal: React.FC<TaskEditModalProps> = ({
  isOpen,
  task,
  initialTitle = '',
  initialCategory,
  onClose,
}) => {
  const { addTask, updateTask, taskCategories, addTaskCategory, theme } = useApp();
  const themeColors = getThemeColors(theme);

  const [title, setTitle] = useState(task?.title || initialTitle);
  const [description, setDescription] = useState(task?.description || '');
  const [category, setCategory] = useState<TaskCategory>(
    task?.category || initialCategory || taskCategories[0] || '生活日常'
  );
  const [priority, setPriority] = useState<TaskPriority>(task?.priority || '中');
  const [startTime, setStartTime] = useState<string>('');
  const [dueTime, setDueTime] = useState<string>('');
  const [repeatRule, setRepeatRule] = useState<RepeatRule>(task?.repeatRule || '无');
  const [customInterval, setCustomInterval] = useState<number>(1);
  const [customUnit, setCustomUnit] = useState<'天' | '周' | '月'>('天');

  // 预估时间与单位
  const [durationValue, setDurationValue] = useState<number>(1);
  const [durationInput, setDurationInput] = useState<string>('1');
  const [durationUnit, setDurationUnit] = useState<TimeUnit>('天');

  // 子任务与新建子任务输入
  const [steps, setSteps] = useState<TaskStep[]>([]);
  const [newStepText, setNewStepText] = useState('');
  const [newStepDurationValue, setNewStepDurationValue] = useState<number>(1);
  const [newStepDurationInput, setNewStepDurationInput] = useState<string>('1');
  const [newStepDurationUnit, setNewStepDurationUnit] = useState<TimeUnit>('天');

  const [decomposing, setDecomposing] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState('');

  // 初始化重置
  useEffect(() => {
    if (isOpen) {
      if (task) {
        setTitle(task.title || '');
        setDescription(task.description || '');
        setCategory(task.category || initialCategory || taskCategories[0] || '生活日常');
        setPriority(task.priority || '中');
        setStartTime(task.startTime ? task.startTime.slice(0, 16) : getLocalISOString());
        setDueTime(task.dueTime ? task.dueTime.slice(0, 16) : '');
        setRepeatRule(task.repeatRule || '无');
        if (task.customRepeatDetail) {
          setCustomInterval(task.customRepeatDetail.interval || 1);
          setCustomUnit(task.customRepeatDetail.unit || '天');
        } else {
          setCustomInterval(1);
          setCustomUnit('天');
        }

        // 还原预估时间与单位
        let initDuration = 1;
        let initUnit: TimeUnit = '天';
        if (task.estimatedDurationValue != null && task.estimatedDurationValue > 0) {
          initDuration = task.estimatedDurationValue;
          initUnit = task.estimatedDurationUnit || '天';
        } else if (task.estimatedMinutes != null && task.estimatedMinutes > 0) {
          if (task.estimatedMinutes >= 1440 && task.estimatedMinutes % 1440 === 0) {
            initDuration = task.estimatedMinutes / 1440;
            initUnit = '天';
          } else if (task.estimatedMinutes >= 60 && task.estimatedMinutes % 60 === 0) {
            initDuration = task.estimatedMinutes / 60;
            initUnit = '小时';
          } else {
            initDuration = task.estimatedMinutes;
            initUnit = '分钟';
          }
        }
        setDurationValue(initDuration);
        setDurationInput(String(initDuration));
        setDurationUnit(initUnit);

        const baseStart = task.startTime ? task.startTime.slice(0, 16) : getLocalISOString();
        const initialSteps = task.steps ? [...task.steps] : [];
        setSteps(computeStepsTimeline(baseStart, initialSteps));
      } else {
        const nowIso = getLocalISOString();
        setTitle(initialTitle || '');
        setDescription('');
        setCategory(initialCategory || taskCategories[0] || '生活日常');
        setPriority('中');
        setStartTime(nowIso);
        setDueTime('');
        setRepeatRule('无');
        setCustomInterval(1);
        setCustomUnit('天');
        setDurationValue(1);
        setDurationInput('1');
        setDurationUnit('天');
        setSteps([]);
      }
      setNewStepText('');
      setNewStepDurationValue(1);
      setNewStepDurationInput('1');
      setNewStepDurationUnit('天');
      setDecomposing(false);
      setIsAddingCategory(false);
      setCustomCategoryInput('');
    }
  }, [isOpen, task, initialTitle, initialCategory, taskCategories]);

  // 当开始时间变化时，重新重算子任务时间轴与延期判定
  const handleStartTimeChange = (newStart: string) => {
    setStartTime(newStart);
    setSteps((prev) => computeStepsTimeline(newStart, prev));
  };

  const resetAndClose = () => {
    setTitle('');
    setDescription('');
    setStartTime('');
    setDueTime('');
    setSteps([]);
    setNewStepText('');
    setCustomCategoryInput('');
    setIsAddingCategory(false);
    onClose();
  };

  if (!isOpen) return null;

  const handleCreateCustomCategory = () => {
    const trimmed = customCategoryInput.trim();
    if (!trimmed) return;
    addTaskCategory(trimmed);
    setCategory(trimmed);
    setCustomCategoryInput('');
    setIsAddingCategory(false);
  };

  // 添加单个子任务
  const handleAddStep = () => {
    if (!newStepText.trim()) return;
    const parsedNewStep = parseFloat(newStepDurationInput);
    const safeDuration =
      !isNaN(parsedNewStep) && parsedNewStep >= 0.5
        ? Math.round(parsedNewStep * 2) / 2
        : Math.max(0.5, Math.round((newStepDurationValue || 1) * 2) / 2);
    const newStep: TaskStep = {
      content: newStepText.trim(),
      done: false,
      durationValue: safeDuration,
      durationUnit: newStepDurationUnit,
    };
    const updated = [...steps, newStep];
    setSteps(computeStepsTimeline(startTime, updated));
    setNewStepText('');
    setNewStepDurationValue(1);
    setNewStepDurationInput('1');
  };

  // 切换完成状态
  const handleToggleStep = (index: number) => {
    const updated = [...steps];
    updated[index] = { ...updated[index], done: !updated[index].done };
    setSteps(computeStepsTimeline(startTime, updated));
  };

  // 修改单个步骤的时间值或单位（最小以0.5为单位）
  const handleStepDurationChange = (index: number, val: number, unit: TimeUnit) => {
    const safeVal = Math.max(0.5, Math.round((val || 0.5) * 2) / 2);
    const updated = [...steps];
    updated[index] = {
      ...updated[index],
      durationValue: safeVal,
      durationUnit: unit,
    };
    setSteps(computeStepsTimeline(startTime, updated));
  };

  // 删除步骤
  const handleDeleteStep = (index: number) => {
    const updated = steps.filter((_, i) => i !== index);
    setSteps(computeStepsTimeline(startTime, updated));
  };

  // AI 智能拆解步骤（根据总预估时间自动分配各步骤时长，重新生成时彻底覆盖原步骤，绝不累加翻倍）
  const handleAiDecompose = async () => {
    if (!title.trim()) return;
    setDecomposing(true);
    try {
      const generated = await AiService.decomposeTaskWithDurations(title, description, {
        value: durationValue,
        unit: durationUnit,
      });

      const mappedSteps: TaskStep[] = generated.map((g) => ({
        content: g.content,
        done: false,
        durationValue: Math.max(0.5, Math.round((g.durationValue || 0.5) * 2) / 2),
        durationUnit: g.durationUnit,
      }));

      // 覆盖原有步骤，避免重复生成时时间翻倍
      setSteps(computeStepsTimeline(startTime, mappedSteps));
    } finally {
      setDecomposing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    // 提交前最终基于当前开始时间重算一次时间轴与延期状态
    const parsedDuration = parseFloat(durationInput);
    const finalDurationValue =
      !isNaN(parsedDuration) && parsedDuration >= 0.5
        ? Math.round(parsedDuration * 2) / 2
        : durationValue;
    const finalSteps = computeStepsTimeline(startTime, steps);
    const estimatedMins = durationToMinutes(finalDurationValue, durationUnit);

    const taskPayload = {
      title: title.trim(),
      description: description.trim(),
      category,
      priority,
      startTime: startTime ? new Date(startTime).toISOString() : null,
      dueTime: dueTime ? new Date(dueTime).toISOString() : null,
      repeatRule,
      customRepeatDetail:
        repeatRule === '自定义'
          ? {
              interval: customInterval || 1,
              unit: customUnit || '天',
            }
          : null,
      estimatedMinutes: estimatedMins,
      estimatedDurationValue: finalDurationValue,
      estimatedDurationUnit: durationUnit,
      steps: finalSteps,
    };

    if (task) {
      updateTask({
        ...task,
        ...taskPayload,
      });
    } else {
      addTask({
        ...taskPayload,
        status: '未开始',
      });
    }
    resetAndClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className={`${themeColors.cardBg} border ${themeColors.cardBorder} rounded-2xl w-full max-w-lg shadow-xl p-5 sm:p-6 relative max-h-[90vh] overflow-y-auto`}>
        <button
          onClick={resetAndClose}
          className={`absolute top-4 right-4 p-1 ${themeColors.textSub} hover:${themeColors.textMain} rounded-full`}
        >
          <X className="w-4 h-4" />
        </button>

        <h3 className={`text-base font-semibold ${themeColors.textMain} mb-3`}>
          {task ? '编辑待办任务' : '新建待办任务'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* 任务标题 */}
          <div>
            <label className={`block text-xs font-semibold ${themeColors.textMain} mb-1`}>
              任务标题 <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="例如：整理项目上线架构图与验收清单"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`w-full text-xs p-2.5 ${themeColors.subtleBg} border ${themeColors.subtleBorder} ${themeColors.textMain} rounded-xl focus:outline-none ${themeColors.focusRing}`}
            />
          </div>

          {/* 详细说明 */}
          <div>
            <label className={`block text-xs font-semibold ${themeColors.textMain} mb-1`}>详细说明</label>
            <textarea
              rows={2}
              placeholder="补充任务背景、注意事项或交付指标..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`w-full text-xs p-2.5 ${themeColors.subtleBg} border ${themeColors.subtleBorder} ${themeColors.textMain} rounded-xl focus:outline-none ${themeColors.focusRing}`}
            />
          </div>

          {/* 所属分类 & 优先级 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-600">所属分类</label>
                {!isAddingCategory && (
                  <button
                    type="button"
                    onClick={() => setIsAddingCategory(true)}
                    className={`text-[10px] ${themeColors.primaryText} hover:underline font-medium`}
                  >
                    + 自定义
                  </button>
                )}
              </div>

              {isAddingCategory ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    autoFocus
                    placeholder="新分类名称"
                    value={customCategoryInput}
                    onChange={(e) => setCustomCategoryInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCreateCustomCategory();
                      }
                    }}
                    className={`w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none ${themeColors.focusRing}`}
                  />
                  <button
                    type="button"
                    onClick={handleCreateCustomCategory}
                    className={`px-2.5 py-2 ${themeColors.actionBtn} text-white text-[11px] rounded-xl shrink-0 font-medium`}
                  >
                    添加
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingCategory(false)}
                    className="px-1.5 py-2 text-slate-400 hover:text-slate-600 text-[11px] shrink-0"
                  >
                    取消
                  </button>
                </div>
              ) : (
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as TaskCategory)}
                  className={`w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none ${themeColors.focusRing}`}
                >
                  {Array.from(new Set([...taskCategories, category].filter(Boolean)))
                    .filter((c) => c !== '习惯' && c !== '习惯打卡')
                    .map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">优先级</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className={`w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none ${themeColors.focusRing}`}
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}优先级
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 开始时间 & 截止时间 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="flex items-center gap-1 text-xs font-semibold text-slate-600">
                  <Clock className={`w-3 h-3 ${themeColors.primaryText}`} />
                  开始时间
                </label>
                <button
                  type="button"
                  onClick={() => handleStartTimeChange(getLocalISOString())}
                  className={`text-[10px] ${themeColors.primaryText} hover:underline font-medium`}
                >
                  设为现在
                </button>
              </div>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => handleStartTimeChange(e.target.value)}
                className={`w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none ${themeColors.focusRing} font-mono`}
              />
            </div>

            <div>
              <label className="flex items-center gap-1 text-xs font-semibold text-slate-600 mb-1">
                <Calendar className="w-3 h-3 text-slate-500" />
                截止时间（可选）
              </label>
              <input
                type="datetime-local"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className={`w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none ${themeColors.focusRing} font-mono`}
              />
            </div>
          </div>

          {/* 重复规则 & 自定义展开 */}
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">重复规则</label>
                <select
                  value={repeatRule}
                  onChange={(e) => setRepeatRule(e.target.value as RepeatRule)}
                  className={`w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none ${themeColors.focusRing}`}
                >
                  {REPEAT_RULES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              {/* 预估时间与单位（最小 0.5 为单位，去除小时和分钟） */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  总预估时间 (最小0.5天)
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={0.5}
                    step={0.5}
                    placeholder="0.5"
                    value={durationInput}
                    onChange={(e) => {
                      setDurationInput(e.target.value);
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val) && val >= 0.5) {
                        setDurationValue(Math.round(val * 2) / 2);
                      }
                    }}
                    onBlur={() => {
                      const val = parseFloat(durationInput);
                      const aligned = !isNaN(val) && val >= 0.5 ? Math.round(val * 2) / 2 : 0.5;
                      setDurationValue(aligned);
                      setDurationInput(String(aligned));
                    }}
                    className={`flex-1 text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none ${themeColors.focusRing} font-mono font-medium`}
                  />
                  <select
                    value={durationUnit}
                    onChange={(e) => {
                      const u = e.target.value as TimeUnit;
                      setDurationUnit(u);
                      setNewStepDurationUnit(u);
                    }}
                    className={`w-20 text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none ${themeColors.focusRing}`}
                  >
                    {TIME_UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* 当选择「自定义」重复规则时的直观操作面板 */}
            {repeatRule === '自定义' && (
              <div className={`p-3 ${themeColors.subtleBg} border ${themeColors.subtleBorder} rounded-xl text-xs space-y-1.5 animate-fadeIn`}>
                <div className={`flex items-center gap-1 ${themeColors.primaryText} font-semibold`}>
                  <Info className="w-3.5 h-3.5" />
                  <span>自定义重复周期设置</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-600">每隔</span>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={customInterval}
                    onChange={(e) => setCustomInterval(Math.max(1, parseInt(e.target.value) || 1))}
                    className={`w-16 p-1.5 text-center bg-white border ${themeColors.subtleBorder} rounded-lg text-xs font-mono font-medium focus:outline-none ${themeColors.focusRing}`}
                  />
                  <select
                    value={customUnit}
                    onChange={(e) => setCustomUnit(e.target.value as '天' | '周' | '月')}
                    className={`p-1.5 bg-white border ${themeColors.subtleBorder} rounded-lg text-xs focus:outline-none ${themeColors.focusRing}`}
                  >
                    <option value="天">天</option>
                    <option value="周">周</option>
                    <option value="月">月</option>
                  </select>
                  <span className="text-slate-600">循环一次</span>
                </div>
                <p className={`text-[11px] ${themeColors.textMuted}`}>
                  当前设定：每 {customInterval} {customUnit}重复一次。任务完成后将按此周期自动滚入下一周期。
                </p>
              </div>
            )}
          </div>

          {/* 子任务步骤 & 时间显示 & AI 智能拆解 */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <div>
                <label className="text-xs font-semibold text-slate-700">执行子任务步骤</label>
                <span className="ml-1.5 text-[10px] text-slate-400">（以开始时间为基准推算截止）</span>
              </div>
              <button
                type="button"
                onClick={handleAiDecompose}
                disabled={decomposing || !title.trim()}
                className="flex items-center gap-1 text-[11px] px-2.5 py-1 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity shadow-2xs"
              >
                <Sparkles className="w-3 h-3" />
                <span>{decomposing ? '智能分配中...' : 'AI 拆解分配时间'}</span>
              </button>
            </div>

            {/* 子步骤列表 */}
            <div className="space-y-2 mb-3">
              {steps.map((step, idx) => {
                const timeStatus = getStepTimeStatus(step);
                return (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-xl border transition-all text-xs ${
                      step.isDelayed
                        ? 'bg-rose-50/50 border-rose-200'
                        : step.done
                        ? 'bg-slate-50/80 border-slate-200 opacity-75'
                        : 'bg-white border-slate-200 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleStep(idx)}
                        className="flex items-start gap-2 text-left flex-1 min-w-0 mt-0.5"
                      >
                        {step.done ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        ) : (
                          <Circle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        )}
                        <span
                          className={`flex-1 break-words font-medium ${
                            step.done ? 'line-through text-slate-400' : 'text-slate-700'
                          }`}
                        >
                          <span className="text-[10px] text-slate-400 mr-1 font-mono">#{idx + 1}</span>
                          {step.content}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteStep(idx)}
                        className="p-1 text-slate-300 hover:text-rose-500 shrink-0 rounded-md transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* 步骤时间配置 & 截止/延期状态展示 */}
                    <div className="mt-2 pt-1.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400 text-[10px]">预估耗时:</span>
                        <input
                          type="number"
                          min={0.5}
                          step={0.5}
                          placeholder="0.5"
                          defaultValue={step.durationValue ?? 1}
                          key={step.id + '_' + (step.durationValue ?? 1)}
                          onBlur={(e) => {
                            const raw = parseFloat(e.target.value);
                            const aligned = !isNaN(raw) && raw >= 0.5 ? Math.round(raw * 2) / 2 : 0.5;
                            e.target.value = String(aligned);
                            handleStepDurationChange(
                              idx,
                              aligned,
                              step.durationUnit || durationUnit
                            );
                          }}
                          className="w-14 p-1 text-center bg-slate-50 border border-slate-200 rounded-md text-[10px] font-mono font-medium"
                        />
                        <select
                          value={step.durationUnit || durationUnit}
                          onChange={(e) =>
                            handleStepDurationChange(
                              idx,
                              step.durationValue ?? 1,
                              e.target.value as TimeUnit
                            )
                          }
                          className="p-1 bg-slate-50 border border-slate-200 rounded-md text-[10px]"
                        >
                          {TIME_UNITS.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {step.estimatedDueTime && (
                          <span className="text-[10px] text-slate-500 font-mono">
                            截止: {formatFriendlyDateTime(step.estimatedDueTime).slice(5)}
                          </span>
                        )}

                        {timeStatus.text && (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-medium flex items-center gap-0.5 ${timeStatus.colorClass}`}
                          >
                            {step.isDelayed && <AlertTriangle className="w-2.5 h-2.5 text-rose-600" />}
                            {timeStatus.text}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 手动添加子任务输入条 */}
            <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-50 rounded-xl border border-slate-200">
              <input
                type="text"
                placeholder="手动添加单个子任务步骤..."
                value={newStepText}
                onChange={(e) => setNewStepText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddStep())}
                className={`flex-1 min-w-[140px] text-xs py-1.5 px-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none ${themeColors.focusRing}`}
              />
              <div className="flex items-center gap-1 shrink-0">
                <input
                  type="number"
                  min={0.5}
                  step={0.5}
                  placeholder="0.5"
                  value={newStepDurationInput}
                  onChange={(e) => {
                    setNewStepDurationInput(e.target.value);
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val) && val >= 0.5) {
                      setNewStepDurationValue(Math.round(val * 2) / 2);
                    }
                  }}
                  onBlur={() => {
                    const val = parseFloat(newStepDurationInput);
                    const aligned = !isNaN(val) && val >= 0.5 ? Math.round(val * 2) / 2 : 0.5;
                    setNewStepDurationValue(aligned);
                    setNewStepDurationInput(String(aligned));
                  }}
                  className="w-14 py-1.5 text-center text-xs bg-white border border-slate-200 rounded-lg font-mono font-medium"
                />
                <select
                  value={newStepDurationUnit}
                  onChange={(e) => setNewStepDurationUnit(e.target.value as TimeUnit)}
                  className="py-1.5 px-1 text-xs bg-white border border-slate-200 rounded-lg"
                >
                  {TIME_UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAddStep}
                  className={`flex items-center gap-1 text-xs px-2.5 py-1.5 ${themeColors.actionBtn} text-white rounded-lg transition-colors shrink-0 font-medium`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>添加</span>
                </button>
              </div>
            </div>
          </div>

          {/* 底部按钮 */}
          <div className={`mt-5 flex justify-end gap-2 pt-3 border-t ${themeColors.divider}`}>
            <button
              type="button"
              onClick={resetAndClose}
              className={`px-4 py-2 text-xs ${themeColors.textSub} hover:${themeColors.textMain} ${themeColors.subtleHoverBg} rounded-xl transition-colors`}
            >
              取消
            </button>
            <button
              type="submit"
              className={`px-4 py-2 ${themeColors.actionBtn} text-white text-xs font-medium rounded-xl transition-colors shadow-xs`}
            >
              {task ? '保存修改并更新时间轴' : '创建任务并启动时间轴'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

