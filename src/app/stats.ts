// 키별 숙련도와 저장
import { SCHEME } from '../scheme';

export interface Sample { ms: number | null; ok: boolean }
export interface Saved {
  keyStats: Record<string, Sample[]>;
  stage: number;
  unlocked: number;
  layout: string;
  targetCpm: number;
  daily: { date: string; ms: number };
  last: { cpm: number; acc: number } | null;
  mode: 'words' | 'text';
  lessonNo: number;
  seen: Record<string, number>;     // 낱말 → 마지막으로 나온 차례
  seenText: Record<string, number>; // 글감 → 마지막으로 나온 차례
  unlockOn: boolean;                // 줄 단위 해금 사용
  customKeys: string[] | null;      // 해금을 끄고 직접 고른 키
  textSource: string; // 'builtin' | 'lit' | 'line' | 'proverb' | 'mine'
  history: { t: number; cpm: number; acc: number; mode: 'words' | 'text'; n: number }[];
}

// 자판마다 기록을 따로 둔다 (같은 키라도 자판에 따라 낱자가 다르다)
const STORE = SCHEME.store;
const MAX_SAMPLES = 30;
export const MIN_SAMPLES = 10;
export const UNLOCK_SCORE = 0.8;

export function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function load(): Saved {
  const base: Saved = { keyStats: {}, stage: 1, unlocked: 1, layout: 'ansi', targetCpm: 150, daily: { date: today(), ms: 0 }, last: null, mode: 'words', lessonNo: 0, seen: {}, seenText: {}, unlockOn: true, customKeys: null, textSource: 'builtin', history: [] };
  try {
    const raw = localStorage.getItem(STORE);
    if (raw) Object.assign(base, JSON.parse(raw));
  } catch { /* 저장소를 못 쓰면 새로 시작 */ }
  if (base.daily.date !== today()) base.daily = { date: today(), ms: 0 };
  return base;
}

export function resetRecords(s: Saved): void {
  s.keyStats = {}; s.history = []; s.last = null; s.unlocked = 1; s.stage = 1; s.seen = {}; s.seenText = {};
  s.daily = { date: today(), ms: 0 };
}

export function save(s: Saved): void {
  try { localStorage.setItem(STORE, JSON.stringify(s)); } catch { /* 무시 */ }
}

export function record(s: Saved, code: string, sample: Sample): void {
  const arr = (s.keyStats[code] ??= []);
  arr.push(sample);
  if (arr.length > MAX_SAMPLES) arr.splice(0, arr.length - MAX_SAMPLES);
}

export interface KeyScore { samples: number; acc: number; cpm: number; score: number; calibrated: boolean }

export function score(s: Saved, code: string): KeyScore {
  const arr = s.keyStats[code] ?? [];
  const n = arr.length;
  if (!n) return { samples: 0, acc: 0, cpm: 0, score: 0, calibrated: false };
  const acc = arr.filter((x) => x.ok).length / n;
  const times = arr.filter((x) => x.ok && x.ms !== null && x.ms < 3000).map((x) => x.ms as number).sort((a, b) => a - b);
  const med = times.length ? times[Math.floor(times.length / 2)] : 0;
  const cpm = med ? 60000 / med : 0;
  const sc = Math.min(1, cpm / s.targetCpm) * acc;
  return { samples: n, acc, cpm, score: sc, calibrated: n >= MIN_SAMPLES };
}

/** 가장 약한 키: 표본이 모자란 키 먼저, 그다음 점수가 낮은 키 */
export function weakest(s: Saved, keys: string[]): string | null {
  let best: string | null = null, bestVal = Infinity;
  for (const k of keys) {
    const sc = score(s, k);
    const v = sc.calibrated ? sc.score : -1 + sc.samples / 100;
    if (v < bestVal) { bestVal = v; best = k; }
  }
  return best;
}

export function stageReady(s: Saved, keys: string[]): boolean {
  return keys.every((k) => { const sc = score(s, k); return sc.calibrated && sc.score >= UNLOCK_SCORE; });
}
