// src/features/spirit/presentation/controllers/useMascotController.ts
import { useState, useEffect, useRef, useCallback } from 'react';
import { MascotState, MascotExpression } from '../../domain/mascotState';
import { getMascotTimeBucket, isMascotLateNight, MascotTimeBucket } from '../../domain/mascotTimeBucket';
import { mascotRepository } from '../../data/repositories/mascotRepository';

export function useMascotController() {
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

  // 清除全部活跃定时器（用于切后台或状态重置）
  const clearAllTimers = useCallback(() => {
    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (bounceTimerRef.current) clearTimeout(bounceTimerRef.current);
  }, []);

  const isSleeping = state === 'sleeping' || isMascotLateNight();

  // 调度下一次随机待机小动作 (20~50s 随机)
  const scheduleNextIdleAction = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (isMascotLateNight()) return; // 深夜熟睡不触发跳跃小动作

    const delay = 20000 + Math.random() * 30000; // 20~50 秒
    idleTimerRef.current = setTimeout(() => {
      setState((curr) => {
        if (curr !== 'topIdle') return curr;

        // 随机挑选小动作：眨眨眼、弯月笑、惊讶
        const expressions: MascotExpression[] = ['wink', 'happy', 'surprised'];
        const randomExp = expressions[Math.floor(Math.random() * expressions.length)];
        setExpression(randomExp);

        // 50% 几率吐出简短气泡
        if (Math.random() > 0.5) {
          const line = mascotRepository.getRandomIdleLine();
          setBubbleText(line);
          setBubbleVariant('mini');
          bubbleTimerRef.current = setTimeout(() => {
            setBubbleText(null);
          }, 2600);
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
  }, []);

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

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('mascot-trigger-greeting', handleTriggerGreeting);
    window.addEventListener('mascot-toggle', handleToggleEvent as EventListener);

    return () => {
      clearAllTimers();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('mascot-trigger-greeting', handleTriggerGreeting);
      window.removeEventListener('mascot-toggle', handleToggleEvent as EventListener);
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
