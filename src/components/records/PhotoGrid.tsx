// src/components/records/PhotoGrid.tsx
import React from 'react';
import { CheckCircle2, Edit2, Image as ImageIcon, MapPin, Trash2 } from 'lucide-react';
import { Photo } from '../../types';

interface PhotoGridProps {
  photos: Photo[];
  activeSubTab: 'all' | 'memories' | 'notes' | 'photos';
  onViewAll: () => void;
  onEdit: (p: Photo) => void;
  onDelete: (id: string) => void;
}

export const PhotoGrid: React.FC<PhotoGridProps> = ({
  photos,
  activeSubTab,
  onViewAll,
  onEdit,
  onDelete,
}) => {
  if (photos.length === 0) return null;

  return (
    <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-xs">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
          <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
          <span>照片记录 ({photos.length})</span>
        </span>
        {activeSubTab === 'all' && (
          <button
            onClick={onViewAll}
            className="text-[11px] text-[#4A90D9] hover:underline font-medium"
          >
            查看全部
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {photos.slice(0, activeSubTab === 'all' ? 4 : 20).map((photo) => (
          <div
            key={photo.id}
            className="group relative aspect-square rounded-xl overflow-hidden border border-slate-100 bg-slate-100"
          >
            <img src={photo.localPath} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent opacity-90 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-end text-white">
              <p className="text-[10px] line-clamp-2 leading-tight">{photo.aiSummary}</p>
              <div className="flex items-center justify-between mt-1 text-[9px] text-white/80">
                {photo.locationName && (
                  <span className="flex items-center gap-0.5 truncate">
                    <MapPin className="w-2.5 h-2.5 shrink-0" />
                    {photo.locationName}
                  </span>
                )}
                {photo.summaryConfirmed && (
                  <span className="flex items-center gap-0.5 text-emerald-300 shrink-0">
                    <CheckCircle2 className="w-2.5 h-2.5" /> 已确认
                  </span>
                )}
              </div>
            </div>

            <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onEdit(photo)}
                className="p-1 bg-black/60 hover:bg-black/80 text-white rounded-md"
              >
                <Edit2 className="w-3 h-3" />
              </button>
              <button
                onClick={() => onDelete(photo.id)}
                className="p-1 bg-rose-600/80 hover:bg-rose-600 text-white rounded-md"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
