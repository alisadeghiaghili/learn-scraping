/** Progress persistence (localStorage + cookie). */

export interface LevelProgress {
  solved: boolean;
  bestCommands?: number;
  solvedAt?: string;
}

const STORAGE_KEY = "learn-scraping-progress-v1";
const COOKIE_KEY = "learn_scraping_progress";

export function loadProgress(): Record<string, LevelProgress> {
  let fromLocal: Record<string, LevelProgress> = {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) fromLocal = JSON.parse(raw);
  } catch {
    fromLocal = {};
  }
  let fromCookie: Record<string, LevelProgress> = {};
  try {
    const raw = getCookie(COOKIE_KEY);
    if (raw) fromCookie = JSON.parse(decodeURIComponent(raw));
  } catch {
    fromCookie = {};
  }
  const merged: Record<string, LevelProgress> = { ...fromCookie, ...fromLocal };
  for (const [id, p] of Object.entries(fromLocal)) {
    const other = fromCookie[id];
    if (other?.solved) merged[id] = { ...p, solved: true };
    if (other?.bestCommands !== undefined && p.bestCommands !== undefined) {
      merged[id] = {
        ...merged[id],
        bestCommands: Math.min(other.bestCommands, p.bestCommands),
      };
    }
  }
  return merged;
}

export function saveProgress(progress: Record<string, LevelProgress>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    document.cookie = `${COOKIE_KEY}=${encodeURIComponent(JSON.stringify(progress))}; path=/; max-age=${60 * 60 * 24 * 400}`;
  } catch {
    // ignore quota
  }
}

export function summarizeCurriculum(
  progress: Record<string, LevelProgress>,
  ids: string[],
): {
  solvedCount: number;
  total: number;
  percent: number;
  next?: string;
} {
  const total = ids.length;
  const solvedCount = ids.filter((id) => progress[id]?.solved).length;
  const next = ids.find((id) => !progress[id]?.solved);
  return {
    solvedCount,
    total,
    percent: total ? Math.round((solvedCount / total) * 100) : 0,
    next,
  };
}

export function resumeLine(progress: Record<string, LevelProgress>, total: number): string {
  const n = Object.values(progress).filter((p) => p.solved).length;
  if (!n) return "";
  return `Welcome back — ${n}/${total} levels solved.`;
}

function getCookie(name: string): string | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? m[1] : null;
}
