// 다음 선택지를 뽑는 규칙 (2단계).
// 1) 가중치 무작위로 2~3개, 한 화면 안에서 단서 종류는 겹치지 않는다
// 2) 단서 반복 막기: 바로 전 화면에 나온 단서 문장은 다시 안 나온다
// 3) 연달아 같은 일 막기: 방금 벌어진 종류는 다음 화면에 안 나오고, 그 뒤로 서서히 원래 확률로 돌아온다
// 4) 가끔 속임: 낮은 확률로 단서와 다른 일이 벌어진다 (속여도 막힌 종류는 안 벌어진다)
// 5) 이벤트 단서는 이벤트마다 따로 있어, 고른 단서가 어떤 이벤트인지 정한다 (5단계)
// 6) 단서와 이벤트는 지금 걸음의 지역 것만 나온다 (F1, data/regions.ts)

import { eventByHint, fieldEvents } from "../data/events";
import { REGIONS } from "../data/regions";
import type { Rng } from "./rng";
import type { Choice, RegionId, SceneKind } from "./types";

/** [임시값] 장면 종류가 선택지로 나올 가중치. 플레이해 보고 조정한다. */
export const SCENE_WEIGHTS: Record<SceneKind, number> = {
  battle: 35,
  event: 25,
  rest: 15,
  shop: 10,
  dungeon: 15,
};

/**
 * [임시값] 벌어진 뒤 몇 걸음 지났는지에 따라 가중치에 곱하는 값.
 * [0] = 방금 벌어짐(막힘), [1] = 한 걸음 전, ... 표 끝을 넘으면 1(원래 확률).
 */
export const RECOVERY = [0, 0.33, 0.67] as const;

/** [임시값] 단서와 다른 일이 벌어질 확률 */
export const DECEIVE_CHANCE = 0.2;

/** 선택지를 뽑을 때 참고하는 직전 상황 */
export interface ChoiceContext {
  /** 종류별로 마지막으로 벌어진 뒤 지난 걸음 수 (0 = 방금). 한 번도 안 벌어졌으면 없음 */
  since: Partial<Record<SceneKind, number>>;
  /** 바로 전 화면에 보였던 단서 문장들 */
  lastHints: readonly string[];
  /** 이 걸음이 어느 지역인가 */
  region: RegionId;
}

export const EMPTY_CONTEXT: ChoiceContext = { since: {}, lastHints: [], region: "harbor" };

/** region 지역 길에서 kind 종류의 단서들 */
export function hintsFor(region: RegionId, kind: SceneKind): readonly string[] {
  return kind === "event" ? fieldEvents(region).flatMap((e) => e.hints) : REGIONS[region].hints[kind];
}

/** 지금 화면의 종류별 가중치 */
export function currentWeights(ctx: ChoiceContext): Record<SceneKind, number> {
  const w = { ...SCENE_WEIGHTS };
  for (const k of Object.keys(w) as SceneKind[]) {
    const s = ctx.since[k];
    if (s !== undefined && s < RECOVERY.length) w[k] *= RECOVERY[s];
  }
  return w;
}

export function rollChoices(rng: Rng, ctx: ChoiceContext = EMPTY_CONTEXT): Choice[] {
  const count = rng.int(2, 3);
  const weights = currentWeights(ctx);
  // 막힌(가중치 0) 종류는 아예 뺀다. 막혀도 3종 이상 남으므로 개수는 항상 채워진다
  const pool = (Object.keys(weights) as SceneKind[]).filter((k) => weights[k] > 0);
  const out: Choice[] = [];
  while (out.length < count) {
    const hintKind = weightedPick(pool, weights, rng);
    pool.splice(pool.indexOf(hintKind), 1);
    const hint = pickHint(hintsFor(ctx.region, hintKind), ctx.lastHints, rng);
    const kind = rng.next() < DECEIVE_CHANCE ? otherKind(hintKind, weights, rng) : hintKind;
    const choice: Choice = { hintKind, hint, kind };
    // 이벤트 단서면 그 이벤트가, 다른 단서에 속아 이벤트가 벌어지면 아무 이벤트나 벌어진다
    if (kind === "event") choice.eventId = hintKind === "event" ? eventByHint(hint)!.id : rng.pick(fieldEvents(ctx.region)).id;
    out.push(choice);
  }
  return out;
}

/** 전 화면 단서를 뺀 나머지에서 고른다. 다 빠지면(단서가 너무 적으면) 전체에서 고른다. */
function pickHint(hints: readonly string[], lastHints: readonly string[], rng: Rng): string {
  const fresh = hints.filter((h) => !lastHints.includes(h));
  return rng.pick(fresh.length > 0 ? fresh : hints);
}

/** 속일 때 실제로 벌어질 종류: 단서 종류와 막힌 종류를 뺀 나머지에서, 지금 가중치로 */
function otherKind(hintKind: SceneKind, weights: Record<SceneKind, number>, rng: Rng): SceneKind {
  const others = (Object.keys(weights) as SceneKind[]).filter((k) => k !== hintKind && weights[k] > 0);
  return weightedPick(others, weights, rng);
}

function weightedPick(kinds: SceneKind[], weights: Record<SceneKind, number>, rng: Rng): SceneKind {
  const total = kinds.reduce((sum, k) => sum + weights[k], 0);
  let roll = rng.next() * total;
  for (const k of kinds) {
    roll -= weights[k];
    if (roll < 0) return k;
  }
  return kinds[kinds.length - 1];
}
