// 물리 배열: 키 위치·크기·손가락. 논리 자판(P2, 쿼티 …)과 독립.
// 단위 u = 키 1칸. finger: L5(왼새끼)…L1(왼엄지), R1(오른엄지)…R5(오른새끼)

export type Finger = 'L5' | 'L4' | 'L3' | 'L2' | 'L1' | 'R1' | 'R2' | 'R3' | 'R4' | 'R5';

export interface PhysKey { code: string; x: number; y: number; w: number; h: number; finger: Finger; home?: boolean; label?: string }
export interface PhysLayout { id: string; name: string; keys: PhysKey[] }

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

export const ANSI: PhysLayout = { id: 'ansi', name: '일반', keys: ansi() };
export const ORTHO: PhysLayout = { id: 'ortho', name: '오쏘리니어', keys: grid(0) };
export const SPLIT: PhysLayout = { id: 'split', name: '스플릿', keys: grid(2) };

export const PHYS_LAYOUTS = [ANSI, ORTHO, SPLIT];

export function fingerOf(layout: PhysLayout, code: string): Finger | undefined {
  return layout.keys.find((k) => k.code === code)?.finger;
}

/** 윗글쇠를 누를 손: 글쇠와 반대쪽 새끼손가락 */
export function shiftFor(layout: PhysLayout, code: string): 'ShiftLeft' | 'ShiftRight' {
  return fingerOf(layout, code)?.startsWith('R') ? 'ShiftLeft' : 'ShiftRight';
}

export const FINGER_NAME: Record<Finger, string> = {
  L5: '왼손 새끼', L4: '왼손 약지', L3: '왼손 중지', L2: '왼손 검지', L1: '왼손 엄지',
  R1: '오른손 엄지', R2: '오른손 검지', R3: '오른손 중지', R4: '오른손 약지', R5: '오른손 새끼',
};
