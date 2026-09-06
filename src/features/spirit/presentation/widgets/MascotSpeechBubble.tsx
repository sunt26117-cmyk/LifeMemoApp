// src/features/spirit/presentation/widgets/MascotSpeechBubble.tsx
import React from 'react';
import { Sparkles, X, Moon } from 'lucide-react';
import { MascotTimeBucket, TIME_BUCKET_META_MAP } from '../../domain/mascotTimeBucket';

interface MascotSpeechBubbleProps {
  text: string;
  variant?: 'large' | 'mini';
  timeBucket?: MascotTimeBucket;
  isSleeping?: boolean;
  onDismiss?: () => void;
  className?: string;
}

export const MascotSpeechBubble: React.FC<MascotSpeechBubbleProps> = ({
  text,
  variant = 'large',
  timeBucket,
  isSleeping = false,
  onDismiss,
  className = '',
}) => {
  const bucketMeta = timeBucket ? TIME_BUCKET_META_MAP[timeBucket] : null;

  if (variant === 'mini') {
    return (
      <div
        onClick={onDismiss}
        className={`relative z-20 pointer-events-auto cursor-pointer select-none transition-all duration-300 animate-bubble-pop ${className}`}
        title="点击关闭气泡"
      >
        {/* 顶部指示标，指向顶栏小精灵 */}
        <div className="w-0 h-0 border-x-5 border-x-transparent border-b-5 border-b-slate-900/95 mx-auto -mb-[1px]" />

        <div className="bg-slate-900/95 text-white backdrop-blur-md px-3.5 py-2.5 rounded-2xl shadow-xl border border-white/20 flex items-start gap-2 text-xs max-w-[290px] sm:max-w-xs font-medium leading-relaxed">
          {isSleeping ? (
            <Moon className="w-4 h-4 text-indigo-300 shrink-0 mt-0.5" />
          ) : (
            <Sparkles className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
          )}
          <span className="flex-1 break-words leading-relaxed text-slate-100">{text}</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDismiss?.();
            }}
            className="text-slate-400 hover:text-white shrink-0 p-0.5 -mr-1"
            title="关闭气泡"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // 大气泡（入场问候模式）
  return (
    <div
      onClick={onDismiss}
      className={`relative z-30 pointer-events-auto cursor-pointer select-none transition-all duration-300 animate-bubble-pop max-w-[320px] sm:max-w-sm w-full mx-auto ${className}`}
      title="点击任意处跳过问候"
    >
      <div className="bg-white/95 backdrop-blur-md px-4 py-3.5 rounded-2xl shadow-xl border border-blue-100 text-slate-800 text-center relative">
        {/* 顶部标签 */}
        <div className="flex items-center justify-between gap-1 mb-1.5 pb-1 border-b border-slate-100">
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-50 text-blue-600 text-xs">
              ✨
            </span>
            <span className="text-[11px] font-semibold text-blue-700 tracking-wide">
              {bucketMeta ? `${bucketMeta.name} · 小精灵` : '小精灵问候'}
            </span>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDismiss?.();
            }}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
            title="跳过问候"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 问候文案 */}
        <p className="text-sm font-medium text-slate-700 leading-relaxed tracking-normal break-words text-left sm:text-center">
          {text}
        </p>

        {/* 底部跳过提示 */}
        <div className="mt-2 text-[10px] text-slate-400 font-normal">
          轻触任意处可提前跳过
        </div>
      </div>

      {/* 底部居中小三角指示标 */}
      <div className="w-0 h-0 border-x-6 border-x-transparent border-t-6 border-t-white/95 mx-auto -mt-[1px] filter drop-shadow-xs" />
    </div>
  );
};
