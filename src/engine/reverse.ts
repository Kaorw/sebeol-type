// 역방향 엔진: 목표 글 → 눌러야 할 키 순서 (키·손가락 하이라이트용)
import { decompose, split, CHO_DOUBLE, JONG_COMBINE, JUNG_COMBINE } from '../hangul/jamo';
import { CHO_KEY, JONG_KEY, PUNCT_KEY, RIGHT_VOWEL_KEY, VOWEL_KEY } from '../layout/p2';

export type Role = '초성' | '중성' | '종성' | '띄어쓰기' | '문장부호';

export interface Stroke {
  code: string;   // KeyboardEvent.code
  jamo: string;   // 이 타에서 들어가는 낱자
  role: Role;
  note?: string;  // 예: '갈마들이', '거듭치기', '겹홀소리'
  shift?: boolean; // 윗글쇠와 함께
  /** 모아치기 자판: 한꺼번에 누를 키 묶음 (있으면 code 대신 이 키들을 모두 누른다) */
  chord?: { code: string; jamo: string; role: Role }[];
}

export class UntypeableError extends Error {}

function choStrokes(cho: string): Stroke[] {
  if (CHO_KEY[cho]) return [{ code: CHO_KEY[cho], jamo: cho, role: '초성' }];
  const base = Object.keys(CHO_DOUBLE).find((b) => CHO_DOUBLE[b] === cho);
  if (base) {
    const code = CHO_KEY[base];
    return [
      { code, jamo: base, role: '초성' },
      { code, jamo: cho, role: '초성', note: '거듭치기' },
    ];
  }
  throw new UntypeableError(`초성 ${cho}`);
}

function jungStrokes(jung: string): Stroke[] {
  if (VOWEL_KEY[jung]) return [{ code: VOWEL_KEY[jung], jamo: jung, role: '중성', note: '갈마들이' }];
  const parts = split(JUNG_COMBINE, jung);
  if (parts && RIGHT_VOWEL_KEY[parts[0]] && VOWEL_KEY[parts[1]]) {
    return [
      { code: RIGHT_VOWEL_KEY[parts[0]], jamo: parts[0], role: '중성', note: '오른쪽 홀소리' },
      { code: VOWEL_KEY[parts[1]], jamo: jung, role: '중성', note: '겹홀소리' },
    ];
  }
  throw new UntypeableError(`중성 ${jung}`);
}

function jongStrokes(jong: string): Stroke[] {
  if (!jong) return [];
  if (JONG_KEY[jong]) return [{ code: JONG_KEY[jong], jamo: jong, role: '종성' }];
  const parts = split(JONG_COMBINE, jong);
  if (parts && JONG_KEY[parts[0]] && JONG_KEY[parts[1]]) {
    return [
      { code: JONG_KEY[parts[0]], jamo: parts[0], role: '종성' },
      { code: JONG_KEY[parts[1]], jamo: jong, role: '종성', note: parts[0] === parts[1] ? '거듭치기' : '겹받침' },
    ];
  }
  throw new UntypeableError(`종성 ${jong}`);
}

/** 한 글자 → 키 순서 */
export function charStrokes(ch: string): Stroke[] {
  if (ch === ' ') return [{ code: 'Space', jamo: ' ', role: '띄어쓰기' }];
  const pk = PUNCT_KEY[ch];
  if (pk) return [{ code: pk.code, jamo: ch, role: '문장부호', ...(pk.shift ? { shift: true, note: '윗글쇠' } : {}) }];
  const syl = decompose(ch);
  if (!syl) throw new UntypeableError(`한글 음절 아님: ${ch}`);
  return [...choStrokes(syl.cho), ...jungStrokes(syl.jung), ...jongStrokes(syl.jong)];
}

/** 글 전체 → 글자별 키 순서 */
export function textStrokes(text: string): Stroke[][] {
  return [...text].map(charStrokes);
}

export function flatCodes(text: string): string[] {
  return textStrokes(text).flat().map((s) => (s.shift ? `Shift+${s.code}` : s.code));
}

/** 이 글자를 칠 수 있는가 */
export function typeable(ch: string): boolean {
  try { charStrokes(ch); return true; } catch { return false; }
}
