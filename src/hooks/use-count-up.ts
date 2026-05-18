import { useEffect, useRef, useState } from "react";

export function useCountUp(
  target: number,
  duration = 800,
  decimals = 0,
): number {
  const [value, setValue] = useState(0);
  const frameRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const prevTarget = useRef(0);

  useEffect(() => {
    if (target === prevTarget.current) return;
    const from = prevTarget.current;
    prevTarget.current = target;

    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    startRef.current = null;

    const factor = Math.pow(10, decimals);
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

    const step = (ts: number) => {
      if (!startRef.current) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOut(progress);
      const current = Math.round((from + (target - from) * eased) * factor) / factor;
      setValue(current);
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(step);
      }
    };

    frameRef.current = requestAnimationFrame(step);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [target, duration, decimals]);

  return value;
}
