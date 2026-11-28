// 이벤트 처리 (5단계). 데이터는 data/events.ts.
// 이벤트 화면: 처음 문장 + 고를 거리 → 고르면 결과 하나가 가중치로 뽑혀 효과가 적용된다.
// 결과가 전투로 이어지면 game.ts 가 전투를 연다 (enemy 가 있으면 그 적).

import type { Amount, EventDef, EventEffect, EventOption } from "../data/events";
import { itemDef } from "../data/items";
import type { Rng } from "./rng";
import type { Player } from "./types";

/** 이 고를 거리를 지금 고를 수 있나 */
export function canChoose(opt: EventOption, p: Player): boolean {
  const r = opt.require;
  if (!r) return true;
  if (r.gold !== undefined && p.gold < r.gold) return false;
  if (r.item !== undefined && !p.bag.includes(r.item)) return false;
  return true;
}

/**
 * index 번 고를 거리를 고른다. player 를 직접 바꾸고, 보여줄 문장과 전투 여부를 돌려준다.
 * 고를 수 없으면 null.
 */
export function resolveOption(
  ev: EventDef,
  index: number,
  p: Player,
  rng: Rng,
): { lines: string[]; battle: boolean; enemy?: string } | null {
  const opt = ev.options[index];
  if (!opt || !canChoose(opt, p)) return null;
  const total = opt.outcomes.reduce((s, o) => s + o.weight, 0);
  let roll = rng.next() * total;
  const outcome = opt.outcomes.find((o) => (roll -= o.weight) < 0) ?? opt.outcomes[opt.outcomes.length - 1];
  const lines = [...outcome.text];
  const summary = applyEffect(outcome.effect ?? {}, p, rng);
  if (summary) lines.push(summary);
  return { lines, battle: outcome.effect?.battle === true, enemy: outcome.effect?.enemy };
}

/** 효과를 적용하고 "체력 +8 · 골드 -5" 같은 요약 문장을 돌려준다. 바뀐 게 없으면 빈 문자열 */
function applyEffect(e: EventEffect, p: Player, rng: Rng): string {
  const parts: string[] = [];
  if (e.maxHp) {
    p.maxHp += e.maxHp;
    parts.push(`최대 체력 ${signed(e.maxHp)}`);
  }
  if (e.hp !== undefined) {
    const want = roll(e.hp, rng);
    // 회복은 최대 체력까지만. 피해는 그대로 (0 아래는 game.ts 가 죽음/부적 처리)
    const delta = want > 0 ? Math.min(want, p.maxHp - p.hp) : want;
    p.hp += delta;
    parts.push(`체력 ${signed(delta)}`);
  }
  if (e.gold !== undefined) {
    const delta = Math.max(roll(e.gold, rng), -p.gold);
    p.gold += delta;
    parts.push(`골드 ${signed(delta)}`);
  }
  if (e.loseItem) {
    const i = p.bag.indexOf(e.loseItem);
    if (i >= 0) {
      p.bag.splice(i, 1);
      parts.push(`${itemDef(e.loseItem).name} -1`);
    }
  }
  if (e.gainItem) {
    // 무게를 넘어도 일단 든다. 넘으면 걸을 수 없으니 버리거나 팔아야 한다 (game.ts)
    p.bag.push(e.gainItem);
    parts.push(`${itemDef(e.gainItem).name} +1`);
  }
  return parts.join(" · ");
}

function roll(a: Amount, rng: Rng): number {
  return typeof a === "number" ? a : rng.int(a[0], a[1]);
}

function signed(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}
