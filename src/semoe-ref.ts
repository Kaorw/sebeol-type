// 세모이 배열·결합 법칙 안내 페이지 (semoe.html)
// 배열도와 결합 표는 연습 엔진의 데이터(SEMOE, 권하는 조합)에서 바로 만든다. 판정 규칙과 어긋나지 않게.
import './style.css';
import { keyLabel } from './layout/p2';
import { SEMOE, SEMOE_PUNCT, SEMOE_SHIFT_PUNCT } from './layout/semoe';
import { PHYS_LAYOUTS, LAYOUT_ALIAS, PhysKey, PhysLayout } from './layout/physical';
import { CHO, JUNG, JONG } from './hangul/jamo';
import { chordFor, otherChords, semoeCharStrokes } from './engine/semoe';
import { SCHEMES, withFingers } from './scheme';

const SEMOE_SCHEME = SCHEMES.semoe;
const $ = (id: string) => document.getElementById(id)!;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

// ── 전체 배열 ───────────────────────────────────
// 물리 배열은 연습 화면에서 고른 것을 처음 값으로 쓴다(여기서 바꾼 것은 저장하지 않음)
let layoutId = 'ansi';
try {
  const l = localStorage.getItem('sebeol-type.layout');
  const id = l ? (LAYOUT_ALIAS[l] ?? l) : null;
  if (id && PHYS_LAYOUTS.some((x) => x.id === id)) layoutId = id;
} catch { /* 무시 */ }
const layout = (): PhysLayout => withFingers(PHYS_LAYOUTS.find((l) => l.id === layoutId) ?? PHYS_LAYOUTS[0], SEMOE_SCHEME);

function capLabel(k: PhysKey): string {
  if (k.label) return k.label;
  if (k.code === 'Space') return '';
  return keyLabel(k.code) + (SEMOE_SHIFT_PUNCT[k.code] ? ` ${SEMOE_SHIFT_PUNCT[k.code]}` : '');
}

function drawKeyboard(): void {
  $('layout-seg').innerHTML = PHYS_LAYOUTS.map((l) => `<button type="button" data-layout="${l.id}" aria-pressed="${l.id === layoutId}">${esc(l.name)}</button>`).join('');
  const L = layout();
  const target = $('kbd');
  const stubs = L.stubs ?? [];
  const maxX = Math.max(...L.keys.map((k) => k.x + k.w), ...stubs.map((s) => s.x + s.w));
  const maxY = Math.max(...L.keys.map((k) => k.y + k.h), ...stubs.map((s) => s.y + (s.h ?? 1)));
  const pad = 14;
  const u = Math.max(16, Math.min(60, Math.floor(($('kbd-wrap').clientWidth - pad * 2) / maxX)));
  const gap = Math.max(3, Math.round(u * 0.1));
  target.style.setProperty('--u', `${u}px`);
  target.style.width = `${maxX * u + pad * 2 - gap}px`;
  target.style.height = `${maxY * u + pad * 2 - gap}px`;
  const box = (x: number, y: number, w: number, h = 1, rot?: number) =>
    `left:${pad + x * u}px;top:${pad + y * u}px;width:${w * u - gap}px;height:${h * u - gap}px${rot ? `;transform:rotate(${rot}deg)` : ''}`;
  let html = stubs.map((s) => `<div class="key stub${s.round ? ' round' : ''}" style="${box(s.x, s.y, s.w, s.h, s.rot)}"><span class="cap">${esc(s.label)}</span></div>`).join('');
  for (const k of L.keys) {
    const g = SEMOE_SCHEME.glyph(k.code);
    const isMod = k.code.startsWith('Shift');
    const zone = k.code === 'Space' ? 'z1' : `z${k.finger.slice(1)}`;
    const used = isMod || k.code === 'Space' || !!g.main;
    const cls = ['key', isMod ? 'stub mod' : zone, g.side, used ? '' : 'locked', k.home ? 'home' : ''].join(' ');
    html += `<div class="${cls}" title="${esc(SEMOE_SCHEME.role(k.code))}" style="${box(k.x, k.y, k.w, k.h, k.rot)}"><span class="cap">${esc(capLabel(k))}</span><span class="sub">${esc(g.sub)}</span><span class="main">${esc(g.main)}</span></div>`;
  }
  target.innerHTML = html;
}

// ── 결합 법칙 ───────────────────────────────────
type Cat = 'c' | 'v' | 'j';
const CAT_CLASS: Record<Cat, string> = { c: 'c-cho', v: 'c-jung', j: 'c-jong' };
/** 키 하나: 키 이름 + 그 키가 내는 낱자 */
function keyChip(code: string): string {
  const t = SEMOE[code];
  const cat = t[0] as Cat;
  const jamo = t === 'v.' ? '모음⇧' : t.slice(1);
  return `<span class="kk"><b>${esc(keyLabel(code))}</b><i class="${CAT_CLASS[cat]}">${esc(jamo)}</i></span>`;
}
const chordHtml = (keys: string[]) => keys.map(keyChip).join('<span class="plus">+</span>');
const plainChord = (keys: string[]) => keys.map(keyLabel).join('+');

// 공식 입력 방식 안내(blog.naver.com/eekdland/220239514856)의 풀이. ⇧ㄴ(ㅎ) = ㄴ 키의 종성⇧ 낱자 ㅎ
const NOTE: Record<string, string> = {
  vㅐ: 'ㅏ+ㅣ', vㅢ: 'ㅡ+ㅣ', vㅟ: '공식 표는 ㅔ+ㅣ',
  jㄲ: 'ㄱ+ㅇ (ㅇ을 더함)',
  jㄵ: 'ㄴ+⇧ㄹ(ㅈ)에서', jㄶ: 'ㄴ+⇧ㅇ(ㅀ)에서', jㄾ: '⇧ㅇ(ㅀ)+⇧ㅁ(ㄷ)에서', jㄿ: '⇧ㅇ(ㅀ)+ㅂ에서', jㅌ: '⇧ㄴ(ㅎ)+⇧ㅁ(ㄷ)에서',
};
function card(cat: Cat, jamo: string): string {
  const keys = chordFor(cat + jamo);
  if (!keys) return '';
  const alt = otherChords(cat + jamo);
  const note = NOTE[cat + jamo];
  return `<div class="card"><span class="cj ${CAT_CLASS[cat]}">${esc(jamo)}</span><span class="chord">${chordHtml(keys)}</span>${
    note ? `<span class="alt">${esc(note)}</span>` : ''}${
    alt.length ? `<span class="alt">또는 ${alt.map((a) => `<span class="mono">${esc(plainChord(a))}</span>`).join(', ')}</span>` : ''}</div>`;
}
function group(title: string, note: string, cat: Cat, jamos: string[]): string {
  if (!jamos.length) return '';
  return `<div class="ref-group"><h3>${title}</h3>${note ? `<p class="ref-sub">${note}</p>` : ''}<div class="cards">${jamos.map((j) => card(cat, j)).join('')}</div></div>`;
}
const keysOf = (cat: Cat, j: string) => chordFor(cat + j) ?? [];

function renderRules(): void {
  // 첫소리: 한 키 / ㅇ과 함께(된소리) / ㅎ과 함께(거센소리)
  const cho = [...CHO];
  const choBase = cho.filter((j) => keysOf('c', j).length === 1);
  const tense = cho.filter((j) => keysOf('c', j).length > 1 && keysOf('c', j).includes('KeyJ'));
  const aspir = cho.filter((j) => keysOf('c', j).length > 1 && keysOf('c', j).includes('KeyH'));
  $('cho-groups').innerHTML =
    group('한 키', '', 'c', choBase) +
    group('된소리 = ㅇ(J)과 함께', '더해치기합성: 예사소리 키에 <span class="kc">J</span>(ㅇ)를 더해 같이 누릅니다. 까 = J+K+F', 'c', tense) +
    group('거센소리 = ㅎ(H)과 함께', '발음원리합성: 소리 나는 대로 예사소리와 <span class="kc">H</span>(ㅎ)를 같이 누릅니다(조타 → 좋다). 타 = I+H+F', 'c', aspir);

  // 가운뎃소리: 한 키 / . 과 함께 / 홀소리 두 키
  const jung = [...JUNG];
  const v1 = jung.filter((j) => keysOf('v', j).length === 1);
  const vDot = jung.filter((j) => keysOf('v', j).length > 1 && keysOf('v', j).includes('Period'));
  const vTwo = jung.filter((j) => keysOf('v', j).length > 1 && !keysOf('v', j).includes('Period'));
  $('jung-groups').innerHTML =
    group('한 키', '', 'v', v1) +
    group('모음⇧(.)과 함께', '오른손 소지로 <span class="kc">.</span>(모음 시프트, 오른쪽 ㅗ)을 같이 누릅니다. 배열도에서 홀소리 키 오른쪽 위에 적힌 ㅝ ㅒ ㅑ ㅖ ㅛ ㅠ와 겹홀소리 ㅘ ㅚ ㅙ가 여기에 듭니다. 왼쪽 ㅗ(<span class="kc">V</span>)도 모음⇧로 쓸 수 있지만, ㅘ·ㅙ는 왼손 중지에 무리가 가지 않게 오른쪽 <span class="kc">.</span>으로 치기를 권합니다.', 'v', vDot) +
    group('홀소리 두 키', '두 홀소리를 그대로 모읍니다.', 'v', vTwo);

  // 받침: 한 키 / ; 과 함께 / 받침 두 키
  const jong = JONG.slice(1);
  const j1 = jong.filter((j) => keysOf('j', j).length === 1);
  const jSemi = jong.filter((j) => keysOf('j', j).length > 1 && keysOf('j', j).includes('Semicolon'));
  const jTwo = jong.filter((j) => keysOf('j', j).length > 1 && !keysOf('j', j).includes('Semicolon'));
  $('jong-groups').innerHTML =
    group('한 키', 'ㅆ은 오른손 소지 <span class="kc">;</span>(종성 시프트)입니다. 다른 받침 키 없이 누르면 ㅆ이 됩니다.', 'j', j1) +
    group('종성⇧(;)과 함께', '배열도에서 받침 키 오른쪽 위에 적힌 받침은 <span class="kc">;</span>과 그 키를 같이 누릅니다. 있 = J+D+;, 좋 = L+V+;+S', 'j', jSemi) +
    group('받침 두 키', '합쳐치기합성: 겹받침은 이루는 두 받침을 그대로 모읍니다. ㄲ은 ㄱ에 ㅇ을 더하고, ㄵ·ㄶ·ㄾ·ㄿ·ㅌ은 종성⇧ 낱자에서 나온 조합입니다.', 'j', jTwo);
}

// ── 글자 찾아보기 ───────────────────────────────
function renderLookup(): void {
  const text = ($('lookup-input') as HTMLInputElement).value;
  const out = [...text].filter((ch) => ch.trim()).slice(0, 40).map((ch) => {
    try {
      const s = semoeCharStrokes(ch)[0];
      if (s.chord) return `<div class="card"><span class="cj">${esc(ch)}</span><span class="chord">${chordHtml(s.chord.map((p) => p.code))}</span></div>`;
      return `<div class="card"><span class="cj">${esc(ch)}</span><span class="chord"><span class="kk"><b>${esc((s.shift ? 'Shift + ' : '') + keyLabel(s.code))}</b><i>기호</i></span></span></div>`;
    } catch {
      return `<div class="card"><span class="cj">${esc(ch)}</span><span class="alt">세모이 기본 배열로 칠 수 없음</span></div>`;
    }
  });
  $('lookup-out').innerHTML = out.join('');
}

// ── 숫자·기호 ──────────────────────────────────
function renderPunct(): void {
  const rows: [string, string, string][] = [
    ['1 ~ 0', '숫자 줄', '그대로'],
    ...Object.entries(SEMOE_PUNCT).filter(([c]) => !c.startsWith('Digit')).map(([c, v]) => [v, keyLabel(c), c === 'KeyP' ? '. 키는 모음⇧(오른쪽 ㅗ)이라 마침표는 P 자리에 있습니다' : ''] as [string, string, string]),
    ...Object.entries(SEMOE_SHIFT_PUNCT).map(([c, v]) => [v, `Shift + ${keyLabel(c)}`, ''] as [string, string, string]),
    ['띄어쓰기', 'Space', '앞 글자 키와 함께 눌러도 됩니다'],
  ];
  $('punct-table').innerHTML = `<thead><tr><th>글자</th><th>키</th><th>참고</th></tr></thead><tbody>${
    rows.map(([a, b, c]) => `<tr><td class="mono">${esc(a)}</td><td><span class="kc">${esc(b)}</span></td><td class="stat-sub">${esc(c)}</td></tr>`).join('')}</tbody>`;
}

drawKeyboard();
renderRules();
renderLookup();
renderPunct();
$('lookup-input').addEventListener('input', renderLookup);
document.addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest<HTMLElement>('[data-layout]');
  if (!b) return;
  layoutId = b.dataset.layout!;
  drawKeyboard();
});
let resizeTimer = 0;
window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = window.setTimeout(drawKeyboard, 120); });
