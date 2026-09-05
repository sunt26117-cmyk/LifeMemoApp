// src/features/spirit/presentation/widgets/renderers/MascotPlaceholder.tsx
import React, { useEffect, useState } from 'react';
import { MascotRendererProps } from '../MascotRenderer';
import { MascotExpression } from '../../../domain/mascotState';

export const MascotPlaceholder: React.FC<MascotRendererProps> = ({
  state,
  expression = 'normal',
  size = 52,
  isSleeping = false,
  isBouncing = false,
  onClick,
  className = '',
  theme = 'sky',
}) => {
  const [internalBlink, setInternalBlink] = useState(false);

  // 模拟每隔 3.5 秒眨一次眼（150ms 后睁开）
  useEffect(() => {
    if (isSleeping || state === 'sleeping') return;

    let blinkTimeout: NodeJS.Timeout;
    const interval = setInterval(() => {
      setInternalBlink(true);
      blinkTimeout = setTimeout(() => {
        setInternalBlink(false);
      }, 160);
    }, 3500 + Math.random() * 1200);

    return () => {
      clearInterval(interval);
      clearTimeout(blinkTimeout);
    };
  }, [isSleeping, state]);

  const activeSleeping = isSleeping || state === 'sleeping' || expression === 'sleeping';
  const effectiveExpression: MascotExpression = activeSleeping
    ? 'sleeping'
    : internalBlink
    ? 'blink'
    : expression;

  // 主题配色适配（水滴团子外表）
  const getColors = () => {
    switch (theme) {
      case 'warm':
        return {
          gradientStart: '#FED7AA', // 橙粉
          gradientEnd: '#FB923C',
          highlight: '#FFF7ED',
          border: '#EA580C',
          blush: '#FDA4AF',
          leaf: '#84CC16',
          shadow: 'rgba(234, 88, 12, 0.25)',
        };
      case 'forest':
        return {
          gradientStart: '#BBF7D0', // 翠绿
          gradientEnd: '#4ADE80',
          highlight: '#F0FDF4',
          border: '#16A34A',
          blush: '#F472B6',
          leaf: '#15803D',
          shadow: 'rgba(22, 163, 74, 0.25)',
        };
      case 'sky':
      default:
        return {
          gradientStart: '#BAE6FD', // 晴空蓝
          gradientEnd: '#60A5FA',
          highlight: '#F0F9FF',
          border: '#2563EB',
          blush: '#FDA4AF',
          leaf: '#10B981',
          shadow: 'rgba(37, 99, 235, 0.25)',
        };
    }
  };

  const colors = getColors();

  return (
    <div
      onClick={onClick}
      style={{ width: size, height: size }}
      className={`relative inline-flex items-center justify-center select-none cursor-pointer transition-transform duration-200 ${
        isBouncing ? 'scale-110 active:scale-95' : 'hover:scale-105 active:scale-95'
      } ${className}`}
      title="点击和小精灵互动"
    >
      {/* 熟睡时的浮动 Zzz 动效 */}
      {activeSleeping && (
        <div className="absolute -top-3 -right-1 pointer-events-none flex flex-col items-center">
          <span className="text-[10px] font-bold text-indigo-500 animate-bounce leading-none opacity-80">
            z
          </span>
          <span className="text-[12px] font-black text-indigo-600 animate-pulse leading-none ml-2">
            Z
          </span>
        </div>
      )}

      {/* 精灵主体 SVG */}
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full drop-shadow-md overflow-visible"
        style={{
          filter: `drop-shadow(0 4px 8px ${colors.shadow})`,
        }}
      >
        <defs>
          <linearGradient id={`mascotGrad-${theme}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors.gradientStart} />
            <stop offset="100%" stopColor={colors.gradientEnd} />
          </linearGradient>

          <linearGradient id={`highlightGrad-${theme}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* 顶部元气萌芽/小叶子 */}
        <g className="origin-bottom transition-transform duration-500" style={{ transformOrigin: '50px 22px' }}>
          {/* 茎 */}
          <path d="M50,22 Q50,15 48,11" stroke={colors.leaf} strokeWidth="2.5" strokeLinecap="round" fill="none" />
          {/* 叶片 */}
          <path
            d="M48,11 Q41,7 48,3 Q55,7 48,11 Z"
            fill={colors.leaf}
            className="animate-pulse"
          />
        </g>

        {/* 身体（圆润 Q 弹水滴形） */}
        <g className="animate-breathing" style={{ transformOrigin: '50px 65px' }}>
          <path
            d="M 50 18
               C 74 18, 88 38, 88 62
               C 88 82, 72 92, 50 92
               C 28 92, 12 82, 12 62
               C 12 38, 26 18, 50 18 Z"
            fill={`url(#mascotGrad-${theme})`}
          />

          {/* 顶部柔光高光 */}
          <ellipse cx="44" cy="30" rx="18" ry="8" fill="url(#highlightGrad-sky)" opacity="0.6" transform="rotate(-15 44 30)" />

          {/* 脸蛋红晕 */}
          <ellipse cx="26" cy="63" rx="5.5" ry="3.5" fill={colors.blush} opacity="0.75" />
          <ellipse cx="74" cy="63" rx="5.5" ry="3.5" fill={colors.blush} opacity="0.75" />

          {/* 眼睛渲染根据当前表情 */}
          {activeSleeping ? (
            // 熟睡闭眼弧线
            <g stroke="#1E293B" strokeWidth="2.5" strokeLinecap="round" fill="none">
              <path d="M 32 54 Q 38 60 44 54" />
              <path d="M 56 54 Q 62 60 68 54" />
            </g>
          ) : effectiveExpression === 'blink' ? (
            // 眨眼闭合横线
            <g stroke="#1E293B" strokeWidth="2.5" strokeLinecap="round">
              <line x1="33" y1="55" x2="43" y2="55" />
              <line x1="57" y1="55" x2="67" y2="55" />
            </g>
          ) : effectiveExpression === 'wink' ? (
            // 单眼眨眨 (>‿•)
            <g>
              <path d="M 32 53 L 42 57 L 32 61" stroke="#1E293B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <circle cx="62" cy="55" r="5" fill="#1E293B" />
              <circle cx="64" cy="53" r="2" fill="#FFFFFF" />
            </g>
          ) : effectiveExpression === 'happy' ? (
            // 弯月笑眼 (⌒ ⌒)
            <g stroke="#1E293B" strokeWidth="2.8" strokeLinecap="round" fill="none">
              <path d="M 32 57 Q 38 50 44 57" />
              <path d="M 56 57 Q 62 50 68 57" />
            </g>
          ) : effectiveExpression === 'surprised' ? (
            // 惊讶圆圆眼 (O o)
            <g fill="#1E293B">
              <circle cx="37" cy="54" r="6" />
              <circle cx="63" cy="54" r="6" />
              <circle cx="39" cy="52" r="2.5" fill="#FFFFFF" />
              <circle cx="65" cy="52" r="2.5" fill="#FFFFFF" />
            </g>
          ) : (
            // 正常大眼睛带闪光
            <g fill="#1E293B">
              <circle cx="38" cy="54" r="4.8" />
              <circle cx="62" cy="54" r="4.8" />
              {/* 高光白点 */}
              <circle cx="40" cy="52.5" r="1.8" fill="#FFFFFF" />
              <circle cx="64" cy="52.5" r="1.8" fill="#FFFFFF" />
            </g>
          )}

          {/* 小嘴巴 */}
          {activeSleeping ? (
            // 睡觉微微呼气的小圆嘴
            <ellipse cx="50" cy="62" rx="2" ry="2.5" fill="#334155" />
          ) : effectiveExpression === 'surprised' ? (
            // 惊讶小圆嘴
            <circle cx="50" cy="66" r="3" fill="#334155" />
          ) : (
            // 可爱微笑小嘴弧
            <path
              d="M 46 63 Q 50 67 54 63"
              stroke="#1E293B"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
            />
          )}

          {/* 身体两旁软萌小手 */}
          <ellipse cx="16" cy="66" rx="4" ry="7" fill={colors.gradientEnd} opacity="0.9" transform="rotate(-15 16 66)" />
          <ellipse cx="84" cy="66" rx="4" ry="7" fill={colors.gradientEnd} opacity="0.9" transform="rotate(15 84 66)" />
        </g>
      </svg>
    </div>
  );
};
