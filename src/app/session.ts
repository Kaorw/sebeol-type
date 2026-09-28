// 한 차례 연습: 타 단위 판정
// - 이어치기(P2): 한 타 = 키 하나
// - 모아치기(세모이): 한 타 = 한꺼번에 눌렀다 뗀 키 묶음 (한 글자)
import type { Stroke } from '../engine/reverse';
import { SCHEME, Scheme } from '../scheme';
import { chordMatches } from '../engine/semoe';

export interface CharState { ch: string; strokes: Stroke[]; error: boolean }

/** 판정 결과. keys: 기록할 키(권하는 키 묶음), units: 속도 계산용 타 수 */
export interface PressResult { ok: boolean; expected: string; keys: string[]; ms: number | null; units: number; advanced: number }

/** 속도(타/분)에 셀 타 수: 모아치기 글자는 낱자 키 수만큼 센다 */
const unitsOf = (s: Stroke) => (s.chord ? s.chord.length : 1);

export class Lesson {
  chars: CharState[];
  ci = 0;          // 글자 위치
  si = 0;          // 글자 안의 타 위치
  hits = 0;        // 맞은 타
  misses = 0;      // 틀린 타
  units = 0;       // 맞게 친 타 수(속도용)
  startedAt: number | null = null;
  lastAt: number | null = null;
  endedAt: number | null = null;

  constructor(public text: string, public scheme: Scheme = SCHEME) {
    this.chars = [...text].map((ch) => ({ ch, strokes: scheme.charStrokes(ch), error: false }));
  }

  get done(): boolean { return this.ci >= this.chars.length; }
  get current(): CharState | undefined { return this.chars[this.ci]; }
  get expected(): Stroke | undefined { return this.current?.strokes[this.si]; }

  private advance(n = 1): void {
    for (let i = 0; i < n; i++) {
      this.si++;
      if (this.si >= this.current!.strokes.length) { this.ci++; this.si = 0; }
    }
  }

  /** 이어치기: 키 하나 */
  press(code: string, now: number, shift = false): PressResult | null {
    return this.pressChord([code], now, shift);
  }

  /**
   * 키 묶음 하나(모아치기) 또는 키 하나(이어치기)를 판정한다.
   * 모아치기에서 글자 키와 스페이스를 함께 누르면 뒤따르는 띄어쓰기까지 한 번에 친 것으로 본다.
   */
  pressChord(codes: string[], now: number, shift = false): PressResult | null {
    const exp = this.expected;
    if (!exp) return null;
    const ms = this.lastAt === null ? null : now - this.lastAt;
    if (this.startedAt === null) this.startedAt = now;
    const want = exp.chord ? exp.chord.map((p) => p.code) : [exp.code];
    let ok: boolean;
    let advanced = 1;
    if (exp.chord) {
      const set = codes.filter((c) => c !== 'Space');
      const withSpace = set.length !== codes.length;
      const next = this.chars[this.ci + 1];
      ok = !shift && chordMatches(this.current!.ch, set) && (!withSpace || next?.ch === ' ');
      if (ok && withSpace) advanced = 2;
    } else {
      ok = codes.length === 1 && codes[0] === exp.code && shift === !!exp.shift;
    }
    const units = unitsOf(exp) + (advanced === 2 ? 1 : 0);
    if (ok) {
      this.hits++;
      this.units += units;
      this.lastAt = now;
      this.advance(advanced);
      if (this.done) this.endedAt = now;
      return { ok: true, expected: exp.code, keys: want, ms, units, advanced };
    }
    this.misses++;
    this.current!.error = true;
    return { ok: false, expected: exp.code, keys: want, ms: null, units, advanced: 0 };
  }

  get elapsedMs(): number {
    if (this.startedAt === null) return 0;
    return (this.endedAt ?? this.lastAt ?? this.startedAt) - this.startedAt;
  }
  get cpm(): number { const m = this.elapsedMs / 60000; return m > 0 ? this.units / m : 0; }
  get accuracy(): number { const t = this.hits + this.misses; return t ? this.hits / t : 1; }
}
