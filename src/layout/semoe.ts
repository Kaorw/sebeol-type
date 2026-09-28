// 세모이(세벌식 모아치기 e) 기본 배열 — 요즘 한글만
// 배열: https://github.com/Sinseiki/Semo-e_keyboard (CC BY-SA 4.0)
// 결합 규칙: 온라인 한글 입력기 세모이 구현(K3_Semoe_combination_table, https://github.com/Sinseiki/ohi)에서
//           요즘 한글 낱자로만 이루어진 규칙을 같은 차례로 옮김. 옛한글이 되는 규칙은 결과를 'x'(칠 수 없음)로 남겨
//           모아치기 판정 차례가 원본과 같도록 했다.
// 키는 KeyboardEvent.code 기준(물리 키). 약어·옛한글·기호 확장은 제외.
//
// 오른손 = 첫소리(초성). ; 는 받침 ㅆ, . 는 겹홀소리용 ㅗ(가상 홀소리).
// 왼손 = 가운뎃소리(중성)와 받침(종성).
// 한 글자의 초성·중성·종성 키를 한꺼번에 눌렀다 떼면 글자가 들어간다(모아치기).

/** 낱자 표기: 앞 글자로 자리를 나눈다. c=초성, v=중성, j=종성. 'v.' 는 . 키의 가상 ㅗ */
export type Tok = string;

export const SEMOE: Record<string, Tok> = {
  // 오른손: 첫소리
  KeyY: 'cㅁ', KeyU: 'cㄴ', KeyI: 'cㄷ', KeyO: 'cㅂ',
  KeyH: 'cㅎ', KeyJ: 'cㅇ', KeyK: 'cㄱ', KeyL: 'cㅈ',
  KeyN: 'cㅅ', KeyM: 'cㄹ',
  Semicolon: 'jㅆ', // 받침 ㅆ (다른 받침과 모아 ㅊ ㅍ ㅈ ㅀ ㅎ ㄷ ㅋ 을 만든다)
  Period: 'v.',     // 겹홀소리용 ㅗ (다른 홀소리와 모아 ㅝ ㅒ ㅑ ㅖ ㅛ ㅠ ㅘ ㅚ 를 만든다)
  // 왼손: 받침
  KeyQ: 'jㅅ', KeyW: 'jㅂ', KeyE: 'jㄹ',
  KeyA: 'jㅇ', KeyS: 'jㄴ',
  KeyZ: 'jㅁ', KeyX: 'jㄱ',
  // 왼손: 홀소리
  KeyR: 'vㅓ', KeyT: 'vㅕ',
  KeyD: 'vㅣ', KeyF: 'vㅏ', KeyG: 'vㅡ',
  KeyC: 'vㅔ', KeyV: 'vㅗ', KeyB: 'vㅜ',
};

/** 배열도에 함께 적는 보조 낱자 (; 또는 . 와 모아서 나오는 낱자) */
export const SEMOE_SUB: Record<string, string> = {
  KeyQ: 'ㅊ', KeyW: 'ㅍ', KeyE: 'ㅈ', KeyR: 'ㅝ', KeyT: 'ㅒ',
  KeyA: 'ㅀ', KeyS: 'ㅎ', KeyG: 'ㅑ',
  KeyZ: 'ㄷ', KeyX: 'ㅋ', KeyC: 'ㅖ', KeyV: 'ㅛ', KeyB: 'ㅠ',
};

// 한글 밖의 글자 (OHI 세모이, 기호 확장 끔)
export const SEMOE_PUNCT: Record<string, string> = {
  KeyP: '.', Comma: ',',
  Digit1: '1', Digit2: '2', Digit3: '3', Digit4: '4', Digit5: '5',
  Digit6: '6', Digit7: '7', Digit8: '8', Digit9: '9', Digit0: '0',
};
export const SEMOE_SHIFT_PUNCT: Record<string, string> = { Slash: '?', Digit1: '!', Semicolon: ':' };

/** 모아치기 결합 규칙: 'a+b=r' (낱자 차례를 따지지 않고 위에서부터 먼저 맞는 규칙을 쓴다) */
const RULES_SRC =
  'cㄱ+cㄱ=cㄲ cㄱ+cㄴ=x cㄱ+cㄷ=x cㄱ+cㄹ=x cㄱ+cㅂ=x cㄱ+cㅅ=x cㄱ+cㅇ=cㄲ cㄱ+cㅈ=x cㄱ+cㅎ=cㅋ ' +
  'cㄲ+cㄱ=cㅋ cㄴ+cㄱ=x cㄴ+cㄷ=x cㄴ+cㄹ=x cㄴ+cㅁ=x cㄴ+cㅂ=x cㄴ+cㅃ=x cㄴ+cㅅ=x cㄴ+cㅇ=x ' +
  'cㄴ+cㅈ=x cㄴ+cㅎ=x cㄷ+cㄱ=x cㄷ+cㄴ=x cㄷ+cㄷ=cㄸ cㄷ+cㄹ=x cㄷ+cㅁ=x cㄷ+cㅂ=x cㄷ+cㅅ=x ' +
  'cㄷ+cㅇ=cㄸ cㄷ+cㅈ=x cㄷ+cㅎ=cㅌ cㄸ+cㄷ=cㅌ cㄹ+cㄱ=x cㄹ+cㄴ=x cㄹ+cㄷ=x cㄹ+cㅁ=x cㄹ+cㅂ=x ' +
  'cㄹ+cㅅ=x cㄹ+cㅇ=x cㄹ+cㅈ=x cㄹ+cㅎ=x cㅁ+cㄴ=x cㅁ+cㄷ=x cㅁ+cㄹ=x cㅁ+cㅂ=x cㅁ+cㅅ=x cㅁ+cㅈ=x ' +
  'cㅁ+cㅎ=x cㅂ+cㄱ=x cㅂ+cㄴ=x cㅂ+cㄷ=x cㅂ+cㄹ=x cㅂ+cㅁ=x cㅂ+cㅂ=cㅃ cㅂ+cㅅ=x cㅂ+cㅇ=cㅃ ' +
  'cㅂ+cㅈ=x cㅂ+cㅎ=cㅍ cㅃ+cㄴ=x cㅃ+cㅂ=cㅍ cㅅ+cㄱ=x cㅅ+cㄴ=x cㅅ+cㄷ=x cㅅ+cㄹ=x cㅅ+cㅁ=x ' +
  'cㅅ+cㅂ=x cㅅ+cㅅ=cㅆ cㅅ+cㅇ=cㅆ cㅅ+cㅈ=x cㅅ+cㅎ=x cㅇ+cㄱ=cㄲ cㅇ+cㄴ=x cㅇ+cㄷ=cㄸ cㅇ+cㄹ=x ' +
  'cㅇ+cㅂ=cㅃ cㅇ+cㅅ=cㅆ cㅇ+cㅈ=cㅉ cㅇ+cㅎ=x cㅈ+cㄱ=x cㅈ+cㄴ=x cㅈ+cㄷ=x cㅈ+cㄹ=x cㅈ+cㅁ=x ' +
  'cㅈ+cㅂ=x cㅈ+cㅅ=x cㅈ+cㅇ=cㅉ cㅈ+cㅈ=cㅉ cㅈ+cㅎ=cㅊ cㅉ+cㅈ=cㅊ cㅎ+cㄱ=cㅋ cㅎ+cㄴ=x ' +
  'cㅎ+cㄷ=cㅌ cㅎ+cㄹ=x cㅎ+cㅁ=x cㅎ+cㅂ=cㅍ cㅎ+cㅅ=x cㅎ+cㅇ=x cㅎ+cㅈ=cㅊ vㅏ+vㅏ=vㅑ ' +
  'vㅏ+vㅓ=vㅛ vㅏ+vㅔ=x vㅏ+vㅗ=vㅘ vㅏ+vㅚ=vㅙ vㅏ+vㅜ=x vㅏ+vㅡ=x vㅏ+vㅢ=x vㅏ+vㅣ=vㅐ ' +
  'vㅏ+v.=vㅘ vㅐ+vㅗ=vㅙ vㅐ+vㅡ=x vㅐ+v.=vㅙ vㅑ+vㅡ=x vㅓ+vㅏ=vㅛ vㅓ+vㅓ=vㅝ vㅓ+vㅔ=x vㅓ+vㅕ=x ' +
  'vㅓ+vㅗ=vㅝ vㅓ+vㅜ=vㅝ vㅓ+vㅟ=vㅞ vㅓ+vㅡ=x vㅓ+v.=vㅝ vㅔ+vㅏ=x vㅔ+vㅓ=x vㅔ+vㅔ=vㅖ ' +
  'vㅔ+vㅕ=x vㅔ+vㅗ=vㅖ vㅔ+vㅜ=vㅞ vㅔ+vㅡ=x vㅔ+vㅣ=vㅟ vㅔ+v.=vㅖ vㅕ+vㅓ=x vㅕ+vㅔ=x ' +
  'vㅕ+vㅕ=vㅒ vㅕ+vㅗ=vㅒ vㅕ+vㅜ=x vㅕ+vㅡ=x vㅕ+v.=vㅒ vㅖ+vㅣ=x vㅗ+vㅏ=vㅘ vㅗ+vㅐ=vㅙ ' +
  'vㅗ+vㅓ=vㅝ vㅗ+vㅔ=vㅖ vㅗ+vㅕ=vㅒ vㅗ+vㅗ=vㅛ vㅗ+vㅜ=vㅠ vㅗ+vㅡ=x vㅗ+vㅣ=vㅚ vㅗ+v.=vㅛ ' +
  'vㅘ+vㅣ=vㅙ vㅚ+vㅏ=vㅙ vㅚ+vㅔ=x vㅚ+vㅜ=x vㅜ+vㅏ=x vㅜ+vㅓ=vㅝ vㅜ+vㅔ=vㅞ vㅜ+vㅕ=x ' +
  'vㅜ+vㅗ=vㅠ vㅜ+vㅜ=vㅠ vㅜ+vㅡ=x vㅜ+vㅣ=vㅟ vㅜ+v.=vㅠ vㅝ+vㅣ=vㅞ vㅟ+vㅓ=vㅞ vㅟ+vㅔ=x ' +
  'vㅟ+vㅗ=x vㅟ+v.=x vㅟ+vㅜ=x vㅠ+vㅣ=x vㅡ+vㅏ=x vㅡ+vㅐ=x vㅡ+vㅑ=x vㅡ+vㅓ=x vㅡ+vㅔ=x vㅡ+vㅕ=x ' +
  'vㅡ+vㅗ=x vㅡ+vㅜ=x vㅡ+vㅡ=vㅑ vㅡ+vㅣ=vㅢ vㅡ+v.=vㅑ vㅢ+vㅏ=x vㅣ+vㅏ=vㅐ vㅣ+vㅔ=vㅟ ' +
  'vㅣ+vㅖ=x vㅣ+vㅗ=vㅚ vㅣ+vㅘ=vㅙ vㅣ+vㅜ=vㅟ vㅣ+vㅝ=vㅞ vㅣ+vㅠ=x vㅣ+vㅡ=vㅢ vㅣ+v.=vㅚ ' +
  'v.+vㅏ=vㅘ v.+vㅐ=vㅙ v.+vㅓ=vㅝ v.+vㅔ=vㅖ v.+vㅕ=vㅒ v.+vㅗ=vㅛ v.+vㅜ=vㅠ v.+vㅡ=vㅑ v.+vㅣ=vㅚ ' +
  'v.+v.=vㅛ jㄱ+jㄱ=jㄲ jㄱ+jㄴ=x jㄱ+jㄷ=jㄳ jㄱ+jㄹ=jㄺ jㄱ+jㄽ=x jㄱ+jㅁ=jㄺ jㄱ+jㅂ=x ' +
  'jㄱ+jㅅ=jㄳ jㄱ+jㅆ=jㅋ jㄱ+jㅇ=jㄲ jㄱ+jㅎ=jㅋ jㄲ+jㄱ=jㅋ jㄴ+jㄱ=x jㄴ+jㄴ=jㅎ jㄴ+jㄹ=jㄵ ' +
  'jㄴ+jㅁ=jㅌ jㄴ+jㅂ=jㅍ jㄴ+jㅅ=x jㄴ+jㅆ=jㅎ jㄴ+jㅇ=jㄶ jㄴ+jㅈ=jㄵ jㄴ+jㅎ=jㄶ jㄵ+jㄴ=jㅀ ' +
  'jㄷ+jㄱ=jㄳ jㄷ+jㅀ=jㄾ jㄷ+jㅁ=jㅌ jㄷ+jㅇ=jㄾ jㄷ+jㅎ=jㅌ jㄹ+jㄱ=jㄺ jㄹ+jㄴ=jㄵ jㄹ+jㄹ=jㅈ ' +
  'jㄹ+jㅁ=jㄻ jㄹ+jㅂ=jㄼ jㄹ+jㅅ=jㄽ jㄹ+jㅆ=jㅈ jㄹ+jㅇ=jㄱ jㄹ+jㅊ=jㄲ jㄹ+jㅌ=jㄾ jㄹ+jㅍ=jㄿ ' +
  'jㄹ+jㅎ=jㅀ jㄺ+jㅆ=jㄳ jㄻ+jㅁ=jㄾ jㄼ+jㅂ=jㄿ jㄼ+jㅆ=jㅌ jㄽ+jㄱ=x jㄽ+jㅂ=x jㄽ+jㅅ=jㅈ ' +
  'jㄽ+jㅆ=jㄲ jㅀ+jㄷ=jㄾ jㅀ+jㄹ=jㅋ jㅀ+jㅂ=jㄿ jㅁ+jㄱ=jㄺ jㅁ+jㄴ=jㅌ jㅁ+jㄹ=jㄻ jㅁ+jㅁ=jㄷ ' +
  'jㅁ+jㅂ=x jㅁ+jㅅ=x jㅁ+jㅆ=jㄷ jㅁ+jㅇ=jㄾ jㅁ+jㅋ=jㄳ jㅂ+jㄱ=x jㅂ+jㄴ=jㅍ jㅂ+jㄹ=jㄼ ' +
  'jㅂ+jㄽ=x jㅂ+jㅀ=jㄿ jㅂ+jㅁ=x jㅂ+jㅂ=jㅍ jㅂ+jㅅ=jㅄ jㅂ+jㅆ=jㅍ jㅂ+jㅇ=jㄿ jㅂ+jㅈ=jㅌ ' +
  'jㅂ+jㅊ=jㄻ jㅂ+jㅎ=jㅍ jㅄ+jㅆ=jㄻ jㅅ+jㄱ=jㄳ jㅅ+jㄴ=x jㅅ+jㄹ=jㄽ jㅅ+jㅁ=x jㅅ+jㅂ=jㅄ ' +
  'jㅅ+jㅅ=jㅆ jㅅ+jㅆ=jㅊ jㅅ+jㅇ=jㅆ jㅅ+jㅈ=jㄲ jㅅ+jㅍ=jㄻ jㅆ+jㄱ=jㅋ jㅆ+jㄴ=jㅎ jㅆ+jㄷ=jㅌ ' +
  'jㅆ+jㄹ=jㅈ jㅆ+jㄺ=jㄳ jㅆ+jㄼ=jㅌ jㅆ+jㄽ=jㄲ jㅆ+jㅁ=jㄷ jㅆ+jㅂ=jㅍ jㅆ+jㅄ=jㄻ jㅆ+jㅅ=jㅊ ' +
  'jㅆ+jㅇ=jㅀ jㅇ+jㄱ=jㄲ jㅇ+jㄴ=jㄶ jㅇ+jㄹ=jㄱ jㅇ+jㅁ=jㄾ jㅇ+jㅂ=jㄿ jㅇ+jㅅ=jㅆ jㅇ+jㅆ=jㅀ ' +
  'jㅇ+jㅇ=jㅌ jㅈ+jㅂ=jㅌ jㅈ+jㅅ=jㄲ jㅈ+jㅇ=jㅋ jㅊ+jㄹ=jㄲ jㅊ+jㅂ=jㄻ jㅋ+jㅁ=jㄳ jㅌ+jㅇ=jㅀ ' +
  'jㅍ+jㄹ=jㅌ jㅍ+jㅅ=jㄻ jㅎ+jㄱ=jㅋ jㅎ+jㄴ=jㄶ jㅎ+jㄷ=jㅌ jㅎ+jㅂ=jㅍ' +
  '';

export const RULES: { a: Tok; b: Tok; r: Tok }[] = RULES_SRC.trim().split(/\s+/).map((s) => {
  const [ab, r] = s.split('=');
  const [a, b] = ab.split('+');
  return { a, b, r };
});
