// 줄 단위 해금 커리큘럼과 낱말 출제
import vocabWords from '../../data/vocab.json';
import { SCHEME, Scheme } from '../scheme';

export interface Stage { id: number; name: string; keys: string[] }

export const stagesOf = (sc: Scheme): Stage[] => sc.stages.map((s, i) => ({ id: i + 1, ...s }));
export const STAGES: Stage[] = stagesOf(SCHEME);

export interface Word { word: string; codes: string[] }

/** 자판으로 칠 수 있는 낱말과 그 키 */
export function vocabOf(sc: Scheme): Word[] {
  const out: Word[] = [];
  for (const w of vocabWords as string[]) {
    try { out.push({ word: w, codes: sc.flatCodes(w) }); } catch { /* 칠 수 없는 낱말은 뺀다 */ }
  }
  return out;
}
export const VOCAB: Word[] = vocabOf(SCHEME);

export function pool(stage: Stage, words: Word[] = VOCAB): Word[] {
  const open = new Set(stage.keys);
  return words.filter((w) => w.codes.every((c) => open.has(c)));
}

/** 오래 안 나온 순(한 번도 안 나온 것 먼저), 같으면 무작위 */
function byStaleness<T>(items: T[], lastSeen: (t: T) => number, rand: () => number): T[] {
  return items
    .map((t) => ({ t, k: lastSeen(t), r: rand() }))
    .sort((a, b) => a.k - b.k || a.r - b.r)
    .map((x) => x.t);
}

/**
 * 낱말 묶음 출제 (다양화)
 * - 한 차례 안에서는 같은 낱말을 다시 내지 않는다
 * - 가장 오래 안 나온 낱말부터 낸다 (seen: 낱말 → 마지막으로 나온 차례 번호)
 * - 3분의 1까지는 집중 키가 든 낱말로 채운다 (직전 2차례에 나온 낱말 제외)
 */
export function makeLesson(
  words: Word[], focus: string | null, seen: Record<string, number>,
  count = 14, rand: () => number = Math.random,
): string[] {
  const n = Math.min(count, words.length);
  const last = (w: Word) => seen[w.word] ?? -1;
  // 집중 키 낱말은 1/3까지, 직전 2차례에 나온 낱말은 빼서 같은 낱말이 연달아 나오지 않게
  const recent = Math.max(-1, ...Object.values(seen)) - 2;
  const focusWords = focus
    ? byStaleness(words.filter((w) => w.codes.includes(focus) && last(w) < recent), last, rand)
    : [];
  const picked = new Set<string>();
  for (const w of focusWords.slice(0, Math.ceil(n / 3))) picked.add(w.word);
  for (const w of byStaleness(words, last, rand)) {
    if (picked.size >= n) break;
    picked.add(w.word);
  }
  // 섞어서 집중 키 낱말이 한쪽에 몰리지 않게
  return [...picked].map((w) => ({ w, r: rand() })).sort((a, b) => a.r - b.r).map((x) => x.w);
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
