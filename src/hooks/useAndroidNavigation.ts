// src/hooks/useAndroidNavigation.ts
import { useEffect, useRef, useState, useCallback } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { modalBackManager } from '../services/modalBackManager';

export type MainTabType = 'today' | 'records' | 'tasks' | 'review';

const MAIN_TABS: MainTabType[] = ['today', 'records', 'tasks', 'review'];

interface UseAndroidNavigationOptions {
  activeTab: MainTabType;
  setActiveTab: (tab: MainTabType) => void;
  modalCloseHandlers: Array<{ isOpen: boolean; close: () => void }>;
}

export function useAndroidNavigation({
  activeTab,
  setActiveTab,
  modalCloseHandlers,
}: UseAndroidNavigationOptions) {
  const [exitToast, setExitToast] = useState<string | null>(null);
  const lastBackPressRef = useRef<number>(0);
  const toastTimeoutRef = useRef<any>(null);

  // Keep latest handlers in ref to avoid re-binding listeners
  const handlersRef = useRef(modalCloseHandlers);
  handlersRef.current = modalCloseHandlers;

  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;

  const setActiveTabRef = useRef(setActiveTab);
  setActiveTabRef.current = setActiveTab;

  // Touch gesture state
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const touchStartTimeRef = useRef<number>(0);

  const hasAnyModalOpen = modalCloseHandlers.some((h) => h.isOpen);

  // 1. Android Native Back Button Support
  useEffect(() => {
    let removeListener: (() => void) | undefined;

    const setupListener = async () => {
      try {
        const handler = await CapacitorApp.addListener('backButton', ({ canGoBack }) => {
          // 1. Check nested dynamic modals (e.g. ManageHabitsModal, HabitReminderModal)
          if (modalBackManager.handleBack()) {
            return;
          }

          // 2. Check if any top-level modal is open
          const currentHandlers = handlersRef.current;
          const openHandler = currentHandlers.find((h) => h.isOpen);

          if (openHandler) {
            // First back press: close the active modal
            openHandler.close();
            return;
          }

          // Second back press: double press to exit app
          const now = Date.now();
          if (now - lastBackPressRef.current < 2000) {
            CapacitorApp.exitApp();
          } else {
            lastBackPressRef.current = now;
            setExitToast('再按一次返回键退出应用');
            if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
            toastTimeoutRef.current = setTimeout(() => {
              setExitToast(null);
            }, 2000);
          }
        });

        removeListener = () => {
          handler.remove();
        };
      } catch (err) {
        console.warn('Capacitor backButton not available in this environment:', err);
      }
    };

    setupListener();

    // Browser / PWA fallback for back navigation
    const handlePopState = (e: PopStateEvent) => {
      if (modalBackManager.handleBack()) {
        e.preventDefault();
        return;
      }
      const openHandler = handlersRef.current.find((h) => h.isOpen);
      if (openHandler) {
        e.preventDefault();
        openHandler.close();
      }
    };
    window.addEventListener('popstate', handlePopState);

    return () => {
      if (removeListener) removeListener();
      window.removeEventListener('popstate', handlePopState);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  // 2. Touch Swipe Handlers for 4 Main Modules
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (hasAnyModalOpen) return;

      // Check if user is swiping inside an explicitly horizontal-scrollable element
      let el = e.target as HTMLElement | null;
      while (el && el !== e.currentTarget) {
        if (
          el.classList &&
          (el.classList.contains('overflow-x-auto') ||
            el.classList.contains('no-swipe') ||
            el.tagName === 'INPUT' ||
            el.tagName === 'TEXTAREA')
        ) {
          return;
        }
        el = el.parentElement;
      }

      const touch = e.touches[0];
      touchStartXRef.current = touch.clientX;
      touchStartYRef.current = touch.clientY;
      touchStartTimeRef.current = Date.now();
    },
    [hasAnyModalOpen]
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (
        hasAnyModalOpen ||
        touchStartXRef.current === null ||
        touchStartYRef.current === null
      ) {
        return;
      }

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartXRef.current;
      const deltaY = touch.clientY - touchStartYRef.current;
      const duration = Date.now() - touchStartTimeRef.current;

      touchStartXRef.current = null;
      touchStartYRef.current = null;

      // Must be a decisive swipe gesture (duration < 600ms, distance > 55px, mostly horizontal)
      if (duration < 600 && Math.abs(deltaX) > 55 && Math.abs(deltaX) > Math.abs(deltaY) * 1.6) {
        const currentTab = activeTabRef.current;
        const currentIndex = MAIN_TABS.indexOf(currentTab);

        if (deltaX < 0) {
          // Swiped Left -> Move to Next Module
          if (currentIndex < MAIN_TABS.length - 1) {
            setActiveTabRef.current(MAIN_TABS[currentIndex + 1]);
          }
        } else {
          // Swiped Right -> Move to Previous Module
          if (currentIndex > 0) {
            setActiveTabRef.current(MAIN_TABS[currentIndex - 1]);
          }
        }
      }
    },
    [hasAnyModalOpen]
  );

  return {
    exitToast,
    handleTouchStart,
    handleTouchEnd,
  };
}
