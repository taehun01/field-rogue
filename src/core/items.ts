// 아이템 5종 (4단계) + 던전 전용 단단한 심장 (6단계). 이름·문장은 content 쪽에 있다.

import { ITEM_TEXT } from "../content/placeholder";
import type { Enemy, ItemId, Player } from "./types";

/** [임시값] 소지품 칸 수 */
export const INVENTORY_SIZE = 3;

export interface ItemDef {
  /** 상점 가격 */
  price: number;
  /** 전투 중에 쓸 수 있나 */
  battle: boolean;
  /** 전투 밖(선택지 화면)에서 쓸 수 있나 */
  field: boolean;
  /** 상점에 진열되나. false 면 던전 보상에서만 나온다 */
  shop: boolean;
}

/** [임시값] 가격과 쓰는 곳 */
export const ITEMS: Record<ItemId, ItemDef> = {
  potion: { price: 6, battle: true, field: true, shop: true },
  bomb: { price: 8, battle: true, field: false, shop: true },
  smoke: { price: 5, battle: true, field: false, shop: true },
  whetstone: { price: 12, battle: true, field: true, shop: true },
  // 쓰는 아이템이 아니다. 들고 있으면 체력이 0이 될 때 저절로 발동한다 (game.ts)
  charm: { price: 25, battle: false, field: false, shop: true },
  // 던전 보상 전용. 가격은 쓰지 않는다
  heart: { price: 0, battle: true, field: true, shop: false },
};

export const ITEM_IDS = Object.keys(ITEMS) as ItemId[];
/** 상점에 진열될 수 있는 아이템 */
export const SHOP_ITEM_IDS = ITEM_IDS.filter((id) => ITEMS[id].shop);

/** [임시값] 효과 크기 */
export const POTION_HEAL = 10;
export const BOMB_DAMAGE = 8;
export const WHETSTONE_ATK = 1;
/** 단단한 심장: 최대 체력이 오르고, 오른 만큼 체력도 찬다 */
export const HEART_MAXHP = 5;
/** 부활 부적이 발동하면 최대 체력의 이 비율로 버틴다 */
export const CHARM_REVIVE = 0.5;

/**
 * 소지품 index 번 아이템을 쓴다. 쓸 수 없는 곳이면 null (아무 일도 없음).
 * 쓰면 소지품에서 빠지고 player·enemy 를 직접 바꾼다. fled 는 연막탄.
 */
export function useItem(
  p: Player,
  index: number,
  enemy: Enemy | null,
): { lines: string[]; fled: boolean } | null {
  const id = p.items[index];
  if (!id) return null;
  const def = ITEMS[id];
  if (enemy ? !def.battle : !def.field) return null;
  p.items.splice(index, 1);

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
      p.atk += WHETSTONE_ATK;
      return { lines: [ITEM_TEXT.whetstone(WHETSTONE_ATK)], fled: false };
    case "heart":
      p.maxHp += HEART_MAXHP;
      p.hp += HEART_MAXHP;
      return { lines: [ITEM_TEXT.heart(HEART_MAXHP)], fled: false };
    case "charm":
      return null; // 위에서 걸러지지만 타입상 필요
  }
}
