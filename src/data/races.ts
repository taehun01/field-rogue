// 종족 4개 (F2). 시작 수치 보너스와 시작 기술 보너스만 다르다 (고유 능력은 docs/open-questions.md).
// 세계관 설명은 docs/world.md. 숫자는 모두 [임시값].

import type { RaceId, RuneId, SkillId } from "../core/types";

export interface RaceDef {
  id: RaceId;
  name: string;
  /** 캐릭터 만들기 화면의 설명 */
  desc: string;
  /** 시작 수치에 더하는 값 */
  hp: number;
  stamina: number;
  magicka: number;
  /** 들 수 있는 무게 */
  carry: number;
  /** 시작 기술에 더하는 값 (F4) */
  skills: Partial<Record<SkillId, number>>;
  /** 치유 룬 말고 더 지니고 태어나는 룬 (F3) */
  runes: RuneId[];
}

export const RACES: Record<RaceId, RaceDef> = {
  northman: {
    id: "northman",
    name: "북방인",
    desc: "이 땅의 주인. 키 크고 단단하며 추위에 강하다. 체력이 많고 무기를 잘 다룬다.",
    hp: 5,
    stamina: 0,
    magicka: 0,
    carry: 0,
    skills: { weapon: 5, block: 3 },
    runes: [],
  },
  halfgiant: {
    id: "halfgiant",
    name: "반거인",
    desc: "거인의 피가 섞인 크고 느린 사람. 체력이 아주 많고 짐을 많이 들지만, 기력이 적다.",
    hp: 10,
    stamina: -3,
    magicka: 0,
    carry: 20,
    skills: { block: 5 },
    runes: [],
  },
  snowelf: {
    id: "snowelf",
    name: "눈요정",
    desc: "하얀 고원의 창백하고 가는 요정. 몸은 약하지만 마력이 많고, 불꽃 룬을 지니고 태어난다.",
    hp: -3,
    stamina: 0,
    magicka: 10,
    carry: -5,
    skills: { destruction: 5, restoration: 3 },
    runes: ["fire"],
  },
  wolfblood: {
    id: "wolfblood",
    name: "늑대혈족",
    desc: "보름달이면 늑대가 되는 혈통의 사냥꾼. 기력이 많고 소리 없이 움직인다. 사람들이 경계한다.",
    hp: 0,
    stamina: 5,
    magicka: 0,
    carry: 0,
    skills: { sneak: 5, weapon: 3 },
    runes: [],
  },
};

export const RACE_IDS = Object.keys(RACES) as RaceId[];
