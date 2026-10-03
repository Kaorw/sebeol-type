// 세모이 모아치기 엔진
// - 정방향: 한꺼번에 누른 키 묶음(코드) → 글자
// - 역방향: 글자 → 누를 키 묶음 (가장 적은 키, 손가락이 겹치지 않는 조합을 고름)
import { compose, decompose } from '../hangul/jamo';
import { RULES, SEMOE, SEMOE_PUNCT, SEMOE_SHIFT_PUNCT, Tok } from '../layout/semoe';
import type { Stroke, Role } from './reverse';
import { UntypeableError } from './reverse';

const CAT_ROLE: Record<string, Role> = { c: '초성', v: '중성', j: '종성' };

/** 규칙 찾기(차례 무관, 표 순서대로) */
function ruleFor(a: Tok, b: Tok, ordered: boolean): Tok | undefined {
  for (const r of RULES) {
    if (r.a === a && r.b === b) return r.r;
    if (!ordered && r.a === b && r.b === a) return r.r;
  }
  return undefined;
}

/** . 키의 가상 ㅗ 가 홀로 남으면 보통 ㅗ 로 들어간다 */
const plain = (t: Tok) => (t === 'v.' ? 'vㅗ' : t);

/**
 * 낱자 묶음 → 자리별로 모은 낱자
 * OHI 세모이 처리 차례를 따른다: 결합 규칙 표를 위에서부터 훑어 누른 낱자에서 짝을 찾아 합치고,
 * 남은 낱자는 뒤에 붙인 다음, 자리(초·중·종)별로 앞에서부터 이어 합친다.
 */
export function resolveTokens(toks: Tok[]): { c: Tok[]; v: Tok[]; j: Tok[]; bad: boolean } {
  const pressed = [...toks];
  const out: Tok[] = [];
  for (const r of RULES) {
    const i = pressed.indexOf(r.a);
    if (i < 0) continue;
    const rest = [...pressed.slice(0, i), ...pressed.slice(i + 1)];
    const k = rest.indexOf(r.b);
    if (k < 0) continue;
    rest.splice(k, 1);
    pressed.length = 0;
    pressed.push(...rest);
    out.push(r.r);
  }
  out.push(...pressed);
  const res = { c: [] as Tok[], v: [] as Tok[], j: [] as Tok[], bad: false };
  for (const t of out) {
    if (t === 'x') { res.bad = true; continue; }
    const list = res[t[0] as 'c' | 'v' | 'j'];
    const prev = list[list.length - 1];
    const comb = prev !== undefined ? ruleFor(prev, t, true) : undefined;
    if (comb && comb !== 'x') list[list.length - 1] = comb;
    else list.push(t);
  }
  res.v = res.v.map(plain);
  return res;
}

/** 키 묶음 → 들어갈 글 (한 글자가 안 되면 낱자를 늘어놓음) */
export function chordText(codes: string[], shift = false): string {
  if (shift) return codes.map((c) => SEMOE_SHIFT_PUNCT[c] ?? '').join('');
  const toks = codes.map((c) => SEMOE[c]).filter(Boolean);
  const punct = codes.map((c) => SEMOE_PUNCT[c]).filter(Boolean).join('');
  const space = codes.includes('Space') ? ' ' : '';
  if (!toks.length) return punct + space;
  const r = resolveTokens(toks);
  const one = (xs: Tok[]) => (xs.length === 1 ? xs[0].slice(1) : null);
  const [c, v, j] = [one(r.c), one(r.v), r.j.length ? one(r.j) : ''];
  if (!r.bad && c && v && j !== null) {
    try { return compose(c, v, j) + punct + space; } catch { /* 아래로 */ }
  }
  return [...r.c, ...r.v, ...r.j].map((t) => t.slice(1)).join('') + (r.bad ? '?' : '') + punct + space;
}

// ── 역방향 ────────────────────────────────────
const CAT_KEYS: Record<'c' | 'v' | 'j', string[]> = { c: [], v: [], j: [] };
for (const [code, t] of Object.entries(SEMOE)) CAT_KEYS[t[0] as 'c' | 'v' | 'j'].push(code);

// 손가락 겹침 판정용 열(표준 키보드 기준, . 은 공식 타자법대로 소지). 같은 손가락 두 키를 한꺼번에 누르기는 어렵다
const COL: Record<string, string> = {
  KeyQ: 'L5', KeyA: 'L5', KeyZ: 'L5', KeyW: 'L4', KeyS: 'L4', KeyX: 'L4', KeyE: 'L3', KeyD: 'L3', KeyC: 'L3',
  KeyR: 'L2', KeyF: 'L2', KeyV: 'L2', KeyT: 'L2', KeyG: 'L2', KeyB: 'L2',
  KeyY: 'R2', KeyH: 'R2', KeyN: 'R2', KeyU: 'R2', KeyJ: 'R2', KeyM: 'R2', KeyI: 'R3', KeyK: 'R3', Comma: 'R3',
  KeyO: 'R4', KeyL: 'R4', KeyP: 'R5', Period: 'R5', Semicolon: 'R5', Slash: 'R5',
};
const clash = (keys: string[]) => new Set(keys.map((k) => COL[k])).size < keys.length;

function subsets(keys: string[], max: number): string[][] {
  const out: string[][] = [];
  const rec = (start: number, cur: string[]) => {
    if (cur.length) out.push([...cur]);
    if (cur.length === max) return;
    for (let i = start; i < keys.length; i++) rec(i + 1, [...cur, keys[i]]);
  };
  rec(0, []);
  return out;
}

/** 자리별 낱자 → 가장 좋은 키 묶음 (적은 키 → 손가락 안 겹침 → 보조키(; .) 씀 → 배열 순서) */
const BEST: Record<string, string[]> = {};
/** 자리별 낱자 → 칠 수 있는 모든 키 묶음 (참고용) */
export const ALT: Record<string, string[][]> = {};
for (const cat of ['c', 'v', 'j'] as const) {
  const cand: Record<string, string[][]> = {};
  for (const keys of subsets(CAT_KEYS[cat], 3)) {
    const r = resolveTokens(keys.map((k) => SEMOE[k]));
    const list = r[cat];
    if (r.bad || list.length !== 1 || r.c.length + r.v.length + r.j.length !== 1) continue;
    (cand[list[0]] ??= []).push(keys);
  }
  for (const [tok, list] of Object.entries(cand)) {
    const cost = (k: string[]) => k.length * 100 + (clash(k) ? 50 : 0) + (k.length > 1 && k.some((x) => x === 'Period' || x === 'Semicolon') ? 0 : 1) + (k.length === 1 && (k[0] === 'Period') ? 2 : 0);
    list.sort((a, b) => cost(a) - cost(b));
    BEST[tok] = list[0];
    ALT[tok] = list;
  }
}

// OHI 방식으로는 되지만 세모이 타자연습(semoi-typing.pages.dev)이 받지 않는 3키 조합 등은 빼서
// 권하는 조합만 익히도록 한다. (2026-09 대조)
// 받침 ㅆ = ㅅ+ㅇ(Q+A)은 세모이 타자연습이 받지 않지만 공식 입력 방식 안내(blog.naver.com/eekdland/220239514856)에
// 더해치기합성으로 나와 있어 받아 준다. (2026-10 대조)
const REJECT_LIST: [Tok, string[]][] = [
  ['vㅞ', ['KeyR', 'KeyD', 'Period']], ['vㅞ', ['KeyR', 'KeyD', 'KeyV']], ['vㅞ', ['KeyR', 'KeyD', 'KeyB']],
  ['jㄻ', ['KeyQ', 'KeyW', 'KeyS']], ['jㅋ', ['Semicolon', 'KeyE', 'KeyA']],
  ['jㄳ', ['Semicolon', 'KeyE', 'KeyX']], ['jㅀ', ['KeyA', 'KeyS', 'KeyZ']], ['jㄾ', ['Semicolon', 'KeyA', 'KeyZ']],
];
const sig = (keys: string[]) => [...keys].sort().join('+');
const REJECT = new Set(REJECT_LIST.map(([t, k]) => `${t}:${sig(k)}`));
/** 자리별 낱자 → 받아 주는 키 묶음들 (정렬한 서명) */
const ACCEPT: Record<string, Set<string>> = {};
for (const [tok, list] of Object.entries(ALT)) {
  ACCEPT[tok] = new Set(list.map(sig).filter((k) => !REJECT.has(`${tok}:${k}`)));
}

export function chordFor(tok: Tok): string[] | undefined { return BEST[tok]; }

/** 권하는 조합 말고도 받아 주는 키 묶음들 (배열 안내용) */
export function otherChords(tok: Tok): string[][] {
  return (ALT[tok] ?? []).slice(1).filter((k) => !REJECT.has(`${tok}:${sig(k)}`));
}

/** 누른 키 묶음이 이 글자를 치는 올바른 모아치기인가 (권하는 조합이 아니어도 되는 조합이면 참) */
export function chordMatches(ch: string, codes: string[]): boolean {
  const syl = decompose(ch);
  if (!syl) return false;
  const by: Record<'c' | 'v' | 'j', string[]> = { c: [], v: [], j: [] };
  for (const c of codes) {
    const t = SEMOE[c];
    if (!t) return false;
    by[t[0] as 'c' | 'v' | 'j'].push(c);
  }
  const ok = (cat: 'c' | 'v' | 'j', jamo: string) => ACCEPT[cat + jamo]?.has(sig(by[cat])) ?? false;
  if (!ok('c', syl.cho) || !ok('v', syl.jung)) return false;
  return syl.jong ? ok('j', syl.jong) : by.j.length === 0;
}

/** 한 글자 → 한 타(키 묶음) */
export function semoeCharStrokes(ch: string): Stroke[] {
  if (ch === ' ') return [{ code: 'Space', jamo: ' ', role: '띄어쓰기' }];
  const pk = Object.entries(SEMOE_PUNCT).find(([, v]) => v === ch);
  if (pk) return [{ code: pk[0], jamo: ch, role: '문장부호' }];
  const sk = Object.entries(SEMOE_SHIFT_PUNCT).find(([, v]) => v === ch);
  if (sk) return [{ code: sk[0], jamo: ch, role: '문장부호', shift: true, note: '윗글쇠' }];
  const syl = decompose(ch);
  if (!syl) throw new UntypeableError(`한글 음절 아님: ${ch}`);
  const parts: { code: string; jamo: string; role: Role }[] = [];
  const add = (cat: 'c' | 'v' | 'j', jamo: string) => {
    const keys = BEST[cat + jamo];
    if (!keys) throw new UntypeableError(`${CAT_ROLE[cat]} ${jamo}`);
    for (const k of keys) {
      const t = SEMOE[k];
      parts.push({ code: k, jamo: t === 'v.' ? 'ㅗ' : t.slice(1), role: CAT_ROLE[cat] });
    }
  };
  add('c', syl.cho);
  add('v', syl.jung);
  if (syl.jong) add('j', syl.jong);
  return [{ code: parts[0].code, jamo: ch, role: '초성', chord: parts }];
}

export function semoeTypeable(ch: string): boolean {
  try { semoeCharStrokes(ch); return true; } catch { return false; }
}

/** 글 → 모든 키 (해금 판정용) */
export function semoeFlatCodes(text: string): string[] {
  return [...text].flatMap((ch) => semoeCharStrokes(ch).flatMap((s) => (s.chord ? s.chord.map((p) => p.code) : [s.shift ? `Shift+${s.code}` : s.code])));
}
