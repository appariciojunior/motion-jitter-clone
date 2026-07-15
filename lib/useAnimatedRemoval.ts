'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export function useAnimatedRemoval(
  remove: (id: string) => void,
  duration = 150,
): {
  isLeaving: (id: string) => boolean;
  requestRemoval: (id: string) => void;
} {
  const removeRef = useRef(remove);
  const leavingRef = useRef(new Set<string>());
  const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const [leaving, setLeaving] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    removeRef.current = remove;
  }, [remove]);

  useEffect(() => () => {
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current.clear();
    leavingRef.current.clear();
  }, []);

  const requestRemoval = useCallback((id: string) => {
    if (leavingRef.current.has(id)) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      removeRef.current(id);
      return;
    }

    leavingRef.current.add(id);
    setLeaving(new Set(leavingRef.current));

    const timer = setTimeout(() => {
      timersRef.current.delete(id);
      removeRef.current(id);
      leavingRef.current.delete(id);
      setLeaving(new Set(leavingRef.current));
    }, duration);

    timersRef.current.set(id, timer);
  }, [duration]);

  const isLeaving = useCallback((id: string) => leaving.has(id), [leaving]);

  return { isLeaving, requestRemoval };
}
