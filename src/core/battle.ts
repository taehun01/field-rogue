// 턴제 전투 (3단계). 공격 / 방어 / 아이템 / 도망.
// 한 턴 = 플레이어 행동 → (적이 살아 있고 도망치지 않았으면) 적의 공격.
// 화면과 분리된 순수 로직: 시뮬레이션에서 그대로 돌린다.

import { BATTLE_TEXT, ENEMY_NAMES } from "../content/placeholder";
import { BOSS_FLEE_CHANCE } from "./boss";
import { useItem } from "./items";
import type { Rng } from "./rng";
import type { Battle, BattleAction, Enemy, EnemyId, Player } from "./types";

/** [임시값] 적 3종. 이름·묘사 문장은 content 쪽에 있다. */
/** 보통 적 (보스는 boss.ts) */
export type NormalEnemyId = Exclude<EnemyId, "boss">;

export const ENEMIES: Record<NormalEnemyId, Omit<Enemy, "id" | "name" | "hp">> = {
  // 약하고 흔하다
  weak: { maxHp: 8, atk: 4, def: 0, gold: [3, 6] },
  // 오래 버틴다. 방어가 높아 한 대가 약하게 들어간다
  tough: { maxHp: 14, atk: 4, def: 2, gold: [5, 9] },
  // 체력은 낮지만 아프게 때린다
  fierce: { maxHp: 7, atk: 7, def: 0, gold: [6, 10] },
};

/** [임시값] 적이 나올 가중치 */
export const ENEMY_WEIGHTS: Record<NormalEnemyId, number> = { weak: 50, tough: 25, fierce: 25 };

/** [임시값] 도망 성공 확률. 보스는 boss.ts BOSS_FLEE_CHANCE */
export const FLEE_CHANCE = 0.5;

/**
 * [임시값] 멀리 갈수록 세계가 위험해진다: SCALE_EVERY 걸음마다 적의 체력·공격이 SCALE_RATE 씩 오른다.
 * 숫돌·여관으로 강해진 플레이어도 결국 죽게 하기 위해 (판은 죽을 때만 끝난다). 골드 보상은 그대로.
 */
export const SCALE_EVERY = 20;
export const SCALE_RATE = 0.1;

/** step 걸음째에 만나는 적에게 곱할 배율 (0~19걸음 1.0, 20~39걸음 1.1, ...) */
export function enemyScale(step: number): number {
  return 1 + SCALE_RATE * Math.floor(step / SCALE_EVERY);
}

export function startBattle(rng: Rng, step = 0): Battle {
  const ids = Object.keys(ENEMY_WEIGHTS) as NormalEnemyId[];
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
  const m = enemyScale(step);
  const maxHp = Math.ceil(base.maxHp * m);
  const atk = Math.ceil(base.atk * m);
  return { enemy: { id, name: ENEMY_NAMES[id], ...base, hp: maxHp, maxHp, atk } };
}

/** 공격력 - 방어력 ±1, 최소 1 */
export function damage(atk: number, def: number, rng: Rng): number {
  return Math.max(1, atk - def + rng.int(-1, 1));
}

export type TurnOutcome = "ongoing" | "won" | "fled";

/**
 * 한 턴을 처리한다. battle 과 player 를 직접 바꾸고, 보여줄 문장과 결과를 돌려준다.
 * action 이 "item" 이면 itemIndex 번 소지품을 쓴다. 쓸 수 없으면 턴을 쓰지 않는다.
 */
export function battleTurn(
  b: Battle,
  p: Player,
  action: BattleAction,
  rng: Rng,
  itemIndex = 0,
): { lines: string[]; outcome: TurnOutcome } {
  const e = b.enemy;
  const lines: string[] = [];
  let guarding = false;

  switch (action) {
    case "attack": {
      const dmg = damage(p.atk, e.def, rng);
      e.hp = Math.max(0, e.hp - dmg);
      lines.push(BATTLE_TEXT.attack(e.name, dmg));
      break;
    }
    case "guard":
      guarding = true;
      lines.push(BATTLE_TEXT.guard);
      break;
    case "item": {
      const used = useItem(p, itemIndex, e);
      if (!used) return { lines: [BATTLE_TEXT.noItem], outcome: "ongoing" };
      lines.push(...used.lines);
      if (used.fled) return { lines, outcome: "fled" };
      break;
    }
    case "flee":
      if (rng.next() < (b.boss ? BOSS_FLEE_CHANCE : FLEE_CHANCE)) {
        lines.push(BATTLE_TEXT.fled);
        return { lines, outcome: "fled" };
      }
      lines.push(BATTLE_TEXT.fleeFailed);
      break;
  }

  // 공격이나 폭탄으로 쓰러뜨렸으면 반격 없이 승리
  if (e.hp <= 0) {
    const gold = rng.int(e.gold[0], e.gold[1]);
    p.gold += gold;
    lines.push(BATTLE_TEXT.won(e.name, gold));
    return { lines, outcome: "won" };
  }

  // 적의 차례
  let dmg = damage(e.atk, p.def, rng);
  if (guarding) dmg = Math.ceil(dmg / 2);
  p.hp -= dmg;
  lines.push(BATTLE_TEXT.hit(e.name, dmg));
  return { lines, outcome: "ongoing" };
}
