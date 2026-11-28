// 던전 (6단계). 필드에서 던전 단서를 고르면 들어온다.
// 방 3~5개(숨김)를 지난다. 방마다 갈림길 2개를 단서로 보고 고르면 전투 / 이벤트 / 빈 방 중 하나가 벌어진다.
// 갈림길 화면에서는 언제든 나갈 수 있지만, 나가면 끝 보상은 없다.
// 방을 다 지나면 그 지역 던전의 우두머리가 나오고, 쓰러뜨리면 골드 + 아이템 1개 (F1, data/regions.ts).
// 전투는 그 지역 적을 쓰고, 이벤트는 던전 전용(data/events.ts 의 place: "dungeon")만 나온다.

import { ROOM_HINTS } from "../content/text";
import { DUNGEON_EVENTS, eventByHint } from "../data/events";
import { DECEIVE_CHANCE } from "./choices";
import { itemDef } from "../data/items";
import { GEAR_IDS, SHOP_ITEM_IDS } from "./items";
import type { Rng } from "./rng";
import type { Dungeon, ItemId, RegionId, RoomChoice, RoomKind } from "./types";

/** [임시값] 던전의 방 수 [최소, 최대] */
export const DUNGEON_ROOMS: [number, number] = [3, 5];

/** [임시값] 한 화면의 갈림길 수 */
export const ROOM_CHOICES = 2;

/** [임시값] 방에서 벌어질 일의 가중치 */
export const ROOM_WEIGHTS: Record<RoomKind, number> = { battle: 50, event: 30, empty: 20 };

/** [임시값] 빈 방에서 줍는 골드 */
export const EMPTY_ROOM_GOLD: [number, number] = [2, 5];

/** [임시값] 끝 보상 골드 */
export const REWARD_GOLD: [number, number] = [6, 14];

/** [임시값] 끝 보상 아이템이 고분 심장석일 확률, 장비일 확률. 나머지는 상점의 쓰는 물건 중 하나 */
export const HEART_CHANCE = 0.3;
export const GEAR_CHANCE = 0.3;

export function newDungeon(rng: Rng, region: RegionId): Dungeon {
  return { region, rooms: rng.int(DUNGEON_ROOMS[0], DUNGEON_ROOMS[1]), cleared: 0, choices: rollRoomChoices(rng) };
}

/** 갈림길 2개. 한 화면 안에서 종류는 겹치지 않고, 필드와 같은 확률로 단서가 속인다 */
export function rollRoomChoices(rng: Rng): RoomChoice[] {
  const pool = Object.keys(ROOM_WEIGHTS) as RoomKind[];
  const out: RoomChoice[] = [];
  while (out.length < ROOM_CHOICES) {
    const hintKind = weightedPick(pool, rng);
    pool.splice(pool.indexOf(hintKind), 1);
    // 이벤트 단서는 이벤트 자기 단서를 쓴다 (고른 단서가 어떤 이벤트인지 정한다)
    const hint = rng.pick(hintKind === "event" ? DUNGEON_EVENTS.flatMap((e) => e.hints) : ROOM_HINTS[hintKind]);
    const kind =
      rng.next() < DECEIVE_CHANCE ? weightedPick((Object.keys(ROOM_WEIGHTS) as RoomKind[]).filter((k) => k !== hintKind), rng) : hintKind;
    const choice: RoomChoice = { hintKind, hint, kind };
    if (kind === "event") choice.eventId = hintKind === "event" ? eventByHint(hint)!.id : rng.pick(DUNGEON_EVENTS).id;
    out.push(choice);
  }
  return out;
}

/** 끝 보상 (우두머리 뒤 궤짝): 골드와 물건 하나. 장비는 지금 등급보다 한 등급 위까지 나온다 */
export function rollReward(rng: Rng, tier = 0): { gold: number; item: ItemId } {
  const gold = rng.int(REWARD_GOLD[0], REWARD_GOLD[1]);
  const r = rng.next();
  const item =
    r < HEART_CHANCE
      ? "heart"
      : r < HEART_CHANCE + GEAR_CHANCE
        ? rng.pick(GEAR_IDS.filter((id) => itemDef(id).tier! <= tier + 1))
        : rng.pick(SHOP_ITEM_IDS);
  return { gold, item };
}

function weightedPick(kinds: RoomKind[], rng: Rng): RoomKind {
  let roll = rng.next() * kinds.reduce((s, k) => s + ROOM_WEIGHTS[k], 0);
  for (const k of kinds) {
    roll -= ROOM_WEIGHTS[k];
    if (roll < 0) return k;
  }
  return kinds[kinds.length - 1];
}
