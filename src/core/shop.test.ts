import { describe, expect, it } from "vitest";
import { DROPS, ITEM_IDS, itemDef } from "../data/items";
import { RACES, RACE_IDS } from "../data/races";
import { REGIONS, REGION_IDS } from "../data/regions";
import { guardRate } from "./battle";
import { CAMPFIRE_HEAL, newGame } from "./game";
import {
  BOMB_DAMAGE,
  GEAR_IDS,
  POTION_HEAL,
  rollDrops,
  rollStock,
  SELL_RATE,
  sellPrice,
  SHOP_ITEM_IDS,
  SHOP_USE_STOCK,
  TOWN_GEAR_STOCK,
  useItem,
} from "./items";
import { attackOf, BASE, defenseOf, equip, loadOf, newPlayer, overloaded, START_KIT } from "./player";
import { createRng } from "./rng";
import { blockBonus, weaponBonus } from "./skills";
import { fightOnce, inScene, onRoad, reach } from "./testkit";
import type { Enemy, Player } from "./types";

const player = (over: Partial<Player> = {}): Player => ({ ...newPlayer("northman"), hp: 10, maxHp: 20, bag: [], ...over });
const enemy = (): Enemy => ({ id: "wolf", name: "적", hp: 20, maxHp: 20, atk: 4, def: 0, gold: [1, 1] });

describe("종족과 캐릭터 만들기", () => {
  it("종족 4개, 시작 수치는 공통 + 종족 보너스", () => {
    expect(RACE_IDS.length).toBe(4);
    for (const r of RACE_IDS) {
      const p = newPlayer(r);
      expect(p.maxHp).toBe(BASE.hp + RACES[r].hp);
      expect(p.carry).toBe(BASE.carry + RACES[r].carry);
      expect(p.weapon).toBe(START_KIT.weapon);
      expect(p.armor).toBe(START_KIT.armor);
    }
    expect(newPlayer("halfgiant").carry).toBeGreaterThan(newPlayer("northman").carry);
  });

});

describe("장비", () => {
  it("공격은 무기, 방어는 갑옷이 정한다. 장착하면 옛 장비는 짐으로", () => {
    const p = player({ bag: ["steel_greataxe", "chainmail"] });
    expect(attackOf(p)).toBe(itemDef("rusty_axe").atk! + weaponBonus(p));
    expect(defenseOf(p)).toBe(itemDef("worn_furs").def! + blockBonus(p));
    equip(p, 0);
    expect(p.weapon).toBe("steel_greataxe");
    expect(attackOf(p)).toBe(itemDef("steel_greataxe").atk! + weaponBonus(p));
    expect(p.bag).toEqual(["chainmail", "rusty_axe"]);
    equip(p, 0);
    expect(defenseOf(p)).toBe(itemDef("chainmail").def! + blockBonus(p));
    expect(p.bag).toEqual(["rusty_axe", "worn_furs"]);
  });

  it("쓰는 물건·잡동사니는 장착할 수 없다", () => {
    const p = player({ bag: ["potion", "wolf_pelt"] });
    expect(equip(p, 0)).toBe(false);
    expect(equip(p, 1)).toBe(false);
    expect(p.bag).toEqual(["potion", "wolf_pelt"]);
  });

  it("한손 무기는 방어 행동이 더 잘 통하고, 양손은 덜 통한다", () => {
    const one = player({ weapon: "iron_sword" });
    const two = player({ weapon: "iron_greatsword" });
    expect(guardRate(one)).toBeLessThan(guardRate(two));
    expect(itemDef("iron_greatsword").atk!).toBeGreaterThan(itemDef("iron_sword").atk!);
    expect(itemDef("iron_greatsword").weight).toBeGreaterThan(itemDef("iron_sword").weight);
  });

  it("한판 안에서 장착·벗기·버리기는 전투 중에는 안 된다", () => {
    const g = reach("battle");
    const p = g.state.player;
    p.bag = ["iron_sword"];
    g.equip(0);
    g.drop(0);
    g.unequip("weapon");
    expect(p.bag).toEqual(["iron_sword"]);
    expect(p.weapon).toBe(START_KIT.weapon);
  });
});

describe("무게", () => {
  it("짐과 장착한 장비의 무게를 모두 센다", () => {
    const p = player({ bag: ["potion", "bear_pelt"] });
    expect(loadOf(p)).toBe(1 + 8 + itemDef(START_KIT.weapon).weight + itemDef(START_KIT.armor).weight);
  });

  it("무게를 넘으면 길을 떠나지도, 걷지도, 되돌아가지도 못한다. 버리면 다시 걷는다", () => {
    const g = newGame(1);
    const p = g.state.player;
    p.bag = Array(20).fill("bear_pelt");
    expect(overloaded(p)).toBe(true);
    g.depart("pines");
    expect(g.state.travel).toBeNull();

    p.bag = [];
    g.depart("pines");
    p.bag = Array(20).fill("bear_pelt");
    const step = g.state.step;
    g.choose(0);
    g.turnBack();
    expect(g.state.step).toBe(step);
    expect(g.state.travel!.walked).toBe(0);

    while (overloaded(p)) g.drop(0);
    g.choose(0);
    expect(g.state.step).toBe(step + 1);
  });

  it("무게를 넘어도 사거나 얻을 수는 있다 (넘으면 걷지 못할 뿐)", () => {
    const g = newGame(2);
    const p = g.state.player;
    p.bag = Array(20).fill("bear_pelt");
    p.gold = 999;
    g.openShop();
    const id = g.state.shop!.stock[0];
    g.buy(0);
    expect(p.bag).toContain(id);
  });
});

describe("아이템", () => {
  it("약초 물약: 전투 안팎 모두 쓸 수 있고, 쓰면 사라진다", () => {
    const p = player({ bag: ["potion", "potion"] });
    expect(useItem(p, 0, null)).not.toBeNull();
    expect(p.hp).toBe(10 + POTION_HEAL);
    expect(useItem(p, 0, enemy())).not.toBeNull();
    expect(p.bag).toEqual([]);
  });

  it("기름 단지·연기 주머니는 전투 밖에서 못 쓰고, 부적·장비·잡동사니는 쓸 수 없다", () => {
    const p = player({ bag: ["bomb", "smoke", "charm", "iron_sword", "feather"] });
    for (let i = 0; i < 5; i++) expect(useItem(p, i, null)).toBeNull();
    expect(useItem(p, 2, enemy())).toBeNull();
    expect(useItem(p, 3, enemy())).toBeNull();
    expect(p.bag.length).toBe(5);
  });

  it("기름 단지는 고정 피해, 연기 주머니는 도망, 숫돌은 공격 영구 상승", () => {
    const e = enemy();
    const p = player({ bag: ["bomb", "smoke", "whetstone"] });
    const atk = attackOf(p);
    useItem(p, 0, e);
    expect(e.hp).toBe(20 - BOMB_DAMAGE);
    expect(useItem(p, 0, e)!.fled).toBe(true);
    useItem(p, 0, null);
    expect(attackOf(p)).toBe(atk + 1);
  });

  it("뼈 부적: 체력이 0이 되면 한 번 버티고 사라진다", () => {
    const g = reach("battle");
    const p = g.state.player;
    p.maxHp = 20;
    p.hp = 1;
    p.armor = null;
    g.state.battle!.enemy.atk = 99; // 반드시 맞아 쓰러지게
    p.bag = ["charm"];
    g.act("guard");
    expect(g.state.dead).toBe(false);
    expect(p.hp).toBe(10);
    expect(p.bag).toEqual([]);
  });
});

describe("상인", () => {
  it("떠돌이 상인은 쓰는 물건만, 마을 상인은 장비도 판다", () => {
    const rng = createRng(3);
    for (let i = 0; i < 200; i++) {
      const road = rollStock(rng, false, 0);
      expect(road.length).toBe(SHOP_USE_STOCK);
      for (const id of road) expect(SHOP_ITEM_IDS).toContain(id);
      const town = rollStock(rng, true, 0);
      expect(town.length).toBe(SHOP_USE_STOCK + TOWN_GEAR_STOCK);
      expect(new Set(town).size).toBe(town.length);
      for (const id of town.slice(SHOP_USE_STOCK)) {
        expect(GEAR_IDS).toContain(id);
        expect(itemDef(id).tier!).toBeLessThanOrEqual(1);
      }
    }
  });

  it("사면 골드가 줄고 짐에 들어간다. 골드가 모자라면 살 수 없다", () => {
    const g = reach("shop");
    const p = g.state.player;
    const id = g.state.shop!.stock[0];
    p.gold = 0;
    p.bag = [];
    g.buy(0);
    expect(p.bag).toEqual([]);
    p.gold = 100;
    g.buy(0);
    expect(p.bag).toEqual([id]);
    expect(p.gold).toBe(100 - itemDef(id).price);
    expect(g.state.shop!.stock).not.toContain(id);
  });

  it(`팔면 값의 ${SELL_RATE * 100}%를 받고 짐에서 빠진다`, () => {
    const g = newGame(4);
    const p = g.state.player;
    p.bag = ["bear_pelt", "iron_sword"];
    g.sell(0); // 상점 밖에서는 못 판다
    expect(p.bag.length).toBe(2);
    g.openShop();
    g.sell(0);
    expect(p.gold).toBe(sellPrice("bear_pelt"));
    expect(sellPrice("bear_pelt")).toBe(Math.floor(itemDef("bear_pelt").price * SELL_RATE));
    expect(p.bag).toEqual(["iron_sword"]);
  });

  it("상점에 있는 동안엔 선택지를 고를 수 없고, 떠나면 길로 돌아온다", () => {
    const g = reach("shop");
    const step = g.state.step;
    g.choose(0);
    expect(g.state.step).toBe(step);
    g.leaveShop();
    expect(g.state.shop).toBeNull();
    expect(inScene(g)).toBe(false);
  });
});

describe("전리품", () => {
  it("모든 지역 적과 우두머리는 떨어뜨릴 것이 정해져 있고, 있는 물건이다", () => {
    for (const r of REGION_IDS) for (const e of REGIONS[r].enemies) expect(DROPS[e.id]?.length).toBeGreaterThan(0);
    for (const list of Object.values(DROPS)) for (const d of list) expect(ITEM_IDS).toContain(d.item);
  });

  it("잡동사니는 확률대로, 무기를 든 적은 가끔 장비도 떨어뜨린다", () => {
    const rng = createRng(5);
    let pelts = 0;
    let gear = 0;
    const n = 5000;
    for (let i = 0; i < n; i++) {
      if (rollDrops(rng, "wolf", 0).includes("wolf_pelt")) pelts++;
      if (rollDrops(rng, "bandit", 0).some((id) => GEAR_IDS.includes(id))) gear++;
      for (const id of rollDrops(rng, "wolf", 0)) expect(GEAR_IDS).not.toContain(id);
    }
    expect(Math.abs(pelts / n - DROPS.wolf[0].chance)).toBeLessThan(0.03);
    expect(gear).toBeGreaterThan(0);
  });

  it("전투에서 이기면 전리품이 짐에 들어온다 (시드 50개 중 한 번은)", () => {
    for (let seed = 1; seed <= 50; seed++) {
      const g = reach("battle", seed);
      g.state.player.bag = [];
      while (g.state.battle) fightOnce(g);
      if (g.state.player.bag.length > 0) return;
    }
    throw new Error("전리품이 한 번도 없음");
  });
});

describe("휴식", () => {
  it("길 위 모닥불은 무료로 조금 회복한다", () => {
    const g = reach("rest");
    const p = g.state.player;
    p.maxHp = 20;
    p.hp = 5;
    g.rest();
    expect(p.hp).toBe(5 + Math.ceil(20 * CAMPFIRE_HEAL));
    expect(g.state.camp).toBe(false);
  });

  it("출발하면 마을 상점 진열은 비운다", () => {
    const g = onRoad(1);
    expect(g.state.townStock).toEqual([]);
  });
});
