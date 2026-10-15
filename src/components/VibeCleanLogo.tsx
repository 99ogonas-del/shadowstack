import { cn } from "@/lib/utils";

export function VibeCleanLogo({
  size = 32,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="vc-grad-1" x1="0" y1="0" x2="64" y2="64">
          <stop offset="0%" stopColor="#00d4ff" />
          <stop offset="50%" stopColor="#2b6cff" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
        <linearGradient id="vc-grad-2" x1="20" y1="32" x2="56" y2="32">
          <stop offset="0%" stopColor="#d946ef" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
        <linearGradient id="vc-grad-3" x1="44" y1="44" x2="64" y2="44">
          <stop offset="0%" stopColor="#00d4ff" />
          <stop offset="100%" stopColor="#d946ef" />
        </linearGradient>
      </defs>
      {/* V shape */}
      <path
        d="M8 6 L28 6 L36 32 L28 50 L20 58 C 18 56 8 36 8 6 Z"
        fill="url(#vc-grad-1)"
      />
      <path
        d="M56 6 L36 6 L28 32 L36 50 L44 58 C 46 56 56 36 56 6 Z"
        fill="url(#vc-grad-2)"
      />
      {/* Inner highlight */}
      <path
        d="M8 6 L28 6 L24 28 L20 6 Z"
        fill="rgba(255,255,255,0.15)"
      />
      {/* Sparkle 1 */}
      <g transform="translate(46,18)">
        <path
          d="M0 -4 L1 -1 L4 0 L1 1 L0 4 L-1 1 L-4 0 L-1 -1 Z"
          fill="url(#vc-grad-3)"
        />
      </g>
      <g transform="translate(54,28)">
        <path
          d="M0 -2.5 L0.7 -0.7 L2.5 0 L0.7 0.7 L0 2.5 L-0.7 0.7 L-2.5 0 L-0.7 -0.7 Z"
          fill="#00d4ff"
        />
      </g>
    </svg>
  );
}

export function VibeCleanWordmark({
  size = "md",
  showTagline = true,
}: {
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
}) {
  const fontSize =
    size === "sm" ? "text-base" : size === "lg" ? "text-3xl" : "text-xl";
  const tagSize = size === "sm" ? "text-[10px]" : "text-xs";

  return (
    <div className="flex items-center gap-2.5">
      <VibeCleanLogo size={size === "sm" ? 24 : size === "lg" ? 44 : 32} />
      <div className="flex flex-col leading-none">
        <span
          className={cn(
            "font-bold tracking-tight",
            fontSize,
          )}
        >
          <span className="text-white">Vibe</span>
          <span className="gradient-text-cyan">Clean</span>
        </span>
        {showTagline && (
          <span
            className={cn(
              "mt-1 text-[var(--color-text-dim)] tracking-wide",
              tagSize,
            )}
          >
            Analyse · Nettoie · Sécurise
          </span>
        )}
      </div>
    </div>
  );
}
