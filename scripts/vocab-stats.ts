// 어휘 정제 + 해금 단계별 사용 가능 낱말 집계
import { readFileSync, writeFileSync } from 'node:fs';
import { flatCodes, UntypeableError } from '../src/engine/reverse';
import { typeCodes } from '../src/engine/automaton';
import { keyLabel } from '../src/layout/p2';

// 1) 정제
const raw = readFileSync('data/vocab-raw.txt', 'utf8').split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
const words = new Set<string>();
for (const line of raw) {
  const m = line.match(/^(.+?)\((.+)\)$/); // 도쿄(동경) → 도쿄, 동경
  const parts = m ? [m[1], m[2]] : [line];
  for (const p of parts) if (/^[가-힣]+$/.test(p)) words.add(p);
}
const vocab = [...words];

// 2) 왕복 검사 + 키 순서
const entries: { word: string; codes: string[] }[] = [];
const failures: string[] = [];
for (const w of vocab) {
  try {
    const codes = flatCodes(w);
    if (typeCodes(codes) !== w) failures.push(`${w} → ${typeCodes(codes)}`);
    entries.push({ word: w, codes });
  } catch (e) {
    if (e instanceof UntypeableError) failures.push(`${w}: ${e.message}`);
    else throw e;
  }
}

// 3) 단계별 집계
const HOME = ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon'];
const TOP = ['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP'];
const BOTTOM = ['KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM', 'Slash'];
const typeable = (open: Set<string>) => entries.filter((e) => e.codes.every((c) => open.has(c)));

const stages: [string, string[]][] = [
  ['1. 기준 자리(홈 행 10키)', HOME],
  ['1+. 홈 행 + \' (ㅌ)', [...HOME, 'Quote']],
  ['2. + 윗줄', [...HOME, 'Quote', ...TOP]],
  ['3. + 아랫줄 (전체)', [...HOME, 'Quote', ...TOP, ...BOTTOM]],
];
const lines: string[] = [];
lines.push(`정제 후 낱말 ${vocab.length}개 (원본 ${raw.length}행)`);
lines.push(`왕복 실패 ${failures.length}개${failures.length ? ': ' + failures.slice(0, 20).join(', ') : ''}`);
lines.push('');
for (const [name, keys] of stages) {
  const t = typeable(new Set(keys));
  lines.push(`${name}: ${t.length}개 — 예) ${t.slice(0, 25).map((e) => e.word).join(' ')}`);
}

// 4) keybr식 한 키씩 해금: 홈 행 다음, 새로 칠 수 있는 낱말이 가장 많이 늘어나는 키를 차례로 추가
lines.push('');
lines.push('한 키씩 해금 (욕심쟁이 순서: 매번 낱말 수를 가장 많이 늘리는 키)');
const open = new Set(HOME);
let rest = ['Quote', ...TOP, ...BOTTOM];
lines.push(`  시작(홈 행): ${typeable(open).length}개`);
while (rest.length) {
  let best = rest[0], bestN = -1;
  for (const k of rest) {
    const n = typeable(new Set([...open, k])).length;
    if (n > bestN) { best = k; bestN = n; }
  }
  open.add(best);
  rest = rest.filter((k) => k !== best);
  lines.push(`  + ${keyLabel(best).padEnd(2)} → ${bestN}개`);
}

// 5) 키 사용 빈도 (전체 어휘)
const freq = new Map<string, number>();
for (const e of entries) for (const c of e.codes) freq.set(c, (freq.get(c) ?? 0) + 1);
lines.push('');
lines.push('키 사용 빈도(어휘 전체 타수 기준): ' + [...freq.entries()].sort((a, b) => b[1] - a[1]).map(([c, n]) => `${keyLabel(c)} ${n}`).join(', '));

const out = lines.join('\n');
console.log(out);
writeFileSync('data/vocab.json', JSON.stringify(entries.map((e) => e.word)));
writeFileSync('data/vocab-stats.txt', out + '\n');
