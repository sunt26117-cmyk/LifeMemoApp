// src/features/spirit/presentation/widgets/MascotRenderer.ts
import React from 'react';
import { MascotExpression, MascotState } from '../../domain/mascotState';

export interface MascotRendererProps {
  state: MascotState;
  expression?: MascotExpression;
  size?: number; // 默认 52 (顶栏) 或 130~140 (入场问候)
  isSleeping?: boolean;
  isBouncing?: boolean;
  onClick?: () => void;
  className?: string;
  theme?: string;
}

/**
 * 动效渲染抽象接口规范
 * 支持切换为 MascotPlaceholderRenderer 自绘方案，或未来无缝切换为 Rive/Lottie 等
 */
export type MascotRendererComponent = React.FC<MascotRendererProps>;
