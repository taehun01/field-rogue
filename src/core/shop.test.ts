import { describe, expect, it } from "vitest";
import { CAMPFIRE_HEAL, INN_PRICE, newGame, SHOP_STOCK, type Game } from "./game";
import { BOMB_DAMAGE, INVENTORY_SIZE, ITEMS, POTION_HEAL, useItem } from "./items";
import type { Enemy, Player, SceneKind } from "./types";

/** kind 장면이 실제로 벌어질 때까지 다른 일은 무난히 넘기며 진행한다 */
function reach(kind: SceneKind, seed = 1): Game {
  for (let s = seed; s < seed + 500; s++) {
    const g = newGame(s);
    g.state.player.hp = 999; // 가는 길에 죽지 않게
    g.state.player.maxHp = 999;
    for (let n = 0; n < 200 && !g.state.dead; n++) {
      const st = g.state;
      if (st.battle) g.act("attack");
      else if (st.shop) g.leaveShop();
      else if (st.camp) g.rest("campfire");
      else {
        const i = st.choices.findIndex((c) => c.kind === kind);
        g.choose(Math.max(0, i));
        if (i >= 0) return g;
      }
    }
  }
  throw new Error(`${kind} 에 닿지 못함`);
}

const player = (over: Partial<Player> = {}): Player => ({
  hp: 10, maxHp: 20, atk: 3, def: 1, gold: 0, items: [], ...over,
});
const enemy = (): Enemy => ({ id: "weak", name: "적", hp: 20, maxHp: 20, atk: 4, def: 0, gold: [1, 1] });

describe("아이템", () => {
  it("회복약: 전투 안팎 모두 쓸 수 있고, 쓰면 사라진다", () => {
    const p = player({ items: ["potion", "potion"] });
    expect(useItem(p, 0, null)).not.toBeNull();
    expect(p.hp).toBe(10 + POTION_HEAL);
    expect(useItem(p, 0, enemy())).not.toBeNull();
    expect(p.items).toEqual([]);
  });

  it("폭탄·연막탄은 전투 밖에서 못 쓰고, 부활 부적은 어디서도 직접 못 쓴다", () => {
    const p = player({ items: ["bomb", "smoke", "charm"] });
    expect(useItem(p, 0, null)).toBeNull();
    expect(useItem(p, 1, null)).toBeNull();
    expect(useItem(p, 2, null)).toBeNull();
    expect(useItem(p, 2, enemy())).toBeNull();
    expect(p.items).toEqual(["bomb", "smoke", "charm"]);
  });

  it("폭탄은 적에게 고정 피해, 연막탄은 도망, 숫돌은 공격 영구 상승", () => {
    const e = enemy();
    const p = player({ items: ["bomb", "smoke", "whetstone"] });
    useItem(p, 0, e);
    expect(e.hp).toBe(20 - BOMB_DAMAGE);
    expect(useItem(p, 0, e)!.fled).toBe(true);
    useItem(p, 0, null);
    expect(p.atk).toBe(4);
  });

  it("부활 부적: 체력이 0이 되면 한 번 버티고 사라진다", () => {
    const g = reach("battle");
    const p = g.state.player;
    p.maxHp = 20;
    p.hp = 1;
    p.def = -99; // 반드시 맞아 쓰러지게
    p.items = ["charm"];
    g.act("guard");
    expect(g.state.dead).toBe(false);
    expect(p.hp).toBe(10);
    expect(p.items).toEqual([]);
  });
});

describe("상점", () => {
  it(`서로 다른 물건 ${SHOP_STOCK}개를 진열하고, 사면 골드가 줄고 소지품에 들어간다`, () => {
    const g = reach("shop");
    const shop = g.state.shop!;
    expect(new Set(shop.stock).size).toBe(SHOP_STOCK);
    const id = shop.stock[0];
    g.state.player.gold = 100;
    g.state.player.items = [];
    g.buy(0);
    expect(g.state.player.items).toEqual([id]);
    expect(g.state.player.gold).toBe(100 - ITEMS[id].price);
    expect(g.state.shop!.stock).not.toContain(id);
  });

  it("골드가 모자라거나 소지품이 가득 차면 살 수 없다", () => {
    const g = reach("shop");
    const p = g.state.player;
    p.gold = 0;
    p.items = [];
    g.buy(0);
    expect(p.items).toEqual([]);

    p.gold = 100;
    p.items = Array(INVENTORY_SIZE).fill("potion");
    g.buy(0);
    expect(p.items.length).toBe(INVENTORY_SIZE);
    expect(p.gold).toBe(100);
  });

  it("상점에 있는 동안엔 선택지를 고를 수 없고, 떠나면 선택지가 나온다", () => {
    const g = reach("shop");
    const step = g.state.step;
    g.choose(0);
    expect(g.state.step).toBe(step);
    g.leaveShop();
    expect(g.state.shop).toBeNull();
    expect(g.state.choices.length).toBeGreaterThanOrEqual(2);
  });
});

describe("휴식", () => {
  it("모닥불은 무료로 조금, 여관은 골드를 내고 전부 회복", () => {
    let g = reach("rest");
    let p = g.state.player;
    p.maxHp = 20;
    p.hp = 5;
    g.rest("campfire");
    expect(p.hp).toBe(5 + Math.ceil(20 * CAMPFIRE_HEAL));
    expect(g.state.camp).toBe(false);

    g = reach("rest");
    p = g.state.player;
    p.maxHp = 20;
    p.hp = 5;
    p.gold = INN_PRICE + 3;
    g.rest("inn");
    expect(p.hp).toBe(20);
    expect(p.gold).toBe(3);
  });

  it("골드가 모자라면 여관에 묵을 수 없고 계속 고르는 중", () => {
    const g = reach("rest");
    g.state.player.gold = 0;
    const hp = g.state.player.hp;
    g.rest("inn");
    expect(g.state.camp).toBe(true);
    expect(g.state.player.hp).toBe(hp);
  });
});
