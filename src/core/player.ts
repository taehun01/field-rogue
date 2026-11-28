// 플레이어 만들기와, 장비·무게·기술에서 나오는 수치 (F2, F4).
// 공격 = 무기 공격력 + atkBonus + 무기술, 방어 = 갑옷 방어력 + 방어 기술. 무게 = 짐 + 장착한 장비.

import { itemDef, type ItemId } from "../data/items";
import { RACES } from "../data/races";
import { blockBonus, startSkills, weaponBonus, zeroPractice } from "./skills";
import type { Player, RaceId } from "./types";

/** [임시값] 모든 종족 공통 시작 수치. 종족 보너스는 data/races.ts */
export const BASE = { hp: 20, stamina: 10, magicka: 10, carry: 40 };

/** [임시값] 맨손 공격력 (무기가 없을 때) */
export const FIST_ATK = 1;

/** [임시값] 시작 장비와 짐 */
export const START_KIT: { weapon: ItemId; armor: ItemId; bag: ItemId[] } = {
  weapon: "rusty_axe",
  armor: "worn_furs",
  bag: ["potion"],
};

export function newPlayer(race: RaceId): Player {
  const r = RACES[race];
  const hp = BASE.hp + r.hp;
  const st = BASE.stamina + r.stamina;
  const mp = BASE.magicka + r.magicka;
  return {
    race,
    hp,
    maxHp: hp,
    st,
    maxSt: st,
    mp,
    maxMp: mp,
    runes: ["heal", ...r.runes],
    gold: 0,
    bag: [...START_KIT.bag],
    weapon: START_KIT.weapon,
    armor: START_KIT.armor,
    atkBonus: 0,
    carry: BASE.carry + r.carry,
    level: 1,
    skills: startSkills(r.skills),
    practice: zeroPractice(),
    rises: 0,
  };
}

export function attackOf(p: Player): number {
  return (p.weapon ? itemDef(p.weapon).atk! : FIST_ATK) + p.atkBonus + weaponBonus(p);
}

export function defenseOf(p: Player): number {
  return (p.armor ? itemDef(p.armor).def! : 0) + blockBonus(p);
}

/** 지금 짊어진 무게 (장착한 장비 포함) */
export function loadOf(p: Player): number {
  let w = 0;
  for (const id of p.bag) w += itemDef(id).weight;
  if (p.weapon) w += itemDef(p.weapon).weight;
  if (p.armor) w += itemDef(p.armor).weight;
  return w;
}

/** 기력·마력을 채운다 (최대치까지) */
export function regen(p: Player, st: number, mp: number) {
  p.st = Math.min(p.maxSt, p.st + st);
  p.mp = Math.min(p.maxMp, p.mp + mp);
}

/** 체력·기력·마력을 모두 채운다 (여관) */
export function restoreAll(p: Player) {
  p.hp = p.maxHp;
  p.st = p.maxSt;
  p.mp = p.maxMp;
}

/** 너무 무거워 걸을 수 없나 */
export function overloaded(p: Player): boolean {
  return loadOf(p) > p.carry;
}

/** 짐 index 번 장비를 장착한다. 원래 끼던 것은 짐으로 들어간다. 장비가 아니면 false */
export function equip(p: Player, index: number): boolean {
  const id = p.bag[index];
  if (!id) return false;
  const kind = itemDef(id).kind;
  if (kind !== "weapon" && kind !== "armor") return false;
  p.bag.splice(index, 1);
  const old = p[kind];
  p[kind] = id;
  if (old) p.bag.push(old);
  return true;
}

/** 장착한 장비를 벗어 짐에 넣는다 */
export function unequip(p: Player, slot: "weapon" | "armor"): boolean {
  const id = p[slot];
  if (!id) return false;
  p[slot] = null;
  p.bag.push(id);
  return true;
}
