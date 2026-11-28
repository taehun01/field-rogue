import { describe, expect, it } from "vitest";
import { DUNGEON_EVENTS, eventById } from "../data/events";
import { REGIONS, REGION_IDS } from "../data/regions";
import { ROOM_HINTS } from "../content/text";
import { DUNGEON_ROOMS, HEART_CHANCE, REWARD_GOLD, ROOM_CHOICES, rollReward, rollRoomChoices } from "./dungeon";
import type { Game } from "./game";
import { HEART_MAXHP, SHOP_ITEM_IDS, useItem } from "./items";
import { newPlayer } from "./player";
import { createRng } from "./rng";
import { engage, fightOnce, inScene, reach, stepOnce } from "./testkit";

/** 던전 입구를 지나 첫 갈림길 앞에 선 판 */
const atDungeon = (seed = 1): Game => reach("dungeon", seed);

/** 던전 안에서 한 방을 끝까지 처리한다 (전투는 공격, 이벤트는 지나간다). 우두머리전은 남겨 둔다 */
function clearRoom(g: Game, index = 0) {
  g.enterRoom(index);
  while ((g.state.battle && !g.state.battle.chief) || g.state.event) {
    if (g.state.battle) fightOnce(g);
    else g.answer(eventById(g.state.event!.id).options.length - 1);
  }
}

/** 방을 다 지나 우두머리 앞에 선 판 */
function atChief(seed = 1): Game {
  const g = atDungeon(seed);
  while (!g.state.battle?.chief) clearRoom(g);
  return g;
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

  it("들어가면 그 지역 던전이고, 던전 안에서는 choose 가 무시된다", () => {
    const g = atDungeon();
    const d = g.state.dungeon!;
    expect(d.region).toBe(g.state.here);
    expect(d.rooms).toBeGreaterThanOrEqual(DUNGEON_ROOMS[0]);
    expect(d.rooms).toBeLessThanOrEqual(DUNGEON_ROOMS[1]);
    expect(d.cleared).toBe(0);
    expect(g.state.choices).toEqual([]);
    expect(g.state.story).toEqual([...REGIONS[d.region].dungeon.enter]);
    const step = g.state.step;
    g.choose(0);
    expect(g.state.step).toBe(step);
  });

  it("던전 안 전투는 그 지역 적이다 (시드 30개)", () => {
    for (let seed = 1; seed <= 30; seed++) {
      const g = atDungeon(seed);
      const ids = REGIONS[g.state.dungeon!.region].enemies.map((e) => e.id);
      for (let n = 0; n < 20 && g.state.dungeon && !g.state.battle?.chief; n++) {
        const i = g.state.dungeon.choices.findIndex((c) => c.kind === "battle");
        g.enterRoom(Math.max(0, i));
        if (g.state.battle && !g.state.battle.chief) expect(ids).toContain(g.state.battle.enemy.id);
        while ((g.state.battle && !g.state.battle.chief) || g.state.event) stepOnce(g);
      }
    }
  });
});

describe("던전 이벤트", () => {
  it("던전 단서와 길 위 단서는 겹치지 않는다", () => {
    const dungeon = [...DUNGEON_EVENTS.flatMap((e) => e.hints), ...ROOM_HINTS.battle, ...ROOM_HINTS.empty];
    const field = REGION_IDS.flatMap((r) => Object.values(REGIONS[r].hints).flat());
    expect(new Set(dungeon).size).toBe(dungeon.length);
    for (const h of dungeon) expect(field).not.toContain(h);
  });
});

describe("우두머리와 보물", () => {
  it("방 수만큼 지나면 그 지역 우두머리가 나온다. 이기면 골드와 아이템을 받고 길로 나온다 (시드 60개)", () => {
    for (let seed = 1; seed <= 60; seed++) {
      const g = atDungeon(seed);
      const d = g.state.dungeon!;
      const rooms = d.rooms;
      g.state.player.bag = []; // 보상 아이템이 들어갈 자리
      for (let i = 0; i < rooms; i++) {
        expect(g.state.dungeon!.cleared).toBe(i);
        expect(g.state.battle).toBeNull();
        clearRoom(g, i % ROOM_CHOICES);
      }
      const chief = REGIONS[d.region].dungeon.chief;
      expect(g.state.battle!.chief).toBe(true);
      expect(g.state.battle!.enemy.id).toBe(chief.id);
      expect(g.state.story).toEqual(expect.arrayContaining([...chief.intro]));
      g.leaveDungeon(); // 우두머리 앞에서는 나갈 수 없다
      expect(g.state.dungeon).not.toBeNull();

      const goldBefore = g.state.player.gold;
      while (g.state.battle) fightOnce(g);
      expect(g.state.dungeon).toBeNull();
      expect(g.state.player.gold - goldBefore).toBeGreaterThanOrEqual(REWARD_GOLD[0] + chief.gold[0]);
      // 보상 하나 + 우두머리 전리품
      expect(g.state.player.bag.length).toBeGreaterThanOrEqual(1);
      expect(g.state.story).toContain(chief.won);
    }
  });

  it("우두머리에게서 달아나면 보물 없이 길로 나온다", () => {
    for (let seed = 1; seed <= 50; seed++) {
      const g = atChief(seed);
      g.state.player.bag = [];
      engage(g);
      g.act("flee");
      if (g.state.battle) continue; // 도망 실패
      expect(g.state.dungeon).toBeNull();
      expect(g.state.player.bag).toEqual([]);
      return;
    }
    throw new Error("도망에 한 번도 성공하지 못함");
  });

  it("갈림길에서 나가면 보상 없이 길로 돌아온다", () => {
    const g = atDungeon();
    const gold = g.state.player.gold;
    const items = [...g.state.player.bag];
    g.leaveDungeon();
    expect(g.state.dungeon).toBeNull();
    expect(g.state.player.gold).toBe(gold);
    expect(g.state.player.bag).toEqual(items);
    expect(inScene(g)).toBe(false);
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

  it("갈림길에서는 회복약을 쓸 수 있다", () => {
    const g = atDungeon();
    g.state.player.hp = 1;
    g.state.player.bag = ["potion"];
    g.use(0);
    expect(g.state.player.hp).toBeGreaterThan(1);
  });
});

describe("끝 보상", () => {
  it("고분 심장석은 가끔 나오고, 나머지는 장비나 상점의 쓰는 물건", () => {
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

  it("고분 심장석은 상점에 나오지 않는다", () => {
    expect(SHOP_ITEM_IDS).not.toContain("heart");
  });

  it("고분 심장석: 최대 체력과 체력이 함께 오르고 사라진다", () => {
    const p = { ...newPlayer("northman"), hp: 10, maxHp: 20, bag: ["heart" as const] };
    expect(useItem(p, 0, null)).not.toBeNull();
    expect(p.maxHp).toBe(20 + HEART_MAXHP);
    expect(p.hp).toBe(10 + HEART_MAXHP);
    expect(p.bag).toEqual([]);
  });
});
