import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(n);
}

export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  if (hours < 24) return `il y a ${hours} h`;
  if (days < 7) return `il y a ${days} j`;
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function severityColor(severity: string): {
  bg: string;
  text: string;
  border: string;
  ring: string;
  label: string;
} {
  switch (severity) {
    case "critical":
      return {
        bg: "bg-red-500/10",
        text: "text-red-400",
        border: "border-red-500/30",
        ring: "ring-red-500/30",
        label: "Critique",
      };
    case "high":
      return {
        bg: "bg-orange-500/10",
        text: "text-orange-400",
        border: "border-orange-500/30",
        ring: "ring-orange-500/30",
        label: "Élevée",
      };
    case "medium":
      return {
        bg: "bg-yellow-500/10",
        text: "text-yellow-400",
        border: "border-yellow-500/30",
        ring: "ring-yellow-500/30",
        label: "Moyenne",
      };
    case "low":
      return {
        bg: "bg-blue-500/10",
        text: "text-blue-400",
        border: "border-blue-500/30",
        ring: "ring-blue-500/30",
        label: "Faible",
      };
    default:
      return {
        bg: "bg-slate-500/10",
        text: "text-slate-400",
        border: "border-slate-500/30",
        ring: "ring-slate-500/30",
        label: severity,
      };
  }
}

export function scoreColor(score: number): {
  bg: string;
  text: string;
  ring: string;
  label: string;
} {
  if (score >= 90)
    return {
      bg: "from-green-400 to-emerald-500",
      text: "text-green-400",
      ring: "stroke-green-400",
      label: "Excellent",
    };
  if (score >= 75)
    return {
      bg: "from-cyan-400 to-blue-500",
      text: "text-cyan-400",
      ring: "stroke-cyan-400",
      label: "Bon",
    };
  if (score >= 60)
    return {
      bg: "from-yellow-400 to-orange-500",
      text: "text-yellow-400",
      ring: "stroke-yellow-400",
      label: "À surveiller",
    };
  return {
    bg: "from-red-400 to-pink-500",
    text: "text-red-400",
    ring: "stroke-red-400",
    label: "Critique",
  };
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
}

export function parseGitHubRepo(url: string): {
  owner: string;
  repo: string;
} | null {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/);
  if (!match) return null;
  return { owner: match[1], repo: match[2] };
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  const rs = s % 60;
  return `${m} min ${rs} s`;
}
