// src/components/review/ManageHabitsModal.tsx
import React, { useState } from 'react';
import { X, Check, Power, Plus, Bell, Clock } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { CheckInType } from '../../types';
import { HabitReminderModal } from './HabitReminderModal';
import { getThemeColors } from '../../utils/themeStyles';

interface ManageHabitsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ManageHabitsModal: React.FC<ManageHabitsModalProps> = ({ isOpen, onClose }) => {
  const { checkInTypes, addCheckInType, updateCheckInType, theme } = useApp();
  const themeColors = getThemeColors(theme);

  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeSymbol, setNewTypeSymbol] = useState('⭐');
  const [reminderTargetHabit, setReminderTargetHabit] = useState<CheckInType | null>(null);

  if (!isOpen) return null;

  const handleToggleHabitEnabled = (type: typeof checkInTypes[0]) => {
    updateCheckInType({
      ...type,
      enabled: !type.enabled,
    });
  };

  const handleCreateCheckInType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTypeName.trim()) return;
    const name = newTypeName.trim().slice(0, 4);
    addCheckInType({
      name,
      symbol: newTypeSymbol || '⭐',
      colorHex: '#4A90D9',
      sortOrder: checkInTypes.length + 1,
      enabled: true,
    });
    setNewTypeName('');
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
        <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-5 relative">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-800">管理习惯与固定提醒</h3>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-full"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">
            可为每个习惯设定<strong className="text-slate-700">固定时间段（如21点~22点）</strong>与<strong className="text-slate-700">手机通知栏提醒</strong>。完成打卡后通知自动消失；提前完成到点不打扰。
          </p>

          <div className="space-y-2 max-h-64 overflow-y-auto mb-4 pr-1">
            {checkInTypes.map((t) => {
              const hasReminder = t.reminder?.enabled;
              return (
                <div
                  key={t.id}
                  className={`p-2.5 rounded-2xl text-xs transition-all border ${
                    t.enabled
                      ? 'bg-slate-50/80 border-slate-200/80 hover:border-slate-300'
                      : 'bg-slate-100/60 border-slate-200/40 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{t.symbol}</span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-semibold ${
                              t.enabled ? 'text-slate-800' : 'text-slate-400 line-through'
                            }`}
                          >
                            {t.name}
                          </span>
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded-md ${
                              t.enabled
                                ? 'bg-emerald-100 text-emerald-700 font-medium'
                                : 'bg-slate-200 text-slate-500'
                            }`}
                          >
                            {t.enabled ? '已启用' : '已禁用'}
                          </span>
                        </div>
                        {/* Reminder status summary */}
                        <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                          {hasReminder ? (
                            <span className="inline-flex items-center gap-0.5 text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded-md font-medium">
                              <Bell className="w-2.5 h-2.5" />
                              <span>{formatDays(t.reminder?.daysOfWeek)} {t.reminder?.targetStartTime || t.reminder?.reminderTime}</span>
                              {t.reminder?.targetEndTime && <span>~{t.reminder.targetEndTime}</span>}
                              {t.reminder?.advanceMinutes ? <span> (提前{t.reminder.advanceMinutes}分提醒)</span> : ''}
                            </span>
                          ) : (
                            <span className="text-slate-400">未配置固定时段与提醒</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setReminderTargetHabit(t)}
                        className="px-2 py-1 bg-white hover:bg-sky-50 text-sky-700 border border-sky-200 hover:border-sky-300 rounded-xl text-[11px] font-medium flex items-center gap-1 shadow-2xs transition-colors"
                        title="配置固定时段、提醒时间与手机通知栏"
                      >
                        <Clock className="w-3 h-3" />
                        <span>{hasReminder ? '修改提醒' : '设定时间'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleHabitEnabled(t)}
                        className={`p-1.5 rounded-xl text-xs font-medium transition-all ${
                          t.enabled
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                            : 'bg-slate-200 text-slate-600 hover:bg-slate-300 border border-slate-300'
                        }`}
                        title={t.enabled ? '点击禁用该习惯' : '点击启用该习惯'}
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <form onSubmit={handleCreateCheckInType} className="space-y-3 pt-3 border-t border-slate-100">
            <label className="block text-[11px] font-semibold text-slate-700">新增自定义打卡习惯</label>
            <div className="flex gap-2">
              <input
                type="text"
                maxLength={2}
                value={newTypeSymbol}
                onChange={(e) => setNewTypeSymbol(e.target.value)}
                placeholder="图标"
                className="w-12 text-center text-sm py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500"
              />
              <input
                type="text"
                maxLength={4}
                required
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
                placeholder="习惯名称（如早起/阅读）"
                className="flex-1 text-xs py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500"
              />
              <button
                type="submit"
                className={`px-3 py-1.5 ${themeColors.actionBtn} text-white text-xs font-medium rounded-xl transition-colors flex items-center gap-1 shrink-0 shadow-xs`}
                style={{
                  backgroundColor: theme === 'warm' ? '#B86B35' : theme === 'forest' ? '#3B7D57' : '#4A90D9',
                }}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>添加</span>
              </button>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
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


