import { describe, expect, it } from "vitest";
import { itemDef } from "../data/items";
import { UNIQUE_QUESTS } from "../data/quests";
import { REGIONS, REGION_IDS } from "../data/regions";
import { newGame, type Game } from "./game";
import { distance } from "./map";
import {
  BOARD_SIZE,
  checkDeliveries,
  completable,
  MAX_QUESTS,
  onChief,
  onKill,
  questProgress,
  questTitle,
  rollQuest,
  turnIn,
} from "./quests";
import { createRng } from "./rng";
import { lastOption } from "./testkit";
import type { Quest } from "./types";

/** 게시판에 원하는 의뢰를 직접 붙인 판 (서리항 마을) */
function withBoard(quests: Partial<Quest>[]): Game {
  const g = newGame(1);
  g.state.board = quests.map((q, i) => ({ id: 100 + i, kind: "hunt", giver: "harbor", region: "harbor", enemy: "crows", count: 2, progress: 0, reward: { gold: 10 }, ...q }) as Quest);
  return g;
}

describe("게시판", () => {
  it("마을에 닿으면 반복 의뢰 3개 + 그 마을 고유 의뢰가 붙는다", () => {
    const g = newGame(1);
    expect(g.state.board.length).toBe(BOARD_SIZE + 1);
    expect(g.state.board.filter((q) => q.unique).map((q) => q.unique)).toEqual(["bran"]);
    for (const q of g.state.board) expect(q.giver).toBe("harbor");
  });

  it("반복 의뢰는 처치·배달·던전이 고루 나오고, 처치·던전은 다른 지역 것도 나온다", () => {
    const rng = createRng(2);
    const kinds = new Set<string>();
    let away = 0;
    for (let i = 0; i < 2000; i++) {
      const q = rollQuest(rng, "pines", 1, i);
      kinds.add(q.kind);
      if (q.kind !== "deliver" && q.region !== "pines") away++;
      if (q.kind === "deliver") {
        expect(q.region).not.toBe("pines");
        expect(itemDef(q.item!).kind).toBe("quest");
      }
      if (q.kind === "hunt") expect(REGIONS[q.region].enemies.map((e) => e.id)).toContain(q.enemy);
      expect(q.reward.gold).toBeGreaterThan(0);
      expect(questTitle(q).length).toBeGreaterThan(0);
    }
    expect(kinds.size).toBe(3);
    expect(away).toBeGreaterThan(300);
  });

  it("레벨이 높을수록, 멀리 갈수록 보상이 크다", () => {
    const low = rollQuest(createRng(5), "harbor", 1, 1);
    const high = rollQuest(createRng(5), "harbor", 10, 1);
    expect(high.kind).toBe(low.kind);
    expect(high.reward.gold).toBeGreaterThan(low.reward.gold);
    expect(distance("harbor", "plateau")).toBe(9 + 8);
  });

  it("마을에 닿을 때마다 게시판이 새로 붙는다", () => {
    const g = newGame(3);
    g.state.player.hp = g.state.player.maxHp = 999;
    const first = g.state.board.map((q) => q.id);
    g.depart("pines");
    while (g.state.travel) {
      const s = g.state;
      if (s.battle) g.act(s.battle.opening ? "fight" : "attack");
      else if (s.shop) g.leaveShop();
      else if (s.camp) g.rest();
      else if (s.event) g.answer(lastOption(g));
      else if (s.dungeon) g.leaveDungeon();
      else g.choose(0);
    }
    expect(g.state.at).toBe("pines");
    expect(g.state.board.map((q) => q.id)).not.toEqual(first);
    expect(g.state.board.some((q) => q.unique === "einar")).toBe(true);
  });
});

describe("맡기와 포기", () => {
  it(`동시에 ${MAX_QUESTS}개까지 맡는다`, () => {
    const g = withBoard([{}, {}, {}, {}]);
    for (let i = 0; i < 4; i++) g.takeQuest(0);
    expect(g.state.quests.length).toBe(MAX_QUESTS);
    expect(g.state.board.length).toBe(1);
  });

  it("배달을 맡으면 물건이 짐에 들어오고, 포기하면 빠진다", () => {
    const g = withBoard([{ kind: "deliver", region: "pines", item: "fish_barrel" }]);
    g.takeQuest(0);
    expect(g.state.player.bag).toContain("fish_barrel");
    g.abandonQuest(g.state.quests[0].id);
    expect(g.state.quests).toEqual([]);
    expect(g.state.player.bag).not.toContain("fish_barrel");
    expect(g.state.journal[0]).toContain("포기");
  });

  it("배달 물건을 버리거나 팔면 의뢰가 실패한다", () => {
    const g = withBoard([
      { kind: "deliver", region: "pines", item: "sealed_letter" },
      { kind: "deliver", region: "bones", item: "sealed_letter" },
    ]);
    g.takeQuest(0);
    g.takeQuest(0);
    g.drop(g.state.player.bag.indexOf("sealed_letter"));
    expect(g.state.quests.length).toBe(1); // 하나만 실패 (나중에 받은 것)
    expect(g.state.quests[0].region).toBe("pines");
    g.openShop();
    g.sell(g.state.player.bag.indexOf("sealed_letter"));
    expect(g.state.quests).toEqual([]);
    expect(g.state.journal.filter((l) => l.includes("실패")).length).toBe(2);
  });

  it("checkDeliveries 는 물건이 남아 있으면 아무 일도 없다", () => {
    const g = withBoard([{ kind: "deliver", region: "pines", item: "herb_bundle" }]);
    g.takeQuest(0);
    expect(checkDeliveries(g.state)).toEqual([]);
    expect(g.state.quests.length).toBe(1);
  });
});

describe("해내고 마치기", () => {
  it("처치: 그 지역의 그 적만 센다. 다 채우면 의뢰를 준 마을에서 보상을 받는다", () => {
    const g = withBoard([{ kind: "hunt", giver: "harbor", region: "pines", enemy: "wolf", count: 2, reward: { gold: 30, item: "iron_sword" } }]);
    g.takeQuest(0);
    const q = g.state.quests[0];
    onKill(g.state, "wolf", "harbor"); // 다른 지역
    onKill(g.state, "bear", "pines"); // 다른 적
    expect(q.progress).toBe(0);
    onKill(g.state, "wolf", "pines");
    onKill(g.state, "wolf", "pines");
    onKill(g.state, "wolf", "pines");
    expect(q.progress).toBe(2);
    expect(completable(g.state, q, "pines")).toBe(false); // 의뢰를 준 곳이 아니다
    expect(completable(g.state, q, "harbor")).toBe(true);
    const gold = g.state.player.gold;
    turnIn(g.state, "harbor");
    expect(g.state.quests).toEqual([]);
    expect(g.state.player.gold).toBe(gold + 30);
    expect(g.state.player.bag).toContain("iron_sword");
    expect(g.state.journal[0]).toContain("완료");
  });

  it("던전: 그 지역 우두머리를 쓰러뜨리면 해낸 것이 된다", () => {
    const g = withBoard([{ kind: "clear", region: "bones" }]);
    g.takeQuest(0);
    const q = g.state.quests[0];
    onChief(g.state, "pines", "갱도의 늙은 곰");
    expect(q.progress).toBe(0);
    onChief(g.state, "bones", "고분의 옛 전사");
    expect(q.progress).toBe(1);
    expect(questProgress(q)).toContain("서리항");
  });

  it("배달: 목적지 마을에 닿으면 끝나고 물건이 빠진다", () => {
    const g = withBoard([{ kind: "deliver", region: "pines", item: "fish_barrel", reward: { gold: 20 } }]);
    g.takeQuest(0);
    expect(turnIn(g.state, "harbor")).toEqual([]);
    const lines = turnIn(g.state, "pines");
    expect(lines.length).toBeGreaterThan(0);
    expect(g.state.player.bag).not.toContain("fish_barrel");
    expect(g.state.quests).toEqual([]);
  });

  it("한 판 안에서: 몰래 지나간 적은 처치로 세지 않는다", () => {
    for (let seed = 1; seed <= 200; seed++) {
      const g = newGame(seed);
      g.state.player.skills.sneak = 100;
      g.depart("pines");
      const s = g.state;
      const i = s.choices.findIndex((c) => c.kind === "battle" && c.hintKind === "battle");
      if (i < 0) continue;
      g.choose(i);
      const enemy = s.battle!.enemy.id;
      s.quests = [{ id: 1, kind: "hunt", giver: "harbor", region: s.here, enemy, count: 3, progress: 0, reward: { gold: 1 } }];
      g.act("sneak");
      if (s.battle) continue; // 들켰다
      expect(s.quests[0].progress).toBe(0);
      return;
    }
    throw new Error("몰래 지나가기에 성공한 판이 없음");
  });
});

describe("고유 의뢰", () => {
  it("마을마다 하나씩, 맡으면 그 인물의 말을 듣고, 끝내면 다시 붙지 않는다", () => {
    expect(new Set(UNIQUE_QUESTS.map((u) => u.town)).size).toBe(REGION_IDS.length);
    const g = newGame(1);
    const i = g.state.board.findIndex((q) => q.unique === "bran");
    g.takeQuest(i);
    expect(g.state.story[0]).toContain("브란");
    onChief(g.state, "harbor", "외팔이 하랄");
    turnIn(g.state, "harbor");
    expect(g.state.uniqueDone).toEqual(["bran"]);
    expect(g.state.player.bag).toContain("iron_sword");
  });
});
