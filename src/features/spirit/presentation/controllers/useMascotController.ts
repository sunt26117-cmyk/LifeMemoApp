// src/features/spirit/presentation/controllers/useMascotController.ts
import { useState, useEffect, useRef, useCallback } from 'react';
import { MascotState, MascotExpression } from '../../domain/mascotState';
import { getMascotTimeBucket, isMascotLateNight, MascotTimeBucket } from '../../domain/mascotTimeBucket';
import { mascotRepository } from '../../data/repositories/mascotRepository';

interface UseMascotControllerOptions {
  isBusy?: boolean;
}

export function useMascotController({ isBusy = false }: UseMascotControllerOptions = {}) {
  const [isEnabled, setIsEnabled] = useState<boolean>(() => mascotRepository.isEnabled());
  const [state, setState] = useState<MascotState>('hidden');
  const [expression, setExpression] = useState<MascotExpression>('normal');
  const [bubbleText, setBubbleText] = useState<string | null>(null);
  const [bubbleVariant, setBubbleVariant] = useState<'large' | 'mini'>('large');
  const [timeBucket, setTimeBucket] = useState<MascotTimeBucket>(() => getMascotTimeBucket());
  const [isBouncing, setIsBouncing] = useState(false);

  // 定时器引用，方便切后台时统一清除
  const transitionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const bubbleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const bounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastInteractionTimeRef = useRef<number>(0);

  // 清除全部活跃定时器（用于切后台或状态重置）
  const clearAllTimers = useCallback(() => {
    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (bounceTimerRef.current) clearTimeout(bounceTimerRef.current);
  }, []);

  const isSleeping = state === 'sleeping' || isMascotLateNight();

  // 检测用户是否正在积极操作 App、填写输入框、或处于详情查看弹窗中
  const checkIsUserBusy = useCallback(() => {
    if (isBusy) return true;
    try {
      const active = document.activeElement;
      if (
        active &&
        (active.tagName === 'INPUT' ||
          active.tagName === 'TEXTAREA' ||
          active.tagName === 'SELECT' ||
          (active as HTMLElement).isContentEditable)
      ) {
        return true;
      }
      // 检查 DOM 是否有正在显示的对话框或遮罩层
      const modals = document.querySelectorAll(
        '[role="dialog"], [aria-modal="true"], .fixed.inset-0:not(#mascot-global-overlay), .z-50'
      );
      if (modals && modals.length > 0) {
        return true;
      }
    } catch {
      // safe fallback
    }

    // 10 秒内有键入或表单交互则静默
    if (Date.now() - lastInteractionTimeRef.current < 10000) {
      return true;
    }

    return false;
  }, [isBusy]);

  // 当处于忙碌态（弹窗打开/用户编辑）时，立即清退任何气泡
  useEffect(() => {
    if (isBusy) {
      setBubbleText(null);
      if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
    }
  }, [isBusy]);

  // 调度下一次随机待机小动作 (120~240s 间隔，温和克制，绝不频繁打扰)
  const scheduleNextIdleAction = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (isMascotLateNight()) return; // 深夜熟睡不触发跳跃小动作

    const delay = 120000 + Math.random() * 120000; // 2 ~ 4 分钟温和待机
    idleTimerRef.current = setTimeout(() => {
      // 若用户正在输入或查看内容，绝不弹气泡
      if (checkIsUserBusy()) {
        scheduleNextIdleAction();
        return;
      }

      setState((curr) => {
        if (curr !== 'topIdle') return curr;

        // 随机挑选小动作：眨眨眼、弯月笑、惊讶
        const expressions: MascotExpression[] = ['wink', 'happy', 'surprised'];
        const randomExp = expressions[Math.floor(Math.random() * expressions.length)];
        setExpression(randomExp);

        // 仅 30% 几率吐出横向 3 行内的简短克制气泡，且必须不在忙碌态
        if (Math.random() > 0.7 && !checkIsUserBusy()) {
          const line = mascotRepository.getRandomIdleLine();
          setBubbleText(line);
          setBubbleVariant('mini');
          bubbleTimerRef.current = setTimeout(() => {
            setBubbleText(null);
          }, 3000);
        }

        // 2.2 秒后恢复正常待机
        setTimeout(() => {
          setExpression('normal');
        }, 2200);

        return 'topIdle';
      });

      // 递归调度下一次
      scheduleNextIdleAction();
    }, delay);
  }, [checkIsUserBusy]);

  // 执行平滑入轨至顶栏 (Docking -> TopIdle)
  const dockToTop = useCallback((skipAnimation = false) => {
    clearAllTimers();
    setBubbleText(null);

    const late = isMascotLateNight();
    if (skipAnimation) {
      setState(late ? 'sleeping' : 'topIdle');
      setExpression(late ? 'sleeping' : 'normal');
      scheduleNextIdleAction();
      return;
    }

    setState('docking');
    setExpression('normal');

    transitionTimerRef.current = setTimeout(() => {
      const isLate = isMascotLateNight();
      setState(isLate ? 'sleeping' : 'topIdle');
      setExpression(isLate ? 'sleeping' : 'normal');
      scheduleNextIdleAction();
    }, 800);
  }, [clearAllTimers, scheduleNextIdleAction]);

  // 触发完整的入场问候流程 (Entering -> Greeting -> Docking)
  const startFullGreetingFlow = useCallback((forced = false) => {
    if (!mascotRepository.isEnabled() && !forced) {
      setState('hidden');
      return;
    }

    clearAllTimers();
    const now = new Date();
    const currentBucket = getMascotTimeBucket(now);
    setTimeBucket(currentBucket);

    // 深夜静默特殊处理：直接在顶栏就位
    if (currentBucket === 'lateNight' && !forced) {
      setState('sleeping');
      setExpression('sleeping');
      setBubbleText('夜深了，早点休息，熬夜很伤身体哦 Zzz');
      setBubbleVariant('mini');
      bubbleTimerRef.current = setTimeout(() => {
        setBubbleText(null);
      }, 4000);
      mascotRepository.recordGreetingShown(currentBucket, now);
      return;
    }

    // 阶段 1: 屏幕中央偏下弹性弹出 (0.6s)
    setState('entering');
    setExpression('happy');
    setBubbleText(null);

    transitionTimerRef.current = setTimeout(() => {
      // 阶段 2: 播放问候台词 + 大气泡展示 (3s)
      setState('greeting');
      setExpression('happy');
      const greeting = mascotRepository.getRandomGreeting(currentBucket);
      setBubbleText(greeting);
      setBubbleVariant('large');
      mascotRepository.recordGreetingShown(currentBucket, now);

      // 3 秒后自动开启滑移归位
      transitionTimerRef.current = setTimeout(() => {
        dockToTop();
      }, 3200);
    }, 600);
  }, [clearAllTimers, dockToTop]);

  // 静默直接进入 TopIdle (300ms 快速淡入)
  const startSilentTopIdle = useCallback(() => {
    clearAllTimers();
    const currentBucket = getMascotTimeBucket();
    setTimeBucket(currentBucket);

    const late = isMascotLateNight();
    setState(late ? 'sleeping' : 'topIdle');
    setExpression(late ? 'sleeping' : 'normal');
    scheduleNextIdleAction();
  }, [clearAllTimers, scheduleNextIdleAction]);

  // 初始化根据频控策略判定启动状态
  const initMascot = useCallback(() => {
    if (!mascotRepository.isEnabled()) {
      setState('hidden');
      return;
    }

    const check = mascotRepository.checkGreetingPolicy();
    if (check.shouldFullGreeting) {
      startFullGreetingFlow();
    } else {
      startSilentTopIdle();
    }
  }, [startFullGreetingFlow, startSilentTopIdle]);

  // 挂载生命周期
  useEffect(() => {
    initMascot();

    // 监听应用前后台生命周期（切后台自动冻结，零后台能耗）
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // 切到后台：停止所有定时器，记录活跃时间戳
        clearAllTimers();
        mascotRepository.updateLastActive();
      } else {
        // 切回前台：重新校验离线时长与分桶
        mascotRepository.updateLastActive();
        const check = mascotRepository.checkGreetingPolicy();
        if (check.shouldFullGreeting) {
          startFullGreetingFlow();
        } else {
          scheduleNextIdleAction();
        }
      }
    };

    const handleWindowBlur = () => {
      mascotRepository.updateLastActive();
    };

    const handleTriggerGreeting = () => {
      startFullGreetingFlow(true);
    };

    const handleToggleEvent = (e: Event) => {
      const customEvt = e as CustomEvent<{ enabled: boolean }>;
      const isEn = customEvt.detail?.enabled ?? mascotRepository.isEnabled();
      setIsEnabled(isEn);
      if (!isEn) {
        clearAllTimers();
        setState('hidden');
        setBubbleText(null);
      } else {
        startFullGreetingFlow(true);
      }
    };

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        lastInteractionTimeRef.current = Date.now();
        setBubbleText(null);
        if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
      }
    };

    const handleKeyDown = () => {
      lastInteractionTimeRef.current = Date.now();
      setBubbleText((prev) => {
        if (prev) {
          if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
          return null;
        }
        return prev;
      });
    };

    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      if (target?.closest('input, textarea, select, [role="dialog"], .z-50')) {
        lastInteractionTimeRef.current = Date.now();
        setBubbleText((prev) => {
          if (prev) {
            if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
            return null;
          }
          return prev;
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('mascot-trigger-greeting', handleTriggerGreeting);
    window.addEventListener('mascot-toggle', handleToggleEvent as EventListener);
    window.addEventListener('focusin', handleFocusIn);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('pointerdown', handlePointerDown);

    return () => {
      clearAllTimers();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('mascot-trigger-greeting', handleTriggerGreeting);
      window.removeEventListener('mascot-toggle', handleToggleEvent as EventListener);
      window.removeEventListener('focusin', handleFocusIn);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [initMascot, clearAllTimers, startFullGreetingFlow, scheduleNextIdleAction]);

  // 用户轻触互动
  const handleMascotClick = useCallback(() => {
    // 触发 Q 弹动画反馈
    setIsBouncing(true);
    if (bounceTimerRef.current) clearTimeout(bounceTimerRef.current);
    bounceTimerRef.current = setTimeout(() => {
      setIsBouncing(false);
    }, 350);

    // 如果当前正在 Greeting，轻触代表提前跳过
    if (state === 'greeting' || state === 'entering') {
      dockToTop();
      return;
    }

    if (state === 'docking') return;

    // 顶栏常驻或熟睡互动
    if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);

    if (isMascotLateNight() || state === 'sleeping') {
      setExpression('sleeping');
      setBubbleText('呼呼～把心事放下，做个好梦吧 Zzz');
      setBubbleVariant('mini');
      bubbleTimerRef.current = setTimeout(() => {
        setBubbleText(null);
      }, 2000);
      return;
    }

    // 正常状态点击：随机吐出一句互动文案
    setState('interacting');
    setExpression('happy');
    const tapLine = mascotRepository.getRandomTapReaction();
    setBubbleText(tapLine);
    setBubbleVariant('mini');

    bubbleTimerRef.current = setTimeout(() => {
      setBubbleText(null);
      setExpression('normal');
      setState('topIdle');
      scheduleNextIdleAction();
    }, 1800);
  }, [state, dockToTop, scheduleNextIdleAction]);

  // 用户点击气泡（跳过问候或提前关闭提示）
  const handleBubbleDismiss = useCallback(() => {
    if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
    setBubbleText(null);

    if (state === 'greeting' || state === 'entering') {
      dockToTop();
    }
  }, [state, dockToTop]);

  // 手动开关设置
  const toggleEnabled = useCallback((enabled: boolean) => {
    mascotRepository.setEnabled(enabled);
    setIsEnabled(enabled);
    if (!enabled) {
      clearAllTimers();
      setState('hidden');
      setBubbleText(null);
    } else {
      startFullGreetingFlow(true);
    }
  }, [clearAllTimers, startFullGreetingFlow]);

  return {
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
    dockToTop,
    startFullGreetingFlow,
    toggleEnabled,
  };
}
