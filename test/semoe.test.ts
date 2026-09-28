import { describe, expect, it } from 'vitest';
import vocab from '../data/vocab.json';
import { TEXTS } from '../src/app/texts';
import { chordText, chordMatches, semoeCharStrokes, semoeTypeable } from '../src/engine/semoe';
import { Lesson } from '../src/app/session';
import { SCHEMES } from '../src/scheme';
import { PHYS_LAYOUTS, ERGO, shiftFor } from '../src/layout/physical';

const keysOf = (ch: string) => semoeCharStrokes(ch)[0].chord!.map((p) => p.code);
const label = (codes: string[]) => codes.map((c) => c.replace(/^Key/, '').replace('Semicolon', ';').replace('Period', '.')).join('+');

describe('세모이 모아치기 엔진', () => {
  it('기본 음절: 초성·중성·종성 키를 한꺼번에', () => {
    expect(label(keysOf('가'))).toBe('K+F');
    expect(label(keysOf('한'))).toBe('H+F+S');
    expect(label(keysOf('없'))).toBe('J+R+Q+W');
  });

  it('보조키: ; 는 받침 ㅆ·거센 받침, . 는 겹홀소리 ㅗ', () => {
    expect(label(keysOf('있'))).toBe('J+D+;');
    expect(label(keysOf('닭'))).toBe('I+F+E+X');
    expect(label(keysOf('좋'))).toBe('L+V+;+S'); // ㅎ 받침 = ㄴ + ;
    expect(label(keysOf('과'))).toBe('K+.+F');
    expect(label(keysOf('워'))).toBe('J+.+R');
    expect(label(keysOf('요'))).toBe('J+.+V');
  });

  it('된소리·거센소리 첫소리: ㅇ 또는 ㅎ 과 모아서', () => {
    expect(label(keysOf('까'))).toBe('J+K+F');
    expect(label(keysOf('타'))).toBe('I+H+F');
    expect(label(keysOf('차'))).toBe('H+L+F');
  });

  it('권하는 조합 말고도 되는 조합을 받아 준다', () => {
    expect(chordMatches('과', ['KeyK', 'KeyV', 'KeyF'])).toBe(true); // ㅗ+ㅏ
    expect(chordMatches('뭐', ['KeyY', 'KeyB', 'KeyR'])).toBe(true); // ㅜ+ㅓ
    expect(chordMatches('가', ['KeyK', 'KeyD'])).toBe(false);
    expect(chordMatches('가', ['KeyK', 'KeyF', 'KeyX'])).toBe(false); // 받침이 더 있음
    expect(chordMatches('웨', ['KeyJ', 'KeyR', 'KeyD', 'KeyB'])).toBe(false); // 세모이 타자연습이 받지 않는 3키 ㅞ
  });

  it('키 차례와 상관없이 같은 글자', () => {
    expect(chordText(['KeyF', 'KeyK'])).toBe('가');
    expect(chordText(['KeyS', 'KeyF', 'KeyH'])).toBe('한');
    expect(chordText(['Semicolon', 'KeyD', 'KeyJ'])).toBe('있');
  });

  it('모든 낱말과 글감을 칠 수 있고, 권하는 키로 치면 그 글자가 된다', () => {
    const chars = new Set<string>();
    for (const w of [...(vocab as string[]), ...TEXTS.map((t) => t.text)]) for (const ch of w) if (/[가-힣]/.test(ch)) chars.add(ch);
    const bad = [...chars].filter((ch) => !semoeTypeable(ch) || chordText(keysOf(ch)) !== ch || !chordMatches(ch, keysOf(ch)));
    expect(bad).toEqual([]);
  });

  it('모든 글감의 문장부호를 칠 수 있다', () => {
    const bad = TEXTS.map((t) => t.text).filter((t) => ![...t].every((ch) => semoeTypeable(ch)));
    expect(bad).toEqual([]);
  });
});

describe('모아치기 연습 판정', () => {
  const sc = SCHEMES.semoe;
  it('글자 하나 = 한 타, 틀리면 오타', () => {
    const l = new Lesson('가나', sc);
    expect(l.pressChord(['KeyK', 'KeyD'], 0)!.ok).toBe(false);
    expect(l.pressChord(['KeyF', 'KeyK'], 100)!.ok).toBe(true);
    expect(l.pressChord(['KeyU', 'KeyF'], 300)!.ok).toBe(true);
    expect(l.done).toBe(true);
    expect(l.accuracy).toBeCloseTo(2 / 3);
    expect(l.units).toBe(4); // 낱자 키 4개
  });
  it('스페이스를 함께 누르면 띄어쓰기까지', () => {
    const l = new Lesson('가 나', sc);
    const r = l.pressChord(['KeyK', 'KeyF', 'Space'], 0)!;
    expect(r.ok).toBe(true);
    expect(r.advanced).toBe(2);
    expect(l.current!.ch).toBe('나');
  });
  it('문장부호는 따로 한 타', () => {
    const l = new Lesson('가.', sc);
    l.pressChord(['KeyK', 'KeyF'], 0);
    expect(l.pressChord(['KeyP'], 100)!.ok).toBe(true);
  });
});

describe('Ergo 배열', () => {
  it('목록에 있다', () => { expect(PHYS_LAYOUTS.map((l) => l.id)).toContain('ergo'); });
  it('세모이 한글 키를 모두 담고 있다', () => {
    const have = new Set(ERGO.keys.map((k) => k.code));
    const keys = sc3().filter((c) => !have.has(c));
    expect(keys).toEqual([]);
  });
  it('손가락 배정: 열 엇갈림 표준', () => {
    const f = (c: string) => ERGO.keys.find((k) => k.code === c)!.finger;
    expect([f('KeyQ'), f('KeyW'), f('KeyE'), f('KeyR'), f('KeyT')]).toEqual(['L5', 'L4', 'L3', 'L2', 'L2']);
    expect([f('KeyY'), f('KeyU'), f('KeyI'), f('KeyO'), f('KeyP')]).toEqual(['R2', 'R2', 'R3', 'R4', 'R5']);
    expect([f('Semicolon'), f('Period'), f('Comma')]).toEqual(['R5', 'R4', 'R3']);
    expect(ERGO.keys.filter((k) => k.code === 'KeyB').map((k) => k.finger)).toEqual(['L2', 'R2']); // B 키가 양쪽에
  });
  it('맨 아랫줄(스페이스·엄지 키·트랙볼·노브)이 없다', () => {
    expect(ERGO.keys.some((k) => k.code === 'Space')).toBe(false);
    expect(ERGO.stubs!.map((s) => s.label)).toEqual(expect.not.arrayContaining(['트랙볼', '노브', 'Ctrl', 'M1', '←']));
    expect(Math.max(...ERGO.keys.map((k) => k.y + k.h))).toBeLessThan(3.5);
  });
  it('오른쪽 Shift가 없으면 왼쪽 Shift를 쓴다', () => {
    expect(shiftFor(ERGO, 'Slash')).toBe('ShiftLeft');
    expect(shiftFor(ERGO, 'KeyQ')).toBe('ShiftLeft');
  });
});

function sc3(): string[] { return SCHEMES.semoe.stages[2].keys; }
