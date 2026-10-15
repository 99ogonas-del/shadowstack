"use client";

import { useEffect, useState } from "react";
import { scoreColor } from "@/lib/utils";

export function HealthScoreRing({
  score,
  size = 180,
}: {
  score: number;
  size?: number;
}) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const color = scoreColor(score);

  useEffect(() => {
    const start = performance.now();
    const duration = 1200;
    let raf: number;
    function tick(now: number) {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setAnimatedScore(Math.round(eased * score));
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [score]);

  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(animatedScore, 100);
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="score-ring"
      >
        <defs>
          <linearGradient
            id="hs-grad"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#00d4ff" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(45, 45, 92, 0.5)"
          strokeWidth={14}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#hs-grad)"
          strokeWidth={14}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-5xl font-bold text-white leading-none">
          {animatedScore}
        </div>
        <div className="text-sm text-[var(--color-text-dim)] mt-1">/ 100</div>
        <div
          className={`mt-2 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/5 ${color.text}`}
        >
          {color.label}
        </div>
      </div>
    </div>
  );
}
