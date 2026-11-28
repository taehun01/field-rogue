// 지도 그림 (F1). 지역 4곳과 길, 길마다 걸음 수, 지금 있는 곳을 도트 느낌의 SVG로 그린다.
// 위치는 그림용일 뿐이고, 실제 거리는 core/map.ts ROADS 가 정한다.

import { REGIONS } from "../data/regions";
import { ROADS } from "../core/map";
import type { GameState, RegionId } from "../core/types";

/** 그림 위 자리 (viewBox 640×160) */
const POS: Record<RegionId, [number, number]> = {
  harbor: [70, 118],
  pines: [230, 58],
  bones: [400, 112],
  plateau: [570, 42],
};

export function mapSvg(s: GameState): string {
  const roads = ROADS.map((r) => {
    const [x1, y1] = POS[r.a];
    const [x2, y2] = POS[r.b];
    // 서리항–뼈의 골짜기 해안 길은 아래로 휘어 그린다
    const coast = (r.a === "harbor" && r.b === "bones") || (r.a === "bones" && r.b === "harbor");
    const mx = (x1 + x2) / 2;
    const my = coast ? Math.max(y1, y2) + 34 : (y1 + y2) / 2;
    const path = coast ? `M${x1} ${y1} Q${mx} ${my + 18} ${x2} ${y2}` : `M${x1} ${y1} L${x2} ${y2}`;
    const active =
      s.travel && ((s.travel.from === r.a && s.travel.to === r.b) || (s.travel.from === r.b && s.travel.to === r.a));
    return `<path d="${path}" class="road${active ? " active" : ""}"/>
      <text x="${mx}" y="${coast ? my + 8 : my - 8}" class="dist">${r.steps}</text>`;
  }).join("");

  const nodes = (Object.keys(POS) as RegionId[]).map((id) => {
    const [x, y] = POS[id];
    const here = !s.travel && s.at === id;
    return `<rect x="${x - 6}" y="${y - 6}" width="12" height="12" class="node${here ? " here" : ""}"/>
      <text x="${x}" y="${y + 24}" class="label${here ? " here" : ""}">${REGIONS[id].name}</text>`;
  }).join("");

  return `<svg viewBox="0 0 640 160" class="map" role="img" aria-label="지도">${roads}${nodes}${traveler(s)}</svg>`;
}

/** 길 위에 있으면 지금 자리에 점을 찍는다 */
function traveler(s: GameState): string {
  const t = s.travel;
  if (!t) return "";
  const [x1, y1] = POS[t.from];
  const [x2, y2] = POS[t.to];
  const f = t.walked / t.total;
  let x = x1 + (x2 - x1) * f;
  let y = y1 + (y2 - y1) * f;
  const coast = (t.from === "harbor" && t.to === "bones") || (t.from === "bones" && t.to === "harbor");
  if (coast) {
    // 2차 베지어 위의 점
    const cx = (x1 + x2) / 2;
    const cy = Math.max(y1, y2) + 52;
    x = (1 - f) ** 2 * x1 + 2 * (1 - f) * f * cx + f ** 2 * x2;
    y = (1 - f) ** 2 * y1 + 2 * (1 - f) * f * cy + f ** 2 * y2;
  }
  return `<rect x="${x - 4}" y="${y - 4}" width="8" height="8" class="me"/>`;
}
