// 턴제 전투 (3단계). 공격 / 방어 / 아이템 / 도망.
// 한 턴 = 플레이어 행동 → (적이 살아 있고 도망치지 않았으면) 적의 공격.
// 화면과 분리된 순수 로직: 시뮬레이션에서 그대로 돌린다.

import { BATTLE_TEXT, ENEMY_NAMES } from "../content/placeholder";
import type { Rng } from "./rng";
import type { Battle, BattleAction, Enemy, EnemyId, Player } from "./types";

/** [임시값] 적 3종. 이름·묘사 문장은 content 쪽에 있다. */
export const ENEMIES: Record<EnemyId, Omit<Enemy, "id" | "name" | "hp">> = {
  // 약하고 흔하다
  weak: { maxHp: 8, atk: 4, def: 0, gold: [3, 6] },
  // 오래 버틴다. 방어가 높아 한 대가 약하게 들어간다
  tough: { maxHp: 14, atk: 4, def: 2, gold: [5, 9] },
  // 체력은 낮지만 아프게 때린다
  fierce: { maxHp: 7, atk: 7, def: 0, gold: [6, 10] },
};

/** [임시값] 적이 나올 가중치 */
export const ENEMY_WEIGHTS: Record<EnemyId, number> = { weak: 50, tough: 25, fierce: 25 };

/** [임시값] 도망 성공 확률 */
export const FLEE_CHANCE = 0.5;

/** [임시값] 회복약 회복량 */
export const POTION_HEAL = 10;
export const POTION = "회복약";

export function startBattle(rng: Rng): Battle {
  const ids = Object.keys(ENEMY_WEIGHTS) as EnemyId[];
  let roll = rng.next() * ids.reduce((s, k) => s + ENEMY_WEIGHTS[k], 0);
  let id = ids[ids.length - 1];
  for (const k of ids) {
    roll -= ENEMY_WEIGHTS[k];
    if (roll < 0) {
      id = k;
      break;
    }
  }
  const base = ENEMIES[id];
  return { enemy: { id, name: ENEMY_NAMES[id], hp: base.maxHp, ...base } };
}

/** 공격력 - 방어력 ±1, 최소 1 */
export function damage(atk: number, def: number, rng: Rng): number {
  return Math.max(1, atk - def + rng.int(-1, 1));
}

export type TurnOutcome = "ongoing" | "won" | "fled";

/** 한 턴을 처리한다. battle 과 player 를 직접 바꾸고, 보여줄 문장과 결과를 돌려준다. */
export function battleTurn(
  b: Battle,
  p: Player,
  action: BattleAction,
  rng: Rng,
): { lines: string[]; outcome: TurnOutcome } {
  const e = b.enemy;
  const lines: string[] = [];
  let guarding = false;

  switch (action) {
    case "attack": {
      const dmg = damage(p.atk, e.def, rng);
      e.hp = Math.max(0, e.hp - dmg);
      lines.push(BATTLE_TEXT.attack(e.name, dmg));
      if (e.hp === 0) {
        const gold = rng.int(e.gold[0], e.gold[1]);
        p.gold += gold;
        lines.push(BATTLE_TEXT.won(e.name, gold));
        return { lines, outcome: "won" };
      }
      break;
    }
    case "guard":
      guarding = true;
      lines.push(BATTLE_TEXT.guard);
      break;
    case "item": {
      const i = p.items.indexOf(POTION);
      if (i < 0) return { lines: [BATTLE_TEXT.noItem], outcome: "ongoing" }; // 턴을 쓰지 않음
      p.items.splice(i, 1);
      const heal = Math.min(POTION_HEAL, p.maxHp - p.hp);
      p.hp += heal;
      lines.push(BATTLE_TEXT.potion(heal));
      break;
    }
    case "flee":
      if (rng.next() < FLEE_CHANCE) {
        lines.push(BATTLE_TEXT.fled);
        return { lines, outcome: "fled" };
      }
      lines.push(BATTLE_TEXT.fleeFailed);
      break;
  }

  // 적의 차례
  let dmg = damage(e.atk, p.def, rng);
  if (guarding) dmg = Math.ceil(dmg / 2);
  p.hp -= dmg;
  lines.push(BATTLE_TEXT.hit(e.name, dmg));
  return { lines, outcome: "ongoing" };
}
