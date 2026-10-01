// 자판(논리 배열) 묶음: 신세벌식 P2(이어치기) / 세모이(모아치기)
// 화면·출제·통계는 지금 고른 자판(SCHEME)만 본다. 자판을 바꾸면 페이지를 다시 읽는다.
import { P2, PUNCT, SHIFT_PUNCT } from './layout/p2';
import { SEMOE, SEMOE_PUNCT, SEMOE_SHIFT_PUNCT, SEMOE_SUB } from './layout/semoe';
import { charStrokes as p2Strokes, flatCodes as p2Flat, typeable as p2Typeable, Stroke } from './engine/reverse';
import { typeCodes } from './engine/automaton';
import { semoeCharStrokes, semoeFlatCodes, semoeTypeable, chordText } from './engine/semoe';

export type SchemeId = 'p2' | 'semoe';

/** 키 위에 적는 낱자. side: R=초성색, L=받침색(보조 중성색), V=중성색, J=받침색, P=기호 */
export interface Glyph { main: string; sub: string; side: 'R' | 'L' | 'V' | 'J' | 'P' | '' }

export interface Scheme {
  id: SchemeId;
  name: string;
  brandSub: string;
  /** 모아치기: 한 글자의 키를 한꺼번에 눌렀다 뗀다 */
  chord: boolean;
  /** 기록 저장 이름 (자판마다 따로) */
  store: string;
  stages: { name: string; keys: string[] }[];
  punct: Record<string, string>;
  shiftPunct: Record<string, string>;
  isHangulKey(code: string): boolean;
  charStrokes(ch: string): Stroke[];
  flatCodes(text: string): string[];
  typeable(ch: string): boolean;
  glyph(code: string): Glyph;
  chip(code: string): string;
  role(code: string): string;
  /** 치는 중인 글자 미리 보기 (이어치기: 이미 친 타, 모아치기: 누르고 있는 키) */
  preview(codes: string[]): string;
  legend: [string, string, string][]; // [색 클래스, 낱자, 설명]
  credit: string; // 배열 출처 (HTML)
}

// ── 신세벌식 P2 ───────────────────────────────
const P2_HOME = ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon', 'Quote'];
const P2_TOP = ['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP'];
const P2_BOTTOM = ['KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM', 'Slash'];

const p2: Scheme = {
  id: 'p2',
  name: '신세벌식 P2',
  brandSub: '신세벌식 P2 · 기본 배열',
  chord: false,
  store: 'sinsebeol-p2.v1',
  stages: [
    { name: '기준 자리', keys: P2_HOME },
    { name: '+ 윗줄', keys: [...P2_HOME, ...P2_TOP] },
    { name: '+ 아랫줄', keys: [...P2_HOME, ...P2_TOP, ...P2_BOTTOM] },
  ],
  punct: PUNCT,
  shiftPunct: SHIFT_PUNCT,
  isHangulKey: (code) => !!P2[code],
  charStrokes: p2Strokes,
  flatCodes: p2Flat,
  typeable: p2Typeable,
  glyph(code) {
    if (PUNCT[code]) return { main: PUNCT[code], sub: '', side: 'P' };
    const k = P2[code];
    if (!k) return { main: '', sub: '', side: '' };
    if (k.side === 'R') return { main: k.cho, sub: k.rightVowel ? `(${k.rightVowel})` : '', side: 'R' };
    return { main: k.jong, sub: k.vowel ?? '', side: 'L' };
  },
  chip(code) {
    const k = P2[code];
    if (!k) return '';
    return k.side === 'R' ? k.cho : (k.vowel ?? k.jong);
  },
  role(code) {
    const k = P2[code];
    if (!k) return '';
    return k.side === 'R' ? `초성 ${k.cho}${k.rightVowel ? ` · (${k.rightVowel})` : ''}` : `받침 ${k.jong}${k.vowel ? ` · 중성 ${k.vowel}` : ''}`;
  },
  preview: (codes) => typeCodes(codes),
  legend: [
    ['c-cho', 'ㄱ', '초성 (오른손)'],
    ['c-jung', 'ㅏ', '중성 — 초성 뒤 갈마들이'],
    ['c-jong', 'ㄴ', '종성 (왼손)'],
  ],
  credit: '배열: <a href="https://pat.im/1136" target="_blank" rel="noopener">신세벌식 P2</a> (팥알)',
};

// ── 세모이 ─────────────────────────────────────
// ; (받침 ㅆ)은 홈 행에 있지만 홈 행 키만으로 칠 수 있는 낱말이 없어(있다·했다 모두 윗줄 ㄷ이 필요) 윗줄 단계에서 연다
const S_HOME = ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL'];
const S_TOP = ['Semicolon', 'KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO'];
const S_BOTTOM = ['KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM', 'Period'];

const semoe: Scheme = {
  id: 'semoe',
  name: '세모이',
  brandSub: '세모이(세벌식 모아치기 e) · 모아치기',
  chord: true,
  store: 'semoe.v1',
  stages: [
    { name: '기준 자리', keys: S_HOME },
    { name: '+ 윗줄', keys: [...S_HOME, ...S_TOP] },
    { name: '+ 아랫줄', keys: [...S_HOME, ...S_TOP, ...S_BOTTOM] },
  ],
  punct: SEMOE_PUNCT,
  shiftPunct: SEMOE_SHIFT_PUNCT,
  isHangulKey: (code) => !!SEMOE[code],
  charStrokes: semoeCharStrokes,
  flatCodes: semoeFlatCodes,
  typeable: semoeTypeable,
  glyph(code) {
    if (SEMOE_PUNCT[code]) return { main: SEMOE_PUNCT[code], sub: '', side: 'P' };
    const t = SEMOE[code];
    if (!t) return { main: '', sub: '', side: '' };
    if (t === 'v.') return { main: 'ㅗ', sub: '겹', side: 'V' };
    const main = t.slice(1);
    const sub = SEMOE_SUB[code] ?? '';
    if (t[0] === 'c') return { main, sub, side: 'R' };
    if (t[0] === 'v') return { main, sub, side: 'V' };
    return { main, sub, side: 'J' };
  },
  chip(code) {
    const t = SEMOE[code];
    return t ? (t === 'v.' ? 'ㅗ' : t.slice(1)) : '';
  },
  role(code) {
    const t = SEMOE[code];
    if (!t) return '';
    if (t === 'v.') return '겹홀소리용 ㅗ';
    const name = t[0] === 'c' ? '초성' : t[0] === 'v' ? '중성' : '받침';
    return `${name} ${t.slice(1)}${SEMOE_SUB[code] ? ` · 모아서 ${SEMOE_SUB[code]}` : ''}`;
  },
  preview: (codes) => chordText(codes),
  legend: [
    ['c-cho', 'ㄱ', '초성 (오른손)'],
    ['c-jung', 'ㅏ', '중성 (왼손, . 은 겹홀소리용 ㅗ)'],
    ['c-jong', 'ㄴ', '받침 (왼손, ; 은 ㅆ)'],
  ],
  credit: '배열: <a href="https://github.com/Sinseiki/Semo-e_keyboard" target="_blank" rel="noopener">세모이</a> (신세기, CC BY-SA 4.0)',
};

export const SCHEMES: Record<SchemeId, Scheme> = { p2, semoe };

const KEY = 'sebeol-type.scheme';
function initial(): SchemeId {
  try {
    // ?scheme=semoe 또는 #semoe (주소 뒤 # 만 전해지는 곳에서도 쓰도록)
    const h = location.hash.slice(1);
    const q = new URLSearchParams(location.search).get('scheme') ?? (h === 'p2' || h === 'semoe' ? h : null);
    if (q === 'p2' || q === 'semoe') { localStorage.setItem(KEY, q); return q; }
    return localStorage.getItem(KEY) === 'semoe' ? 'semoe' : 'p2';
  } catch { return 'p2'; }
}

/** 지금 쓰는 자판 */
export const SCHEME: Scheme = SCHEMES[initial()];

export function switchScheme(id: SchemeId): void {
  try { localStorage.setItem(KEY, id); } catch { /* 무시 */ }
  const url = new URL(location.href);
  url.searchParams.delete('scheme');
  url.hash = '';
  location.replace(url.toString());
}
