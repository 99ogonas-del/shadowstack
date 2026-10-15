import { cn } from "@/lib/utils";

/**
 * ShadowStack — Logo
 *
 * Bouclier néon (symbole de sécurité) avec un "S" formé par le scan.
 * Palette : cyan → bleu → violet, cohérente avec le thème du site.
 */
export function ShadowStackLogo({
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
        <linearGradient id="ss-grad-shield" x1="8" y1="4" x2="56" y2="60">
          <stop offset="0%" stopColor="#00d4ff" />
          <stop offset="50%" stopColor="#2b6cff" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
        <linearGradient id="ss-grad-scan" x1="20" y1="32" x2="44" y2="32">
          <stop offset="0%" stopColor="#d946ef" />
          <stop offset="100%" stopColor="#00d4ff" />
        </linearGradient>
      </defs>

      {/* Bouclier */}
      <path
        d="M32 3 L56 12 V32 C56 45 46 55 32 61 C18 55 8 45 8 32 V12 Z"
        fill="url(#ss-grad-shield)"
      />
      {/* Éclat intérieur */}
      <path
        d="M32 7 L52 14 V32 C52 42 44 50 32 55 C20 50 12 42 12 32 V14 Z"
        fill="rgba(255,255,255,0.08)"
      />
      {/* "S" de scan — deux arcs + barre de scan */}
      <path
        d="M40 24 C40 20 36 18 32 18 C27 18 24 21 24 25 C24 30 29 31 33 33 C37 35 40 37 40 42 C40 46 36 48 32 48 C27 48 24 45 24 42"
        stroke="url(#ss-grad-scan)"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Barre de scan */}
      <rect x="22" y="30.5" width="20" height="1.5" rx="0.75" fill="#00d4ff" opacity="0.7" />
    </svg>
  );
}

export function ShadowStackWordmark({
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
      <ShadowStackLogo size={size === "sm" ? 24 : size === "lg" ? 44 : 32} />
      <div className="flex flex-col leading-none">
        <span className={cn("font-bold tracking-tight", fontSize)}>
          <span className="text-white">Shadow</span>
          <span className="gradient-text-cyan">Stack</span>
        </span>
        {showTagline && (
          <span
            className={cn(
              "mt-1 text-[var(--color-text-dim)] tracking-wide",
              tagSize,
            )}
          >
            Analyse · Sécurise · Corrige
          </span>
        )}
      </div>
    </div>
  );
}
