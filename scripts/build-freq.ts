// 「현대 국어 사용 빈도 조사」 단어 목록 4개 → data/vocab-freq.json
// - 항목 열만 쓴다. 동음이의어 번호(가01, 감자05)는 떼어 낸다
// - 한글 음절로만 된 항목만 남긴다 (기호·숫자·띄어쓰기·낱자(ㄱ, ㄴ다) 섞인 항목은 버림)
// - 같은 낱말은 하나로 합치고 빈도를 더한 뒤, 빈도가 높은 차례로 늘어놓는다
// - 기존 학습용 어휘(data/vocab.json)에 있는 낱말은 빼서 겹치지 않게 한다
import { readFileSync, writeFileSync } from 'node:fs';

const FILES = ['일반어', '고유명사', '조사', '어미'];
const basic = new Set<string>(JSON.parse(readFileSync('data/vocab.json', 'utf8')));
const freq = new Map<string, number>();
const report: string[] = [];

for (const name of FILES) {
  const lines = readFileSync(`data/freq/${name}.txt`, 'utf8').split(/\r?\n/).filter(Boolean);
  const head = lines[0].split('\t');
  const iItem = head.indexOf('항목');
  const iFreq = head.indexOf('빈도');
  let kept = 0, dropped = 0;
  for (const line of lines.slice(1)) {
    const cols = line.split('\t');
    const word = (cols[iItem] ?? '').trim().replace(/\d+$/, '');
    const n = Number((cols[iFreq] ?? '0').replace(/[,\s]/g, '')) || 0;
    if (!/^[가-힣]+$/.test(word)) { dropped++; continue; }
    kept++;
    freq.set(word, (freq.get(word) ?? 0) + n);
  }
  report.push(`${name}: 항목 ${lines.length - 1}개 중 ${kept}개 사용, ${dropped}개 버림`);
}

const all = [...freq.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ko'));
const out = all.map(([w]) => w).filter((w) => !basic.has(w));
writeFileSync('data/vocab-freq.json', JSON.stringify(out));
report.push(`합친 낱말 ${all.length}개 → 학습용 어휘와 겹치는 ${all.length - out.length}개를 빼고 ${out.length}개`);
console.log(report.join('\n'));
