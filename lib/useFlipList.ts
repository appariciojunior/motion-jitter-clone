'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, type RefObject } from 'react';

const FLIP_SELECTOR = '[data-flip-id]:not(.leaving)';

export function useFlipList<T extends HTMLElement>(
  listRef: RefObject<T | null>,
  orderKey: string,
): { snapshot: () => void } {
  const firstRectsRef = useRef<Map<string, DOMRect> | null>(null);
  const animationsRef = useRef(new Map<string, Animation>());

  const cancelAnimations = useCallback(() => {
    const animations = Array.from(animationsRef.current.values());
    animationsRef.current.clear();
    animations.forEach((animation) => animation.cancel());
  }, []);

  const snapshot = useCallback(() => {
    const list = listRef.current;
    if (!list) return;

    const firstRects = new Map<string, DOMRect>();
    list.querySelectorAll<HTMLElement>(FLIP_SELECTOR).forEach((element) => {
      const id = element.dataset.flipId;
      if (id) firstRects.set(id, element.getBoundingClientRect());
    });

    cancelAnimations();

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      firstRectsRef.current = null;
      return;
    }

    firstRectsRef.current = firstRects;
  }, [cancelAnimations, listRef]);

  useLayoutEffect(() => {
    const firstRects = firstRectsRef.current;
    const list = listRef.current;
    if (!firstRects || !list) return;

    firstRectsRef.current = null;

    list.querySelectorAll<HTMLElement>(FLIP_SELECTOR).forEach((element) => {
      const id = element.dataset.flipId;
      if (!id) return;

      const previous = firstRects.get(id);
      if (!previous) return;

      const current = element.getBoundingClientRect();
      const dx = previous.left - current.left;
      const dy = previous.top - current.top;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;

      const animation = element.animate(
        [
          { transform: `translate(${dx}px, ${dy}px)` },
          { transform: 'translate(0, 0)' },
        ],
        {
          duration: 200,
          easing: 'cubic-bezier(.16, 1, .3, 1)',
          fill: 'both',
        },
      );

      animationsRef.current.set(id, animation);

      const cleanup = () => {
        if (animationsRef.current.get(id) === animation) {
          animationsRef.current.delete(id);
        }
      };

      animation.onfinish = () => {
        if (animationsRef.current.get(id) !== animation) return;
        animation.cancel();
        cleanup();
      };
      animation.oncancel = cleanup;
    });
  }, [listRef, orderKey]);

  useEffect(() => () => {
    firstRectsRef.current = null;
    cancelAnimations();
  }, [cancelAnimations]);

  return { snapshot };
}
