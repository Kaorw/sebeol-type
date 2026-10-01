// 줄 단위 해금 커리큘럼과 낱말 출제
import basicWords from '../../data/vocab.json';
import freqWords from '../../data/vocab-freq.json';
import { SCHEME, Scheme } from '../scheme';

export interface Stage { id: number; name: string; keys: string[] }

export const stagesOf = (sc: Scheme): Stage[] => sc.stages.map((s, i) => ({ id: i + 1, ...s }));
export const STAGES: Stage[] = stagesOf(SCHEME);

/** rank: 0(자주 쓰는 낱말)~1(드문 낱말). 출제할 때 자주 쓰는 낱말이 먼저 나오도록 쓴다 */
export interface Word { word: string; codes: string[]; rank: number }

/** 학습용 어휘(기본) 다음에 「현대 국어 사용 빈도 조사」 낱말을 빈도 차례로 */
const ALL_WORDS: string[] = [...(basicWords as string[]), ...(freqWords as string[])];

/** 자판으로 칠 수 있는 낱말과 그 키 */
export function vocabOf(sc: Scheme): Word[] {
  const out: Word[] = [];
  ALL_WORDS.forEach((w, i) => {
    try { out.push({ word: w, codes: sc.flatCodes(w), rank: i / ALL_WORDS.length }); } catch { /* 칠 수 없는 낱말은 뺀다 */ }
  });
  return out;
}
export const VOCAB: Word[] = vocabOf(SCHEME);

export function pool(stage: Stage, words: Word[] = VOCAB): Word[] {
  const open = new Set(stage.keys);
  return words.filter((w) => w.codes.every((c) => open.has(c)));
}

/** 오래 안 나온 순(한 번도 안 나온 것 먼저), 같으면 무작위. bias가 클수록 뒤로 밀린다 */
function byStaleness<T>(items: T[], lastSeen: (t: T) => number, rand: () => number, bias: (t: T) => number = () => 0): T[] {
  return items
    .map((t) => ({ t, k: lastSeen(t), r: rand() + bias(t) }))
    .sort((a, b) => a.k - b.k || a.r - b.r)
    .map((x) => x.t);
}

/**
 * 낱말 묶음 출제 (키 진도 가중 무작위)
 * - need(키): 0~1.5. 진도가 낮거나 자주 틀리는 키일수록 크다
 * - 낱말 무게 = (0.1 + 가장 약한 키의 need + 0.5×평균 need) × 자주 쓰는 낱말 가중(순위가 낮을수록 큼)
 * - 무게에 비례해 겹치지 않게 뽑는다 (Efraimidis–Spirakis: 열쇠 = 난수^(1/무게)가 큰 차례)
 * - 직전 2차례에 나온 낱말은 빼서 같은 낱말이 연달아 나오지 않게
 */
export function makeLesson(
  words: Word[], need: (code: string) => number, seen: Record<string, number>,
  count = 14, rand: () => number = Math.random,
): string[] {
  const latest = Object.values(seen).reduce((a, b) => Math.max(a, b), -Infinity);
  let cand = words.filter((w) => (seen[w.word] ?? -Infinity) < latest - 1); // 직전 2차례(latest, latest-1)에 나온 낱말 빼기
  if (cand.length < count) cand = words;
  const cache = new Map<string, number>();
  const needOf = (k: string) => { let v = cache.get(k); if (v === undefined) { v = need(k); cache.set(k, v); } return v; };
  const scored = cand.map((w) => {
    const keys = [...new Set(w.codes)];
    const ns = keys.map(needOf);
    const max = Math.max(0, ...ns);
    const mean = ns.reduce((a, b) => a + b, 0) / Math.max(1, ns.length);
    const weight = (0.1 + max + 0.5 * mean) * Math.exp(-4 * w.rank);
    return { w: w.word, key: Math.log(rand() || 1e-12) / weight };
  });
  scored.sort((a, b) => b.key - a.key);
  return scored.slice(0, Math.min(count, scored.length)).map((x) => x.w);
}

/** 짧은 글 출제: 오래 안 나온 글감부터, 모두 합쳐 minChars 글자 이상 */
export function makeTextLesson(
  texts: string[], seen: Record<string, number>, minChars = 70, rand: () => number = Math.random,
): string[] {
  const out: string[] = [];
  let len = 0;
  for (const t of byStaleness(texts, (x) => seen[x] ?? -1, rand)) {
    if (len >= minChars) break;
    out.push(t);
    len += t.length + 1;
  }
  return out;
}
