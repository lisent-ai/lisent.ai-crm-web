"use client";

import { useEffect, useRef, useState } from "react";

export function useAnimatedValue(
  target: number,
  opts?: { delay?: number; stiffness?: number; damping?: number },
): number {
  const { delay = 0, stiffness = 120, damping = 20 } = opts ?? {};
  const [value, setValue] = useState(0);
  const posRef = useRef(0);
  const velRef = useRef(0);
  const rafRef = useRef<number>(0);
  const startedRef = useRef(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      startedRef.current = true;
      let lastTime = performance.now();

      const step = (now: number) => {
        const dt = Math.min((now - lastTime) / 1000, 0.064); // cap at ~16fps min
        lastTime = now;

        const displacement = posRef.current - target;
        const springForce = -stiffness * displacement;
        const dampingForce = -damping * velRef.current;
        const acceleration = springForce + dampingForce;

        velRef.current += acceleration * dt;
        posRef.current += velRef.current * dt;

        const rounded = Math.round(posRef.current);
        setValue(rounded);

        // Stop when close enough and velocity is low
        if (Math.abs(displacement) < 0.5 && Math.abs(velRef.current) < 0.5) {
          posRef.current = target;
          setValue(target);
          return;
        }

        rafRef.current = requestAnimationFrame(step);
      };

      rafRef.current = requestAnimationFrame(step);
    }, delay);

    return () => {
      clearTimeout(timeout);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, delay, stiffness, damping]);

  return value;
}
