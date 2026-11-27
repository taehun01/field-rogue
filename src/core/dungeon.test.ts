import { describe, expect, it } from "vitest";
import { DUNGEON_EVENTS, eventById } from "../data/events";
import { HINTS, ROOM_HINTS } from "../content/placeholder";
import { DUNGEON_ROOMS, HEART_CHANCE, REWARD_GOLD, ROOM_CHOICES, rollReward, rollRoomChoices } from "./dungeon";
import { newGame, type Game } from "./game";
import { HEART_MAXHP, INVENTORY_SIZE, SHOP_ITEM_IDS, useItem } from "./items";
import { createRng } from "./rng";

/** 던전 입구를 지나 첫 갈림길 앞에 선 판. 가는 길에 죽지 않게 체력을 크게 둔다 */
function atDungeon(seed = 1): Game {
  for (let s = seed; s < seed + 500; s++) {
    const g = newGame(s);
    g.state.player.hp = g.state.player.maxHp = 999;
    for (let n = 0; n < 200 && !g.state.dead; n++) {
      const st = g.state;
      if (st.battle) g.act("attack");
      else if (st.shop) g.leaveShop();
      else if (st.camp) g.rest("campfire");
      else if (st.event) g.answer(eventById(st.event.id).options.length - 1);
      else if (st.dungeon) return g;
      else {
        const i = st.choices.findIndex((c) => c.kind === "dungeon");
        g.choose(Math.max(0, i));
      }
    }
  }
  throw new Error("던전에 닿지 못함");
}

/** 던전 안에서 한 방을 끝까지 처리한다 (전투는 공격, 이벤트는 지나간다) */
function clearRoom(g: Game, index = 0) {
  g.enterRoom(index);
  while (g.state.battle || g.state.event) {
    if (g.state.battle) g.act("attack");
    else g.answer(eventById(g.state.event!.id).options.length - 1);
  }
}

describe("던전 갈림길", () => {
  it("갈림길은 2개, 한 화면 안에서 단서 종류가 겹치지 않는다", () => {
    const rng = createRng(3);
    for (let i = 0; i < 500; i++) {
      const cs = rollRoomChoices(rng);
      expect(cs.length).toBe(ROOM_CHOICES);
      expect(new Set(cs.map((c) => c.hintKind)).size).toBe(cs.length);
      for (const c of cs) if (c.kind === "event") expect(eventById(c.eventId!).place).toBe("dungeon");
    }
  });

  it("들어가면 필드 선택지는 비고, 던전 안에서는 choose 가 무시된다", () => {
    const g = atDungeon();
    const d = g.state.dungeon!;
    expect(d.rooms).toBeGreaterThanOrEqual(DUNGEON_ROOMS[0]);
    expect(d.rooms).toBeLessThanOrEqual(DUNGEON_ROOMS[1]);
    expect(d.cleared).toBe(0);
    expect(g.state.choices).toEqual([]);
    const step = g.state.step;
    g.choose(0);
    expect(g.state.step).toBe(step);
  });
});

describe("던전 이벤트", () => {
  it("던전 단서와 필드 단서는 겹치지 않는다", () => {
    const dungeon = [...DUNGEON_EVENTS.flatMap((e) => e.hints), ...ROOM_HINTS.battle, ...ROOM_HINTS.empty];
    const field = Object.values(HINTS).flat();
    expect(new Set(dungeon).size).toBe(dungeon.length);
    for (const h of dungeon) expect(field).not.toContain(h);
  });

  it("필드 선택지에서는 던전 이벤트가 벌어지지 않는다 (시드 300개)", () => {
    for (let seed = 1; seed <= 300; seed++) {
      const g = newGame(seed);
      for (let n = 0; n < 100; n++) {
        for (const c of g.state.choices) if (c.kind === "event") expect(eventById(c.eventId!).place).toBe("field");
        const before = g.state.choices.length;
        if (before === 0) break;
        // 선택지를 바꾸려고 상점·쉴 곳만 거쳐 간다 (위험 없이 화면을 넘김)
        const i = g.state.choices.findIndex((c) => c.kind === "shop" || c.kind === "rest");
        if (i < 0) break;
        g.choose(i);
        if (g.state.shop) g.leaveShop();
        if (g.state.camp) g.rest("campfire");
      }
    }
  });
});

describe("던전 진행", () => {
  it("방 수만큼 지나면 골드와 아이템을 받고 밖으로 나온다 (시드 100개)", () => {
    for (let seed = 1; seed <= 100; seed++) {
      const g = atDungeon(seed);
      const rooms = g.state.dungeon!.rooms;
      g.state.player.items = []; // 보상 아이템이 들어갈 자리
      for (let i = 0; i < rooms; i++) {
        expect(g.state.dungeon!.cleared).toBe(i);
        const goldBefore = g.state.player.gold;
        clearRoom(g, i % ROOM_CHOICES);
        if (i < rooms - 1) {
          expect(g.state.dungeon).not.toBeNull();
          expect(g.state.dungeon!.choices.length).toBe(ROOM_CHOICES);
        } else {
          expect(g.state.player.gold - goldBefore).toBeGreaterThanOrEqual(REWARD_GOLD[0]);
        }
      }
      expect(g.state.dungeon).toBeNull();
      expect(g.state.choices.length).toBeGreaterThanOrEqual(2);
      // 방 안 이벤트에서 아이템을 얻을 일은 없으므로 보상 하나만 들어 있다
      expect(g.state.player.items.length).toBe(1);
    }
  });

  it("갈림길에서 나가면 보상 없이 필드로 돌아온다", () => {
    const g = atDungeon();
    const gold = g.state.player.gold;
    const items = [...g.state.player.items];
    g.leaveDungeon();
    expect(g.state.dungeon).toBeNull();
    expect(g.state.player.gold).toBe(gold);
    expect(g.state.player.items).toEqual(items);
    expect(g.state.choices.length).toBeGreaterThanOrEqual(2);
  });

  it("방 안(전투·이벤트 중)에서는 나갈 수 없다", () => {
    for (let seed = 1; seed <= 100; seed++) {
      const g = atDungeon(seed);
      const i = g.state.dungeon!.choices.findIndex((c) => c.kind !== "empty");
      if (i < 0) continue;
      g.enterRoom(i);
      g.leaveDungeon();
      expect(g.state.dungeon).not.toBeNull();
      return;
    }
    throw new Error("빈 방이 아닌 갈림길이 없음");
  });

  it("소지품이 가득 차면 보상 아이템은 두고 나온다", () => {
    const g = atDungeon(7);
    g.state.player.items = Array(INVENTORY_SIZE).fill("bomb");
    const rooms = g.state.dungeon!.rooms;
    for (let i = 0; i < rooms; i++) clearRoom(g);
    expect(g.state.dungeon).toBeNull();
    expect(g.state.player.items.length).toBe(INVENTORY_SIZE);
  });

  it("갈림길에서는 회복약을 쓸 수 있다", () => {
    const g = atDungeon();
    g.state.player.hp = 1;
    g.state.player.items = ["potion"];
    g.use(0);
    expect(g.state.player.hp).toBeGreaterThan(1);
  });
});

describe("끝 보상", () => {
  it("단단한 심장은 가끔 나오고, 나머지는 상점 아이템", () => {
    const rng = createRng(11);
    let hearts = 0;
    const n = 5000;
    for (let i = 0; i < n; i++) {
      const r = rollReward(rng);
      if (r.item === "heart") hearts++;
      expect(r.gold).toBeGreaterThanOrEqual(REWARD_GOLD[0]);
      expect(r.gold).toBeLessThanOrEqual(REWARD_GOLD[1]);
    }
    expect(hearts / n).toBeGreaterThan(HEART_CHANCE - 0.03);
    expect(hearts / n).toBeLessThan(HEART_CHANCE + 0.03);
  });

  it("단단한 심장은 상점에 나오지 않는다", () => {
    expect(SHOP_ITEM_IDS).not.toContain("heart");
    expect(SHOP_ITEM_IDS.length).toBe(5);
  });

  it("단단한 심장: 최대 체력과 체력이 함께 오르고 사라진다", () => {
    const p = { hp: 10, maxHp: 20, atk: 3, def: 1, gold: 0, items: ["heart" as const] };
    expect(useItem(p, 0, null)).not.toBeNull();
    expect(p.maxHp).toBe(20 + HEART_MAXHP);
    expect(p.hp).toBe(10 + HEART_MAXHP);
    expect(p.items).toEqual([]);
  });
});
