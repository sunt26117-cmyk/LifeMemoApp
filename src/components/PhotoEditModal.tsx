// src/components/PhotoEditModal.tsx
import React, { useState } from 'react';
import { X, Upload, MapPin, CheckCircle2 } from 'lucide-react';
import { Photo } from '../types';
import { useApp } from '../context/AppContext';

interface PhotoEditModalProps {
  isOpen: boolean;
  photo?: Photo | null;
  onClose: () => void;
}

const SAMPLE_PHOTO_PRESETS = [
  'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800&auto=format&fit=crop&q=80',
];

export const PhotoEditModal: React.FC<PhotoEditModalProps> = ({
  isOpen,
  photo,
  onClose,
}) => {
  const { addPhoto, updatePhoto } = useApp();

  const [localPath, setLocalPath] = useState(photo?.localPath || '');
  const [aiSummary, setAiSummary] = useState(photo?.aiSummary || '');
  const [summaryConfirmed, setSummaryConfirmed] = useState(photo?.summaryConfirmed ?? false);
  const [locationName, setLocationName] = useState(photo?.locationName || '');
  const [tags, setTags] = useState<string[]>(photo?.tags || []);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setLocalPath(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!localPath) return;

    if (photo) {
      updatePhoto({
        ...photo,
        localPath,
        aiSummary: aiSummary.trim(),
        summaryConfirmed,
        locationName: locationName.trim() || undefined,
        tags,
      });
    } else {
      addPhoto({
        localPath,
        takenAt: new Date().toISOString(),
        aiSummary: aiSummary.trim(),
        summaryConfirmed,
        tags,
        relatedMemoryIds: [],
        locationName: locationName.trim() || undefined,
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl p-6 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 rounded-full"
        >
          <X className="w-4 h-4" />
        </button>

        <h3 className="text-base font-semibold text-slate-800 mb-4">
          {photo ? '编辑照片信息' : '添加生活照片'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Preview */}
          <div className="aspect-video w-full rounded-xl overflow-hidden bg-slate-100 relative border border-slate-200">
            <img src={localPath} alt="Preview" className="w-full h-full object-cover" />
            <label className="absolute bottom-2 right-2 px-3 py-1.5 bg-black/60 hover:bg-black/80 text-white text-xs font-medium rounded-lg cursor-pointer flex items-center gap-1 backdrop-blur-xs">
              <Upload className="w-3.5 h-3.5" />
              <span>本地上传</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          <div>
            <span className="text-[11px] text-slate-400 mb-1 block">快捷推荐精美图片：</span>
            <div className="flex gap-2">
              {SAMPLE_PHOTO_PRESETS.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt=""
                  onClick={() => setLocalPath(url)}
                  className={`w-12 h-12 rounded-lg object-cover cursor-pointer border-2 transition-all ${
                    localPath === url ? 'border-[#57B8E3] scale-105' : 'border-transparent opacity-70'
                  }`}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              AI 内容客观描述（不推断人像身份）
            </label>
            <input
              type="text"
              value={aiSummary}
              onChange={(e) => setAiSummary(e.target.value)}
              placeholder="客观描述画面内容..."
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#57B8E3]"
            />
          </div>

          <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <span className="text-xs font-semibold text-slate-700 block">确认该描述准确</span>
              <span className="text-[10px] text-slate-400">只有已确认描述的照片才会纳入反思上下文</span>
            </div>
            <button
              type="button"
              onClick={() => setSummaryConfirmed(!summaryConfirmed)}
              className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 text-xs ${
                summaryConfirmed
                  ? 'bg-emerald-100 text-emerald-700 font-semibold'
                  : 'bg-slate-200 text-slate-500'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{summaryConfirmed ? '已确认' : '未确认'}</span>
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              拍摄地理位置（选填）
            </label>
            <div className="relative">
              <input
                type="text"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="例如：北京 · 朝阳公园 / 公司会议室"
                className="w-full text-xs py-2 px-3 pl-8 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#57B8E3]"
              />
              <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
            </div>
          </div>

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
              保存照片
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
