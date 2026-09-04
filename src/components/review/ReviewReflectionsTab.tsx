// src/components/review/ReviewReflectionsTab.tsx
import React from 'react';
import { Lock, Plus, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Reflection } from '../../types';

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
  const { reflections, deleteReflection, isBiometricLocked } = useApp();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-semibold text-slate-800">事实反思与行为复盘</h3>
          <p className="text-[11px] text-slate-400">结合历史上下文 · 严格 V1-V5 规则核验</p>
        </div>
        <button
          onClick={onOpenReflectionCreate}
          className="flex items-center gap-1 px-3 py-1.5 bg-[#4A90D9] hover:bg-[#3d7ec1] text-white text-xs font-medium rounded-xl shadow-xs transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>新建反思</span>
        </button>
      </div>

      {isBiometricLocked ? (
        <div className="p-8 bg-white rounded-2xl border border-slate-100 shadow-xs text-center">
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Lock className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-semibold text-slate-800">反思隐私锁保护中</h4>
          <p className="text-xs text-slate-500 mt-1 mb-4">
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
        <div className="p-8 bg-white rounded-2xl border border-slate-100 text-center text-xs text-slate-400">
          暂无反思记录，点击右上角开始沉淀第一条行为复盘
        </div>
      ) : (
        <div className="space-y-3">
          {reflections.map((ref) => (
            <div
              key={ref.id}
              className="p-4 bg-white rounded-2xl border border-slate-100 shadow-xs space-y-3 hover:border-slate-200 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full font-medium">
                    心境：{ref.emotion}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {ref.createdAt.slice(0, 16).replace('T', ' ')}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onOpenReflectionEdit(ref)}
                    className="text-[11px] text-[#4A90D9] hover:underline"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => deleteReflection(ref.id)}
                    className="text-[11px] text-slate-400 hover:text-rose-500 ml-2"
                  >
                    删除
                  </button>
                </div>
              </div>

              {/* 4 Fields */}
              <div className="space-y-1 text-xs">
                <p className="text-slate-800 font-medium">
                  <span className="text-slate-400 font-normal mr-1">事实:</span>
                  {ref.eventDescription}
                </p>
                {ref.actionTaken && (
                  <p className="text-slate-600">
                    <span className="text-slate-400 mr-1">行动:</span>
                    {ref.actionTaken}
                  </p>
                )}
                {ref.result && (
                  <p className="text-slate-600">
                    <span className="text-slate-400 mr-1">结果:</span>
                    {ref.result}
                  </p>
                )}
              </div>

              {/* AI 6 Sections */}
              {ref.aiSummary && (
                <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 text-[11px] space-y-2">
                  <div className="flex items-center justify-between text-slate-500 pb-1 border-b border-slate-200">
                    <span className="font-semibold text-slate-700 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#4CAF50]" />
                      AI 结构化反思沉淀
                    </span>
                    <span className="text-[10px] text-[#4CAF50] font-medium">V1-V5 校验合规</span>
                  </div>

                  <p>
                    <span className="font-semibold text-slate-700">事实摘要：</span>
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

                  <p className="text-purple-800 bg-purple-50/50 p-1.5 rounded">
                    <span className="font-semibold">下一建议（动词）：</span>
                    {ref.aiSummary.nextSuggestion}
                  </p>

                  {ref.aiSummary.suggestedTask && (
                    <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-sky-100">
                      <div>
                        <span className="text-[10px] text-[#4A90D9] font-semibold block">
                          转化为闭环待办
                        </span>
                        <span className="text-slate-800 font-medium">{ref.aiSummary.suggestedTask}</span>
                      </div>
                      <button
                        onClick={() => onOpenTaskCreate(ref.aiSummary!.suggestedTask!)}
                        className="px-2 py-1 bg-[#4A90D9] hover:bg-[#3d7ec1] text-white text-[10px] rounded font-medium transition-colors"
                      >
                        创建待办
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
