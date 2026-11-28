// 이벤트 형식. 이벤트 하나 = 단서 + 처음 문장 + 고를 거리 2~3개, 고를 거리마다 결과가 가중치로 갈린다.
// 결과의 숫자 변화(체력 +8 등)는 처리하는 쪽(core/events.ts)이 문장 끝에 붙이므로, 문장에는 숫자를 쓰지 않는다.
import type { RegionId } from "../../core/types";
import type { ItemId } from "../items";

/** 고정값 또는 [최소, 최대] 범위 */
export type Amount = number | [number, number];

/** 결과 하나가 플레이어에게 하는 일. 적은 것만 일어난다 */
export interface EventEffect {
  hp?: Amount;
  maxHp?: number;
  gold?: Amount;
  /** 짐에서 하나 빠진다 */
  loseItem?: ItemId;
  /** 짐에 하나 들어온다 (무게를 넘어도 든다) */
  gainItem?: ItemId;
  /** 결과 문장 뒤에 전투가 시작된다. 적은 지금 지역 적 가운데 무작위, enemy 가 있으면 그 적 (data/regions.ts id) */
  battle?: true;
  enemy?: string;
}

export interface EventOutcome {
  /** 같은 고를 거리 안에서 이 결과가 나올 가중치 */
  weight: number;
  text: string[];
  effect?: EventEffect;
}

export interface EventOption {
  label: string;
  /** 이 조건이 안 되면 버튼이 꺼진다 */
  require?: { gold?: number; item?: ItemId };
  outcomes: EventOutcome[];
}

export interface EventDef {
  id: string;
  /** 어디서 벌어지나 */
  place: "field" | "dungeon";
  /** 필드 이벤트가 나오는 지역. 없으면 어느 지역에서나 */
  region?: RegionId;
  /** 선택지에 보이는 단서. 이 단서를 고르면 이 이벤트가 벌어진다 */
  hints: string[];
  intro: string[];
  options: EventOption[];
}
