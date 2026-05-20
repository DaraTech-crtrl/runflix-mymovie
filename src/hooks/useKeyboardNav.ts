import { useEffect } from 'react';

/**
 * Global keyboard navigation shortcuts.
 * - Esc: Close any open modal
 * - /: Focus search
 */
export function useKeyboardNav(handlers: {
  onEscape?: () => void;
  onSlash?: () => void;
}) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if user is typing in an input
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        // Only handle Escape in inputs
        if (e.key === 'Escape' && handlers.onEscape) {
          handlers.onEscape();
          target.blur();
        }
        return;
      }

      switch (e.key) {
        case 'Escape':
          handlers.onEscape?.();
          break;
        case '/':
          e.preventDefault();
          handlers.onSlash?.();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers.onEscape, handlers.onSlash]);
}
