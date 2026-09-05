// src/features/spirit/presentation/widgets/MascotOverlayLayer.tsx
import React from 'react';
import { useMascotController } from '../controllers/useMascotController';
import { MascotPlaceholder } from './renderers/MascotPlaceholder';
import { MascotSpeechBubble } from './MascotSpeechBubble';

interface MascotOverlayLayerProps {
  theme?: string;
}

export const MascotOverlayLayer: React.FC<MascotOverlayLayerProps> = ({ theme = 'sky' }) => {
  const {
    state,
    expression,
    bubbleText,
    bubbleVariant,
    timeBucket,
    isSleeping,
    isBouncing,
    isEnabled,
    handleMascotClick,
    handleBubbleDismiss,
  } = useMascotController();

  if (!isEnabled || state === 'hidden') {
    return null;
  }

  const isCenterGreeting = state === 'entering' || state === 'greeting';
  const isDocking = state === 'docking';

  return (
    <div
      id="mascot-global-overlay"
      className="fixed inset-0 z-40 pointer-events-none overflow-hidden max-w-md mx-auto sm:max-w-xl"
    >
      {/* 
        入场与问候态背景蒙层（极微弱半透明遮罩，点击任意处快速跳过问候）
      */}
      {isCenterGreeting && (
        <div
          onClick={handleBubbleDismiss}
          className="absolute inset-0 bg-slate-900/15 backdrop-blur-[1.5px] pointer-events-auto transition-opacity duration-500 animate-fade-in cursor-pointer"
        />
      )}

      {/* 
        小精灵位移与缩放容器
        使用 CSS Transition + 贝塞尔曲线平滑自屏幕中央偏下过渡至顶栏居中
      */}
      <div
        className={`absolute pointer-events-none transition-all duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
          isCenterGreeting
            ? 'top-[52%] left-1/2 -translate-x-1/2 -translate-y-1/2 scale-100 z-50'
            : isDocking
            ? 'top-[10px] left-1/2 -translate-x-1/2 scale-[0.42] opacity-90 z-40'
            : 'top-[8px] left-1/2 -translate-x-1/2 scale-100 z-40'
        }`}
      >
        <div className="relative flex flex-col items-center">
          {/* 
            气泡悬浮区域
            - 入场模式：位于大精灵头顶
            - 顶栏模式：位于精灵下方，避免被状态栏或顶端屏幕切掉
          */}
          {bubbleText && (
            <div
              className={`absolute pointer-events-auto z-50 transition-all ${
                isCenterGreeting
                  ? 'bottom-[138px] left-1/2 -translate-x-1/2'
                  : 'top-[54px] left-1/2 -translate-x-1/2'
              }`}
            >
              <MascotSpeechBubble
                text={bubbleText}
                variant={bubbleVariant}
                timeBucket={timeBucket}
                isSleeping={isSleeping}
                onDismiss={handleBubbleDismiss}
              />
            </div>
          )}

          {/* 
            小精灵本体
            入场模式：130x130 dp
            顶栏模式：50x50 dp
          */}
          <div className="pointer-events-auto">
            <MascotPlaceholder
              state={state}
              expression={expression}
              size={isCenterGreeting ? 130 : 48}
              isSleeping={isSleeping}
              isBouncing={isBouncing}
              onClick={handleMascotClick}
              theme={theme}
              className={`transition-all duration-500 ${
                isCenterGreeting ? 'animate-mascot-spring-in' : ''
              }`}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
