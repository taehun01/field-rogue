import { describe, expect, it } from "vitest";
import { innPrice, newGame, resumeGame } from "./game";
import { deserialize, SAVE_VERSION, serialize } from "./save";
import { stepOnce } from "./testkit";
import type { GameState } from "./types";

/** 저장될 때마다 상태 사본을 모아 두는 판 */
function recorded(seed: number) {
  const saves: GameState[] = [];
  const g = newGame(seed, "northman", { onSave: (s) => saves.push(structuredClone(s)) });
  return { g, saves };
}

describe("저장 형식", () => {
  it("상태를 적고 다시 읽으면 같다", () => {
    const g = newGame(1);
    const file = deserialize(serialize(g.state, 1234))!;
    expect(file.version).toBe(SAVE_VERSION);
    expect(file.savedAt).toBe(1234);
    expect(file.state).toEqual(g.state);
  });

  it("버전이 다르거나 깨진 저장은 읽지 않는다", () => {
    const g = newGame(1);
    const other = JSON.stringify({ version: SAVE_VERSION + 1, savedAt: 0, state: g.state });
    expect(deserialize(other)).toBeNull();
    expect(deserialize("{깨진")).toBeNull();
    expect(deserialize(null)).toBeNull();
    expect(deserialize(JSON.stringify({ version: SAVE_VERSION, savedAt: 0, state: { player: null } }))).toBeNull();
  });
});

describe("자동 저장", () => {
  it("마을에 닿으면 저장한다 (처음 서리항 도착 포함)", () => {
    const { g, saves } = recorded(2);
    expect(saves.length).toBe(1);
    expect(saves[0].at).toBe("harbor");
    g.state.player.hp = g.state.player.maxHp = 999;
    g.depart("pines");
    for (let n = 0; n < 300 && g.state.travel; n++) stepOnce(g, n);
    expect(g.state.at).toBe("pines");
    expect(saves.length).toBe(2);
    expect(saves[1].at).toBe("pines");
    expect(saves[1].travel).toBeNull();
  });

  it("여관에서 자면 저장한다. 길 위에서는 저장하지 않는다", () => {
    const { g, saves } = recorded(3);
    g.state.player.gold = innPrice(1);
    g.state.player.hp = 1;
    g.inn();
    expect(saves.length).toBe(2);
    g.depart("pines");
    g.choose(0);
    expect(saves.length).toBe(2);
  });
});

describe("이어 하기", () => {
  it("저장된 상태 그대로 마을에서 다시 시작하고, 무작위는 새 시드로 굴린다", () => {
    const { g, saves } = recorded(4);
    g.state.player.gold = innPrice(1) + 77;
    g.inn();
    const saved = saves[saves.length - 1];
    // 죽을 때까지 진행
    g.depart("pines");
    for (let n = 0; n < 20000 && !g.state.dead; n++) stepOnce(g, n);
    expect(g.state.dead).toBe(true);

    const r = resumeGame(saved, 999, {}, true);
    expect(r.state.dead).toBe(false);
    expect(r.state.seed).toBe(999);
    expect(r.state.at).toBe(saved.at);
    expect(r.state.travel).toBeNull();
    expect(r.state.player).toEqual(saved.player);
    expect(r.state.story.length).toBeGreaterThan(0);
    // 저장본은 이어 해도 바뀌지 않는다 (다시 죽어도 같은 곳에서)
    r.depart("pines");
    expect(saved.travel).toBeNull();
  });

  it("같은 저장에서 다른 시드로 이어 하면 다른 일이 벌어진다", () => {
    const { saves } = recorded(5);
    const seen = new Set<string>();
    for (let seed = 1; seed <= 20; seed++) {
      const r = resumeGame(saves[0], seed);
      r.depart("pines");
      seen.add(r.state.choices.map((c) => c.hint).join("|"));
    }
    expect(seen.size).toBeGreaterThan(1);
  });

  it("이어 한 판도 자동 저장한다", () => {
    const { saves } = recorded(6);
    const more: GameState[] = [];
    const r = resumeGame(saves[0], 7, { onSave: (s) => more.push(s) });
    r.state.player.gold = innPrice(1);
    r.inn();
    expect(more.length).toBe(1);
  });
});
