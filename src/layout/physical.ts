// 물리 배열: 키 위치·크기·손가락. 논리 자판(P2, 쿼티 …)과 독립.
// 단위 u = 키 1칸. finger: L5(왼새끼)…L1(왼엄지), R1(오른엄지)…R5(오른새끼)

export type Finger = 'L5' | 'L4' | 'L3' | 'L2' | 'L1' | 'R1' | 'R2' | 'R3' | 'R4' | 'R5';

export interface PhysKey { code: string; x: number; y: number; w: number; h: number; finger: Finger; home?: boolean; label?: string; rot?: number }
/** 연습에 쓰지 않는 자리(Esc, Tab, Fn …). 모양만 그린다 */
export interface StubKey { label: string; x: number; y: number; w: number; h?: number; round?: boolean; rot?: number }
export interface PhysLayout { id: string; name: string; keys: PhysKey[]; stubs?: StubKey[]; note?: string }

const ROWS = {
  num: ['Digit1','Digit2','Digit3','Digit4','Digit5','Digit6','Digit7','Digit8','Digit9','Digit0','Minus','Equal'],
  top: ['KeyQ','KeyW','KeyE','KeyR','KeyT','KeyY','KeyU','KeyI','KeyO','KeyP','BracketLeft','BracketRight'],
  home: ['KeyA','KeyS','KeyD','KeyF','KeyG','KeyH','KeyJ','KeyK','KeyL','Semicolon','Quote'],
  bottom: ['KeyZ','KeyX','KeyC','KeyV','KeyB','KeyN','KeyM','Comma','Period','Slash'],
};
// 열(0부터) → 손가락. 숫자 줄도 같은 열 규칙 (1=왼새끼 … 0=오른새끼)
const COL_FINGER: Finger[] = ['L5','L4','L3','L2','L2','R2','R2','R3','R4','R5','R5','R5'];
const HOME_KEYS = new Set(['KeyA','KeyS','KeyD','KeyF','KeyJ','KeyK','KeyL','Semicolon']);

function key(code: string, x: number, y: number, w: number, finger: Finger, label?: string): PhysKey {
  return { code, x, y, w, h: 1, finger, home: HOME_KEYS.has(code), ...(label ? { label } : {}) };
}

/** 일반(행 엇갈림) 배열: 104키 기준 글자 영역 */
function ansi(): PhysKey[] {
  const out: PhysKey[] = [key('Backquote', 0, 0, 1, 'L5')];
  ROWS.num.forEach((c, i) => out.push(key(c, 1 + i, 0, 1, COL_FINGER[i])));
  ROWS.top.forEach((c, i) => out.push(key(c, 1.5 + i, 1, 1, COL_FINGER[i])));
  ROWS.home.forEach((c, i) => out.push(key(c, 1.75 + i, 2, 1, COL_FINGER[i])));
  ROWS.bottom.forEach((c, i) => out.push(key(c, 2.25 + i, 3, 1, COL_FINGER[i])));
  out.push(key('ShiftLeft', 0, 3, 2.25, 'L5', 'Shift'), key('ShiftRight', 12.25, 3, 2.75, 'R5', 'Shift'));
  out.push(key('Space', 3.75, 4, 6.25, 'R1'));
  return out;
}

/** 오쏘리니어(격자) 배열. splitGap > 0 이면 가운데를 벌린 스플릿 */
function grid(splitGap: number): PhysKey[] {
  const out: PhysKey[] = [];
  const x0 = 1; // 맨 왼쪽 열은 Shift 자리
  const gx = (i: number) => x0 + i + (splitGap && i >= 5 ? splitGap : 0);
  ROWS.num.slice(0, 10).forEach((c, i) => out.push(key(c, gx(i), 0, 1, COL_FINGER[i])));
  ROWS.top.slice(0, 11).forEach((c, i) => out.push(key(c, gx(i), 1, 1, COL_FINGER[i])));
  ROWS.home.forEach((c, i) => out.push(key(c, gx(i), 2, 1, COL_FINGER[i])));
  ROWS.bottom.forEach((c, i) => out.push(key(c, gx(i), 3, 1, COL_FINGER[i])));
  out.push(key('ShiftLeft', 0, 3, 1, 'L5', 'Shift'), key('ShiftRight', gx(10), 3, 1, 'R5', 'Shift'));
  if (splitGap) {
    out.push(key('Space', x0 + 3, 4, 2, 'L1'), key('Space', gx(5), 4, 2, 'R1'));
  } else {
    out.push(key('Space', x0 + 3, 4, 4, 'R1'));
  }
  return out;
}

const ANSI_STUBS: StubKey[] = [
  { label: 'Backspace', x: 13, y: 0, w: 2 },
  { label: 'Tab', x: 0, y: 1, w: 1.5 }, { label: '\\', x: 13.5, y: 1, w: 1.5 },
  { label: 'Caps', x: 0, y: 2, w: 1.75 }, { label: 'Enter', x: 12.75, y: 2, w: 2.25 },
  { label: 'Ctrl', x: 0, y: 4, w: 1.5 }, { label: 'Alt', x: 1.5, y: 4, w: 1.5 },
  { label: 'Alt', x: 10, y: 4, w: 1.5 }, { label: 'Ctrl', x: 13.5, y: 4, w: 1.5 },
];

/**
 * Ergo: 사진으로 본 열 엇갈림(column stagger) 스플릿 키보드의 글자 영역
 * - 왼쪽 6열 × 3줄 + 안쪽 Fn2, 오른쪽 바깥 B키 + 6열 × 3줄
 * - 맨 아랫줄(Ctrl·Opt·엄지 키·노브, ←·M1~M3·트랙볼)은 그리지 않고, 스플릿 배열처럼 양쪽에 작은 스페이스바를 둔다
 * - 열마다 높이가 다르다: 가운데손가락 열(E, I)이 가장 높고 새끼손가락 열이 가장 낮다
 * - 모델 정보 없이 사진만 보고 옮겼으므로 키 크기는 어림값이다
 * - 오른쪽에 ' / 키와 오른쪽 Shift가 없다(다른 층에 있을 것으로 봄)
 */
function ergo(): { keys: PhysKey[]; stubs: StubKey[] } {
  const keys: PhysKey[] = [];
  const stubs: StubKey[] = [];
  // 왼쪽: 열별 세로 어긋남(u)과 손가락
  const LST = [0.37, 0.37, 0.15, 0, 0.15, 0.26];
  const LF: Finger[] = ['L5', 'L5', 'L4', 'L3', 'L2', 'L2'];
  const LROWS: (string | null)[][] = [
    [null, 'KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT'],
    [null, 'KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG'],
    ['ShiftLeft', 'KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB'],
  ];
  const LSTUB: Record<string, string> = { '0,0': 'Esc', '0,1': 'Tab' };
  for (let c = 0; c < 6; c++) {
    for (let r = 0; r < 3; r++) {
      const y = r + LST[c];
      const code = LROWS[r][c];
      if (code) keys.push(key(code, c, y, 1, LF[c], code === 'ShiftLeft' ? 'Shift' : undefined));
      else if (`${c},${r}` in LSTUB) stubs.push({ label: LSTUB[`${c},${r}`], x: c, y, w: 1 });
    }
  }
  stubs.push({ label: 'Fn2', x: 6, y: 2.35, w: 1 });
  keys.push(key('Space', 3, 3.55, 2, 'L1')); // 작은 스페이스바 (스플릿 배열처럼 양쪽에 하나씩)

  // 오른쪽
  const X0 = 8.4;
  const RST = [0.37, 0.37, 0.11, 0, 0.15, 0.37, 0.37];
  const RF: Finger[] = ['R2', 'R2', 'R2', 'R3', 'R4', 'R5', 'R5'];
  const RROWS: (string | null)[][] = [
    [null, 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP', 'Minus'],
    [null, 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon', null],
    ['KeyB', 'KeyN', 'KeyM', 'Comma', 'Period', null, null],
  ];
  const RSTUB: Record<string, string> = { '6,1': 'Enter', '5,2': '(', '6,2': ')' };
  for (let c = 0; c < 7; c++) {
    for (let r = 0; r < 3; r++) {
      const y = r + RST[c];
      const code = RROWS[r][c];
      if (code) keys.push(key(code, X0 + c, y, 1, RF[c]));
      else if (`${c},${r}` in RSTUB) stubs.push({ label: RSTUB[`${c},${r}`], x: X0 + c, y, w: 1 });
    }
  }
  keys.push(key('Space', X0 + 2, 3.55, 2, 'R1'));
  return { keys, stubs };
}
const ERGO_KEYS = ergo();

export const ANSI: PhysLayout = { id: 'ansi', name: '일반', keys: ansi(), stubs: ANSI_STUBS };
export const ORTHO: PhysLayout = { id: 'ortho', name: '오쏘리니어', keys: grid(0) };
export const SPLIT: PhysLayout = { id: 'split', name: '스플릿', keys: grid(2) };
export const ERGO: PhysLayout = {
  id: 'ergo', name: 'Ergo', keys: ERGO_KEYS.keys, stubs: ERGO_KEYS.stubs,
};

export const PHYS_LAYOUTS = [ANSI, ORTHO, SPLIT, ERGO];

/** 예전 이름 → 지금 이름 (저장된 설정 옮기기) */
export const LAYOUT_ALIAS: Record<string, string> = { 'split-tb': 'ergo' };

export function fingerOf(layout: PhysLayout, code: string): Finger | undefined {
  return layout.keys.find((k) => k.code === code)?.finger;
}

/** 윗글쇠를 누를 손: 글쇠와 반대쪽 새끼손가락 */
export function shiftFor(layout: PhysLayout, code: string): 'ShiftLeft' | 'ShiftRight' {
  const want = fingerOf(layout, code)?.startsWith('R') ? 'ShiftLeft' : 'ShiftRight';
  // 한쪽 Shift만 있는 키보드는 있는 쪽을 쓴다
  if (!layout.keys.some((k) => k.code === want)) return want === 'ShiftLeft' ? 'ShiftRight' : 'ShiftLeft';
  return want;
}

/** 손가락 짧은 이름 (키 위 표시용) */
export const FINGER_SHORT: Record<Finger, string> = {
  L5: '왼새끼', L4: '왼약지', L3: '왼중지', L2: '왼검지', L1: '왼엄지',
  R1: '오른엄지', R2: '오른검지', R3: '오른중지', R4: '오른약지', R5: '오른새끼',
};

export const FINGER_NAME: Record<Finger, string> = {
  L5: '왼손 새끼', L4: '왼손 약지', L3: '왼손 중지', L2: '왼손 검지', L1: '왼손 엄지',
  R1: '오른손 엄지', R2: '오른손 검지', R3: '오른손 중지', R4: '오른손 약지', R5: '오른손 새끼',
};
