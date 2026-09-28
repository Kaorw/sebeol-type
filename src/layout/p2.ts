// 신세벌식 P2 기본 배열 (https://pat.im/1136, 배열도 2018-04-10판)
// 키는 KeyboardEvent.code 기준(물리 키). 옛한글·기호 확장·아래아는 제외.
//
// 오른손 키 = 첫소리(초성). 그중 / O I 는 초성 바로 뒤에서 겹홀소리용 ㅗ ㅜ ㅡ 가 된다(첫가끝 갈마들이).
// 왼손 키 = 끝소리(종성). 초성 바로 뒤에서는 가운뎃소리(중성)가 된다(첫가끝 갈마들이).

export type Hand = 'L' | 'R';

export interface RightKey { side: 'R'; cho: string; rightVowel?: string }
export interface LeftKey { side: 'L'; jong: string; vowel?: string }
export type P2Key = RightKey | LeftKey;

export const P2: Record<string, P2Key> = {
  // 왼손: 끝소리 / 갈마들이 가운뎃소리
  KeyQ: { side: 'L', jong: 'ㅅ', vowel: 'ㅒ' },
  KeyW: { side: 'L', jong: 'ㄹ', vowel: 'ㅑ' },
  KeyE: { side: 'L', jong: 'ㅂ', vowel: 'ㅐ' },
  KeyR: { side: 'L', jong: 'ㅌ', vowel: 'ㅓ' },
  KeyT: { side: 'L', jong: 'ㅋ', vowel: 'ㅕ' },
  KeyA: { side: 'L', jong: 'ㅇ', vowel: 'ㅠ' },
  KeyS: { side: 'L', jong: 'ㄴ', vowel: 'ㅖ' },
  KeyD: { side: 'L', jong: 'ㅎ', vowel: 'ㅣ' },
  KeyF: { side: 'L', jong: 'ㅍ', vowel: 'ㅏ' },
  KeyG: { side: 'L', jong: 'ㄷ', vowel: 'ㅡ' },
  KeyZ: { side: 'L', jong: 'ㅁ' },            // 가운뎃소리 자리는 아래아(제외)
  KeyX: { side: 'L', jong: 'ㅆ', vowel: 'ㅛ' },
  KeyC: { side: 'L', jong: 'ㄱ', vowel: 'ㅔ' },
  KeyV: { side: 'L', jong: 'ㅈ', vowel: 'ㅗ' },
  KeyB: { side: 'L', jong: 'ㅊ', vowel: 'ㅜ' },
  // 오른손: 첫소리 (+ 겹홀소리용 오른쪽 홀소리)
  KeyY: { side: 'R', cho: 'ㄹ' },
  KeyU: { side: 'R', cho: 'ㄷ' },
  KeyI: { side: 'R', cho: 'ㅁ', rightVowel: 'ㅡ' },
  KeyO: { side: 'R', cho: 'ㅊ', rightVowel: 'ㅜ' },
  KeyP: { side: 'R', cho: 'ㅍ' },              // 오른쪽 아래아(제외)
  KeyH: { side: 'R', cho: 'ㄴ' },
  KeyJ: { side: 'R', cho: 'ㅇ' },
  KeyK: { side: 'R', cho: 'ㄱ' },
  KeyL: { side: 'R', cho: 'ㅈ' },
  Semicolon: { side: 'R', cho: 'ㅂ' },
  Quote: { side: 'R', cho: 'ㅌ' },
  KeyN: { side: 'R', cho: 'ㅅ' },
  KeyM: { side: 'R', cho: 'ㅎ' },
  Slash: { side: 'R', cho: 'ㅋ', rightVowel: 'ㅗ' },
};

// 한글 밖의 글자 (OHI 신세벌식 P2, 기호 확장 끔 상태로 확인)
// 윗글쇠 없이: 숫자, 쉼표, 마침표 / 윗글쇠와 함께: ? ! :
export const PUNCT: Record<string, string> = {
  Comma: ',', Period: '.',
  Digit1: '1', Digit2: '2', Digit3: '3', Digit4: '4', Digit5: '5',
  Digit6: '6', Digit7: '7', Digit8: '8', Digit9: '9', Digit0: '0',
};
export const SHIFT_PUNCT: Record<string, string> = { Slash: '?', Digit1: '!', Semicolon: ':' };
export const PUNCT_KEY: Record<string, { code: string; shift: boolean }> = {};
for (const [code, ch] of Object.entries(PUNCT)) PUNCT_KEY[ch] = { code, shift: false };
for (const [code, ch] of Object.entries(SHIFT_PUNCT)) PUNCT_KEY[ch] = { code, shift: true };

// 역방향 조회표
export const CHO_KEY: Record<string, string> = {};
export const JONG_KEY: Record<string, string> = {};
export const VOWEL_KEY: Record<string, string> = {};       // 왼손 가운뎃소리
export const RIGHT_VOWEL_KEY: Record<string, string> = {}; // 오른쪽 겹홀소리용
for (const [code, k] of Object.entries(P2)) {
  if (k.side === 'R') {
    CHO_KEY[k.cho] = code;
    if (k.rightVowel) RIGHT_VOWEL_KEY[k.rightVowel] = code;
  } else {
    JONG_KEY[k.jong] = code;
    if (k.vowel) VOWEL_KEY[k.vowel] = code;
  }
}

// 사람이 읽는 키 이름 (쿼티 각인)
export const KEY_LABEL: Record<string, string> = {
  Semicolon: ';', Quote: "'", Slash: '/', Comma: ',', Period: '.', BracketLeft: '[', BracketRight: ']', Space: 'Space',
  Backquote: '`', Minus: '-', Equal: '=', ShiftLeft: 'Shift', ShiftRight: 'Shift',
};
export function keyLabel(code: string): string {
  return KEY_LABEL[code] ?? code.replace(/^Key|^Digit/, '');
}
