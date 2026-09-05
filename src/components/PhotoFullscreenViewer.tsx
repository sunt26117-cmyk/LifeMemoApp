// src/components/PhotoFullscreenViewer.tsx
import React, { useEffect, useState } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, Download, Image as ImageIcon } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const PhotoFullscreenViewer: React.FC = () => {
  const { photoPreview, closePhotoPreview } = useApp();
  const [scale, setScale] = useState<number>(1);

  useEffect(() => {
    if (!photoPreview) {
      setScale(1);
      return;
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closePhotoPreview();
      } else if (e.key === '+' || e.key === '=') {
        setScale((s) => Math.min(s + 0.25, 3));
      } else if (e.key === '-') {
        setScale((s) => Math.max(s - 0.25, 0.5));
      } else if (e.key === '0') {
        setScale(1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [photoPreview, closePhotoPreview]);

  if (!photoPreview) return null;

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale((s) => Math.min(s + 0.3, 3));
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale((s) => Math.max(s - 0.3, 0.5));
  };

  const handleResetZoom = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale(1);
  };

  return (
    <div
      className="fixed inset-0 z-[120] bg-black/95 backdrop-blur-md flex flex-col justify-between select-none animate-in fade-in duration-200"
      onClick={closePhotoPreview}
    >
      {/* Top action bar */}
      <div
        className="w-full px-4 py-3 flex items-center justify-between bg-gradient-to-b from-black/90 to-transparent z-20"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 text-white/90">
          <ImageIcon className="w-4 h-4 text-white/70" />
          <span className="text-xs font-medium truncate max-w-[200px] sm:max-w-md">
            {photoPreview.title || '照片全屏查看'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Zoom controls */}
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={scale <= 0.5}
            className="p-2 text-white/80 hover:text-white hover:bg-white/15 disabled:opacity-30 rounded-full transition-colors"
            title="缩小 (-)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleResetZoom}
            className="px-2 py-1 text-[11px] text-white/80 hover:text-white hover:bg-white/15 rounded-md transition-colors"
            title="重置缩放 (0)"
          >
            {Math.round(scale * 100)}%
          </button>
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={scale >= 3}
            className="p-2 text-white/80 hover:text-white hover:bg-white/15 disabled:opacity-30 rounded-full transition-colors"
            title="放大 (+)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          {photoPreview.url.startsWith('data:') && (
            <a
              href={photoPreview.url}
              download="photo.jpg"
              className="p-2 text-white/80 hover:text-white hover:bg-white/15 rounded-full transition-colors ml-1"
              title="保存图片"
            >
              <Download className="w-4 h-4" />
            </a>
          )}

          <button
            type="button"
            onClick={closePhotoPreview}
            className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-colors ml-1"
            title="关闭全屏 (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Image Stage */}
      <div
        className="flex-1 flex items-center justify-center p-2 sm:p-6 overflow-hidden cursor-zoom-out"
        onClick={closePhotoPreview}
      >
        <div
          className="relative max-w-full max-h-full flex items-center justify-center transition-transform duration-150"
          style={{ transform: `scale(${scale})` }}
          onClick={(e) => {
            e.stopPropagation();
            // Toggle between 1x and 1.6x on click
            setScale((s) => (s === 1 ? 1.6 : 1));
          }}
        >
          <img
            src={photoPreview.url}
            alt={photoPreview.title || 'Preview'}
            className="max-w-[96vw] max-h-[82vh] object-contain rounded-xl shadow-2xl cursor-pointer"
          />
        </div>
      </div>

      {/* Bottom hint & info bar */}
      <div
        className="w-full py-3 px-4 text-center bg-gradient-to-t from-black/90 to-transparent z-20 flex flex-col items-center gap-1"
        onClick={(e) => e.stopPropagation()}
      >
        {photoPreview.title && (
          <p className="text-xs text-white/90 font-medium max-w-lg truncate px-2">
            {photoPreview.title}
          </p>
        )}
        <span className="text-[11px] text-white/50">
          轻触图片可缩放 · 点击任意背景或按 ESC 退出全屏
        </span>
      </div>
    </div>
  );
};

