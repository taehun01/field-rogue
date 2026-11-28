// 룬 쓰기 (F3). 룬 정의는 data/runes.ts. 전투 안(battle.ts)과 밖(game.ts)에서 같이 쓴다.

import { RUNE_TEXT } from "../content/text";
import { RUNES } from "../data/runes";
import { destructionBonus, restorationBonus } from "./skills";
import type { Battle, Player, RuneId, SkillId } from "./types";

/** [임시값] 룬을 한 번 쓸 때 그 룬의 기술(파괴·회복)이 오르는 양 */
export const RUNE_PRACTICE = 2;

/** 이 룬의 지금 피해·치유량 (기술 보너스 포함) */
export function runeDamage(p: Player, id: RuneId): number {
  return (RUNES[id].damage ?? 0) + destructionBonus(p);
}
export function runeHeal(p: Player, id: RuneId): number {
  return (RUNES[id].heal ?? 0) + restorationBonus(p);
}

/**
 * 룬을 쓴다. 마력이 모자라거나 전투 밖에서 못 쓰는 룬이면 ok: false (아무 일도 없음, lines[0] 이 까닭).
 * 쓰면 마력이 줄고 player·battle 을 직접 바꾼다. battle 이 null 이면 전투 밖.
 * skill 은 연습할 기술 (부르는 쪽이 train 한다).
 */
export function castRune(p: Player, id: RuneId, battle: Battle | null): { ok: boolean; lines: string[]; skill?: SkillId } {
  const r = RUNES[id];
  if (!battle && !r.field) return { ok: false, lines: [RUNE_TEXT.fieldOnly] };
  if (p.mp < r.cost) return { ok: false, lines: [RUNE_TEXT.noMagicka] };
  p.mp -= r.cost;

  if (r.heal) {
    const heal = Math.min(runeHeal(p, id), p.maxHp - p.hp);
    p.hp += heal;
    return { ok: true, lines: [RUNE_TEXT.heal(heal)], skill: r.skill };
  }
  const e = battle!.enemy;
  const dmg = Math.min(runeDamage(p, id), e.hp);
  e.hp -= dmg;
  if (r.freeze) {
    battle!.frozen = r.freeze;
    return { ok: true, lines: [RUNE_TEXT.frost(e.name, dmg)], skill: r.skill };
  }
  return { ok: true, lines: [RUNE_TEXT.fire(e.name, dmg)], skill: r.skill };
}
