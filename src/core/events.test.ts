import { describe, expect, it } from "vitest";
import { DUNGEON_EVENTS, EVENTS, FIELD_EVENTS, eventById } from "../data/events";
import { canChoose, resolveOption } from "./events";
import { newGame, START_PLAYER, type Game } from "./game";
import { INVENTORY_SIZE } from "./items";
import { createRng } from "./rng";
import type { Player } from "./types";

const player = (over: Partial<Player> = {}): Player => ({ ...structuredClone(START_PLAYER), ...over });

/** 이벤트 화면이 뜰 때까지 진행한 판. 전투는 공격, 상점은 떠남, 쉴 곳은 모닥불 */
function gameAtEvent(seed: number, id?: string): Game | null {
  const g = newGame(seed);
  g.state.player.hp = g.state.player.maxHp = 999;
  for (let n = 0; n < 300 && !g.state.dead; n++) {
    const s = g.state;
    if (s.event) {
      if (!id || s.event.id === id) return g;
      g.answer(eventById(s.event.id).options.length - 1);
    } else if (s.battle) g.act("attack");
    else if (s.shop) g.leaveShop();
    else if (s.camp) g.rest("campfire");
    else if (s.dungeon) g.leaveDungeon();
    else {
      const i = s.choices.findIndex((c) => c.kind === "event" && (!id || c.eventId === id));
      g.choose(Math.max(0, i));
    }
  }
  return null;
}

describe("이벤트 데이터", () => {
  it("필드 이벤트 3개 + 던전 이벤트 4개, 고를 거리 2~3개, 단서는 이벤트끼리 겹치지 않는다", () => {
    expect(FIELD_EVENTS.length).toBe(3);
    expect(DUNGEON_EVENTS.length).toBe(4);
    const hints = EVENTS.flatMap((e) => e.hints);
    expect(new Set(hints).size).toBe(hints.length);
    for (const e of EVENTS) {
      expect(e.options.length).toBeGreaterThanOrEqual(2);
      expect(e.options.length).toBeLessThanOrEqual(3);
      // 마지막은 늘 조건 없이 고를 수 있는 '지나간다' (막다른 화면 방지)
      expect(e.options[e.options.length - 1].require).toBeUndefined();
    }
  });
});

describe("이벤트 처리", () => {
  it("조건이 안 되면 고를 수 없고 아무 일도 없다", () => {
    const well = eventById("well");
    const p = player({ gold: 0 });
    expect(canChoose(well.options[0], p)).toBe(false);
    expect(resolveOption(well, 0, p, createRng(1))).toBeNull();
    expect(p.gold).toBe(0);
  });

  it("회복약을 건네면 약이 빠지고 골드를 받는다", () => {
    const p = player({ items: ["potion"], gold: 0 });
    const r = resolveOption(eventById("wounded"), 0, p, createRng(1))!;
    expect(p.items).toEqual([]);
    expect(p.gold).toBeGreaterThanOrEqual(12);
    expect(r.lines.at(-1)).toContain("골드 +");
  });

  it("회복은 최대 체력을 넘지 않는다", () => {
    for (let seed = 1; seed <= 50; seed++) {
      const p = player({ hp: 19 });
      resolveOption(eventById("well"), 1, p, createRng(seed));
      expect(p.hp).toBeLessThanOrEqual(p.maxHp);
    }
  });

  it("골드를 잃어도 0 아래로 내려가지 않는다", () => {
    for (let seed = 1; seed <= 50; seed++) {
      const p = player({ gold: 10 });
      resolveOption(eventById("gambler"), 0, p, createRng(seed));
      expect([0, 20]).toContain(p.gold);
    }
  });

  it("가득 찬 소지품에는 들어오지 않는다", () => {
    const ev = { ...eventById("wounded"), options: [{ label: "x", outcomes: [{ weight: 1, text: [], effect: { gainItem: "bomb" as const } }] }] };
    const p = player({ items: Array(INVENTORY_SIZE).fill("potion") });
    resolveOption(ev, 0, p, createRng(1));
    expect(p.items.length).toBe(INVENTORY_SIZE);
  });
});

describe("한 판 속 이벤트", () => {
  it("이벤트 단서를 고르면 그 단서의 이벤트가 열린다", () => {
    let seen = 0;
    for (let seed = 1; seed <= 100; seed++) {
      const g = newGame(seed);
      const i = g.state.choices.findIndex((c) => c.hintKind === "event" && c.kind === "event");
      if (i < 0) continue;
      const hint = g.state.choices[i].hint;
      g.choose(i);
      expect(eventById(g.state.event!.id).hints).toContain(hint);
      expect(g.state.choices).toEqual([]);
      seen++;
    }
    expect(seen).toBeGreaterThan(0);
  });

  it("지나가면 이벤트가 닫히고 다음 선택지가 나온다", () => {
    const g = gameAtEvent(3)!;
    g.answer(eventById(g.state.event!.id).options.length - 1);
    expect(g.state.event).toBeNull();
    expect(g.state.choices.length).toBeGreaterThanOrEqual(2);
  });

  it("주사위를 빼앗으면 전투가 열리고, 이기면 다음 선택지로", () => {
    const g = gameAtEvent(5, "gambler")!;
    expect(g).not.toBeNull();
    g.answer(1);
    expect(g.state.event).toBeNull();
    expect(g.state.battle).not.toBeNull();
    while (g.state.battle) g.act("attack");
    expect(g.state.choices.length).toBeGreaterThanOrEqual(2);
  });

  it("이벤트 피해로 쓰러지면 죽는다", () => {
    for (let seed = 1; seed <= 200; seed++) {
      const g = gameAtEvent(seed, "well");
      if (!g) continue;
      g.state.player.hp = 1;
      g.answer(1); // 물: 60% 회복, 40% 피해
      if (g.state.player.hp <= 0 || g.state.dead) {
        expect(g.state.dead).toBe(true);
        expect(g.state.event).toBeNull();
        return;
      }
    }
    throw new Error("썩은 물을 마시는 판이 없음");
  });
});
