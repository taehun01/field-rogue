// 턴제 전투 (3단계). 공격 / 강타 / 방어 / 룬 / 아이템 / 도망. 적은 지역마다 다르다 (data/regions.ts).
// 강타와 도망은 기력을, 룬은 마력을 쓴다 (F3). 전투 중에는 기력·마력이 차지 않는다.
// 적이 아직 나를 못 봤으면(opening) 먼저 몰래 지나가기 / 기습 / 맞서기 중에 고른다 (F4 은신).
// 적은 플레이어 레벨에 맞춰 강해진다 (F4). 한 턴에 쓴 기술은 train 으로 돌려주고, game.ts 가 올린다.
// 화면과 분리된 순수 로직: 시뮬레이션에서 그대로 돌린다.

import { BATTLE_TEXT, SNEAK_TEXT } from "../content/text";
import { enemyById, REGIONS, type EnemyDef } from "../data/regions";
import { itemDef } from "../data/items";
import { useItem } from "./items";
import { castRune, RUNE_PRACTICE } from "./magic";
import { attackOf, defenseOf } from "./player";
import { sneakChance } from "./skills";
import type { Rng } from "./rng";
import type { Battle, BattleAction, Enemy, Player, RegionId, SkillId } from "./types";

/** [임시값] 도망 성공 확률 */
export const FLEE_CHANCE = 0.5;

/** [임시값] 강타: 기력 소모와 공격력 배율. 도망: 기력 소모 */
export const POWER_COST = 4;
export const POWER_MULT = 1.8;
export const FLEE_COST = 3;

/** [임시값] 기습 성공 때 공격력 배율 (방어 무시는 아님) */
export const AMBUSH_MULT = 2;

/**
 * [임시값] 적은 플레이어 레벨에 맞춰 강해진다 (지역과는 상관없다, docs/game.md 전투).
 * 레벨 knee 까지는 한 레벨마다 체력·공격·골드가 early 씩, 그 뒤로는 late 씩 오른다.
 * 초반에는 적이 빨리 따라와 긴장이 남고, 후반에는 천천히 따라와 레벨이 오를수록 조금씩 쉬워진다 (F8 시뮬레이션).
 * defEvery 레벨마다 방어가 1 오른다.
 */
export const ENEMY_LEVEL = { early: 0.2, late: 0.08, knee: 6, defEvery: 4 };

/** level 레벨 플레이어가 만나는 적에게 곱할 배율 */
export function enemyScale(level: number): number {
  const up = Math.max(0, level - 1);
  const early = Math.min(up, ENEMY_LEVEL.knee - 1);
  const late = Math.max(0, up - (ENEMY_LEVEL.knee - 1));
  return 1 + ENEMY_LEVEL.early * early + ENEMY_LEVEL.late * late;
}

/** 지역 적 가운데 가중치로 하나를 골라 전투를 연다. 적은 아직 나를 못 봤다 (opening) */
export function startBattle(rng: Rng, region: RegionId, level = 1): Battle {
  const pool = REGIONS[region].enemies;
  let roll = rng.next() * pool.reduce((sum, e) => sum + e.weight, 0);
  const def = pool.find((e) => (roll -= e.weight) < 0) ?? pool[pool.length - 1];
  return { enemy: makeEnemy(def, level), opening: true };
}

/** 정해진 적으로 전투를 연다 (이벤트가 고른 적: 이미 마주친 상태라 opening 없음) */
export function startBattleWith(id: string, level = 1): Battle {
  return { enemy: makeEnemy(enemyById(id), level) };
}

/** 적 정의 → 이번 전투의 적. 플레이어 레벨에 맞춰 강해진다 */
export function makeEnemy(def: EnemyDef, level: number): Enemy {
  const m = enemyScale(level);
  const maxHp = Math.ceil(def.maxHp * m);
  return {
    id: def.id,
    name: def.name,
    hp: maxHp,
    maxHp,
    atk: Math.ceil(def.atk * m),
    def: def.def + Math.floor(Math.max(0, level - 1) / ENEMY_LEVEL.defEvery),
    // 골드는 레벨을 따라 오르지 않는다 (F8: 골드가 너무 남아서)
    gold: def.gold,
  };
}

/** [임시값] 방어 행동 때 받는 피해 비율. 한손 무기는 잘 막고, 양손 무기는 잘 못 막는다 */
export const GUARD_RATE = { one: 0.34, two: 0.67, none: 0.5 };

export function guardRate(p: Player): number {
  return p.weapon ? GUARD_RATE[itemDef(p.weapon).hand!] : GUARD_RATE.none;
}

/** 공격력 - 방어력 ±1, 최소 1 */
export function damage(atk: number, def: number, rng: Rng): number {
  return Math.max(1, atk - def + rng.int(-1, 1));
}

/** sneaked = 몰래 지나감 (싸움 없이 끝남, 보상 없음) */
export type TurnOutcome = "ongoing" | "won" | "fled" | "sneaked";

export interface TurnResult {
  lines: string[];
  outcome: TurnOutcome;
  /** 이 턴에 연습한 기술과 양 */
  train: Partial<Record<SkillId, number>>;
}

/** [임시값] 기술 연습량: 맞히면 무기술, 맞으면 방어(막고 맞으면 더), 은신은 성공하면 많이 */
export const PRACTICE = { hit: 1, powerHit: 2, struck: 1, guarded: 2, sneakOk: 3, sneakFail: 1 };

/**
 * 한 턴을 처리한다. battle 과 player 를 직접 바꾸고, 보여줄 문장과 결과, 연습한 기술을 돌려준다.
 * action 이 "item" 이면 index 번 짐을, "spell" 이면 index 번 룬을 쓴다.
 * 쓸 수 없거나 기력·마력이 모자라면 턴을 쓰지 않는다 (적도 움직이지 않는다).
 * opening 중에는 sneak / ambush / fight 만 받는다. 우두머리(chief)는 몰래 지나갈 수 없다.
 */
export function battleTurn(b: Battle, p: Player, action: BattleAction, rng: Rng, index = 0): TurnResult {
  const e = b.enemy;
  const lines: string[] = [];
  const train: Partial<Record<SkillId, number>> = {};
  const add = (s: SkillId, n: number) => (train[s] = (train[s] ?? 0) + n);
  let guarding = false;
  const noTurn = (line: string): TurnResult => ({ lines: [line], outcome: "ongoing", train: {} });

  /** 쓰러뜨렸다: 골드를 받고 이긴다 */
  const win = (): TurnResult => {
    const gold = rng.int(e.gold[0], e.gold[1]);
    p.gold += gold;
    lines.push(BATTLE_TEXT.won(e.name, gold));
    return { lines, outcome: "won", train };
  };

  /** 적의 차례. 얼어 있으면 건너뛴다. 맞으면 방어 기술이 오른다 */
  const enemyTurn = (): TurnResult => {
    if (b.frozen) {
      b.frozen--;
      lines.push(BATTLE_TEXT.frozen(e.name));
      return { lines, outcome: "ongoing", train };
    }
    let dmg = damage(e.atk, defenseOf(p), rng);
    if (guarding) dmg = Math.ceil(dmg * guardRate(p));
    p.hp -= dmg;
    add("block", guarding ? PRACTICE.guarded : PRACTICE.struck);
    lines.push(BATTLE_TEXT.hit(e.name, dmg));
    return { lines, outcome: "ongoing", train };
  };

  if (b.opening) {
    if (action !== "sneak" && action !== "ambush" && action !== "fight") return noTurn(BATTLE_TEXT.noItem);
    if (action === "sneak" && b.chief) return noTurn(BATTLE_TEXT.noItem);
    delete b.opening;
    if (action === "fight") {
      lines.push(SNEAK_TEXT.fight(e.name));
      return { lines, outcome: "ongoing", train };
    }
    const ok = rng.next() < sneakChance(p);
    add("sneak", ok ? PRACTICE.sneakOk : PRACTICE.sneakFail);
    if (ok && action === "sneak") {
      lines.push(SNEAK_TEXT.sneaked(e.name));
      return { lines, outcome: "sneaked", train };
    }
    if (ok) {
      // 기습: 반격 없이 한 번 크게 친다
      const dmg = damage(attackOf(p) * AMBUSH_MULT, e.def, rng);
      e.hp = Math.max(0, e.hp - dmg);
      add("weapon", PRACTICE.powerHit);
      lines.push(SNEAK_TEXT.ambushed(e.name, dmg));
      return e.hp <= 0 ? win() : { lines, outcome: "ongoing", train };
    }
    // 들켰다: 적이 먼저 한 번 친다
    lines.push(SNEAK_TEXT.spotted(e.name));
    return enemyTurn();
  }

  switch (action) {
    case "attack": {
      const dmg = damage(attackOf(p), e.def, rng);
      e.hp = Math.max(0, e.hp - dmg);
      add("weapon", PRACTICE.hit);
      lines.push(BATTLE_TEXT.attack(e.name, dmg));
      break;
    }
    case "power": {
      if (p.st < POWER_COST) return noTurn(BATTLE_TEXT.noStamina);
      p.st -= POWER_COST;
      const dmg = damage(Math.ceil(attackOf(p) * POWER_MULT), e.def, rng);
      e.hp = Math.max(0, e.hp - dmg);
      add("weapon", PRACTICE.powerHit);
      lines.push(BATTLE_TEXT.power(e.name, dmg));
      break;
    }
    case "guard":
      guarding = true;
      lines.push(BATTLE_TEXT.guard);
      break;
    case "spell": {
      const rune = p.runes[index];
      if (!rune) return noTurn(BATTLE_TEXT.noItem);
      const cast = castRune(p, rune, b);
      if (!cast.ok) return noTurn(cast.lines[0]);
      if (cast.skill) add(cast.skill, RUNE_PRACTICE);
      lines.push(...cast.lines);
      break;
    }
    case "item": {
      const used = useItem(p, index, e);
      if (!used) return noTurn(BATTLE_TEXT.noItem);
      lines.push(...used.lines);
      if (used.fled) return { lines, outcome: "fled", train };
      break;
    }
    case "flee":
      if (p.st < FLEE_COST) return noTurn(BATTLE_TEXT.fleeNoStamina);
      p.st -= FLEE_COST;
      if (rng.next() < FLEE_CHANCE) {
        lines.push(BATTLE_TEXT.fled);
        return { lines, outcome: "fled", train };
      }
      lines.push(BATTLE_TEXT.fleeFailed);
      break;
    default:
      return noTurn(BATTLE_TEXT.noItem);
  }

  // 공격이나 룬·기름 단지로 쓰러뜨렸으면 반격 없이 승리
  if (e.hp <= 0) return win();
  return enemyTurn();
}
