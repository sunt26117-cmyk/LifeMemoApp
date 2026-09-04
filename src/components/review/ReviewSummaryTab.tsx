// src/components/review/ReviewSummaryTab.tsx
import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { SummaryType } from '../../types';
import { AiService } from '../../services/aiService';

export const ReviewSummaryTab: React.FC = () => {
  const { summaries, addSummary, tasks, checkInRecords, reflections } = useApp();
  const [summaryType, setSummaryType] = useState<SummaryType>('周');
  const [generatingSummary, setGeneratingSummary] = useState(false);

  const handleGenerateSummary = async () => {
    setGeneratingSummary(true);
    try {
      const completed = tasks.filter((t) => t.status === '已完成').length;
      const total = tasks.length;
      const chk = checkInRecords.length;
      const refCount = reflections.length;

      const res = await AiService.generatePeriodicSummary({
        type: summaryType,
        periodStart: new Date(Date.now() - 7 * 86400000).toISOString(),
        periodEnd: new Date().toISOString(),
        tasksCompleted: completed,
        tasksTotal: total,
        checkInCount: chk,
        reflectionCount: refCount,
      });

      addSummary({
        type: summaryType,
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

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-xs font-semibold text-slate-800">周期总结与年度复盘</h3>
            <p className="text-[10px] text-slate-400">结构化汇总 · 洞察自律节奏</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex gap-1 bg-slate-100 p-0.5 rounded-xl text-[11px]">
              {(['周', '月', '年'] as SummaryType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setSummaryType(t)}
                  className={`px-2 py-0.5 rounded-lg ${
                    summaryType === t
                      ? 'bg-white text-slate-800 font-semibold shadow-xs'
                      : 'text-slate-500'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <button
              onClick={handleGenerateSummary}
              disabled={generatingSummary}
              className="flex items-center gap-1 px-3 py-1 bg-[#4A90D9] hover:bg-[#3d7ec1] text-white text-xs font-medium rounded-xl shadow-xs transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{generatingSummary ? '生成中...' : `生成${summaryType}总结`}</span>
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {summaries
            .filter((s) => s.type === summaryType)
            .map((sum) => (
              <div
                key={sum.id}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 px-2 py-0.5 bg-white rounded-md border border-slate-200">
                    {sum.type}度总结
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {sum.periodStart.slice(0, 10)} ~ {sum.periodEnd.slice(0, 10)}
                  </span>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                  {sum.content}
                </p>

                {/* Highlights */}
                {sum.highlights.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-[#4CAF50] block">
                      ⭐ 核心亮点：
                    </span>
                    {sum.highlights.map((h, i) => (
                      <p key={i} className="text-[11px] text-slate-600">
                        • {h}
                      </p>
                    ))}
                  </div>
                )}

                {/* Suggestions */}
                {sum.taskSuggestions.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-[#4A90D9] block">
                      🎯 建议行动计划：
                    </span>
                    {sum.taskSuggestions.map((s, i) => (
                      <p key={i} className="text-[11px] text-slate-600">
                        • {s}
                      </p>
                    ))}
                  </div>
                )}

                {/* Annual Special 5-Stage Data */}
                {sum.annualData && (
                  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2 mt-2">
                    <span className="text-xs font-bold text-amber-800 block">
                      🏆 年度主题：{sum.annualData.annualTheme}
                    </span>
                    <p className="text-[11px] text-slate-700">
                      <strong>行为趋势：</strong>
                      {sum.annualData.behaviorTrend}
                    </p>
                    <p className="text-[11px] text-slate-700">
                      <strong>心境状态：</strong>
                      {sum.annualData.moodTrend}
                    </p>
                    <p className="text-[11px] text-slate-700">
                      <strong>生活节律：</strong>
                      {sum.annualData.lifeRhythm}
                    </p>
                    <p className="text-[11px] text-slate-700 italic">
                      “{sum.annualData.annualReflection}”
                    </p>
                  </div>
                )}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};
