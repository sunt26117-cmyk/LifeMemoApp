// src/components/records/PhotoGrid.tsx
import React from 'react';
import { CheckCircle2, Edit2, Image as ImageIcon, MapPin, Maximize2, Trash2 } from 'lucide-react';
import { Photo } from '../../types';
import { useApp } from '../../context/AppContext';
import { getThemeColors } from '../../utils/themeStyles';

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
  const { openPhotoPreview, theme } = useApp();
  const themeColors = getThemeColors(theme);

  if (photos.length === 0) return null;

  return (
    <div className={`${themeColors.cardBg} p-3.5 rounded-2xl border ${themeColors.cardBorder} shadow-xs`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs font-semibold ${themeColors.textMain} flex items-center gap-1`}>
          <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
          <span>照片记录 ({photos.length})</span>
        </span>
        {activeSubTab === 'all' && (
          <button
            onClick={onViewAll}
            className={`text-[11px] ${themeColors.primaryText} hover:underline font-medium`}
          >
            查看全部
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {photos.slice(0, activeSubTab === 'all' ? 4 : 20).map((photo) => (
          <div
            key={photo.id}
            onClick={() =>
              openPhotoPreview(
                photo.localPath,
                photo.aiSummary || photo.locationName || '生活记录照片'
              )
            }
            className={`group relative aspect-square rounded-xl overflow-hidden border ${themeColors.cardBorder} ${themeColors.subtleBg} cursor-pointer shadow-xs hover:shadow-md transition-all`}
            title="点击全屏查看大图"
          >
            <img src={photo.localPath} alt="" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
            
            {/* Center zoom icon indicator on hover */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 pointer-events-none">
              <div className="p-2 rounded-full bg-black/60 text-white backdrop-blur-xs shadow-lg">
                <Maximize2 className="w-4 h-4" />
              </div>
            </div>

            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent opacity-90 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-end text-white pointer-events-none">
              <p className="text-[10px] line-clamp-2 leading-tight">{photo.aiSummary || '点击全屏查看'}</p>
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

            <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(photo);
                }}
                className="p-1 bg-black/60 hover:bg-black/80 text-white rounded-md shadow-xs transition-colors"
                title="编辑信息"
              >
                <Edit2 className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(photo.id);
                }}
                className="p-1 bg-rose-600/80 hover:bg-rose-600 text-white rounded-md shadow-xs transition-colors"
                title="删除照片"
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
