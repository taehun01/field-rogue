import { afterEach, describe, expect, it } from "vitest";
import { eventById } from "../data/events";
import { battleTurn, FLEE_CHANCE } from "./battle";
import { BOSS, BOSS_FLEE_CHANCE, BOSS_PATHS, OMEN_NEEDED, RUMOR_LIMIT, startBoss } from "./boss";
import { rollChoices } from "./choices";
import { newGame, type Game } from "./game";
import { createRng } from "./rng";
import type { BossPath, GameState } from "./types";

const ALL_ON = { ...BOSS_PATHS };
afterEach(() => Object.assign(BOSS_PATHS, ALL_ON));

/** 네 길 중 하나만 켠다 (다른 길로 먼저 만나 버리는 일을 막는다) */
function only(path: BossPath) {
  for (const k of Object.keys(BOSS_PATHS) as BossPath[]) BOSS_PATHS[k] = k === path;
}

/** 죽지 않는 판 */
function tough(seed: number): Game {
  const g = newGame(seed);
  g.state.player.hp = g.state.player.maxHp = 999;
  g.state.player.atk = 50;
  return g;
}

/** 필드 선택지 화면이 나올 때까지 진행한다 (전투는 공격, 나머지는 위험 없이 지나간다). 보스전이 열리면 멈춘다 */
function toField(g: Game) {
  for (let n = 0; n < 200; n++) {
    const s = g.state;
    if (s.battle?.boss) return;
    if (s.battle) g.act("attack");
    else if (s.shop) g.leaveShop();
    else if (s.camp) g.rest("campfire");
    else if (s.event) g.answer(eventById(s.event.id).options.length - 1);
    else if (s.dungeon) g.leaveDungeon();
    else return;
  }
}

describe("징조", () => {
  it(`징조가 붙은 선택을 ${OMEN_NEEDED}번 고르면 그 장면 대신 보스`, () => {
    only("omen");
    const g = tough(1);
    for (let i = 1; i <= OMEN_NEEDED; i++) {
      toField(g);
      g.state.choices[0].omen = "까마귀";
      g.choose(0);
      if (i < OMEN_NEEDED) {
        expect(g.state.boss.omens).toBe(i);
        expect(g.state.battle?.boss).toBeUndefined();
      }
    }
    expect(g.state.battle?.boss).toBe(true);
    expect(g.state.boss.met).toBe("omen");
  });

  it("길이 열려 있으면 징조가 가끔 붙고, 닫혀 있으면 안 붙는다", () => {
    const rng = createRng(5);
    let omens = 0;
    for (let i = 0; i < 2000; i++) {
      omens += rollChoices(rng, { since: {}, lastHints: [], omen: true }).filter((c) => c.omen).length;
      expect(rollChoices(rng).some((c) => c.omen)).toBe(false);
    }
    expect(omens).toBeGreaterThan(0);
  });
});

describe("소문", () => {
  it("소문이 기준을 넘으면 다음 선택지 대신 보스가 찾아온다", () => {
    only("rumor");
    const g = tough(2);
    g.state.boss.rumor = RUMOR_LIMIT;
    g.choose(0);
    toField(g);
    expect(g.state.battle?.boss).toBe(true);
    expect(g.state.boss.met).toBe("rumor");
    expect(g.state.choices).toEqual([]);
  });

  it("싸우면 소문이 오른다", () => {
    only("rumor");
    for (let seed = 1; seed <= 100; seed++) {
      const g = tough(seed);
      const i = g.state.choices.findIndex((c) => c.kind === "battle");
      if (i < 0) continue;
      g.choose(i);
      expect(g.state.boss.rumor).toBeGreaterThan(0);
      return;
    }
    throw new Error("첫 화면에 전투가 없음");
  });

  it("길을 끄면 기준을 넘어도 오지 않는다", () => {
    only("omen");
    BOSS_PATHS.omen = false;
    const g = tough(2);
    g.state.boss.rumor = RUMOR_LIMIT * 10;
    g.choose(0);
    toField(g);
    expect(g.state.boss.met).toBeNull();
    expect(g.state.choices.length).toBeGreaterThanOrEqual(2);
  });
});

describe("우연", () => {
  it("보스 단서를 고르면 보스와 싸운다", () => {
    only("chance");
    const g = tough(3);
    g.state.choices[0] = { hintKind: "battle", kind: "battle", hint: "발자국", boss: true };
    g.choose(0);
    expect(g.state.battle?.boss).toBe(true);
    expect(g.state.boss.met).toBe("chance");
  });

  it("보스 단서는 드물게 섞이고, 방금 싸웠으면 안 섞인다", () => {
    const rng = createRng(9);
    let bosses = 0;
    for (let i = 0; i < 20_000; i++) {
      if (rollChoices(rng, { since: {}, lastHints: [], chance: true }).some((c) => c.boss)) bosses++;
      expect(rollChoices(rng, { since: { battle: 0 }, lastHints: [], chance: true }).some((c) => c.boss)).toBe(false);
    }
    expect(bosses).toBeGreaterThan(0);
    expect(bosses / 20_000).toBeLessThan(0.05);
  });
});

describe("던전 깊은 곳", () => {
  /** 던전 끝 상자를 연 판 */
  function atDungeonEnd(): Game {
    only("deep");
    for (let seed = 1; seed < 500; seed++) {
      const g = tough(seed);
      for (let n = 0; n < 300; n++) {
        const s = g.state;
        if (s.dungeon?.deep) return g;
        if (s.battle) g.act("attack");
        else if (s.shop) g.leaveShop();
        else if (s.camp) g.rest("campfire");
        else if (s.event) g.answer(eventById(s.event.id).options.length - 1);
        else if (s.dungeon) g.enterRoom(0);
        else g.choose(Math.max(0, s.choices.findIndex((c) => c.kind === "dungeon")));
      }
    }
    throw new Error("던전 끝에 닿지 못함");
  }

  it("끝 상자를 열면 더 깊이 갈지 묻고, 들어가면 보스", () => {
    const g = atDungeonEnd();
    expect(g.state.dungeon!.choices).toEqual([]);
    g.goDeeper();
    expect(g.state.battle?.boss).toBe(true);
    expect(g.state.boss.met).toBe("deep");
  });

  it("보스를 쓰러뜨리면 골드와 심장을 얻고 던전 밖으로 나온다", () => {
    const g = atDungeonEnd();
    g.state.player.items = [];
    const gold = g.state.player.gold;
    g.goDeeper();
    while (g.state.battle) g.act("attack");
    expect(g.state.dungeon).toBeNull();
    expect(g.state.player.gold - gold).toBeGreaterThanOrEqual(BOSS.gold[0]);
    expect(g.state.player.items).toEqual(["heart"]);
    expect(g.state.choices.length).toBeGreaterThanOrEqual(2);
  });

  it("나가기를 고르면 보스 없이 밖으로", () => {
    const g = atDungeonEnd();
    g.leaveDungeon();
    expect(g.state.dungeon).toBeNull();
    expect(g.state.boss.met).toBeNull();
  });
});

describe("한 판에 한 번", () => {
  it("보스를 만나면 모든 길이 닫힌다", () => {
    const g = tough(4);
    g.state.choices[0] = { hintKind: "battle", kind: "battle", hint: "발자국", boss: true };
    g.choose(0);
    while (g.state.battle) g.act("attack");
    g.state.boss.rumor = RUMOR_LIMIT * 10;
    for (let n = 0; n < 300 && !g.state.dead; n++) {
      toField(g);
      expect((g.state as GameState).battle?.boss).toBeUndefined();
      expect(g.state.dungeon?.deep).toBeUndefined();
      for (const c of g.state.choices) {
        expect(c.omen).toBeUndefined();
        expect(c.boss).toBeUndefined();
      }
      g.choose(n % g.state.choices.length);
    }
    expect(g.state.boss.met).toBe("chance");
  });
});

describe("보스전", () => {
  it("보통 적보다 달아나기 어렵다", () => {
    const rng = createRng(13);
    let fled = 0;
    const n = 5000;
    for (let i = 0; i < n; i++) {
      const b = startBoss(0);
      const p = { hp: 999, maxHp: 999, atk: 1, def: 0, gold: 0, items: [] };
      if (battleTurn(b, p, "flee", rng).outcome === "fled") fled++;
    }
    expect(BOSS_FLEE_CHANCE).toBeLessThan(FLEE_CHANCE);
    expect(Math.abs(fled / n - BOSS_FLEE_CHANCE)).toBeLessThan(0.03);
  });
});
