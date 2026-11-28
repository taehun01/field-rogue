// 지도와 길 (F1). 길은 이웃한 지역끼리만 있고, 길마다 걸음 수(거리)가 정해져 있다.
// 여행 중 길의 앞쪽 절반은 떠난 지역, 뒤쪽 절반은 갈 지역의 조우가 나온다.

import type { RegionId, Travel } from "./types";

export interface Road {
  a: RegionId;
  b: RegionId;
  /** [임시값] 걸음 수 */
  steps: number;
}

/** 서리항–솔그늘–뼈의 골짜기–하얀 고원, 그리고 서리항–뼈의 골짜기 해안 길 (docs/world.md) */
export const ROADS: readonly Road[] = [
  { a: "harbor", b: "pines", steps: 6 },
  { a: "pines", b: "bones", steps: 7 },
  { a: "bones", b: "plateau", steps: 8 },
  { a: "harbor", b: "bones", steps: 9 },
];

/** 한 판이 시작하는 곳 */
export const START_REGION: RegionId = "harbor";

/** 두 지역 사이 길. 없으면 undefined */
export function roadBetween(x: RegionId, y: RegionId): Road | undefined {
  return ROADS.find((r) => (r.a === x && r.b === y) || (r.a === y && r.b === x));
}

/** 여기서 바로 갈 수 있는 곳과 거리 */
export function neighbors(at: RegionId): { to: RegionId; steps: number }[] {
  return ROADS.filter((r) => r.a === at || r.b === at).map((r) => ({ to: r.a === at ? r.b : r.a, steps: r.steps }));
}

/** 두 지역 사이 가장 짧은 걸음 수 (길을 여러 번 거쳐도). 같은 곳이면 0 */
export function distance(from: RegionId, to: RegionId): number {
  const best = new Map<RegionId, number>([[from, 0]]);
  const queue: RegionId[] = [from];
  while (queue.length) {
    const at = queue.shift()!;
    for (const n of neighbors(at)) {
      const d = best.get(at)! + n.steps;
      if (d < (best.get(n.to) ?? Infinity)) {
        best.set(n.to, d);
        queue.push(n.to);
      }
    }
  }
  return best.get(to) ?? Infinity;
}

/** 길 위 index 번째 걸음(0부터)이 어느 지역 조우인가: 앞쪽 절반은 떠난 곳, 뒤쪽 절반은 갈 곳 */
export function regionAt(t: Travel, index: number): RegionId {
  return index < t.total / 2 ? t.from : t.to;
}

/** 되돌아간다: 방향을 바꾸고, 남은 걸음은 지금까지 걸은 걸음 수가 된다 */
export function reverse(t: Travel): Travel {
  return { from: t.to, to: t.from, total: t.total, walked: t.total - t.walked };
}
