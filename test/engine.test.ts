import { describe, expect, it } from 'vitest';
import { typeCodes, P2Automaton } from '../src/engine/automaton';
import { flatCodes, charStrokes } from '../src/engine/reverse';
import { keyLabel } from '../src/layout/p2';

const keys = (s: string) =>
  s.split(' ').map((k) => ({ ';': 'Semicolon', "'": 'Quote', '/': 'Slash', '_': 'Space' } as Record<string, string>)[k] ?? `Key${k}`);

describe('정방향 (키 → 글자)', () => {
  it('기본 음절', () => {
    expect(typeCodes(keys('; F'))).toBe('바');
    expect(typeCodes(keys('K F ; F A'))).toBe('가방');
    expect(typeCodes(keys('J F K D'))).toBe('아기');
  });
  it('겹홀소리는 오른쪽 홀소리 + 왼쪽 홀소리', () => {
    expect(typeCodes(keys('K / F'))).toBe('과');
    expect(typeCodes(keys('J O R'))).toBe('워');
    expect(typeCodes(keys('J I D'))).toBe('의');
    expect(typeCodes(keys('J / D'))).toBe('외');
  });
  it('왼쪽 ㅗ 뒤의 왼손 키는 받침 (곺)', () => {
    expect(typeCodes(keys('K V F'))).toBe('곺');
  });
  it('오른쪽 홀소리 뒤 ㅛ 자리는 받침 ㅆ', () => {
    expect(typeCodes(keys('J / X'))).toBe('옸');
  });
  it('초성체 ㅋㅋ 자리는 코 (갈마들이)', () => {
    expect(typeCodes(keys('/ /'))).toBe('코');
  });
  it('된소리 첫소리는 같은 글쇠 거듭치기', () => {
    expect(typeCodes(keys('K K F'))).toBe('까');
    expect(typeCodes(keys('N N F X'))).toBe('쌌');
  });
  it('겹받침', () => {
    expect(typeCodes(keys('J F W C'))).toBe('앍');
    expect(typeCodes(keys('J F S D'))).toBe('않');
    expect(typeCodes(keys('J R E Q'))).toBe('없');
    expect(typeCodes(keys('; F C C'))).toBe('밖');
  });
  it('띄어쓰기', () => {
    expect(typeCodes(keys('H F _ ; F'))).toBe('나 바');
  });
});

// pat.im 온라인 한글 입력기(ohi.pat.im/?ko=sin3-p2)에 같은 키를 쳐서 얻은 결과와 대조 (2026-09-28)
const toCodes = (s: string) =>
  [...s].map((c) => ({ ';': 'Semicolon', "'": 'Quote', '/': 'Slash', ' ': 'Space', ',': 'Comma', '.': 'Period' } as Record<string, string>)[c] ?? `Key${c.toUpperCase()}`);
describe('OHI 대조', () => {
  const cases: [string, string][] = [
    ['k/f jor jid j/d kvf j/x kkf nnfx jfwc jrqe ;fcc hf ;f', '과 워 의 외 곺 옸 까 쌌 앍 엇ㅂ 밖 나 바'],
    ['jreq jfsd uubwd nod k/es ofsd jisd jwe ;owq jb jvm jxc', '없 않 뚫 쉬 괜 찮 읂 얍 붌 우 오ㅎ 욕'],
  ];
  for (const [input, expected] of cases) it(input, () => expect(typeCodes(toCodes(input))).toBe(expected));
});

describe('역방향 (글자 → 키)', () => {
  it('바 = ; F', () => {
    expect(charStrokes('바').map((s) => keyLabel(s.code))).toEqual([';', 'F']);
  });
  it('과 = K / F', () => {
    expect(charStrokes('과').map((s) => keyLabel(s.code))).toEqual(['K', '/', 'F']);
  });
  it('없 = J R E Q', () => {
    expect(charStrokes('없').map((s) => keyLabel(s.code))).toEqual(['J', 'R', 'E', 'Q']);
  });
  it('왕복: 문장', () => {
    const t = '괜찮아요 의외로 쉬워 뚫었다 닭 값 읽고 있습니다';
    expect(typeCodes(flatCodes(t))).toBe(t);
  });
});

import { TEXTS } from '../src/app/texts';
import { makeLesson, pool, STAGES } from '../src/app/curriculum';
describe('짧은 글 글감', () => {
  it('모든 글감이 기본 배열로 왕복된다 (쉼표·마침표 포함)', () => {
    const bad = TEXTS.filter(({ text }) => typeCodes(flatCodes(text)) !== text).map((t) => t.text);
    expect(bad).toEqual([]);
  });
  it('쉼표·마침표 키', () => {
    expect(charStrokes('.').map((s) => s.code)).toEqual(['Period']);
    expect(typeCodes(toCodes('kf, hf.'))).toBe('가, 나.');
  });
});
describe('낱말 다양화', () => {
  it('한 차례 안에 중복 없음, 여러 차례에 걸쳐 1단계 낱말을 고르게 돈다', () => {
    const words = pool(STAGES[0]).filter((w) => w.rank < 0.08); // 학습용 어휘(기본) 부분만
    const seen: Record<string, number> = {};
    const counts = new Map<string, number>();
    for (let lesson = 0; lesson < 20; lesson++) {
      const ws = makeLesson(words, 'Semicolon', seen);
      expect(new Set(ws).size).toBe(ws.length);
      ws.forEach((w) => { seen[w] = lesson; counts.set(w, (counts.get(w) ?? 0) + 1); });
    }
    // 20차례 × 14 = 280번 → 91개 낱말이 모두 한 번 이상 나와야 함
    expect(counts.size).toBe(words.length);
  });
  it('빈도 어휘가 섞여도 자주 쓰는 낱말이 먼저 나온다', () => {
    const words = pool(STAGES[0]);
    const seen: Record<string, number> = {};
    const ranks: number[] = [];
    for (let lesson = 0; lesson < 5; lesson++) {
      const ws = makeLesson(words, null, seen);
      ws.forEach((w) => { seen[w] = lesson; ranks.push(words.find((x) => x.word === w)!.rank); });
    }
    expect(new Set(Object.keys(seen)).size).toBe(70); // 5차례 동안 겹치지 않음
    const median = [...ranks].sort((a, b) => a - b)[35];
    expect(median).toBeLessThan(0.3);
  });
});

describe('숫자·윗글쇠 문장부호 (OHI 대조: kf? hf! jf: kf, hf. 12 → 가? 나! 아: 가, 나. 12)', () => {
  it('정방향', () => {
    const P = new P2Automaton();
    ['KeyK','KeyF','Shift+Slash','Space','KeyH','KeyF','Shift+Digit1','Space','KeyJ','KeyF','Shift+Semicolon','Space',
     'KeyK','KeyF','Comma','Space','KeyH','KeyF','Period','Space','Digit1','Digit2'].forEach((c) => P.press(c));
    expect(P.text).toBe('가? 나! 아: 가, 나. 12');
  });
  it('역방향: ? 는 윗글쇠 + /', () => {
    expect(charStrokes('?')).toEqual([{ code: 'Slash', jamo: '?', role: '문장부호', shift: true, note: '윗글쇠' }]);
  });
  it('왕복', () => {
    const t = '정말? 그래! 오늘 3시: 좋아요.';
    expect(typeCodes(flatCodes(t))).toBe(t);
  });
});

import { normalize } from '../src/app/mytexts';
describe('내 글감 정리', () => {
  it('칠 수 없는 글자를 빼고 한 줄씩 나눈다', () => {
    const r = normalize('“안녕하세요,” 그가 말했다.\n\nABC 테스트… 좋아요! OK?\nㅋㅋ\n');
    expect(r.lines).toEqual(['안녕하세요, 그가 말했다.', '테스트... 좋아요!']);
    expect(r.removed).toEqual(expect.arrayContaining(['A', 'B', 'C']));
    for (const l of r.lines) expect(typeCodes(flatCodes(l))).toBe(l);
  });
});
