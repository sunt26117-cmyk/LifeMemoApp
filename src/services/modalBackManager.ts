// src/services/modalBackManager.ts
import { useEffect, useRef } from 'react';

type CloseCallback = () => void;

interface ModalEntry {
  id: string;
  close: CloseCallback;
  timestamp: number;
}

class ModalBackManager {
  private stack: ModalEntry[] = [];

  public register(id: string, close: CloseCallback): () => void {
    // Remove existing if any, then push to top
    this.stack = this.stack.filter((item) => item.id !== id);
    this.stack.push({ id, close, timestamp: Date.now() });

    return () => {
      this.unregister(id);
    };
  }

  public unregister(id: string) {
    this.stack = this.stack.filter((item) => item.id !== id);
  }

  // Closes the topmost active modal. Returns true if a modal was closed.
  public handleBack(): boolean {
    if (this.stack.length === 0) return false;
    const top = this.stack.pop();
    if (top) {
      try {
        top.close();
      } catch (err) {
        console.warn(`[ModalBackManager] Error closing modal ${top.id}:`, err);
      }
      return true;
    }
    return false;
  }

  public hasOpenModals(): boolean {
    return this.stack.length > 0;
  }
}

export const modalBackManager = new ModalBackManager();

/**
 * Hook to automatically register a modal's close handler to the Android system back button stack.
 * When multiple modals are nested, pressing Back will close them in reverse order (LIFO).
 */
export function useModalBackHandler(isOpen: boolean, onClose: () => void, customId?: string) {
  const idRef = useRef(customId || `modal_${Math.random().toString(36).slice(2, 9)}`);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;

    const unregister = modalBackManager.register(idRef.current, () => {
      onCloseRef.current();
    });

    return () => {
      unregister();
    };
  }, [isOpen]);
}
