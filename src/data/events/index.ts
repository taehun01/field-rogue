// 이벤트 데이터 모음. 이벤트를 더하거나 고칠 때는 그 지역 파일 하나만 연다.
// place 로 필드와 던전을 나누고, 필드 이벤트에 region 이 있으면 그 지역 길에서만, 없으면 어느 길에서나 나온다.
// 처리하는 쪽은 core/events.ts. 세계관은 docs/world/.
import type { RegionId } from "../../core/types";
import type { EventDef } from "./types";
import { COMMON_EVENTS } from "./common";
import { HARBOR_EVENTS } from "./harbor";
import { PINES_EVENTS } from "./pines";
import { BONES_EVENTS } from "./bones";
import { PLATEAU_EVENTS } from "./plateau";
import { DUNGEON_ONLY_EVENTS } from "./dungeon";

export type { Amount, EventDef, EventEffect, EventOption, EventOutcome } from "./types";

/** 순서가 바뀌면 시드 결과가 달라지니, 새 이벤트는 그 파일 끝에 더한다 */
export const EVENTS: readonly EventDef[] = [...COMMON_EVENTS, ...HARBOR_EVENTS, ...PINES_EVENTS, ...BONES_EVENTS, ...PLATEAU_EVENTS, ...DUNGEON_ONLY_EVENTS];

/** 필드 선택지에 나오는 이벤트 */
export const FIELD_EVENTS = EVENTS.filter((e) => e.place === "field");

/** region 지역 길에서 나오는 이벤트: 그 지역 것 + 어느 지역에서나 나오는 것 */
export function fieldEvents(region: RegionId): EventDef[] {
  return FIELD_EVENTS.filter((e) => e.region === undefined || e.region === region);
}
/** 던전 갈림길에 나오는 이벤트 */
export const DUNGEON_EVENTS = EVENTS.filter((e) => e.place === "dungeon");

/** 단서 문장으로 이벤트를 찾는다. 없으면 undefined */
export function eventByHint(hint: string): EventDef | undefined {
  return EVENTS.find((e) => e.hints.includes(hint));
}

export function eventById(id: string): EventDef {
  const e = EVENTS.find((ev) => ev.id === id);
  if (!e) throw new Error(`없는 이벤트: ${id}`);
  return e;
}
