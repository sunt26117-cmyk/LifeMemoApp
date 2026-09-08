// src/components/checkin/CheckInCapsuleItem.tsx
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { CheckCircle2, RotateCw, X, History } from 'lucide-react';
import { CheckInRecord, CheckInType } from '../../types';
import { useApp } from '../../context/AppContext';
import { getThemeColors } from '../../utils/themeStyles';
import { useModalBackHandler } from '../../services/modalBackManager';

interface CheckInCapsuleItemProps {
  type: CheckInType;
  selectedDate: string;
  record?: CheckInRecord;
  onToggle: (type: CheckInType, mode: 'overwrite' | 'toggle') => void;
  onOpenDayDetail?: () => void;
}

export const CheckInCapsuleItem: React.FC<CheckInCapsuleItemProps> = ({
  type,
  selectedDate,
  record,
  onToggle,
  onOpenDayDetail,
}) => {
  const { theme } = useApp();
  const themeColors = getThemeColors(theme);

  const [showMenu, setShowMenu] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchMovedRef = useRef<boolean>(false);

  // Android system back button integration for modals
  useModalBackHandler(showMenu, () => setShowMenu(false), `capsule_menu_${type.id}`);
  useModalBackHandler(showHistoryModal, () => setShowHistoryModal(false), `capsule_history_${type.id}`);

  useEffect(() => {
    if (showMenu || showHistoryModal) {
      window.history.pushState({ modal: 'capsule_action' }, '');
    }
  }, [showMenu, showHistoryModal]);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const isToday = selectedDate === todayStr;
  const isPast = selectedDate < todayStr;
  const isFuture = selectedDate > todayStr;

  const isChecked = !!record;
  const checkedTimeStr =
    record?.checkInTime ||
    (record?.createdAt ? new Date(record.createdAt).toTimeString().slice(0, 5) : '');

  const previousList = record?.previousCheckIns || [];

  // Touch handlers for Long-Press on mobile (only active today)
  const handleTouchStart = () => {
    if (!isToday) return;
    touchMovedRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      if (!touchMovedRef.current) {
        setShowMenu(true);
      }
    }, 450);
  };

  const handleTouchMove = () => {
    touchMovedRef.current = true;
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // Click on item
  const handleItemClick = () => {
    if (isPast || isFuture) {
      // Historical or future date: clicking opens day detail modal
      if (onOpenDayDetail) {
        onOpenDayDetail();
      }
      return;
    }

    // Today:
    if (!isChecked) {
      // Direct check-in with current timestamp
      onToggle(type, 'overwrite');
    } else {
      // Already checked: open menu to allow overwrite or revoke
      setShowMenu(true);
    }
  };

  return (
    <div className="relative group shrink-0">
      {/* Column item designed for a side-by-side horizontal row */}
      <button
        type="button"
        onClick={handleItemClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`flex flex-col items-center justify-between w-[70px] sm:w-[74px] min-h-[86px] p-2 rounded-2xl border transition-all select-none cursor-pointer text-center active:scale-95 ${
          isChecked
            ? 'bg-emerald-50/90 border-emerald-300 shadow-2xs'
            : isPast
            ? 'bg-slate-50/60 border-slate-200/70 opacity-75'
            : isFuture
            ? 'bg-slate-50/40 border-slate-200/50 opacity-60'
            : `${themeColors.cardBg} ${themeColors.cardBorder} hover:border-slate-300 shadow-2xs`
        }`}
        title={
          isPast
            ? `${type.name} (历史记录，点击查阅)`
            : isFuture
            ? `${type.name} (未来日期未开始)`
            : isChecked
            ? `${type.name}: 已打卡 ${checkedTimeStr} (点击可管理或撤销)`
            : `${type.name}: 点击立即打卡`
        }
      >
        {/* Habit Icon Box with Checkmark Indicator */}
        <div
          className={`relative w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0 transition-transform group-hover:scale-105 ${
            isChecked
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs'
              : isPast
              ? 'bg-slate-100 text-slate-400 border border-slate-200/80'
              : `${themeColors.subtleBg} border ${themeColors.subtleBorder} text-slate-700`
          }`}
        >
          <span>{type.symbol}</span>

          {isChecked && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-600 rounded-full flex items-center justify-center text-white ring-2 ring-white shadow-xs">
              <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
            </span>
          )}
        </div>

        {/* Habit Name */}
        <span
          className={`text-[11px] font-semibold truncate w-full mt-1.5 leading-tight ${
            isChecked ? 'text-emerald-950 font-bold' : themeColors.textMain
          }`}
        >
          {type.name}
        </span>

        {/* 打卡了就在对应图标下显示时间 打卡撤销掉了时间就消失 */}
        <div className="h-4 flex items-center justify-center mt-0.5 w-full">
          {isChecked ? (
            <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-100/90 border border-emerald-200/80 px-1 py-0.2 rounded leading-none">
              {checkedTimeStr}
            </span>
          ) : (
            // 撤销或未打卡状态下时间消失，保持卡片高度整齐
            null
          )}
        </div>
      </button>

      {/* Checked Action Menu Popover / Bottom Sheet (Only when opened today) */}
      {showMenu && isToday && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs animate-fadeIn">
          <div className="w-full max-w-xs bg-white rounded-3xl p-5 shadow-2xl space-y-3.5 border border-slate-100">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{type.symbol}</span>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">{type.name} 打卡管理</h4>
                  <p className="text-[10px] text-slate-400">{selectedDate}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMenu(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isChecked ? (
              <div className="space-y-2">
                <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200/80 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-800 font-medium">当前记录时间</span>
                    <span className="font-mono font-bold text-emerald-900 text-sm">
                      {checkedTimeStr}
                    </span>
                  </div>
                  {previousList.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-emerald-200/60 text-[11px] text-emerald-700">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">此前打卡记录：</span>
                        <button
                          type="button"
                          onClick={() => setShowHistoryModal(true)}
                          className="text-[10px] text-emerald-800 underline font-medium"
                        >
                          历史明细
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1 font-mono">
                        {previousList.map((t, idx) => (
                          <span key={idx} className="bg-emerald-100 px-1.5 py-0.2 rounded text-[10px]">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    onToggle(type, 'overwrite');
                  }}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>覆盖更新为当前时间 ({new Date().toTimeString().slice(0, 5)})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    onToggle(type, 'toggle');
                  }}
                  className="w-full py-2.5 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-rose-200"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>撤销本次打卡（清除记录）</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setShowMenu(false);
                  onToggle(type, 'overwrite');
                }}
                className={`w-full py-2.5 px-4 ${themeColors.actionBtn} text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>立即打卡</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowMenu(false)}
              className="w-full py-2 text-center text-xs text-slate-500 hover:text-slate-700 font-medium"
            >
              关闭
            </button>
          </div>
        </div>
      )}

      {/* History Details Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs animate-fadeIn">
          <div className="w-full max-w-xs bg-white rounded-3xl p-5 shadow-2xl space-y-3 border border-slate-100">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-emerald-600" />
                <span>【{type.name}】打卡历史时间流水</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {previousList.map((time, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between text-xs p-2 bg-slate-50 rounded-xl text-slate-600 font-mono"
                >
                  <span className="text-slate-400">第 {idx + 1} 次打卡</span>
                  <span className="font-semibold text-slate-700">{time}</span>
                </div>
              ))}
              <div className="flex items-center justify-between text-xs p-2 bg-emerald-50 rounded-xl text-emerald-800 font-mono font-semibold">
                <span>最新打卡时间</span>
                <span>{checkedTimeStr}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowHistoryModal(false)}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
            >
              返回
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

