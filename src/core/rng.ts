// 시드 기반 난수 (mulberry32). 같은 시드면 같은 판이 나온다.
// 게임 로직은 Math.random 대신 반드시 이것을 쓴다: 버그 재현, 플레이테스트 기록, 밸런스 시뮬레이션용.

export interface Rng {
  /** 0 이상 1 미만 */
  next(): number;
  /** min 이상 max 이하 정수 */
  int(min: number, max: number): number;
  /** 배열에서 하나 */
  pick<T>(items: readonly T[]): T;
  /** 다음 난수 상태 (저장·복원용) */
  readonly state: number;
}

export function createRng(seed: number): Rng {
  let s = seed >>> 0;
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int(min, max) {
      return min + Math.floor(next() * (max - min + 1));
    },
    pick(items) {
      if (items.length === 0) throw new Error("빈 배열에서 고를 수 없음");
      return items[Math.floor(next() * items.length)];
    },
    get state() {
      return s;
    },
  };
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 2 ** 32);
}
