// 내 글감: 사용자가 붙여 넣은 글을 이 브라우저에만 저장한다 (사이트에는 포함되지 않음)
import { SCHEME } from '../scheme';
const typeable = (ch: string) => SCHEME.typeable(ch);

const STORE = 'sinsebeol-p2.mytexts';

export function loadMine(): string[] {
  try { const v = JSON.parse(localStorage.getItem(STORE) ?? '[]'); return Array.isArray(v) ? v : []; } catch { return []; }
}
export function saveMine(lines: string[]): void {
  try { localStorage.setItem(STORE, JSON.stringify(lines)); } catch { /* 무시 */ }
}

export interface NormalizeResult { lines: string[]; removed: string[]; skipped: number }

/** 붙여 넣은 글 → 한 줄에 한 글감. 칠 수 없는 글자는 빼고, 너무 짧은 줄은 버린다 */
export function normalize(raw: string): NormalizeResult {
  const removed = new Set<string>();
  const lines: string[] = [];
  let skipped = 0;
  for (let line of raw.split(/\r?\n/)) {
    line = line
      .replace(/[“”„‟"'‘’`´«»「」『』]/g, '')
      .replace(/…/g, '...')
      .replace(/[·•~\t–—-]/g, ' ');
    let out = '';
    for (const ch of line) {
      if (ch === ' ' || typeable(ch)) out += ch;
      else { removed.add(ch); out += ' '; }
    }
    // 글자를 빼고 나서 문장부호만 남은 토막(예: 'OK?' → '?')은 버린다
    out = out.split(/\s+/).filter((t) => /[가-힣0-9]/.test(t)).join(' ');
    out = out.replace(/\s+([,.?!:])/g, '$1').trim();
    if (!out) continue;
    if (out.length < 4 || !/[가-힣]/.test(out)) { skipped++; continue; }
    lines.push(out);
  }
  return { lines: [...new Set(lines)], removed: [...removed], skipped };
}
