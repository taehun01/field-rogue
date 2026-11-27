import { describe, expect, it } from "vitest";
import { newGame } from "./game";

/** 항상 첫 번째 선택지를 고르며 죽을 때까지 돌린다 */
function playUntilDeath(seed: number, limit = 10_000) {
  const g = newGame(seed);
  while (!g.state.dead && g.state.step < limit) g.choose(0);
  return g;
}

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

  it("벌어진 종류는 since 0, 다른 종류는 한 걸음씩 늘어난다", () => {
    const g = newGame(7);
    const first = g.state.choices[0].kind;
    g.choose(0);
    expect(g.state.since[first]).toBe(0);
    const second = g.state.choices[0].kind;
    g.choose(0);
    expect(g.state.since[second]).toBe(0);
    if (!g.state.dead) expect(g.state.since[first]).toBe(first === second ? 0 : 1);
  });

  it("같은 종류가 연달아 벌어지지 않는다 (시드 200개)", () => {
    for (let seed = 1; seed <= 200; seed++) {
      const g = newGame(seed);
      let last = null;
      while (!g.state.dead && g.state.step < 500) {
        const kind = g.state.choices[seed % g.state.choices.length].kind;
        expect(kind).not.toBe(last);
        g.choose(seed % g.state.choices.length);
        last = kind;
      }
    }
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
