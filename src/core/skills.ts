// 기술과 레벨 (F4). 쓰는 만큼 기술이 오르고, 기술이 오른 횟수를 모아 레벨이 오른다.
// 기술 6개: 무기술(공격), 방어(방어력), 파괴(공격 룬), 회복(치유 룬), 은신(몰래 지나가기·기습), 흥정(사고팔기).
// 레벨이 오르면 체력·기력·마력 중 하나를 고른다. 기력을 고르면 들 수 있는 무게도 는다.
// 적은 플레이어 레벨에 맞춰 강해진다 (battle.ts makeEnemy). 숫자는 모두 [임시값].

import { SKILL_TEXT } from "../content/text";
import { itemDef } from "../data/items";
import type { Player, SkillId } from "./types";

export const SKILL_IDS: readonly SkillId[] = ["weapon", "block", "destruction", "restoration", "sneak", "speech"];

/** [임시값] 모든 기술의 시작값 (종족 보너스는 data/races.ts) */
export const START_SKILL = 5;
export const MAX_SKILL = 100;

/** [임시값] 기술이 몇 번 오르면 레벨이 하나 오르나 */
export const RISES_PER_LEVEL = 8;

/** [임시값] 레벨업 때 고른 수치가 오르는 양. 기력을 고르면 들 수 있는 무게도 CARRY 만큼 는다 */
export const LEVEL_GAIN = { hp: 5, st: 5, mp: 5, carry: 5 };

export type LevelStat = "hp" | "st" | "mp";

/** 기술 level 에서 다음 단계로 오르는 데 필요한 연습량. 높을수록 느리게 오른다 */
export function practiceNeeded(level: number): number {
  return 3 + Math.floor(level / 2);
}

export function startSkills(bonus: Partial<Record<SkillId, number>>): Record<SkillId, number> {
  const out = {} as Record<SkillId, number>;
  for (const id of SKILL_IDS) out[id] = START_SKILL + (bonus[id] ?? 0);
  return out;
}

export function zeroPractice(): Record<SkillId, number> {
  const out = {} as Record<SkillId, number>;
  for (const id of SKILL_IDS) out[id] = 0;
  return out;
}

/** 기술을 amount 만큼 연습한다. 오른 기술마다 문장을 돌려준다 */
export function train(p: Player, skill: SkillId, amount: number): string[] {
  const lines: string[] = [];
  p.practice[skill] += amount;
  while (p.skills[skill] < MAX_SKILL && p.practice[skill] >= practiceNeeded(p.skills[skill])) {
    p.practice[skill] -= practiceNeeded(p.skills[skill]);
    p.skills[skill]++;
    p.rises++;
    lines.push(SKILL_TEXT.rose(skill, p.skills[skill]));
  }
  return lines;
}

/** 아직 고르지 않은 레벨업 수 */
export function pendingLevels(p: Player): number {
  return Math.floor(p.rises / RISES_PER_LEVEL) + 1 - p.level;
}

/** 레벨을 하나 올리고 stat 을 키운다. 고를 레벨업이 없으면 false */
export function levelUp(p: Player, stat: LevelStat): boolean {
  if (pendingLevels(p) <= 0) return false;
  p.level++;
  if (stat === "hp") {
    p.maxHp += LEVEL_GAIN.hp;
    p.hp += LEVEL_GAIN.hp;
  } else if (stat === "st") {
    p.maxSt += LEVEL_GAIN.st;
    p.st += LEVEL_GAIN.st;
    p.carry += LEVEL_GAIN.carry;
  } else {
    p.maxMp += LEVEL_GAIN.mp;
    p.mp += LEVEL_GAIN.mp;
  }
  return true;
}

// ── 기술이 주는 것 ──

/** 시작값보다 오른 만큼 (종족 보너스 포함) */
const above = (p: Player, s: SkillId) => Math.max(0, p.skills[s] - START_SKILL);

/** 무기술: 5 오를 때마다 공격 +1 */
export const weaponBonus = (p: Player) => Math.floor(above(p, "weapon") / 5);
/** 방어: 6 오를 때마다 방어 +1 */
export const blockBonus = (p: Player) => Math.floor(above(p, "block") / 6);
/** 파괴: 3 오를 때마다 공격 룬 피해 +1 */
export const destructionBonus = (p: Player) => Math.floor(above(p, "destruction") / 3);
/** 회복: 2 오를 때마다 치유량 +1 */
export const restorationBonus = (p: Player) => Math.floor(above(p, "restoration") / 2);

/** [임시값] 은신 성공 확률: 기본 + 은신 1당, 무거운 갑옷이면 크게 깎인다 */
export const SNEAK = { base: 0.35, perSkill: 0.03, heavy: 0.2, min: 0.05, max: 0.9 };

export function sneakChance(p: Player): number {
  const heavy = p.armor !== null && itemDef(p.armor).heavy === true;
  const c = SNEAK.base + SNEAK.perSkill * above(p, "sneak") - (heavy ? SNEAK.heavy : 0);
  return Math.min(SNEAK.max, Math.max(SNEAK.min, c));
}

/** [임시값] 흥정: 1당 살 때 1% 싸지고(최대 30%), 팔 때 0.5%씩 더 받는다 (기본 35%, 최대 60%. F8에서 골드가 너무 남아 낮췄다) */
export const SPEECH = { buyPer: 0.01, buyMin: 0.7, sellBase: 0.35, sellPer: 0.005, sellMax: 0.6 };

export function buyRate(p: Player): number {
  return Math.max(SPEECH.buyMin, 1 - SPEECH.buyPer * above(p, "speech"));
}

export function sellRate(p: Player): number {
  return Math.min(SPEECH.sellMax, SPEECH.sellBase + SPEECH.sellPer * above(p, "speech"));
}

/** 사고팔 때 흥정이 오르는 양: 값 10골드마다 1, 최소 1 */
export const speechPractice = (gold: number) => Math.max(1, Math.floor(gold / 10));
