// src/components/MemoryEditModal.tsx
import React, { useState } from 'react';
import { X, Sparkles, Plus } from 'lucide-react';
import { Memory } from '../types';
import { useApp } from '../context/AppContext';
import { AiService } from '../services/aiService';

interface MemoryEditModalProps {
  isOpen: boolean;
  memory?: Memory | null;
  onClose: () => void;
}

export const MemoryEditModal: React.FC<MemoryEditModalProps> = ({
  isOpen,
  memory,
  onClose,
}) => {
  const { addMemory, updateMemory, photos } = useApp();

  const [title, setTitle] = useState(memory?.title || '');
  const [content, setContent] = useState(memory?.content || '');
  const [tags, setTags] = useState<string[]>(memory?.tags || ['记录']);
  const [newTag, setNewTag] = useState('');
  const [aiSummary, setAiSummary] = useState(memory?.aiSummary || '');
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>(memory?.relatedMediaIds || []);
  const [generating, setGenerating] = useState(false);

  if (!isOpen) return null;

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (t: string) => {
    setTags(tags.filter((item) => item !== t));
  };

  const handleGenerateSummary = async () => {
    if (!content.trim()) return;
    setGenerating(true);
    try {
      const summary = await AiService.generateMemorySummary(content);
      setAiSummary(summary);
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    const finalTitle = title.trim() || content.trim().slice(0, 15) + '...';

    if (memory) {
      updateMemory({
        ...memory,
        title: finalTitle,
        content: content.trim(),
        tags,
        aiSummary: aiSummary.trim() || null,
        relatedMediaIds: selectedPhotos,
      });
    } else {
      addMemory({
        title: finalTitle,
        content: content.trim(),
        tags,
        aiSummary: aiSummary.trim() || null,
        relatedMediaIds: selectedPhotos,
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl p-6 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 rounded-full"
        >
          <X className="w-4 h-4" />
        </button>

        <h3 className="text-base font-semibold text-slate-800 mb-4">
          {memory ? '编辑生活记录' : '写记录 / 日记'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">标题（选填）</label>
            <input
              type="text"
              placeholder="简要概括主题，留空自动提取"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#57B8E3]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              内容 <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={5}
              required
              placeholder="记录今天发生的事实、灵感或对话细节..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#57B8E3]"
            />
          </div>

          {/* AI Summary */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-600">AI 事实摘要（1-2句）</label>
              <button
                type="button"
                onClick={handleGenerateSummary}
                disabled={generating || !content.trim()}
                className="flex items-center gap-1 text-[11px] text-purple-600 hover:text-purple-700 disabled:opacity-50"
              >
                <Sparkles className="w-3 h-3" />
                <span>{generating ? '生成中...' : '生成客观摘要'}</span>
              </button>
            </div>
            <input
              type="text"
              placeholder="点击右上角自动提炼，或手动编辑..."
              value={aiSummary}
              onChange={(e) => setAiSummary(e.target.value)}
              className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#57B8E3]"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">标签分类</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-sky-50 text-[#57B8E3] rounded-full font-medium"
                >
                  #{t}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(t)}
                    className="hover:text-rose-500"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="添加新标签..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                className="flex-1 text-xs py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#57B8E3]"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="flex items-center gap-1 text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>添加</span>
              </button>
            </div>
          </div>

          {/* Attach Photos */}
          {photos.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">关联已有照片</label>
              <div className="grid grid-cols-4 gap-2">
                {photos.slice(0, 4).map((p) => {
                  const isSelected = selectedPhotos.includes(p.id);
                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedPhotos(selectedPhotos.filter((id) => id !== p.id));
                        } else {
                          setSelectedPhotos([...selectedPhotos, p.id]);
                        }
                      }}
                      className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${
                        isSelected ? 'border-[#57B8E3] scale-95 shadow-sm' : 'border-transparent'
                      }`}
                    >
                      <img src={p.localPath} alt="" className="w-full h-full object-cover" />
                      {isSelected && (
                        <div className="absolute inset-0 bg-[#57B8E3]/30 flex items-center justify-center text-white font-bold text-xs">
                          ✓
                        </div>
                      )}
                    </div>
                  );
                })}
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
              type="submit"
              className="px-4 py-2 bg-[#57B8E3] hover:bg-[#46a5d0] text-white text-xs font-medium rounded-xl transition-colors shadow-xs"
            >
              保存记录
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
