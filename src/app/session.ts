// 한 차례 연습: 키 단위 판정
import { charStrokes, Stroke } from '../engine/reverse';

export interface CharState { ch: string; strokes: Stroke[]; error: boolean }

export class Lesson {
  chars: CharState[];
  ci = 0;          // 글자 위치
  si = 0;          // 글자 안의 타 위치
  hits = 0;
  misses = 0;
  startedAt: number | null = null;
  lastAt: number | null = null;
  endedAt: number | null = null;

  constructor(public text: string) {
    this.chars = [...text].map((ch) => ({ ch, strokes: charStrokes(ch), error: false }));
  }

  get done(): boolean { return this.ci >= this.chars.length; }
  get current(): CharState | undefined { return this.chars[this.ci]; }
  get expected(): Stroke | undefined { return this.current?.strokes[this.si]; }

  /** @returns 판정 결과와 이 타의 걸린 시간 */
  press(code: string, now: number, shift = false): { ok: boolean; expected: string; ms: number | null } | null {
    const exp = this.expected;
    if (!exp) return null;
    const ms = this.lastAt === null ? null : now - this.lastAt;
    if (this.startedAt === null) this.startedAt = now;
    if (code === exp.code && shift === !!exp.shift) {
      this.hits++;
      this.lastAt = now;
      this.si++;
      if (this.si >= this.current!.strokes.length) { this.ci++; this.si = 0; }
      if (this.done) this.endedAt = now;
      return { ok: true, expected: exp.code, ms };
    }
    this.misses++;
    this.current!.error = true;
    return { ok: false, expected: exp.code, ms: null };
  }

  get elapsedMs(): number {
    if (this.startedAt === null) return 0;
    return (this.endedAt ?? this.lastAt ?? this.startedAt) - this.startedAt;
  }
  get cpm(): number { const m = this.elapsedMs / 60000; return m > 0 ? this.hits / m : 0; }
  get accuracy(): number { const t = this.hits + this.misses; return t ? this.hits / t : 1; }
}
