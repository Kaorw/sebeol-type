import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { flatCodes } from '../src/engine/reverse';
import { typeCodes } from '../src/engine/automaton';

const vocab: string[] = JSON.parse(readFileSync('data/vocab.json', 'utf8'));

describe('어휘 전체 왕복', () => {
  it(`${vocab.length}개 낱말: 글자 → 키 → 글자`, () => {
    const bad = vocab.filter((w) => typeCodes(flatCodes(w)) !== w);
    expect(bad).toEqual([]);
  });
  it('낱말을 띄어쓰기로 이어 친 긴 글도 왕복', () => {
    const text = vocab.slice(0, 500).join(' ');
    expect(typeCodes(flatCodes(text))).toBe(text);
  });
});
