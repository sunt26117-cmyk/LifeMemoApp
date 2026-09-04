// src/components/records/MemoryCard.tsx
import React from 'react';
import { Edit2, Sparkles, Trash2 } from 'lucide-react';
import { Memory } from '../../types';

interface MemoryCardProps {
  memory: Memory;
  onEdit: (m: Memory) => void;
  onDelete: (id: string) => void;
}

export const MemoryCard: React.FC<MemoryCardProps> = ({ memory, onEdit, onDelete }) => {
  return (
    <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-xs hover:border-slate-200 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="text-xs font-semibold text-slate-800">{memory.title}</h4>
          <span className="text-[10px] text-slate-400">
            {memory.createdAt.slice(0, 16).replace('T', ' ')}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onEdit(memory)}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-md transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(memory.id)}
            className="p-1 text-slate-400 hover:text-rose-500 rounded-md transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <p className="text-xs text-slate-600 leading-relaxed mb-2.5 whitespace-pre-line">
        {memory.content}
      </p>

      {/* AI Summary Badge */}
      {memory.aiSummary && (
        <div className="p-2 bg-purple-50/70 border border-purple-100 rounded-xl mb-2.5 flex items-start gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
          <div className="text-[11px] text-slate-700">
            <span className="font-semibold text-purple-700">AI 客观事实摘要：</span>
            {memory.aiSummary}
          </div>
        </div>
      )}

      {/* Tags */}
      <div className="flex flex-wrap gap-1">
        {memory.tags.map((t) => (
          <span
            key={t}
            className="text-[10px] px-2 py-0.5 bg-sky-50 text-[#4A90D9] rounded-full font-medium"
          >
            #{t}
          </span>
        ))}
      </div>
    </div>
  );
};
