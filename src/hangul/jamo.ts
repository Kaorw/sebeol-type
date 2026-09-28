// 한글 음절 조합/분해 (호환용 자모 기준)

export const CHO = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'] as const;
export const JUNG = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'] as const;
export const JONG = ['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'] as const;

const BASE = 0xac00;

export interface Syllable { cho: string; jung: string; jong: string }

export function isSyllable(ch: string): boolean {
  const c = ch.charCodeAt(0);
  return c >= BASE && c <= 0xd7a3;
}

export function decompose(ch: string): Syllable | null {
  if (!isSyllable(ch)) return null;
  const i = ch.charCodeAt(0) - BASE;
  return { cho: CHO[Math.floor(i / 588)], jung: JUNG[Math.floor((i % 588) / 28)], jong: JONG[i % 28] };
}

export function compose(cho: string, jung: string, jong = ''): string {
  const a = CHO.indexOf(cho as any), b = JUNG.indexOf(jung as any), c = JONG.indexOf(jong as any);
  if (a < 0 || b < 0 || c < 0) throw new Error(`조합 불가: ${cho}${jung}${jong}`);
  return String.fromCharCode(BASE + (a * 21 + b) * 28 + c);
}

// 겹홀소리: [앞, 뒤] → 결과
export const JUNG_COMBINE: Record<string, string> = {
  'ㅗㅏ': 'ㅘ', 'ㅗㅐ': 'ㅙ', 'ㅗㅣ': 'ㅚ',
  'ㅜㅓ': 'ㅝ', 'ㅜㅔ': 'ㅞ', 'ㅜㅣ': 'ㅟ',
  'ㅡㅣ': 'ㅢ',
};

// 겹받침(같은 글쇠 거듭치기 ㄱㄱ→ㄲ 포함)
export const JONG_COMBINE: Record<string, string> = {
  'ㄱㄱ': 'ㄲ', 'ㄱㅅ': 'ㄳ', 'ㄴㅈ': 'ㄵ', 'ㄴㅎ': 'ㄶ',
  'ㄹㄱ': 'ㄺ', 'ㄹㅁ': 'ㄻ', 'ㄹㅂ': 'ㄼ', 'ㄹㅅ': 'ㄽ', 'ㄹㅌ': 'ㄾ', 'ㄹㅍ': 'ㄿ', 'ㄹㅎ': 'ㅀ',
  'ㅂㅅ': 'ㅄ',
};

// 쌍자음 첫소리(같은 글쇠 거듭치기)
export const CHO_DOUBLE: Record<string, string> = { 'ㄱ': 'ㄲ', 'ㄷ': 'ㄸ', 'ㅂ': 'ㅃ', 'ㅅ': 'ㅆ', 'ㅈ': 'ㅉ' };

export function split<T extends Record<string, string>>(table: T, value: string): [string, string] | null {
  for (const k of Object.keys(table)) if (table[k] === value) return [k[0], k[1]];
  return null;
}
