"use client";

import { useEffect, useState } from "react";

/** Seconds left until `until` (ISO), ticking every second; 0 when passed or null. */
export function useCountdown(until: string | null | undefined): number {
  const target = until ? Date.parse(until) : NaN;
  const calc = () => (Number.isFinite(target) ? Math.max(0, Math.ceil((target - Date.now()) / 1000)) : 0);
  const [left, setLeft] = useState(calc);
  useEffect(() => {
    setLeft(calc());
    if (!Number.isFinite(target)) return;
    const id = window.setInterval(() => {
      const v = calc();
      setLeft(v);
      if (v <= 0) window.clearInterval(id);
    }, 1000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);
  return left;
}

/** 42 → "00:42", 3725 → "01:02:05" (tokens.md 8.5: MM:SS under an hour, HH:MM:SS under a day). */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const p = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${p(h)}:${p(m)}:${p(sec)}` : `${p(m)}:${p(sec)}`;
}
