import { describe, expect, it } from "vitest";
import { newGame, rollChoices } from "./game";
import { createRng } from "./rng";

/** 항상 첫 번째 선택지를 고르며 죽을 때까지 돌린다 */
function playUntilDeath(seed: number, limit = 10_000) {
  const g = newGame(seed);
  while (!g.state.dead && g.state.step < limit) g.choose(0);
  return g;
}

describe("선택지", () => {
  it("2~3개, 같은 종류 중복 없음, 단서가 있음", () => {
    const rng = createRng(1);
    for (let i = 0; i < 1000; i++) {
      const cs = rollChoices(rng);
      expect(cs.length).toBeGreaterThanOrEqual(2);
      expect(cs.length).toBeLessThanOrEqual(3);
      expect(new Set(cs.map((c) => c.kind)).size).toBe(cs.length);
      for (const c of cs) expect(c.hint.length).toBeGreaterThan(0);
    }
  });
});

describe("한 판", () => {
  it("같은 시드, 같은 선택이면 같은 판", () => {
    const a = newGame(99);
    const b = newGame(99);
    for (let i = 0; i < 20 && !a.state.dead; i++) {
      a.choose(1);
      b.choose(1);
    }
    expect(a.state).toEqual(b.state);
  });

  it("범위 밖 선택은 무시", () => {
    const g = newGame(5);
    g.choose(7);
    expect(g.state.step).toBe(0);
  });

  it("죽을 때까지 끊기지 않고 돌아가다가 결국 죽는다 (시드 500개)", () => {
    for (let seed = 1; seed <= 500; seed++) {
      const g = playUntilDeath(seed);
      expect(g.state.dead).toBe(true);
      expect(g.state.player.hp).toBe(0);
      expect(g.state.choices).toEqual([]);
    }
  });

  it("죽은 뒤에는 고를 수 없다", () => {
    const g = playUntilDeath(3);
    const step = g.state.step;
    g.choose(0);
    expect(g.state.step).toBe(step);
  });
});
