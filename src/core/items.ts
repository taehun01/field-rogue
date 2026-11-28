// 물건 쓰기, 사고팔기, 전리품 (4단계 + F2). 물건 정의와 이름은 data/items.ts.

import { ITEM_TEXT } from "../content/text";
import { ARMED, DROPS, ITEM_IDS, itemDef, type ItemId } from "../data/items";
import type { Rng } from "./rng";
import { buyRate } from "./skills";
import type { Enemy, Player } from "./types";

/** [임시값] 효과 크기 */
export const POTION_HEAL = 10;
export const BOMB_DAMAGE = 8;
export const WHETSTONE_ATK = 1;
/** 고분 심장석: 최대 체력이 오르고, 오른 만큼 체력도 찬다 */
export const HEART_MAXHP = 5;
/** 뼈 부적이 부서지면 최대 체력의 이 비율로 버틴다 */
export const CHARM_REVIVE = 0.5;

/** [임시값] 흥정이 시작값일 때 팔면 받는 값의 비율 (흥정이 오르면 늘어난다, skills.ts sellRate) */
export const SELL_RATE = 0.35;

/** [임시값] 상인 진열: 쓰는 물건 수, 마을 상인의 장비 수 */
export const SHOP_USE_STOCK = 3;
export const TOWN_GEAR_STOCK = 3;

/** [임시값] 무기를 든 적이 장비를 떨어뜨릴 확률 */
export const GEAR_DROP_CHANCE = 0.15;

/** 상점에 진열될 수 있는 쓰는 물건 */
export const SHOP_ITEM_IDS = ITEM_IDS.filter((id) => itemDef(id).kind === "use" && itemDef(id).shop);
/** 마을 상인이 파는 장비 */
export const GEAR_IDS = ITEM_IDS.filter((id) => {
  const k = itemDef(id).kind;
  return k === "weapon" || k === "armor";
});

/** 이 물건을 팔면 받는 값 */
export function sellPrice(id: ItemId, rate = SELL_RATE): number {
  return Math.max(1, Math.floor(itemDef(id).price * rate));
}

/** 값 price 짜리를 살 때 내는 값 (흥정이 오르면 싸진다) */
export function buyPrice(p: Player, price: number): number {
  return Math.max(1, Math.ceil(price * buyRate(p)));
}

/**
 * 짐 index 번 물건을 쓴다. 쓸 수 없는 곳이거나 쓰는 물건이 아니면 null (아무 일도 없음).
 * 쓰면 짐에서 빠지고 player·enemy 를 직접 바꾼다. fled 는 연기 주머니.
 */
export function useItem(p: Player, index: number, enemy: Enemy | null): { lines: string[]; fled: boolean } | null {
  const id = p.bag[index];
  if (!id) return null;
  const def = itemDef(id);
  if (def.kind !== "use") return null;
  if (enemy ? !def.battle : !def.field) return null;
  p.bag.splice(index, 1);

  switch (id) {
    case "potion": {
      const heal = Math.min(POTION_HEAL, p.maxHp - p.hp);
      p.hp += heal;
      return { lines: [ITEM_TEXT.potion(heal)], fled: false };
    }
    case "bomb": {
      const e = enemy!;
      const dmg = Math.min(BOMB_DAMAGE, e.hp);
      e.hp -= dmg;
      return { lines: [ITEM_TEXT.bomb(e.name, dmg)], fled: false };
    }
    case "smoke":
      return { lines: [ITEM_TEXT.smoke], fled: true };
    case "whetstone":
      p.atkBonus += WHETSTONE_ATK;
      return { lines: [ITEM_TEXT.whetstone(WHETSTONE_ATK)], fled: false };
    case "heart":
      p.maxHp += HEART_MAXHP;
      p.hp += HEART_MAXHP;
      return { lines: [ITEM_TEXT.heart(HEART_MAXHP)], fled: false };
  }
  return null;
}

/** [임시값] 지금 나올 수 있는 장비 등급 상한. 레벨이 오를수록 좋은 장비가 나온다 */
export function gearTier(level: number): number {
  return level < 4 ? 0 : level < 8 ? 1 : 2;
}

/** 서로 다른 n 개를 pool 에서 고른다 */
function pickDistinct<T>(pool: readonly T[], n: number, rng: Rng): T[] {
  const left = [...pool];
  const out: T[] = [];
  while (out.length < n && left.length > 0) out.push(left.splice(rng.int(0, left.length - 1), 1)[0]);
  return out;
}

/** 상인 진열. 떠돌이 상인은 쓰는 물건만, 마을 상인은 장비도 판다 (등급 상한 tier 까지, 한 등급 위는 가끔) */
export function rollStock(rng: Rng, town: boolean, tier: number): ItemId[] {
  const out = pickDistinct(SHOP_ITEM_IDS, SHOP_USE_STOCK, rng);
  if (town) {
    const top = rng.next() < 0.3 ? tier + 1 : tier;
    out.push(...pickDistinct(GEAR_IDS.filter((id) => itemDef(id).tier! <= top), TOWN_GEAR_STOCK, rng));
  }
  return out;
}

/** 적을 쓰러뜨리고 얻는 전리품: 잡동사니와, 무기를 든 적이면 가끔 장비 */
export function rollDrops(rng: Rng, enemyId: string, tier: number): ItemId[] {
  const out: ItemId[] = [];
  for (const d of DROPS[enemyId] ?? []) if (rng.next() < d.chance) out.push(d.item);
  if (ARMED.has(enemyId) && rng.next() < GEAR_DROP_CHANCE) {
    out.push(rng.pick(GEAR_IDS.filter((id) => itemDef(id).tier! <= tier)));
  }
  return out;
}
