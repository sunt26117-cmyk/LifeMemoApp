// src/components/review/ManageHabitsModal.tsx
import React, { useState } from 'react';
import { X, Check, Power, Plus, Bell, Clock, Edit2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { CheckInType } from '../../types';
import { HabitReminderModal } from './HabitReminderModal';
import { getThemeColors } from '../../utils/themeStyles';
import { useModalBackHandler } from '../../services/modalBackManager';

interface ManageHabitsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_ICONS = [
  '📖', '🏃', '🚶', '⏰', '🧘', '💧', '🍎', '✍️',
  '💻', '🎯', '🏋️', '💤', '🍵', '🌿', '🚴', '🧹',
  '💊', '🛏️', '⭐', '🎨', '🎵'
];

export const ManageHabitsModal: React.FC<ManageHabitsModalProps> = ({ isOpen, onClose }) => {
  const { checkInTypes, addCheckInType, updateCheckInType, theme } = useApp();
  const themeColors = getThemeColors(theme);

  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeSymbol, setNewTypeSymbol] = useState('⭐');
  const [reminderTargetHabit, setReminderTargetHabit] = useState<CheckInType | null>(null);

  // In-line editing state for existing habits
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editSymbol, setEditSymbol] = useState('');

  // Bind Android native back button to close ManageHabitsModal
  useModalBackHandler(isOpen, onClose, 'manage_habits_modal');

  if (!isOpen) return null;

  const handleToggleHabitEnabled = (type: typeof checkInTypes[0]) => {
    updateCheckInType({
      ...type,
      enabled: !type.enabled,
    });
  };

  const handleStartEdit = (t: CheckInType) => {
    setEditingHabitId(t.id);
    setEditName(t.name);
    setEditSymbol(t.symbol);
  };

  const handleSaveEdit = (t: CheckInType) => {
    const trimmed = editName.trim().slice(0, 6);
    if (!trimmed) return;
    const sym = editSymbol.trim() || '⭐';
    updateCheckInType({
      ...t,
      name: trimmed,
      symbol: sym,
    });
    setEditingHabitId(null);
  };

  const handleCancelEdit = () => {
    setEditingHabitId(null);
  };

  const handleCreateCheckInType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTypeName.trim()) return;
    const name = newTypeName.trim().slice(0, 6);
    addCheckInType({
      name,
      symbol: newTypeSymbol || '⭐',
      colorHex: '#4A90D9',
      sortOrder: checkInTypes.length + 1,
      enabled: true,
    });
    setNewTypeName('');
    setNewTypeSymbol('⭐');
  };

  const formatDays = (days?: number[]) => {
    if (!days || days.length === 0) return '未设周期';
    if (days.length === 7) return '每天';
    if (days.length === 5 && !days.includes(6) && !days.includes(0)) return '工作日';
    if (days.length === 2 && days.includes(6) && days.includes(0)) return '周末';
    const dayMap: Record<number, string> = { 1: '周一', 2: '周二', 3: '周三', 4: '周四', 5: '周五', 6: '周六', 0: '周日' };
    return days.map((d) => dayMap[d] || `${d}`).join('/');
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
        <div className={`${themeColors.cardBg} border ${themeColors.cardBorder} rounded-3xl w-full max-w-md shadow-2xl p-5 relative max-h-[90vh] flex flex-col`}>
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <h3 className={`text-sm font-bold ${themeColors.textMain}`}>管理习惯与固定提醒</h3>
            <button
              onClick={onClose}
              className={`p-1.5 ${themeColors.textSub} hover:${themeColors.textMain} ${themeColors.subtleHoverBg} rounded-full transition-colors`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className={`text-[11px] ${themeColors.textSub} mb-3 leading-relaxed`}>
            可编辑习惯图标与名称、开启/停用习惯、设定<strong className={themeColors.textMain}>固定时间段</strong>与<strong className={themeColors.textMain}>通知栏提醒</strong>。
          </p>

          {/* Habit Items List */}
          <div className="space-y-2.5 overflow-y-auto mb-3 pr-1 flex-1">
            {checkInTypes.map((t) => {
              const hasReminder = t.reminder?.enabled;
              const isEditing = editingHabitId === t.id;

              if (isEditing) {
                return (
                  <div
                    key={t.id}
                    className={`p-3 rounded-2xl border-2 border-sky-400 ${themeColors.subtleBg} shadow-xs space-y-2.5`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold ${themeColors.textMain}`}>
                        编辑习惯（可修改图标和名称）
                      </span>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className={`text-[11px] ${themeColors.textSub} hover:${themeColors.textMain}`}
                      >
                        取消
                      </button>
                    </div>

                    {/* Inputs */}
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editSymbol}
                        onChange={(e) => setEditSymbol(e.target.value)}
                        maxLength={4}
                        placeholder="图标"
                        className={`w-12 h-9 text-center text-xl ${themeColors.cardBg} border ${themeColors.cardBorder} rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500`}
                        title="输入或点击下方常用图标"
                      />
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        maxLength={6}
                        placeholder="习惯名称（如早起/阅读）"
                        className={`flex-1 h-9 px-3 text-xs ${themeColors.cardBg} border ${themeColors.cardBorder} ${themeColors.textMain} rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium`}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(t)}
                        disabled={!editName.trim()}
                        className="h-9 px-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors shrink-0"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>保存</span>
                      </button>
                    </div>

                    {/* Preset Emoji Palette */}
                    <div>
                      <div className={`text-[10px] ${themeColors.textSub} mb-1`}>
                        常用图标快捷替换：
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {PRESET_ICONS.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => setEditSymbol(emoji)}
                            className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center transition-all ${
                              editSymbol === emoji
                                ? 'bg-sky-100 border-2 border-sky-500 scale-110 shadow-xs'
                                : `${themeColors.cardBg} hover:bg-slate-200/80 border ${themeColors.cardBorder}`
                            }`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={t.id}
                  className={`p-3 rounded-2xl text-xs transition-all border ${
                    t.enabled
                      ? `${themeColors.cardBg} ${themeColors.cardBorder} shadow-2xs`
                      : `${themeColors.subtleBg} ${themeColors.subtleBorder} opacity-60`
                  }`}
                >
                  {/* Top Row: Icon + Name + Edit + Actions */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Clickable Icon */}
                      <button
                        type="button"
                        onClick={() => handleStartEdit(t)}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center text-xl ${themeColors.cardBg} border ${themeColors.cardBorder} shadow-2xs hover:scale-105 hover:border-sky-400 active:scale-95 transition-all shrink-0`}
                        title="点击更换图标与名称"
                      >
                        {t.symbol}
                      </button>

                      {/* Name + Status + Edit button */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            onClick={() => handleStartEdit(t)}
                            className={`font-bold text-sm cursor-pointer hover:text-sky-600 transition-colors ${
                              t.enabled ? themeColors.textMain : `${themeColors.textSub} line-through`
                            }`}
                            title="点击编辑习惯名称"
                          >
                            {t.name}
                          </span>
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded-md ${
                              t.enabled
                                ? 'bg-emerald-100 text-emerald-700 font-medium'
                                : 'bg-slate-200 text-slate-500'
                            }`}
                          >
                            {t.enabled ? '已启用' : '已禁用'}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleStartEdit(t)}
                            className={`p-1 ${themeColors.textSub} hover:text-sky-600 hover:${themeColors.subtleHoverBg} rounded-md transition-colors`}
                            title="编辑图标和名称"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Right Action buttons */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setReminderTargetHabit(t)}
                        className={`px-2.5 py-1.5 ${themeColors.cardBg} hover:bg-sky-50 text-sky-700 border border-sky-200 hover:border-sky-300 rounded-xl text-[11px] font-medium flex items-center gap-1 shadow-2xs transition-colors`}
                        title="配置固定时段、提醒时间与手机通知栏"
                      >
                        <Clock className="w-3.5 h-3.5 text-sky-600" />
                        <span>{hasReminder ? '修改时段' : '设定时间'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleHabitEnabled(t)}
                        className={`p-1.5 rounded-xl text-xs font-medium transition-all ${
                          t.enabled
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                            : 'bg-slate-200 text-slate-600 hover:bg-slate-300 border border-slate-300'
                        }`}
                        title={t.enabled ? '点击停用该习惯' : '点击启用该习惯'}
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Dedicated Time & Reminder Display Row (Structured & Spacious) */}
                  {hasReminder ? (
                    <div
                      className={`mt-2.5 pt-2 border-t ${themeColors.divider} flex items-center justify-between gap-2 text-xs flex-wrap sm:flex-nowrap`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        {/* Time Range Badge */}
                        <span
                          className={`inline-flex items-center gap-1 font-mono font-bold text-xs ${themeColors.cardBg} border ${themeColors.cardBorder} ${themeColors.textMain} px-2 py-0.5 rounded-lg shadow-2xs`}
                        >
                          <Clock className="w-3 h-3 text-sky-600 shrink-0" />
                          <span>
                            {t.reminder?.targetStartTime || t.reminder?.reminderTime || '20:00'}
                            {t.reminder?.targetEndTime ? ` ~ ${t.reminder.targetEndTime}` : ''}
                          </span>
                        </span>

                        {/* Frequency Cycle Badge */}
                        <span
                          className={`text-[10px] ${themeColors.textSub} ${themeColors.subtleBg} border ${themeColors.subtleBorder} px-1.5 py-0.5 rounded-md font-medium shrink-0`}
                        >
                          {formatDays(t.reminder?.daysOfWeek)}
                        </span>
                      </div>

                      {/* Advance Notification Notice */}
                      <div className="inline-flex items-center gap-1 text-[11px] text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-md font-medium shrink-0">
                        <Bell className="w-2.5 h-2.5 text-sky-600" />
                        <span>
                          {t.reminder?.advanceMinutes === 0
                            ? '准时提醒'
                            : `提前 ${t.reminder?.advanceMinutes ?? 10} 分钟提醒`}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 pt-1.5 border-t border-dashed border-slate-200/60 flex items-center gap-1 text-[10px] text-slate-400">
                      <Clock className="w-3 h-3 text-slate-300 shrink-0" />
                      <span>未配置固定时段与提醒</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add Custom Habit Form */}
          <form onSubmit={handleCreateCheckInType} className={`space-y-2 pt-3 border-t ${themeColors.divider}`}>
            <label className={`block text-[11px] font-semibold ${themeColors.textMain}`}>
              新增打卡习惯
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                maxLength={4}
                value={newTypeSymbol}
                onChange={(e) => setNewTypeSymbol(e.target.value)}
                placeholder="图标"
                className={`w-12 text-center text-base py-1.5 ${themeColors.cardBg} border ${themeColors.cardBorder} ${themeColors.textMain} rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500`}
              />
              <input
                type="text"
                maxLength={6}
                required
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
                placeholder="习惯名称（如早起/阅读）"
                className={`flex-1 text-xs py-1.5 px-3 ${themeColors.cardBg} border ${themeColors.cardBorder} ${themeColors.textMain} rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500`}
              />
              <button
                type="submit"
                className={`px-3 py-1.5 ${themeColors.actionBtn} text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1 shrink-0 shadow-xs`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>添加</span>
              </button>
            </div>

            {/* Quick Emoji bar for new habit */}
            <div className="flex items-center gap-1 overflow-x-auto py-1">
              <span className={`text-[10px] ${themeColors.textSub} shrink-0`}>选图标:</span>
              {PRESET_ICONS.slice(0, 10).map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setNewTypeSymbol(emoji)}
                  className={`w-6 h-6 rounded-md text-xs flex items-center justify-center transition-all ${
                    newTypeSymbol === emoji
                      ? 'bg-sky-100 border border-sky-400 scale-105'
                      : `${themeColors.subtleBg} hover:${themeColors.subtleHoverBg} border ${themeColors.subtleBorder}`
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={onClose}
                className={`px-4 py-1.5 text-xs ${themeColors.textSub} hover:${themeColors.textMain} ${themeColors.subtleHoverBg} rounded-xl transition-colors`}
              >
                完成
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Submodal for Habit Reminder Configuration */}
      {reminderTargetHabit && (
        <HabitReminderModal
          isOpen={!!reminderTargetHabit}
          habit={reminderTargetHabit}
          onClose={() => setReminderTargetHabit(null)}
          onSave={(updated) => {
            updateCheckInType(updated);
            setReminderTargetHabit(null);
          }}
        />
      )}
    </>
  );
};



