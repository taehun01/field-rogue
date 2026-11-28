// 룬 3개 (F3). 몸에 새겨 두면 마력을 써서 계속 쓸 수 있다 (docs/world.md 마법).
// 누구나 치유 룬을 지니고 시작하고, 다른 룬은 마을의 룬새김이에게 돈을 내고 새긴다. 숫자는 모두 [임시값].

import type { RuneId, SkillId } from "../core/types";

export interface RuneDef {
  id: RuneId;
  name: string;
  desc: string;
  /** 마력 소모 */
  cost: number;
  /** 룬새김이에게 새기는 값 */
  price: number;
  /** 어느 기술이 오르나 (F4) */
  skill: SkillId;
  /** 전투 밖에서도 쓸 수 있나 */
  field: boolean;
  /** 적에게 주는 피해 (방어 무시) */
  damage?: number;
  /** 회복량 */
  heal?: number;
  /** 적을 얼려 멈추게 하는 턴 수 */
  freeze?: number;
}

export const RUNES: Record<RuneId, RuneDef> = {
  heal: {
    id: "heal",
    name: "치유 룬",
    desc: "체력 회복",
    cost: 5,
    price: 0,
    skill: "restoration",
    field: true,
    heal: 10,
  },
  fire: {
    id: "fire",
    name: "불꽃 룬",
    desc: "방어를 무시하는 불길",
    cost: 5,
    price: 30,
    skill: "destruction",
    field: false,
    damage: 6,
  },
  frost: {
    id: "frost",
    name: "서리 룬",
    desc: "약한 피해, 적을 얼려 한 번 멈춘다",
    cost: 6,
    price: 40,
    skill: "destruction",
    field: false,
    damage: 3,
    freeze: 1,
  },
};

export const RUNE_IDS = Object.keys(RUNES) as RuneId[];
