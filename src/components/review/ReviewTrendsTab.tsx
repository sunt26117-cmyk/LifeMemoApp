// src/components/review/ReviewTrendsTab.tsx
import React, { useState, useMemo } from 'react';
import { Activity, Sparkles } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { GrowthEngine } from '../../growth/growthEngine';
import { AiService } from '../../services/aiService';
import { getThemeColors } from '../../utils/themeStyles';
import { formatLocalDate } from '../../utils/dateUtil';

export const ReviewTrendsTab: React.FC = () => {
  const { checkInRecords, checkInTypes, trends, themes, statAnchorDate, theme } = useApp();
  const themeColors = getThemeColors(theme);
  const [growthTimeRange, setGrowthTimeRange] = useState<'week' | 'month' | 'year'>('month');
  const [aiGrowthText, setAiGrowthText] = useState<string | null>(null);
  const [analyzingGrowth, setAnalyzingGrowth] = useState(false);
  const [inspectTrendId, setInspectTrendId] = useState<string | null>(null);

  const anchorDateStr = statAnchorDate ? statAnchorDate.split('T')[0] : null;

  // Growth points computation (受 stat_anchor_date 约束)
  const growthPoints = useMemo(() => {
    const engine = new GrowthEngine();
    const count = growthTimeRange === 'week' ? 7 : growthTimeRange === 'month' ? 14 : 30;
    const rates: number[] = [];
    const labels: string[] = [];

    const now = new Date();
    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const ds = formatLocalDate(d);

      // If date is before stat_anchor_date, do not query or count check-ins before anchor
      if (anchorDateStr && ds < anchorDateStr) {
        continue;
      }

      labels.push(`${d.getMonth() + 1}/${d.getDate()}`);

      // Count check-in completion
      const dayChecks = checkInRecords.filter(
        (r) => r.date === ds && (!anchorDateStr || r.date >= anchorDateStr)
      ).length;
      const rate = Math.min(
        1.0,
        dayChecks / Math.max(1, checkInTypes.filter((t) => t.enabled).length)
      );
      rates.push(rate);
    }

    if (rates.length === 0) {
      labels.push(`${now.getMonth() + 1}/${now.getDate()}`);
      rates.push(0);
    }

    const series = engine.computeSeries({
      initialState: GrowthEngine.initial(),
      completionRates: rates,
    });

    return {
      labels,
      scores: series.map((s) => s.newState.score),
      deltas: series.map((s) => s.delta),
    };
  }, [growthTimeRange, checkInRecords, checkInTypes, anchorDateStr]);

  const handleAnalyzeGrowth = async () => {
    setAnalyzingGrowth(true);
    try {
      const text = await AiService.generateGrowthAnalysis(
        growthPoints.scores,
        growthPoints.labels
      );
      setAiGrowthText(text);
    } finally {
      setAnalyzingGrowth(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Growth Curve Chart */}
      <div className={`${themeColors.cardBg} p-4 rounded-2xl border ${themeColors.cardBorder} shadow-xs`}>
        {anchorDateStr && (
          <div className="mb-3 px-3 py-1.5 bg-amber-100/70 border border-amber-300 rounded-xl text-[11px] text-amber-900 flex items-center justify-between">
            <span>📌 统计锚点生效中：{anchorDateStr} 起计算</span>
            <span className="text-[10px] text-amber-800">重置前的历史打卡与图表已隔离</span>
          </div>
        )}
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className={`text-xs font-semibold ${themeColors.textMain} flex items-center gap-1.5`}>
              <Activity className={`w-4 h-4 ${themeColors.primaryText}`} />
              <span>综合成长轨迹评分（GrowthEngine 引擎）</span>
            </h3>
            <p className={`text-[10px] ${themeColors.textSub}`}>
              结合稳定线 70%、上升动量系数与连续达成衰减保护
            </p>
          </div>

          <div className={`flex gap-1 ${themeColors.segmentBg} p-0.5 rounded-xl text-[11px]`}>
            {(['week', 'month', 'year'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setGrowthTimeRange(r)}
                className={`px-2 py-0.5 rounded-lg transition-all ${
                  growthTimeRange === r
                    ? `${themeColors.segmentActiveBg} ${themeColors.segmentActiveText} font-semibold shadow-xs`
                    : themeColors.textSub
                }`}
              >
                {r === 'week' ? '周' : r === 'month' ? '月' : '年'}
              </button>
            ))}
          </div>
        </div>

        {/* SVG Interactive Line Chart */}
        <div className="h-40 w-full relative pt-4 pb-2">
          <svg className="w-full h-full overflow-visible" viewBox="0 0 500 120">
            {/* 70% Stability Line */}
            <line
              x1="0"
              y1="36"
              x2="500"
              y2="36"
              stroke="#4CAF50"
              strokeDasharray="4 4"
              strokeWidth="1.5"
            />
            <text x="4" y="32" fill="#4CAF50" fontSize="9" fontWeight="bold">
              个人稳定基线 (70%)
            </text>

            {/* Score Line */}
            {growthPoints.scores.length > 1 && (
              <polyline
                fill="none"
                stroke={themeColors.primaryHex}
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={growthPoints.scores
                  .map((s, i) => {
                    const x = (i / (growthPoints.scores.length - 1)) * 480 + 10;
                    const y = 60 - (s / 100) * 50;
                    return `${x},${y}`;
                  })
                  .join(' ')}
              />
            )}

            {/* Data Points */}
            {growthPoints.scores.map((s, i) => {
              const x = (i / (growthPoints.scores.length - 1)) * 480 + 10;
              const y = 60 - (s / 100) * 50;
              return (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r="4"
                  fill="white"
                  stroke={themeColors.primaryHex}
                  strokeWidth="2"
                  className="hover:r-6 cursor-pointer transition-all"
                >
                  <title>{`${growthPoints.labels[i]}: ${s.toFixed(1)}分`}</title>
                </circle>
              );
            })}
          </svg>
        </div>

        {/* Growth Analysis Trigger */}
        <div className={`mt-2 pt-2 border-t ${themeColors.divider} flex items-center justify-between`}>
          <span className={`text-[11px] ${themeColors.textSub}`}>
            当前得分：
            <strong className={`${themeColors.primaryText} ml-1`}>
              {growthPoints.scores[growthPoints.scores.length - 1]?.toFixed(1) || 0}
            </strong>
          </span>

          <button
            onClick={handleAnalyzeGrowth}
            disabled={analyzingGrowth}
            className="flex items-center gap-1 text-[11px] px-2.5 py-1 bg-purple-100/70 hover:bg-purple-200/70 text-purple-800 font-medium rounded-lg transition-colors border border-purple-200"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{analyzingGrowth ? '分析中...' : 'AI 曲线解读'}</span>
          </button>
        </div>

        {aiGrowthText && (
          <div className="mt-3 p-3 bg-purple-100/60 rounded-xl text-xs text-purple-950 leading-relaxed border border-purple-200">
            <span className="font-semibold block mb-1">🤖 AI 自然语言洞察：</span>
            {aiGrowthText}
          </div>
        )}
      </div>

      {/* Themes Aggregation Cards */}
      <div className={`${themeColors.cardBg} p-4 rounded-2xl border ${themeColors.cardBorder} shadow-xs`}>
        <h4 className={`text-xs font-semibold ${themeColors.textMain} mb-2`}>行为主题聚合 (Theme Engine)</h4>
        {themes.length === 0 ? (
          <p className={`text-xs ${themeColors.textSub} py-3 text-center`}>
            暂无行为主题。当你在任务完成或延期中沉淀行为证据时，系统将自动聚类主题。
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {themes.map((th) => (
              <div
                key={th.id}
                className={`p-3 rounded-xl ${themeColors.subtleBg} border ${themeColors.subtleBorder} flex items-center justify-between`}
              >
                <div>
                  <span className={`text-xs font-semibold ${themeColors.textMain}`}>{th.themeName}</span>
                  <span className={`text-[10px] ${themeColors.textSub} block mt-0.5`}>
                    权重: {th.weight.toFixed(1)} · 关联 {th.trendNames?.length || 1} 条趋势
                  </span>
                </div>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    th.direction === '改善'
                      ? 'bg-emerald-100 text-emerald-700'
                      : th.direction === '恶化'
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {th.direction}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Behavioral Trends List & Evidence */}
      <div className={`${themeColors.cardBg} p-4 rounded-2xl border ${themeColors.cardBorder} shadow-xs space-y-2`}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h4 className={`text-xs font-semibold ${themeColors.textMain}`}>行为趋势与不可逆证据链</h4>
            <p className={`text-[10px] ${themeColors.textSub}`}>近 30 天滑动窗口判定方向，近 50 条纯追加证据</p>
          </div>
        </div>

        {trends.length === 0 ? (
          <p className={`text-xs ${themeColors.textSub} py-4 text-center`}>
            暂无行为趋势记录。执行或更新任务状态后，将以不可逆时间序列记录行为变迁。
          </p>
        ) : (
          trends.map((tr) => (
            <div
              key={tr.id}
              onClick={() => setInspectTrendId(inspectTrendId === tr.id ? null : tr.id)}
              className={`p-3 rounded-xl border ${themeColors.cardBorder} ${themeColors.cardHoverBorder} cursor-pointer transition-colors`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0 pr-2">
                  <span className={`text-xs font-semibold ${themeColors.textMain} block truncate`}>
                    {tr.trendName}
                  </span>
                  <span className={`text-[10px] ${themeColors.textSub}`}>
                    分类: {tr.category} · 累计分数: {tr.score.toFixed(1)} · 权重: {tr.weight.toFixed(1)}
                  </span>
                </div>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${
                    tr.direction === '改善'
                      ? 'bg-emerald-100 text-emerald-700'
                      : tr.direction === '恶化'
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {tr.direction}
                </span>
              </div>

              {/* Expanded Evidence Records */}
              {inspectTrendId === tr.id && (() => {
                const validEvidences = anchorDateStr
                  ? tr.evidence.filter((e) => e.time >= anchorDateStr)
                  : tr.evidence;
                return (
                  <div className={`mt-3 pt-2 border-t ${themeColors.divider} text-[11px] space-y-1.5`}>
                    <span className={`font-semibold ${themeColors.textMuted} block`}>
                      最近证据记录（最多保留 50 条）：
                    </span>
                    {validEvidences.length === 0 ? (
                      <p className={themeColors.textSub}>暂无事件记录（已隔离锚点前数据）</p>
                    ) : (
                      validEvidences.slice(0, 5).map((ev, idx) => (
                        <div
                          key={idx}
                          className={`flex items-center justify-between p-1.5 rounded ${themeColors.subtleBg} text-[10px]`}
                        >
                          <span className={themeColors.textMain}>
                            {ev.event === 'completed'
                              ? '已完成任务'
                              : ev.event === 'delayed'
                              ? '任务延期'
                              : '任务取消'}
                            {ev.behaviorImprovement && `（${ev.behaviorImprovement.join('、')}）`}
                          </span>
                          <span
                            className={`font-semibold ${
                              ev.delta < 0 ? 'text-[#4CAF50]' : 'text-[#FF9800]'
                            }`}
                          >
                            delta: {ev.delta > 0 ? `+${ev.delta}` : ev.delta}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                );
              })()}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
