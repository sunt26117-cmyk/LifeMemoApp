// src/components/records/DeleteConfirmationModal.tsx
import React from 'react';
import { Trash2, Smartphone, AlertTriangle, X } from 'lucide-react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  itemDescription?: string;
  onOffload: () => void;
  onPermanentDelete: () => void;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  onClose,
  title,
  itemDescription,
  onOffload,
  onPermanentDelete,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">{title}</h3>
              <p className="text-[11px] text-slate-400">请选择删除方式（支持本地瘦身）</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {itemDescription && (
          <div className="p-2.5 bg-slate-50 rounded-xl text-xs text-slate-600 border border-slate-100 line-clamp-2">
            {itemDescription}
          </div>
        )}

        <div className="space-y-2.5 pt-1">
          {/* Option 1: Offload */}
          <button
            onClick={() => {
              onOffload();
              onClose();
            }}
            className="w-full text-left p-3 rounded-2xl border border-sky-100 bg-sky-50/60 hover:bg-sky-50 transition-colors group"
          >
            <div className="flex items-center gap-2 font-semibold text-xs text-[#4A90D9] mb-1">
              <Smartphone className="w-4 h-4" />
              <span>📱 本地瘦身 (Offload)</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed pl-6">
              清除本机缓存与照片文件，释放手机存储。云端保留归档，未来增量同步绝不会重新拉回本地。
            </p>
          </button>

          {/* Option 2: Permanent Delete */}
          <button
            onClick={() => {
              onPermanentDelete();
              onClose();
            }}
            className="w-full text-left p-3 rounded-2xl border border-rose-100 bg-rose-50/50 hover:bg-rose-50 transition-colors group"
          >
            <div className="flex items-center gap-2 font-semibold text-xs text-rose-600 mb-1">
              <Trash2 className="w-4 h-4" />
              <span>🗑️ 彻底销毁 (Permanent Delete)</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed pl-6">
              彻底从本地及云端数据库物理清除该记录与文件，不可撤销。
            </p>
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium transition-colors"
        >
          取消
        </button>
      </div>
    </div>
  );
};
