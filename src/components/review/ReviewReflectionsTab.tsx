// src/components/review/ReviewReflectionsTab.tsx
import React, { useState } from 'react';
import { Lock, Plus, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Reflection } from '../../types';
import { getThemeColors } from '../../utils/themeStyles';
import { DeleteConfirmationModal } from '../records/DeleteConfirmationModal';

interface ReviewReflectionsTabProps {
  onOpenReflectionCreate: () => void;
  onOpenReflectionEdit: (r: Reflection) => void;
  onUnlockBiometric: () => void;
  onOpenTaskCreate: (title: string) => void;
}

export const ReviewReflectionsTab: React.FC<ReviewReflectionsTabProps> = ({
  onOpenReflectionCreate,
  onOpenReflectionEdit,
  onUnlockBiometric,
  onOpenTaskCreate,
}) => {
  const {
    reflections,
    deleteReflection,
    offloadItem,
    permanentDeleteItem,
    isBiometricLocked,
    theme,
  } = useApp();
  const themeColors = getThemeColors(theme);

  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    title: string;
    description?: string;
  } | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className={`text-xs font-semibold ${themeColors.textMain}`}>事实反思与行为复盘</h3>
          <p className={`text-[11px] ${themeColors.textSub}`}>结合历史上下文 · 严格 V1-V5 规则核验</p>
        </div>
        <button
          onClick={onOpenReflectionCreate}
          className={`flex items-center gap-1 px-3 py-1.5 ${themeColors.actionBtn} text-white text-xs font-medium rounded-xl shadow-xs transition-colors`}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>新建反思</span>
        </button>
      </div>

      {isBiometricLocked ? (
        <div className={`p-8 ${themeColors.cardBg} rounded-2xl border ${themeColors.cardBorder} shadow-xs text-center`}>
          <div className="w-12 h-12 bg-purple-100/70 text-purple-700 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Lock className="w-6 h-6" />
          </div>
          <h4 className={`text-sm font-semibold ${themeColors.textMain}`}>反思隐私锁保护中</h4>
          <p className={`text-xs ${themeColors.textMuted} mt-1 mb-4`}>
            反思包含个人真实动机、情绪及行为记录，需要密码解锁访问
          </p>
          <button
            onClick={onUnlockBiometric}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded-xl shadow-xs transition-colors"
          >
            输入 PIN 码解锁
          </button>
        </div>
      ) : reflections.length === 0 ? (
        <div className={`p-8 ${themeColors.cardBg} rounded-2xl border ${themeColors.cardBorder} text-center text-xs ${themeColors.textSub}`}>
          暂无反思记录，点击右上角开始沉淀第一条行为复盘
        </div>
      ) : (
        <div className="space-y-3">
          {reflections.map((ref) => (
            <div
              key={ref.id}
              className={`p-4 ${themeColors.cardBg} rounded-2xl border ${themeColors.cardBorder} shadow-xs space-y-3 ${themeColors.cardHoverBorder} transition-colors`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full font-medium">
                    心境：{ref.emotion}
                  </span>
                  <span className={`text-[10px] ${themeColors.textSub}`}>
                    {ref.createdAt.slice(0, 16).replace('T', ' ')}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onOpenReflectionEdit(ref)}
                    className={`text-[11px] ${themeColors.primaryText} hover:underline`}
                  >
                    编辑
                  </button>
                  <button
                    onClick={() =>
                      setDeleteTarget({
                        id: ref.id,
                        title: '删除反思记录',
                        description: `【心境：${ref.emotion}】${ref.eventDescription.slice(0, 50)}`,
                      })
                    }
                    className={`text-[11px] ${themeColors.textSub} hover:text-rose-500 ml-2`}
                  >
                    删除
                  </button>
                </div>
              </div>

              {/* 4 Fields */}
              <div className="space-y-1 text-xs">
                <p className={`${themeColors.textMain} font-medium`}>
                  <span className={`${themeColors.textSub} font-normal mr-1`}>事实:</span>
                  {ref.eventDescription}
                </p>
                {ref.actionTaken && (
                  <p className={themeColors.textMuted}>
                    <span className={`${themeColors.textSub} mr-1`}>行动:</span>
                    {ref.actionTaken}
                  </p>
                )}
                {ref.result && (
                  <p className={themeColors.textMuted}>
                    <span className={`${themeColors.textSub} mr-1`}>结果:</span>
                    {ref.result}
                  </p>
                )}
              </div>

              {/* Lessons Learned */}
              {ref.lessonsLearned && (
                <div className="p-2.5 bg-amber-100/70 border border-amber-200/90 rounded-xl text-xs text-amber-950 font-medium">
                  <span className="font-bold text-amber-900 block mb-0.5 text-[11px]">💡 总结经验与后续警醒：</span>
                  <p className="leading-relaxed whitespace-pre-wrap">{ref.lessonsLearned}</p>
                </div>
              )}

              {/* AI Sections */}
              {ref.aiSummary && (
                <div className={`p-3 ${themeColors.subtleBg} rounded-xl border ${themeColors.subtleBorder} text-[11px] space-y-2`}>
                  <div className={`flex items-center justify-between ${themeColors.textSub} pb-1 border-b ${themeColors.divider}`}>
                    <span className={`font-semibold ${themeColors.textMain} flex items-center gap-1`}>
                      <ShieldCheck className="w-3.5 h-3.5 text-[#4CAF50]" />
                      AI 结构化反思沉淀
                    </span>
                    <span className="text-[10px] text-[#4CAF50] font-medium">V1-V5 校验合规</span>
                  </div>

                  {ref.aiSummary.keySuggestion && (
                    <div className="p-2 bg-indigo-100/60 border border-indigo-200 rounded-lg text-indigo-950 font-medium leading-relaxed">
                      <span className="font-bold text-indigo-800 block mb-0.5">💡 AI 关键提点与盲点提醒：</span>
                      {ref.aiSummary.keySuggestion}
                    </div>
                  )}

                  <p>
                    <span className={`font-semibold ${themeColors.textMain}`}>事实摘要：</span>
                    {ref.aiSummary.eventSummary}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <p className="text-emerald-700 bg-emerald-50/50 p-1.5 rounded">
                      <span className="font-semibold">✓ 稳妥之处：</span>
                      {ref.aiSummary.goodPoints}
                    </p>
                    <p className="text-amber-700 bg-amber-50/50 p-1.5 rounded">
                      <span className="font-semibold">! 忽视因素：</span>
                      {ref.aiSummary.ignoredFactors}
                    </p>
                  </div>

                  <p className="text-sky-800 bg-sky-50/50 p-1.5 rounded">
                    <span className="font-semibold">改善空间：</span>
                    {ref.aiSummary.improvementPoints}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Dual-Track Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={!!deleteTarget}
        title={deleteTarget?.title || '删除反思记录'}
        itemDescription={deleteTarget?.description}
        onClose={() => setDeleteTarget(null)}
        onOffload={() => {
          if (deleteTarget) {
            offloadItem('reflections', deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
        onPermanentDelete={() => {
          if (deleteTarget) {
            permanentDeleteItem('reflections', deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
      />
    </div>
  );
};
