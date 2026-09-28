// 정방향 엔진: 물리 키 입력 → 한글 (신세벌식 P2 첫가끝 갈마들이)
import { compose, CHO_DOUBLE, JONG_COMBINE, JUNG_COMBINE } from '../hangul/jamo';
import { P2, PUNCT, SHIFT_PUNCT } from '../layout/p2';

interface State {
  cho: string;
  jung: string;
  jungFromRight: boolean; // 오른쪽 홀소리(ㅗ ㅜ ㅡ)로 넣었고 아직 겹홀소리로 이어질 수 있음
  jong: string;
  jongCombinable: boolean;
  lastCode: string;
}

const empty = (): State => ({ cho: '', jung: '', jungFromRight: false, jong: '', jongCombinable: false, lastCode: '' });

export class P2Automaton {
  private committed = '';
  private s: State = empty();

  /** 지금 조합 중인 글자 */
  get composing(): string {
    const { cho, jung, jong } = this.s;
    if (cho && jung) return compose(cho, jung, jong);
    return cho || jung || jong; // 낱자만 있을 때는 호환용 자모
  }

  get text(): string {
    return this.committed + this.composing;
  }

  reset(): void {
    this.committed = '';
    this.s = empty();
  }

  private commit(): void {
    this.committed += this.composing;
    this.s = empty();
  }

  /** @returns 처리했으면 true (P2에 없는 키는 false) */
  press(code: string, shift = false): boolean {
    if (code.startsWith('Shift+')) { code = code.slice(6); shift = true; }
    if (shift) {
      if (!SHIFT_PUNCT[code]) return false; // 기본 배열에서 윗글쇠+한글 키는 쓰지 않음
      this.commit();
      this.committed += SHIFT_PUNCT[code];
      return true;
    }
    if (code === 'Space') {
      this.commit();
      this.committed += ' ';
      return true;
    }
    if (PUNCT[code]) {
      this.commit();
      this.committed += PUNCT[code];
      return true;
    }
    const k = P2[code];
    if (!k) return false;
    const s = this.s;

    if (k.side === 'R') {
      // 초성만 있을 때: 오른쪽 홀소리 자리면 가운뎃소리
      if (s.cho && !s.jung && !s.jong && k.rightVowel) {
        s.jung = k.rightVowel;
        s.jungFromRight = true;
      } else if (s.cho && !s.jung && !s.jong && s.lastCode === code && CHO_DOUBLE[s.cho]) {
        s.cho = CHO_DOUBLE[s.cho]; // 같은 글쇠 거듭치기 → 된소리
      } else {
        this.commit();
        this.s.cho = k.cho;
      }
    } else {
      if (s.cho && !s.jung && !s.jong) {
        // 초성 뒤: 가운뎃소리
        if (!k.vowel) return true; // 아래아 자리(제외) — 무시
        s.jung = k.vowel;
        s.jungFromRight = false;
      } else if (s.jung && !s.jong) {
        const comb = s.jungFromRight && k.vowel ? JUNG_COMBINE[s.jung + k.vowel] : undefined;
        if (comb) {
          s.jung = comb;
          s.jungFromRight = false;
        } else {
          s.jong = k.jong;
          s.jongCombinable = true;
          s.jungFromRight = false;
        }
      } else if (s.jong && s.jongCombinable && JONG_COMBINE[s.jong + k.jong]) {
        s.jong = JONG_COMBINE[s.jong + k.jong];
        s.jongCombinable = false;
      } else {
        // 받침을 더 붙일 수 없음 → 받침 낱자만 새로 시작
        this.commit();
        this.s.jong = k.jong;
        this.s.jongCombinable = true;
      }
    }
    this.s.lastCode = code;
    return true;
  }

  typeAll(codes: string[]): string {
    for (const c of codes) this.press(c);
    return this.text;
  }
}

export function typeCodes(codes: string[]): string {
  return new P2Automaton().typeAll(codes);
}
