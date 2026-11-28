// 아이템 데이터 (F2). 쓰는 물건, 무기, 갑옷, 잡동사니. 모든 물건에 무게와 값이 있다.
// 값(price)은 살 때 가격이고, 팔면 값의 일부를 받는다 (core/items.ts SELL_RATE).
// 숫자는 모두 [임시값]. 이 파일만 고치면 물건을 더하고 빼고 바꿀 수 있다. 쓰는 효과는 core/items.ts.

/** quest: 배달 의뢰 물건 (F5). 버리거나 팔면 그 의뢰가 실패한다 */
export type ItemKind = "use" | "weapon" | "armor" | "junk" | "quest";

export interface ItemDef {
  name: string;
  /** 상점·소지품에 보이는 한 줄 설명 */
  desc: string;
  kind: ItemKind;
  price: number;
  weight: number;
  /** 상점에 진열되나. 쓰는 물건은 어느 상인이나, 장비는 마을 상인만 판다. 잡동사니는 팔기만 한다 */
  shop?: boolean;
  /** 쓰는 물건: 전투 중에 쓸 수 있나 / 전투 밖에서 쓸 수 있나 */
  battle?: boolean;
  field?: boolean;
  /** 무기: 한손 / 양손. 한손은 방어 행동이 잘 통하고, 양손은 세고 무겁다 */
  hand?: "one" | "two";
  atk?: number;
  /** 갑옷 */
  def?: number;
  /** 무거운 갑옷 (은신이 어려워진다, F4) */
  heavy?: boolean;
  /** 장비 등급 0 낡은 · 1 철 · 2 강철. 상점과 드롭은 강해질수록 높은 등급이 나온다 */
  tier?: number;
}

export const ITEMS = {
  // ── 쓰는 물건 ──
  potion: { name: "약초 물약", desc: "체력 회복", kind: "use", price: 6, weight: 1, shop: true, battle: true, field: true },
  bomb: { name: "기름 단지", desc: "불을 붙여 던진다. 큰 피해", kind: "use", price: 8, weight: 2, shop: true, battle: true },
  smoke: { name: "연기 주머니", desc: "전투에서 반드시 달아남", kind: "use", price: 5, weight: 1, shop: true, battle: true },
  whetstone: { name: "숫돌", desc: "공격력이 영구히 오름", kind: "use", price: 12, weight: 2, shop: true, battle: true, field: true },
  // 쓰는 물건이 아니다. 들고 있으면 체력이 0이 될 때 저절로 부서지며 버틴다 (game.ts)
  charm: { name: "뼈 부적", desc: "쓰러질 때 한 번 버팀", kind: "use", price: 25, weight: 1, shop: true },
  // 던전 보상 전용
  heart: { name: "고분 심장석", desc: "최대 체력이 영구히 오름", kind: "use", price: 40, weight: 1, battle: true, field: true },

  // ── 한손 무기 ──
  rusty_axe: { name: "낡은 손도끼", desc: "한손", kind: "weapon", price: 10, weight: 4, shop: true, hand: "one", atk: 3, tier: 0 },
  iron_sword: { name: "철 검", desc: "한손", kind: "weapon", price: 45, weight: 6, shop: true, hand: "one", atk: 5, tier: 1 },
  steel_sword: { name: "강철 검", desc: "한손", kind: "weapon", price: 110, weight: 8, shop: true, hand: "one", atk: 7, tier: 2 },
  // ── 양손 무기 ──
  old_greataxe: { name: "낡은 양손 도끼", desc: "양손", kind: "weapon", price: 20, weight: 10, shop: true, hand: "two", atk: 5, tier: 0 },
  iron_greatsword: { name: "철 대검", desc: "양손", kind: "weapon", price: 70, weight: 14, shop: true, hand: "two", atk: 8, tier: 1 },
  steel_greataxe: { name: "강철 대도끼", desc: "양손", kind: "weapon", price: 150, weight: 18, shop: true, hand: "two", atk: 11, tier: 2 },
  // ── 갑옷 ──
  worn_furs: { name: "해진 털옷", desc: "가벼움", kind: "armor", price: 8, weight: 4, shop: true, def: 1, tier: 0 },
  leather: { name: "가죽 갑옷", desc: "가벼움", kind: "armor", price: 35, weight: 8, shop: true, def: 2, tier: 1 },
  chainmail: { name: "사슬 갑옷", desc: "무거움", kind: "armor", price: 80, weight: 18, shop: true, def: 4, heavy: true, tier: 1 },
  steel_plate: { name: "강철 판금", desc: "무거움", kind: "armor", price: 160, weight: 26, shop: true, def: 6, heavy: true, tier: 2 },

  // ── 잡동사니 (전투 드롭, 팔기만 한다) ──
  feather: { name: "까마귀 깃털", desc: "팔 물건", kind: "junk", price: 4, weight: 1 },
  brass_ring: { name: "싸구려 반지", desc: "팔 물건", kind: "junk", price: 10, weight: 1 },
  spice: { name: "밀수 향신료", desc: "팔 물건", kind: "junk", price: 20, weight: 2 },
  wolf_pelt: { name: "늑대 가죽", desc: "팔 물건", kind: "junk", price: 14, weight: 4 },
  bear_pelt: { name: "곰 가죽", desc: "팔 물건", kind: "junk", price: 30, weight: 8 },
  silver_cup: { name: "훔친 은잔", desc: "팔 물건", kind: "junk", price: 24, weight: 2 },
  trinket: { name: "녹슨 장신구", desc: "팔 물건", kind: "junk", price: 10, weight: 1 },
  bronze_band: { name: "옛 청동 팔찌", desc: "팔 물건", kind: "junk", price: 22, weight: 1 },
  giant_bone: { name: "거인 뼈 조각", desc: "팔 물건", kind: "junk", price: 26, weight: 5 },
  white_pelt: { name: "흰 늑대 가죽", desc: "팔 물건", kind: "junk", price: 18, weight: 4 },
  troll_fat: { name: "트롤 기름", desc: "팔 물건", kind: "junk", price: 24, weight: 3 },
  frost_core: { name: "얼음 정수", desc: "팔 물건", kind: "junk", price: 28, weight: 1 },

  // ── 배달 물건 (F5 의뢰, 버리거나 팔면 의뢰 실패) ──
  sealed_letter: { name: "봉인된 편지", desc: "배달할 물건", kind: "quest", price: 2, weight: 1 },
  fish_barrel: { name: "소금 절인 생선 통", desc: "배달할 물건", kind: "quest", price: 4, weight: 6 },
  herb_bundle: { name: "약초 꾸러미", desc: "배달할 물건", kind: "quest", price: 3, weight: 2 },
  hild_axe: { name: "천에 싼 도끼", desc: "힐드가 맡긴 물건", kind: "quest", price: 15, weight: 5 },
} satisfies Record<string, ItemDef>;

export type ItemId = keyof typeof ITEMS;

export const ITEM_IDS = Object.keys(ITEMS) as ItemId[];

export function itemDef(id: ItemId): ItemDef {
  return ITEMS[id];
}

/** 적마다 떨어뜨리는 잡동사니와 확률 [임시값]. 사람 적(armed)은 가끔 장비도 떨어뜨린다 (core/items.ts) */
export const DROPS: Record<string, { item: ItemId; chance: number }[]> = {
  crows: [{ item: "feather", chance: 0.6 }],
  thug: [{ item: "brass_ring", chance: 0.4 }],
  smuggler: [{ item: "spice", chance: 0.5 }],
  wolf: [{ item: "wolf_pelt", chance: 0.6 }],
  bear: [{ item: "bear_pelt", chance: 0.7 }],
  bandit: [{ item: "silver_cup", chance: 0.4 }],
  robber: [{ item: "trinket", chance: 0.5 }],
  draugr: [{ item: "bronze_band", chance: 0.5 }],
  collector: [{ item: "giant_bone", chance: 0.6 }],
  snow_wolf: [{ item: "white_pelt", chance: 0.6 }],
  troll: [{ item: "troll_fat", chance: 0.6 }],
  wisp: [{ item: "frost_core", chance: 0.5 }],
  mother_bear: [{ item: "bear_pelt", chance: 1 }],
  old_troll: [{ item: "troll_fat", chance: 1 }],
};

/** 장비를 떨어뜨릴 수 있는 적 (무기를 든 사람·망자) */
export const ARMED = new Set(["thug", "smuggler", "bandit", "robber", "draugr", "collector", "pirate_chief", "barrow_warrior"]);
