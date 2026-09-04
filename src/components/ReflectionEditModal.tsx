// src/components/ReflectionEditModal.tsx
import React, { useState } from 'react';
import { X, Sparkles, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { Emotion, Reflection, ReflectionSummary } from '../types';
import { useApp } from '../context/AppContext';
import { AiService } from '../services/aiService';
import { buildContextPack } from '../utils/contextRetrieval';
import { validate } from '../utils/validator';

interface ReflectionEditModalProps {
  isOpen: boolean;
  reflection?: Reflection | null;
  onClose: () => void;
  onOpenTaskCreate?: (title: string) => void;
}

const EMOTIONS: Emotion[] = [
  '平静',
  '开心',
  '紧张',
  '焦虑',
  '愤怒',
  '难过',
  '疲惫',
  '兴奋',
  '满足',
  '其他',
];

export const ReflectionEditModal: React.FC<ReflectionEditModalProps> = ({
  isOpen,
  reflection,
  onClose,
  onOpenTaskCreate,
}) => {
  const { addReflection, updateReflection, memories, photos, tasks, summaries } = useApp();

  const [eventDescription, setEventDescription] = useState(reflection?.eventDescription || '');
  const [emotion, setEmotion] = useState<Emotion>((reflection?.emotion as Emotion) || '平静');
  const [actionTaken, setActionTaken] = useState(reflection?.actionTaken || '');
  const [result, setResult] = useState(reflection?.result || '');

  // AI Output
  const [aiSummary, setAiSummary] = useState<ReflectionSummary | null>(reflection?.aiSummary || null);
  const [generating, setGenerating] = useState(false);
  const [validationViolations, setValidationViolations] = useState<{ rule: string; detail: string }[]>([]);

  if (!isOpen) return null;

  const handleGenerateAi = async () => {
    if (!eventDescription.trim()) return;
    setGenerating(true);
    setValidationViolations([]);

    try {
      // 1. Context retrieval
      const pack = buildContextPack({
        eventDescription,
        emotion,
        actionTaken,
        result,
        tags: [emotion],
        memories,
        photos,
        tasks,
        summaries,
      });

      // 2. Call AI service
      const res = await AiService.generateReflection({
        eventDescription,
        emotion,
        actionTaken,
        result,
        contextPack: pack,
      });

      // 3. Validate
      const val = validate(res.summary, pack);
      setValidationViolations(val.violations);
      setAiSummary(res.summary);
    } catch (err) {
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  const handleConvertTask = () => {
    if (aiSummary?.suggestedTask && onOpenTaskCreate) {
      onOpenTaskCreate(aiSummary.suggestedTask);
    }
  };

  const handleSave = () => {
    if (!eventDescription.trim()) return;

    if (reflection) {
      updateReflection({
        ...reflection,
        eventDescription: eventDescription.trim(),
        emotion,
        actionTaken: actionTaken.trim(),
        result: result.trim(),
        aiSummary,
        isUserConfirmed: true,
      });
    } else {
      addReflection({
        eventDescription: eventDescription.trim(),
        emotion,
        actionTaken: actionTaken.trim(),
        result: result.trim(),
        aiSummary,
        relatedMemoryIds: aiSummary?.citations.memoryIds || [],
        relatedPhotoIds: aiSummary?.citations.photoIds || [],
        relatedTaskIds: [],
        relatedSummaryIds: [],
        isUserConfirmed: true,
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl p-6 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 rounded-full"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-800">
              {reflection ? '编辑深度反思' : '新建行为反思'}
            </h3>
            <p className="text-xs text-slate-400">
              基于客观事实 · 严格 V1-V5 校验 · 沉淀真实行为证据
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Section 1: User 4 fields */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              发生了什么事实？ <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={2}
              required
              placeholder="客观描述事件经过，例如：与客户进行了两小时项目需求对齐会议..."
              value={eventDescription}
              onChange={(e) => setEventDescription(e.target.value)}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#57B8E3]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              当时的核心情绪
            </label>
            <div className="flex flex-wrap gap-1.5">
              {EMOTIONS.map((emo) => (
                <button
                  key={emo}
                  type="button"
                  onClick={() => setEmotion(emo)}
                  className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                    emotion === emo
                      ? 'bg-[#57B8E3] text-white font-medium shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {emo}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                我采取了什么行动？
              </label>
              <textarea
                rows={2}
                placeholder="例如：当场在白板绘制系统拓扑图并记录要点..."
                value={actionTaken}
                onChange={(e) => setActionTaken(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#57B8E3]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                产生了什么结果？
              </label>
              <textarea
                rows={2}
                placeholder="例如：客户认可架构方向，约定周三前提交验收标准草案..."
                value={result}
                onChange={(e) => setResult(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#57B8E3]"
              />
            </div>
          </div>

          {/* AI Trigger */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleGenerateAi}
              disabled={generating || !eventDescription.trim()}
              className="w-full py-2.5 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 disabled:opacity-50 text-white font-medium text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>{generating ? '正在结合历史上下文并执行 V1-V5 校验...' : '生成 AI 深度反思分析'}</span>
            </button>
          </div>

          {/* Validation Status */}
          {aiSummary && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-semibold text-slate-800">
                    规范校验（V1~V5 宪法级）
                  </span>
                </div>
                {validationViolations.length === 0 ? (
                  <span className="text-[11px] px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> 全部规则通过
                  </span>
                ) : (
                  <span className="text-[11px] px-2 py-0.5 bg-rose-100 text-rose-700 rounded-full font-medium flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> 存在 {validationViolations.length} 条违规
                  </span>
                )}
              </div>

              {validationViolations.length > 0 && (
                <div className="space-y-1">
                  {validationViolations.map((v, idx) => (
                    <p key={idx} className="text-[11px] text-rose-600">
                      • [{v.rule}] {v.detail}
                    </p>
                  ))}
                </div>
              )}

              {/* 6 AI Fields (Editable) */}
              <div className="space-y-2.5 pt-2 border-t border-slate-200">
                <div>
                  <span className="text-[11px] font-semibold text-slate-500">1. 事件事实摘要</span>
                  <input
                    type="text"
                    value={aiSummary.eventSummary}
                    onChange={(e) => setAiSummary({ ...aiSummary, eventSummary: e.target.value })}
                    className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded-lg mt-0.5"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <span className="text-[11px] font-semibold text-emerald-600">2. 做得好的地方</span>
                    <textarea
                      rows={2}
                      value={aiSummary.goodPoints}
                      onChange={(e) => setAiSummary({ ...aiSummary, goodPoints: e.target.value })}
                      className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded-lg mt-0.5"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-amber-600">3. 忽视的客观因素</span>
                    <textarea
                      rows={2}
                      value={aiSummary.ignoredFactors}
                      onChange={(e) => setAiSummary({ ...aiSummary, ignoredFactors: e.target.value })}
                      className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded-lg mt-0.5"
                    />
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-sky-600">4. 行为改善点</span>
                  <textarea
                    rows={2}
                    value={aiSummary.improvementPoints}
                    onChange={(e) => setAiSummary({ ...aiSummary, improvementPoints: e.target.value })}
                    className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded-lg mt-0.5"
                  />
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-purple-600">5. 下一步建议（动词开头）</span>
                  <input
                    type="text"
                    value={aiSummary.nextSuggestion}
                    onChange={(e) => setAiSummary({ ...aiSummary, nextSuggestion: e.target.value })}
                    className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded-lg mt-0.5"
                  />
                </div>

                {aiSummary.suggestedTask && (
                  <div className="p-2.5 bg-sky-50/70 border border-sky-100 rounded-lg flex items-center justify-between gap-2">
                    <div className="flex-1">
                      <span className="text-[10px] font-semibold text-[#57B8E3] block">
                        6. 建议创建的闭环待办任务
                      </span>
                      <p className="text-xs text-slate-800 font-medium">{aiSummary.suggestedTask}</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleConvertTask}
                      className="px-2.5 py-1 bg-[#57B8E3] hover:bg-[#46a5d0] text-white text-[11px] font-medium rounded-lg flex items-center gap-1 shrink-0"
                    >
                      <span>转为待办</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="mt-6 flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 bg-[#57B8E3] hover:bg-[#46a5d0] text-white text-xs font-medium rounded-xl transition-colors shadow-xs"
            >
              确认并保存反思
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
