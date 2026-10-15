import { scoreColor } from "@/lib/utils";

export function ScoreRing({
  score,
  size = 120,
  strokeWidth = 10,
  label,
  showLabel = true,
}: {
  score: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  showLabel?: boolean;
}) {
  const color = scoreColor(score);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(score, 100);
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative inline-flex flex-col items-center justify-center">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="score-ring"
      >
        <defs>
          <linearGradient
            id={`score-grad-${score}`}
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#00d4ff" />
            <stop offset="50%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#d946ef" />
          </linearGradient>
        </defs>
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(45, 45, 92, 0.4)"
          strokeWidth={strokeWidth}
        />
        {/* Progress ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#score-grad-${score})`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000"
        />
      </svg>
      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
        style={{ transform: "rotate(0deg)" }}
      >
        <div className="text-3xl font-bold text-white leading-none">{score}</div>
        <div className="text-[10px] text-[var(--color-text-dim)] mt-1">
          /100
        </div>
        {showLabel && (
          <div
            className={`text-[11px] font-semibold mt-1 ${color.text} tracking-wide uppercase`}
          >
            {label ?? color.label}
          </div>
        )}
      </div>
    </div>
  );
}
