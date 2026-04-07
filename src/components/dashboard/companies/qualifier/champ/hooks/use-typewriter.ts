"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";

function createStore() {
  let idx = 0;
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((l) => l());
  return {
    get() { return idx; },
    set(v: number) { idx = v; notify(); },
    subscribe(cb: () => void) { listeners.add(cb); return () => { listeners.delete(cb); }; },
  };
}

export function useTypewriter(
  text: string,
  opts?: { speed?: number; delay?: number },
): { displayed: string; isComplete: boolean } {
  const { speed = 18, delay = 400 } = opts ?? {};

  const store = useMemo(() => createStore(), []);

  const index = useSyncExternalStore(store.subscribe, store.get, store.get);

  useEffect(() => {
    store.set(0);
    if (!text) return;

    let raf = 0;
    const timeout = setTimeout(() => {
      let lastTime = performance.now();
      let charAccum = 0;

      const step = (now: number) => {
        const dt = now - lastTime;
        lastTime = now;
        charAccum += dt / speed;

        if (charAccum >= 1) {
          const chars = Math.floor(charAccum);
          charAccum -= chars;
          const next = Math.min(store.get() + chars, text.length);
          store.set(next);
          if (next < text.length) raf = requestAnimationFrame(step);
        } else {
          raf = requestAnimationFrame(step);
        }
      };

      raf = requestAnimationFrame(step);
    }, delay);

    return () => { clearTimeout(timeout); cancelAnimationFrame(raf); };
  }, [text, speed, delay, store]);

  return {
    displayed: text.slice(0, index),
    isComplete: !text || index >= text.length,
  };
}
