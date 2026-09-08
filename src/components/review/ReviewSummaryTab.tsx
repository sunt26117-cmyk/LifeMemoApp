// src/components/review/ReviewSummaryTab.tsx
import React, { useState, useMemo } from 'react';
import { Sparkles, Lock, FileText, History } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { SummaryType } from '../../types';
import { AiService } from '../../services/aiService';
import { getPeriodKey } from '../../services/storage';
import { getThemeColors } from '../../utils/themeStyles';

export const ReviewSummaryTab: React.FC = () => {
  const { summaries, addSummary, tasks, checkInRecords, checkInTypes, reflections, theme } = useApp();
  const themeColors = getThemeColors(theme);
  const [summaryType, setSummaryType] = useState<SummaryType>('周');
  const [generatingSummary, setGeneratingSummary] = useState(false);

  const cycleType = summaryType === '周' ? 'week' : summaryType === '月' ? 'month' : 'year';
  const currentPeriodKey = useMemo(() => getPeriodKey(cycleType, new Date()), [cycleType]);

  // Current cycle summary
  const currentCycleSummary = useMemo(() => {
    return summaries.find((s) => s.periodKey === currentPeriodKey);
  }, [summaries, currentPeriodKey]);

  const isCurrentFrozen = currentCycleSummary?.isFrozen ?? false;

  const handleGenerateSummary = async () => {
    if (isCurrentFrozen) {
      alert(`周期 [${currentPeriodKey}] 已封印锁定，禁止修改或刷新。`);
      return;
    }

    setGeneratingSummary(true);
    try {
      const completed = tasks.filter((t) => t.status === '已完成').length;
      const total = tasks.length;
      const chk = checkInRecords.length;
      const refCount = reflections.length;

      const res = await AiService.generatePeriodicSummary({
        type: summaryType,
        periodStart: new Date(Date.now() - (summaryType === '周' ? 7 : summaryType === '月' ? 30 : 365) * 86400000).toISOString(),
        periodEnd: new Date().toISOString(),
        tasksCompleted: completed,
        tasksTotal: total,
        checkInCount: chk,
        reflectionCount: refCount,
        checkInRecords,
        checkInTypes,
      });

      addSummary({
        type: summaryType,
        cycleType,
        periodKey: currentPeriodKey,
        isFrozen: false,
        version: currentCycleSummary ? (currentCycleSummary.version || 1) + 1 : 1,
        updatedAt: new Date().toISOString(),
        periodStart: new Date(
          Date.now() - (summaryType === '周' ? 7 : 30) * 86400000
        ).toISOString(),
        periodEnd: new Date().toISOString(),
        content: res.content,
        themes: res.themes,
        highlights: res.highlights,
        taskSuggestions: res.taskSuggestions,
      });
    } finally {
      setGeneratingSummary(false);
    }
  };

  const filteredSummaries = summaries.filter(
    (s) => s.type === summaryType || s.cycleType === cycleType
  );

  return (
    <div className="space-y-4">
      <div className={`${themeColors.cardBg} p-4 rounded-2xl border ${themeColors.cardBorder} shadow-xs`}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className={`text-xs font-semibold ${themeColors.textMain}`}>周期总结与年度复盘</h3>
            <p className={`text-[10px] ${themeColors.textSub}`}>
              周期标识: <span className={`font-mono ${themeColors.primaryText}`}>{currentPeriodKey}</span> · 草稿更新与跨期封印
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className={`flex gap-1 ${themeColors.segmentBg} p-0.5 rounded-xl text-[11px]`}>
              {(['周', '月', '年'] as SummaryType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setSummaryType(t)}
                  className={`px-2 py-0.5 rounded-lg transition-all ${
                    summaryType === t
                      ? `${themeColors.segmentActiveBg} ${themeColors.segmentActiveText} font-semibold shadow-xs`
                      : themeColors.textSub
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <button
              onClick={handleGenerateSummary}
              disabled={generatingSummary || isCurrentFrozen}
              className={`flex items-center gap-1 px-3 py-1.5 text-white text-xs font-medium rounded-xl shadow-xs transition-colors ${
                isCurrentFrozen
                  ? 'bg-slate-400 cursor-not-allowed'
                  : currentCycleSummary
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : themeColors.actionBtn
              }`}
            >
              {isCurrentFrozen ? (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>已跨期封印</span>
                </>
              ) : generatingSummary ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                  <span>生成中...</span>
                </>
              ) : currentCycleSummary ? (
                <>
                  <History className="w-3.5 h-3.5" />
                  <span>更新草稿 (v{(currentCycleSummary.version || 1) + 1})</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>生成{summaryType}总结</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Status info bar for current period */}
        <div className={`mb-3 p-2.5 rounded-xl ${themeColors.subtleBg} border ${themeColors.subtleBorder} flex items-center justify-between text-[11px]`}>
          <div className="flex items-center gap-1.5">
            {isCurrentFrozen ? (
              <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 font-medium flex items-center gap-1">
                <Lock className="w-3 h-3" />
                已封印 (只读锁定)
              </span>
            ) : currentCycleSummary ? (
              <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-medium flex items-center gap-1">
                <FileText className="w-3 h-3" />
                当前草稿 (v{currentCycleSummary.version || 1})
              </span>
            ) : (
              <span className={`px-2 py-0.5 rounded-md ${themeColors.badgeBg} ${themeColors.primaryText} font-medium`}>
                本周期尚未生成总结
              </span>
            )}
            <span className={themeColors.textSub}>当前周期: {currentPeriodKey}</span>
          </div>
          <span className={`text-[10px] ${themeColors.textSub}`}>
            {currentCycleSummary?.updatedAt
              ? `最近更新: ${new Date(currentCycleSummary.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              : '跨期将自动封印'}
          </span>
        </div>

        {/* Summaries list */}
        <div className="space-y-4">
          {filteredSummaries.length === 0 ? (
            <div className={`text-center py-8 ${themeColors.textSub} text-xs`}>
              <p>暂无{summaryType}总结记录，点击右上角开始生成</p>
            </div>
          ) : (
            filteredSummaries.map((sum) => (
              <div
                key={sum.id}
                className={`p-4 rounded-2xl ${themeColors.subtleBg} border ${themeColors.subtleBorder} space-y-3`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs font-bold ${themeColors.textMain} px-2 py-0.5 ${themeColors.cardBg} rounded-md border ${themeColors.cardBorder}`}>
                      {sum.type}度总结
                    </span>
                    {sum.periodKey && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-200/70 text-slate-700 rounded">
                        {sum.periodKey}
                      </span>
                    )}
                    {sum.isFrozen ? (
                      <span className="text-[10px] px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded flex items-center gap-0.5 font-medium">
                        <Lock className="w-2.5 h-2.5" /> 已封印
                      </span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-medium">
                        草稿 v{sum.version || 1}
                      </span>
                    )}
                  </div>
                  <span className={`text-[10px] ${themeColors.textSub}`}>
                    {sum.periodStart.slice(0, 10)} ~ {sum.periodEnd.slice(0, 10)}
                  </span>
                </div>

                <p className={`text-xs ${themeColors.textMain} leading-relaxed whitespace-pre-line`}>
                  {sum.content}
                </p>

                {/* Highlights */}
                {sum.highlights.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-[#4CAF50] block">
                      ⭐ 核心亮点：
                    </span>
                    {sum.highlights.map((h, i) => (
                      <p key={i} className={`text-[11px] ${themeColors.textMuted}`}>
                        • {h}
                      </p>
                    ))}
                  </div>
                )}

                {/* Suggestions */}
                {sum.taskSuggestions.length > 0 && (
                  <div className="space-y-1">
                    <span className={`text-[11px] font-semibold ${themeColors.primaryText} block`}>
                      🎯 建议行动计划：
                    </span>
                    {sum.taskSuggestions.map((s, i) => (
                      <p key={i} className={`text-[11px] ${themeColors.textMuted}`}>
                        • {s}
                      </p>
                    ))}
                  </div>
                )}

                {/* Annual Special 5-Stage Data */}
                {sum.annualData && (
                  <div className="p-3 bg-amber-100/70 border border-amber-300 rounded-xl space-y-2 mt-2">
                    <span className="text-xs font-bold text-amber-900 block">
                      🏆 年度主题：{sum.annualData.annualTheme}
                    </span>
                    <p className="text-[11px] text-amber-950">
                      <strong>行为趋势：</strong>
                      {sum.annualData.behaviorTrend}
                    </p>
                    <p className="text-[11px] text-amber-950">
                      <strong>心境状态：</strong>
                      {sum.annualData.moodTrend}
                    </p>
                    <p className="text-[11px] text-amber-950">
                      <strong>生活节律：</strong>
                      {sum.annualData.lifeRhythm}
                    </p>
                    <p className="text-[11px] text-amber-950 italic">
                      “{sum.annualData.annualReflection}”
                    </p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
