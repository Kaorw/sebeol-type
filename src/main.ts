import './style.css';
import { P2, PUNCT, SHIFT_PUNCT, keyLabel } from './layout/p2';
import { PHYS_LAYOUTS, PhysLayout, PhysKey, Finger, FINGER_NAME, shiftFor } from './layout/physical';
import { STAGES, VOCAB, makeLesson, makeTextLesson, Word } from './app/curriculum';
import { TEXTS, TEXT_SETS, creditOf, TextItem } from './app/texts';
import { loadMine, saveMine, normalize } from './app/mytexts';
import { load, save, record, score, weakest, stageReady, today, resetRecords, UNLOCK_SCORE, MIN_SAMPLES } from './app/stats';
import { Lesson } from './app/session';
import { typeCodes } from './engine/automaton';
import type { Stroke } from './engine/reverse';

const $ = (id: string) => document.getElementById(id)!;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

const state = load();
let mine = loadMine();
let words: Word[] = [];
let lesson: Lesson;
let keyEls = new Map<string, HTMLElement[]>();
let lastWrong: string | null = null;
let view: 'practice' | 'stats' = 'practice';

const HANGUL_KEYS = STAGES[2].keys; // 29키
const ALL_KEYS = [...HANGUL_KEYS, ...Object.keys(PUNCT), 'ShiftLeft', 'ShiftRight'];


const stage = () => STAGES[state.stage - 1];
const isText = () => state.mode === 'text';
const customKeys = () => state.customKeys ?? HANGUL_KEYS;
/** 연습(숙련도·집중 키)에 쓰는 키 */
const practiceKeys = () => (isText() ? HANGUL_KEYS : state.unlockOn ? stage().keys : customKeys());
/** 키보드에서 켜 보이는 키 */
const openKeys = () => new Set(isText() ? ALL_KEYS : practiceKeys());
const textItems = (): TextItem[] => {
  if (state.textSource === 'mine' && mine.length) return mine.map((text) => ({ text, kind: '문장' as const }));
  const set = TEXT_SETS.find((x) => x.id === state.textSource) ?? TEXT_SETS[0];
  return TEXTS.filter((t) => set.kinds.includes(t.kind));
};
const textList = () => textItems().map((t) => t.text);
let lessonItems: TextItem[] = [];
const layout = (): PhysLayout => PHYS_LAYOUTS.find((l) => l.id === state.layout) ?? PHYS_LAYOUTS[0];
const fingerOf = (code: string): Finger | undefined => layout().keys.find((k) => k.code === code)?.finger;
const poolFor = (keys: string[]) => { const s = new Set(keys); return VOCAB.filter((w) => w.codes.every((c) => s.has(c))); };

// ── 키 표시용 낱자 ─────────────────────────────
function keyGlyph(code: string): { main: string; sub: string; side: string } {
  if (PUNCT[code]) return { main: PUNCT[code], sub: '', side: 'P' };
  const k = P2[code];
  if (!k) return { main: '', sub: '', side: '' };
  if (k.side === 'R') return { main: k.cho, sub: k.rightVowel ? `(${k.rightVowel})` : '', side: 'R' };
  return { main: k.jong, sub: k.vowel ?? '', side: 'L' };
}
function chipGlyph(code: string): string {
  const k = P2[code];
  if (!k) return '';
  return k.side === 'R' ? k.cho : (k.vowel ?? k.jong);
}
function capLabel(k: PhysKey): string {
  if (k.label) return k.label;
  if (k.code === 'Space') return '';
  return keyLabel(k.code) + (SHIFT_PUNCT[k.code] ? ` ${SHIFT_PUNCT[k.code]}` : '');
}

// ── 연습 시작 ─────────────────────────────────
function newLesson(): void {
  state.lessonNo = (state.lessonNo ?? 0) + 1;
  words = poolFor(practiceKeys());
  let items: string[];
  if (isText()) {
    items = makeTextLesson(textList(), state.seenText);
    items.forEach((t) => { state.seenText[t] = state.lessonNo; });
    const all = textItems();
    lessonItems = items.map((t) => all.find((x) => x.text === t)!).filter(Boolean);
  } else {
    items = makeLesson(words, weakest(state, practiceKeys()), state.seen);
    items.forEach((w) => { state.seen[w] = state.lessonNo; });
  }
  save(state);
  lesson = new Lesson(items.join(' '));
  lastWrong = null;
  renderAll();
}

// ── 머리 조작부 ────────────────────────────────
const LOCK_SVG = '<svg class="lock" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
const seg = (items: [string, string][], attr: string, cur: string) =>
  items.map(([id, name]) => `<button type="button" data-${attr}="${id}" aria-pressed="${id === cur}">${name}</button>`).join('');
function renderControls(): void {
  $('mode-seg').innerHTML = seg([['words', '낱말'], ['text', '짧은 글']], 'mode', state.mode);
  $('unlock-seg').innerHTML = seg([['on', '켬'], ['off', '끔']], 'unlock', state.unlockOn ? 'on' : 'off');
  $('source-seg').innerHTML = seg([...TEXT_SETS.map((x) => [x.id, x.name] as [string, string]), ['mine', `내 글감${mine.length ? ` ${mine.length}` : ''}`]], 'source', state.textSource);
  $('unlock-ctl').hidden = isText();
  $('stage-ctl').hidden = isText() || !state.unlockOn;
  $('source-ctl').hidden = !isText();
  $('stage-seg').innerHTML = STAGES.map((s) => {
    const locked = s.id > state.unlocked;
    return `<button type="button" data-stage="${s.id}" aria-pressed="${s.id === state.stage}" title="${locked ? '아직 열리지 않은 단계 (눌러서 미리 연습할 수 있음)' : ''}">${locked ? LOCK_SVG : ''}${s.id}. ${esc(s.name)}</button>`;
  }).join('');
  $('layout-seg').innerHTML = seg(PHYS_LAYOUTS.map((l) => [l.id, l.name] as [string, string]), 'layout', state.layout);
  ($('target') as HTMLSelectElement).value = String(state.targetCpm);
  $('view-toggle').setAttribute('aria-pressed', String(view === 'stats'));
  $('view-toggle').textContent = view === 'stats' ? '연습으로' : '통계';
  $('practice-ctls').hidden = view === 'stats';
}

// ── 지표·키 진도·집중 키 ───────────────────────
function scoreColor(code: string): string {
  const sc = score(state, code);
  return !sc.calibrated ? 'var(--faint)' : sc.score >= UNLOCK_SCORE ? 'var(--cho)' : sc.score >= 0.6 ? 'var(--jung)' : 'var(--jong)';
}
function renderMeta(): void {
  const mins = Math.floor(state.daily.ms / 60000);
  const last = state.last;
  const list = textList();
  $('metrics').innerHTML = `
    <span>속도 <strong>${last ? Math.round(last.cpm) : '–'}</strong> <span class="unit">타/분</span></span>
    <span>정확도 <strong>${last ? (last.acc * 100).toFixed(1) + '%' : '–'}</strong></span>
    <span>오늘 <strong>${mins}</strong><span class="unit"> / 30분</span></span>
    <span class="bar" aria-hidden="true"><i style="width:${Math.min(100, (mins / 30) * 100)}%"></i></span>
    <span class="unit">${isText()
      ? `${state.textSource === 'mine' && mine.length ? '내 글감' : `${TEXT_SETS.find((x) => x.id === state.textSource)?.name ?? '전체'} 글감`} ${list.length}개 중 ${list.filter((t) => state.seenText[t]).length}개 만남`
      : `낱말 ${words.length}개 중 ${words.filter((w) => state.seen[w.word]).length}개 만남`}</span>`;

  const open = openKeys();
  const picking = !isText() && !state.unlockOn;
  const focus = weakest(state, practiceKeys());
  $('chips-hint').hidden = !picking;
  $('chips').innerHTML = HANGUL_KEYS.map((code) => {
    const isOpen = open.has(code);
    const sc = score(state, code);
    const pct = Math.round(sc.score * 100);
    const cls = ['chip', isOpen ? '' : 'locked', isOpen && code === focus ? 'focus' : '', picking ? 'pick' : ''].join(' ');
    const title = `${keyLabel(code)} 키 · ${sc.calibrated ? `숙련도 ${pct}% · ${Math.round(sc.cpm)}타/분 · 정확도 ${Math.round(sc.acc * 100)}%` : `표본 ${sc.samples}/${MIN_SAMPLES}`}${isOpen ? '' : ' · 꺼짐'}`;
    const inner = `<span class="j">${chipGlyph(code)}</span><span class="k">${esc(keyLabel(code))}</span><span class="m"><i style="width:${sc.calibrated ? pct : (sc.samples / MIN_SAMPLES) * 100}%;background:${scoreColor(code)}"></i></span>`;
    return picking
      ? `<button type="button" class="${cls}" data-pick="${code}" aria-pressed="${isOpen}" title="${esc(title)}">${inner}</button>`
      : `<div class="${cls}" title="${esc(title)}">${inner}</div>`;
  }).join('');

  if (focus) {
    const sc = score(state, focus);
    const k = P2[focus];
    const role = k?.side === 'R' ? `초성 ${k.cho}` : `중성 ${(k as any)?.vowel ?? ''} / 받침 ${(k as any)?.jong ?? ''}`;
    const status = sc.calibrated ? `숙련도 ${Math.round(sc.score * 100)}%` : `표본 모으는 중 ${sc.samples}/${MIN_SAMPLES}`;
    let goal: string;
    if (isText()) goal = '짧은 글에서는 모든 키를 씁니다';
    else if (!state.unlockOn) goal = `해금 꺼짐 · 고른 키 ${customKeys().length}개로 연습`;
    else if (state.stage >= 3) goal = '모든 키가 열렸습니다';
    else {
      const next = STAGES[state.stage].name.replace('+ ', '');
      goal = stageReady(state, stage().keys)
        ? `모든 키가 목표에 닿았습니다. 이번 차례를 마치면 ${next}이 열립니다`
        : `열린 키가 모두 ${UNLOCK_SCORE * 100}%에 닿으면 ${next}이 열립니다`;
    }
    $('focus').innerHTML = `<span class="fk">${chipGlyph(focus)}</span><span>${esc(role)} · <span class="mono">${esc(keyLabel(focus))}</span> 키 · ${status} — ${goal}</span>`;
  }
}

// ── 연습 글 ────────────────────────────────────
function renderCredit(): void {
  const el = $('credit');
  if (!isText() || state.textSource === 'mine') { el.hidden = true; return; }
  const credits = [...new Set(lessonItems.map(creditOf))];
  el.hidden = !credits.length;
  el.innerHTML = `출처 · ${credits.map(esc).join(' / ')}${lessonItems.some((t) => t.kind === '문학') ? ' · 원문: <a href="https://ko.wikisource.org" target="_blank" rel="noopener">위키문헌</a>, 따옴표·한자 병기는 뺌' : ''}`;
}
function renderText(): void {
  $('text').innerHTML = lesson.chars.map((c, i) => {
    const sp = c.ch === ' ';
    const cls = [sp ? 'sp' : '', i < lesson.ci ? 'done' : '', i === lesson.ci ? 'cur' : '', c.error ? 'err' : ''].join(' ').trim();
    let shown = sp ? '·' : c.ch;
    if (i === lesson.ci && lesson.si > 0) shown = typeCodes(c.strokes.slice(0, lesson.si).map((s) => s.code)) || shown;
    return `<span class="${cls}">${esc(shown)}</span>`;
  }).join('');
}

// ── 지금 칠 글자 ───────────────────────────────
function strokeNote(s: Stroke): string {
  const f = fingerOf(s.code);
  const hand = f ? FINGER_NAME[f] : '';
  switch (s.note) {
    case '갈마들이': return `초성 뒤 갈마들이 → 중성 · ${hand}`;
    case '오른쪽 홀소리': return `오른쪽 홀소리 (겹홀소리 시작) · ${hand}`;
    case '겹홀소리': return `겹홀소리 완성 · ${hand}`;
    case '거듭치기': return `같은 키 한 번 더 · ${hand}`;
    case '겹받침': return `겹받침 · ${hand}`;
    case '윗글쇠': {
      const sh = shiftFor(layout(), s.code);
      return `${sh === 'ShiftLeft' ? '왼손' : '오른손'} 새끼로 Shift를 누른 채 · ${hand}`;
    }
  }
  return `${s.role} · ${hand}`;
}
function roleColor(s: Stroke): string {
  return s.role === '초성' ? 'var(--cho)' : s.role === '중성' ? 'var(--jung)' : s.role === '종성' ? 'var(--jong)' : 'var(--text)';
}
function renderGuide(): void {
  const c = lesson.current;
  if (!c) { $('guide').innerHTML = ''; return; }
  const parts = c.strokes.map((s, i) => {
    const cls = i < lesson.si ? 'past' : i === lesson.si ? 'now' : '';
    const j = s.role === '띄어쓰기' ? '␣' : s.jamo;
    const k = (s.shift ? 'Shift + ' : '') + keyLabel(s.code);
    return `<div class="step ${cls}"><span class="sj" style="color:${roleColor(s)}">${esc(j)}</span><span class="sk">${esc(k)}</span><span class="sn">${esc(strokeNote(s))}</span></div>`;
  });
  $('guide').innerHTML = `<span class="lbl">지금 칠 글자</span><span class="big">${c.ch === ' ' ? '␣' : esc(c.ch)}</span><span class="eq">=</span>${parts.join('<span class="arr">→</span>')}`;
}

// ── 키보드 ─────────────────────────────────────
const ANSI_STUBS = [
  { label: 'Backspace', x: 13, y: 0, w: 2 },
  { label: 'Tab', x: 0, y: 1, w: 1.5 }, { label: '\\', x: 13.5, y: 1, w: 1.5 },
  { label: 'Caps', x: 0, y: 2, w: 1.75 }, { label: 'Enter', x: 12.75, y: 2, w: 2.25 },
  { label: 'Ctrl', x: 0, y: 4, w: 1.5 }, { label: 'Alt', x: 1.5, y: 4, w: 1.5 },
  { label: 'Alt', x: 10, y: 4, w: 1.5 }, { label: 'Ctrl', x: 13.5, y: 4, w: 1.5 },
];
interface KbdOpts { target: HTMLElement; wrap: HTMLElement; heat?: boolean }
function drawKeyboard({ target, wrap, heat }: KbdOpts): Map<string, HTMLElement[]> {
  const L = layout();
  const stubs = L.id === 'ansi' ? ANSI_STUBS : [];
  const maxX = Math.max(...L.keys.map((k) => k.x + k.w), ...stubs.map((s) => s.x + s.w));
  const maxY = Math.max(...L.keys.map((k) => k.y + k.h));
  const pad = 14;
  const u = Math.max(16, Math.min(56, Math.floor((wrap.clientWidth - pad * 2) / maxX)));
  const gap = Math.max(3, Math.round(u * 0.1));
  target.style.setProperty('--u', `${u}px`);
  target.style.width = `${maxX * u + pad * 2 - gap}px`;
  target.style.height = `${maxY * u + pad * 2 - gap}px`;
  const box = (x: number, y: number, w: number) => `left:${pad + x * u}px;top:${pad + y * u}px;width:${w * u - gap}px;height:${u - gap}px`;
  const open = openKeys();
  let html = stubs.map((s) => `<div class="key stub" style="${box(s.x, s.y, s.w)}"><span class="cap">${esc(s.label)}</span></div>`).join('');
  for (const k of L.keys) {
    const g = keyGlyph(k.code);
    const isMod = k.code.startsWith('Shift');
    const zone = k.code === 'Space' ? 'z1' : `z${k.finger.slice(1)}`;
    if (heat) {
      if (!P2[k.code]) { html += `<div class="key stub" style="${box(k.x, k.y, k.w)}"><span class="cap">${esc(capLabel(k))}</span></div>`; continue; }
      const sc = score(state, k.code);
      const bg = sc.calibrated ? heatColor(sc.score) : 'var(--z1)';
      const ink = sc.calibrated && sc.score > 0.55 ? 'var(--accent-ink)' : 'var(--text)';
      const label = sc.calibrated ? `${Math.round(sc.score * 100)}` : '–';
      html += `<div class="key heat" data-tipkey="${k.code}" style="${box(k.x, k.y, k.w)};background:${bg};color:${ink}"><span class="cap" style="color:inherit;opacity:.75">${esc(keyLabel(k.code))}</span><span class="sub" style="color:inherit">${chipGlyph(k.code)}</span><span class="main" style="color:inherit;font-family:var(--mono)">${label}</span></div>`;
      continue;
    }
    const locked = k.code !== 'Space' && !open.has(k.code);
    const cls = ['key', isMod ? 'stub mod' : zone, g.side, locked ? 'locked' : '', k.home ? 'home' : ''].join(' ');
    html += `<div class="${cls}" data-code="${k.code}" style="${box(k.x, k.y, k.w)}"><span class="cap">${esc(capLabel(k))}</span><span class="sub">${esc(g.sub)}</span><span class="main">${esc(g.main)}</span></div>`;
  }
  target.innerHTML = html;
  const map = new Map<string, HTMLElement[]>();
  target.querySelectorAll<HTMLElement>('[data-code]').forEach((el) => {
    const c = el.dataset.code!;
    map.set(c, [...(map.get(c) ?? []), el]);
  });
  return map;
}
function buildKeyboard(): void {
  keyEls = drawKeyboard({ target: $('kbd'), wrap: $('kbd-wrap') });
}
function renderKeyHighlight(): void {
  const exp = lesson.expected;
  const want = new Set<string>();
  if (exp) { want.add(exp.code); if (exp.shift) want.add(shiftFor(layout(), exp.code)); }
  keyEls.forEach((els, code) => els.forEach((el) => {
    el.classList.toggle('next', want.has(code));
    el.classList.toggle('wrong', code === lastWrong);
  }));
}

// ── 손 ─────────────────────────────────────────
const FINGER_H: Record<string, number> = { '5': 68, '4': 94, '3': 108, '2': 98, '1': 56 };
function renderHands(): void {
  const exp = lesson.expected;
  const on = new Set<string>();
  if (exp) {
    on.add(exp.code === 'Space' ? 'R1' : fingerOf(exp.code) ?? '');
    if (exp.shift) on.add(shiftFor(layout(), exp.code) === 'ShiftLeft' ? 'L5' : 'R5');
  }
  const hand = (side: 'L' | 'R') => {
    const ids = side === 'L' ? ['5', '4', '3', '2', '1'] : ['1', '2', '3', '4', '5'];
    const fingers = ids.map((n) => {
      const id = `${side}${n}`;
      const bg = n === '1' ? 'var(--z1)' : `var(--z${n})`;
      return `<div class="finger ${on.has(id) ? 'on' : ''}" style="height:${FINGER_H[n]}px;background:${bg};${n === '1' ? 'margin-bottom:-10px' : ''}" title="${FINGER_NAME[id as Finger]}"></div>`;
    }).join('');
    const mine = [...on].filter((f) => f.startsWith(side));
    const name = mine.length ? mine.map((f) => FINGER_NAME[f as Finger]).join(' + ') : side === 'L' ? '왼손' : '오른손';
    return `<div class="hand"><div class="fingers">${fingers}</div><div class="palm"></div><span class="hand-name ${mine.length ? 'on' : ''}">${name}</span></div>`;
  };
  $('hands').innerHTML = hand('L') + hand('R');
}

// ── 통계 화면 ──────────────────────────────────
// 숙련도(0~1) → 한 가지 색(호박색)의 밝기 단계. 낮을수록 어둡고 높을수록 밝다.
const HEAT = ['#3b3024', '#5a4526', '#7d5d2a', '#a3782f', '#c99838', '#f0c060'];
function heatColor(v: number): string { return HEAT[Math.min(HEAT.length - 1, Math.floor(v * HEAT.length))]; }

function barChart(values: number[], opts: { max: number; unit: string; fmt: (v: number) => string; label: string; ticks: number[]; dates: string[] }): string {
  const W = 520, H = 150, L = 40, B = 20, T = 10;
  const n = Math.max(values.length, 1);
  const bw = (W - L) / n;
  const y = (v: number) => T + (H - T - B) * (1 - v / opts.max);
  const grid = opts.ticks.map((t) => `<line x1="${L}" x2="${W}" y1="${y(t)}" y2="${y(t)}" stroke="var(--line)" stroke-width="1"/><text x="${L - 6}" y="${y(t) + 4}" text-anchor="end" font-size="11" fill="var(--muted)">${opts.fmt(t)}</text>`).join('');
  const bars = values.map((v, i) => {
    const top = y(Math.min(v, opts.max));
    const h = Math.max(1, H - B - top);
    return `<g class="bar-g" data-tip="${esc(`${opts.dates[i]} · ${opts.fmt(v)}${opts.unit}`)}"><rect x="${L + i * bw}" y="${T}" width="${bw}" height="${H - T - B}" fill="transparent"/><rect x="${L + i * bw + 1}" y="${top}" width="${Math.max(2, bw - 2)}" height="${h}" rx="${Math.min(4, bw / 3)}" fill="var(--accent)"/></g>`;
  }).join('');
  return `<figure class="chart"><figcaption>${esc(opts.label)}</figcaption><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.label)}">${grid}<line x1="${L}" x2="${W}" y1="${H - B}" y2="${H - B}" stroke="var(--line-2)"/>${bars}<text x="${L}" y="${H - 4}" font-size="11" fill="var(--muted)">오래된 차례</text><text x="${W}" y="${H - 4}" font-size="11" fill="var(--muted)" text-anchor="end">최근</text></svg></figure>`;
}

function renderStats(): void {
  const hist = state.history.slice(-30);
  const recent = state.history.slice(-10);
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  const totalHits = state.history.reduce((a, h) => a + h.n, 0);
  const rows = HANGUL_KEYS.map((code) => ({ code, sc: score(state, code), f: fingerOf(code) }))
    .sort((a, b) => (a.sc.calibrated === b.sc.calibrated ? a.sc.score - b.sc.score : a.sc.calibrated ? 1 : -1));
  const fmtDate = (t: number) => { const d = new Date(t); return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
  const cpmMax = Math.ceil(Math.max(100, ...hist.map((h) => h.cpm)) / 100) * 100;
  $('stats').innerHTML = `
    <section class="stat-tiles">
      <div class="tile"><span class="tk">연습한 차례</span><strong>${state.history.length}</strong></div>
      <div class="tile"><span class="tk">누적 타수</span><strong>${totalHits.toLocaleString('ko-KR')}</strong></div>
      <div class="tile"><span class="tk">최근 10차례 속도</span><strong>${recent.length ? Math.round(avg(recent.map((h) => h.cpm))) : '–'}</strong><span class="tu">타/분</span></div>
      <div class="tile"><span class="tk">최근 10차례 정확도</span><strong>${recent.length ? (avg(recent.map((h) => h.acc)) * 100).toFixed(1) : '–'}</strong><span class="tu">%</span></div>
      <div class="tile"><span class="tk">오늘</span><strong>${Math.floor(state.daily.ms / 60000)}</strong><span class="tu">분</span></div>
    </section>

    <section class="stat-block">
      <h2>키별 숙련도 지도</h2>
      <p class="stat-sub">숫자는 숙련도(%)입니다. 밝을수록 잘 익힌 키, 어두울수록 더 연습할 키입니다. 표본이 ${MIN_SAMPLES}타보다 적으면 –로 보입니다. 목표 속도 ${state.targetCpm}타 기준.</p>
      <div class="heat-legend" aria-hidden="true"><span>0</span>${HEAT.map((c) => `<i style="background:${c}"></i>`).join('')}<span>100</span></div>
      <div class="kbd-wrap" id="heat-wrap"><div class="kbd" id="heat-kbd"></div></div>
    </section>

    <section class="stat-block">
      <h2>최근 차례</h2>
      ${hist.length ? `<div class="charts">
        ${barChart(hist.map((h) => h.cpm), { max: cpmMax, unit: '타/분', fmt: (v) => String(Math.round(v)), label: '속도 (타/분)', ticks: [0, cpmMax / 2, cpmMax], dates: hist.map((h) => fmtDate(h.t)) })}
        ${barChart(hist.map((h) => h.acc * 100), { max: 100, unit: '%', fmt: (v) => v.toFixed(0), label: '정확도 (%)', ticks: [0, 50, 100], dates: hist.map((h) => fmtDate(h.t)) })}
      </div>` : '<p class="stat-sub">아직 마친 차례가 없습니다. 한 차례를 끝까지 치면 여기에 쌓입니다.</p>'}
    </section>

    <section class="stat-block">
      <h2>키별 기록 <span class="stat-sub">약한 키부터</span></h2>
      <div class="table-wrap"><table class="ktable">
        <thead><tr><th>키</th><th>낱자</th><th>손가락</th><th class="num">표본</th><th class="num">정확도</th><th class="num">속도</th><th>숙련도</th></tr></thead>
        <tbody>${rows.map(({ code, sc, f }) => {
          const k = P2[code] as any;
          const jamo = k.side === 'R' ? `초성 ${k.cho}${k.rightVowel ? ` · (${k.rightVowel})` : ''}` : `받침 ${k.jong}${k.vowel ? ` · 중성 ${k.vowel}` : ''}`;
          const pct = Math.round(sc.score * 100);
          return `<tr><td class="mono">${esc(keyLabel(code))}</td><td>${esc(jamo)}</td><td>${f ? FINGER_NAME[f] : ''}</td><td class="num">${sc.samples}</td><td class="num">${sc.samples ? Math.round(sc.acc * 100) + '%' : '–'}</td><td class="num">${sc.cpm ? Math.round(sc.cpm) : '–'}</td><td><span class="tbar"><i style="width:${sc.calibrated ? pct : 0}%;background:${scoreColor(code)}"></i></span> <span class="num">${sc.calibrated ? pct + '%' : '표본 부족'}</span></td></tr>`;
        }).join('')}</tbody>
      </table></div>
    </section>

    <section class="stat-block">
      <h2>기록 지우기</h2>
      <p class="stat-sub">키별 기록, 차례 기록, 단계 진도를 모두 지웁니다. 내 글감과 설정은 남습니다.</p>
      <div id="reset-area"><button type="button" class="btn" id="reset-ask">기록 지우기…</button></div>
    </section>`;
  drawKeyboard({ target: $('heat-kbd'), wrap: $('heat-wrap'), heat: true });
}

function renderAll(): void {
  renderControls();
  $('practice').hidden = view !== 'practice';
  $('stats').hidden = view !== 'stats';
  if (view === 'stats') { renderStats(); return; }
  buildKeyboard();
  renderMeta();
  renderCredit();
  renderLive();
}
function renderLive(): void {
  renderText();
  renderGuide();
  renderKeyHighlight();
  renderHands();
}

// ── 알림·말풍선 ───────────────────────────────
let toastTimer = 0;
function toast(msg: string): void {
  const t = $('toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => { t.hidden = true; }, 3500);
}
document.addEventListener('mousemove', (e) => {
  const tip = $('tip');
  const g = (e.target as Element).closest?.('[data-tip],[data-tipkey]') as HTMLElement | null;
  document.querySelectorAll('.bar-g.hover').forEach((x) => x.classList.remove('hover'));
  if (!g) { tip.hidden = true; return; }
  let text = g.getAttribute('data-tip') ?? '';
  const k = g.getAttribute('data-tipkey');
  if (k) {
    const sc = score(state, k);
    text = `${keyLabel(k)} · ${chipGlyph(k)} · ${sc.calibrated ? `숙련도 ${Math.round(sc.score * 100)}% · ${Math.round(sc.cpm)}타/분 · 정확도 ${Math.round(sc.acc * 100)}%` : `표본 ${sc.samples}/${MIN_SAMPLES}`}`;
  } else g.classList.add('hover');
  tip.textContent = text;
  tip.hidden = false;
  tip.style.left = `${Math.min(window.innerWidth - 240, e.clientX + 12)}px`;
  tip.style.top = `${e.clientY + 14}px`;
});

// ── 입력 ───────────────────────────────────────
function finishLesson(): void {
  state.last = { cpm: lesson.cpm, acc: lesson.accuracy };
  state.history.push({ t: Date.now(), cpm: lesson.cpm, acc: lesson.accuracy, mode: state.mode, n: lesson.hits });
  if (state.history.length > 200) state.history.splice(0, state.history.length - 200);
  if (state.daily.date !== today()) state.daily = { date: today(), ms: 0 };
  state.daily.ms += lesson.elapsedMs;
  if (!isText() && state.unlockOn && state.stage === state.unlocked && state.unlocked < 3 && stageReady(state, stage().keys)) {
    state.unlocked++;
    state.stage = state.unlocked;
    toast(`${STAGES[state.stage - 1].name.replace('+ ', '')} 자모가 열렸습니다`);
  }
  save(state);
  newLesson();
}

window.addEventListener('keydown', (e) => {
  if (view !== 'practice' || !$('mine-panel').hidden) return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const tag = (e.target as HTMLElement)?.tagName;
  if (tag === 'SELECT' || tag === 'TEXTAREA') return;
  if (e.code === 'Escape') { newLesson(); return; }
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') return;
  if (e.code !== 'Space' && !P2[e.code] && !PUNCT[e.code] && !SHIFT_PUNCT[e.code]) return;
  e.preventDefault();
  if (e.repeat) return;
  const r = lesson.press(e.code, performance.now(), e.shiftKey);
  if (!r) return;
  record(state, r.expected, { ok: r.ok, ms: r.ok ? r.ms : null });
  lastWrong = r.ok ? null : e.code;
  if (lesson.done) { finishLesson(); return; }
  renderLive();
  if (lesson.hits % 8 === 0) { renderMeta(); save(state); }
});

// ── 클릭 ───────────────────────────────────────
function openMine(): void {
  ($('mine-input') as HTMLTextAreaElement).value = mine.join('\n');
  $('mine-report').textContent = mine.length ? `지금 ${mine.length}개가 저장되어 있습니다.` : '';
  $('mine-panel').hidden = false;
  ($('mine-input') as HTMLTextAreaElement).focus();
}
document.addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest('button');
  if (!b) return;
  const d = b.dataset;
  if (d.mode) { state.mode = d.mode as 'words' | 'text'; save(state); newLesson(); }
  if (d.unlock) {
    state.unlockOn = d.unlock === 'on';
    if (!state.unlockOn && !state.customKeys) state.customKeys = [...stage().keys];
    save(state); newLesson();
  }
  if (d.stage) { state.stage = Number(d.stage); save(state); newLesson(); }
  if (d.source) {
    if (d.source === 'mine' && !mine.length) openMine();
    else { state.textSource = d.source; save(state); newLesson(); }
  }
  if (d.layout) { state.layout = d.layout; save(state); renderAll(); }
  if (d.pick) {
    const cur = new Set(customKeys());
    if (cur.has(d.pick)) {
      cur.delete(d.pick);
      if (poolFor([...cur]).length < 5) { toast('이 키를 빼면 칠 수 있는 낱말이 5개보다 적어집니다'); return; }
    } else cur.add(d.pick);
    state.customKeys = HANGUL_KEYS.filter((k) => cur.has(k));
    save(state); newLesson();
  }
  if (b.id === 'view-toggle') { view = view === 'stats' ? 'practice' : 'stats'; renderAll(); }
  if (b.id === 'edit-mine') openMine();
  if (b.id === 'mine-cancel') $('mine-panel').hidden = true;
  if (b.id === 'mine-save') {
    const r = normalize(($('mine-input') as HTMLTextAreaElement).value);
    mine = r.lines;
    saveMine(mine);
    const notes = [`글감 ${r.lines.length}개를 저장했습니다.`];
    if (r.removed.length) notes.push(`칠 수 없어서 뺀 글자: ${r.removed.slice(0, 20).join(' ')}${r.removed.length > 20 ? ' …' : ''}`);
    if (r.skipped) notes.push(`너무 짧거나 한글이 없어 건너뛴 줄: ${r.skipped}개`);
    $('mine-report').textContent = notes.join(' ');
    if (mine.length) {
      state.textSource = 'mine'; state.mode = 'text'; save(state);
      $('mine-panel').hidden = true;
      toast(notes.join(' '));
      newLesson();
    } else {
      state.textSource = 'builtin'; save(state); renderControls();
    }
  }
  if (b.id === 'reset-ask') {
    $('reset-area').innerHTML = '<span class="stat-sub">정말 지울까요? 되돌릴 수 없습니다.</span> <button type="button" class="btn btn-danger" id="reset-yes">모두 지우기</button> <button type="button" class="btn" id="reset-no">취소</button>';
  }
  if (b.id === 'reset-no') renderStats();
  if (b.id === 'reset-yes') { resetRecords(state); save(state); toast('기록을 지웠습니다'); renderStats(); }
  b.blur(); // 스페이스가 버튼을 다시 누르지 않게
});
($('target') as HTMLSelectElement).addEventListener('change', (e) => {
  state.targetCpm = Number((e.target as HTMLSelectElement).value);
  save(state);
  renderAll();
  (e.target as HTMLSelectElement).blur();
});
let resizeTimer = 0;
window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = window.setTimeout(() => renderAll(), 120); });

// 실제 키보드가 없어 보이는 기기 안내
try { $('touch-notice').hidden = !(matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches); } catch { /* 무시 */ }

newLesson();
