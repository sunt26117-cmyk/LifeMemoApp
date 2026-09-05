// src/features/spirit/domain/mascotState.ts

/**
 * 小精灵行为状态机状态
 * [Hidden]
 *    │
 * [Entering] ─── (0.6s 弹性入场: Scale & Fade In, 屏幕中央偏下)
 *    │
 * [Greeting] ─── (播放问候语动作 + 头顶大台词气泡 3s，点击可提前跳过)
 *    │
 * [Docking]  ─── (沿贝塞尔曲线平滑位移并缩小至 52x52 dp 移至顶部居中安全区 0.8s)
 *    │
 * [TopIdle]  ◄──┐
 *    ├─ (随机 20~60s 触发) ─> [IdleAction] (卖萌/眨眼/张望，可浮现短气泡) ──┤
 *    ├─ (用户点击精灵) ────> [Interacting] (微弹 + mini气泡 1.5s) ─────────┤
 *    ├─ (处于 23:00~04:59) ─> [Sleeping] (闭眼 + Zzz气泡) ──────────────────┤
 *    └─ (拖拽松手) ────────> [DropReaction] (贴回安全边缘或居中归位) ───────┘
 */
export type MascotState =
  | 'hidden'        // 隐藏
  | 'entering'      // 居中偏下弹性弹出 (0.6s)
  | 'greeting'      // 问候台词展示 (3s, 点击跳过)
  | 'docking'       // 飞至顶栏平滑归位 (0.8s)
  | 'topIdle'       // 顶栏常驻待机
  | 'idleAction'    // 待机随机小动作
  | 'interacting'   // 用户点击互动 (Q 弹放大 + 短台词)
  | 'sleeping'      // 深夜熟睡模式 (闭眼 + Zzz)
  | 'dropReaction'; // 拖拽释放回弹

/**
 * 表情类型
 */
export type MascotExpression =
  | 'normal'     // 睁眼微笑
  | 'blink'      // 眨眼瞬间
  | 'happy'      // 弯月笑眼
  | 'wink'       // 单眼眨眨
  | 'surprised'  // 惊讶圆圆眼
  | 'sleeping'   // 恬静闭眼
  | 'bouncing';  // 受到轻抚/点击的弹性

export interface MascotPosition {
  x: number; // 屏幕偏移百分比或像素
  y: number;
}
