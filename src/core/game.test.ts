import { describe, expect, it } from "vitest";
import { newGame, type Game } from "./game";

/** 한 걸음: 전투 중이면 공격, 상점이면 떠나고, 쉴 곳이면 모닥불, 아니면 index 번 선택지 */
function stepOnce(g: Game, index = 0) {
  const s = g.state;
  if (s.battle) g.act("attack");
  else if (s.shop) g.leaveShop();
  else if (s.camp) g.rest("campfire");
  else g.choose(index % s.choices.length);
}

/** 항상 첫 번째 선택지를 고르고, 싸우면 공격만 하며 죽을 때까지 돌린다 */
function playUntilDeath(seed: number, limit = 10_000) {
  const g = newGame(seed);
  while (!g.state.dead && g.state.step < limit) stepOnce(g);
  return g;
}

describe("한 판", () => {
  it("같은 시드, 같은 선택이면 같은 판", () => {
    const a = newGame(99);
    const b = newGame(99);
    for (let i = 0; i < 40 && !a.state.dead; i++) {
      stepOnce(a, 1);
      stepOnce(b, 1);
    }
    expect(a.state).toEqual(b.state);
  });

  it("벌어진 종류는 since 0, 다른 종류는 한 걸음씩 늘어난다", () => {
    const g = newGame(7);
    const first = g.state.choices[0].kind;
    g.choose(0);
    expect(g.state.since[first]).toBe(0);
    while (g.state.battle || g.state.shop || g.state.camp) stepOnce(g);
    const second = g.state.choices[0]?.kind;
    if (!second) return; // 첫 전투에서 죽음
    g.choose(0);
    expect(g.state.since[second]).toBe(0);
    if (!g.state.dead) expect(g.state.since[first]).toBe(first === second ? 0 : 1);
  });

  it("같은 종류가 연달아 벌어지지 않는다 (시드 200개)", () => {
    for (let seed = 1; seed <= 200; seed++) {
      const g = newGame(seed);
      let last = null;
      while (!g.state.dead && g.state.step < 500) {
        if (g.state.battle || g.state.shop || g.state.camp) {
          stepOnce(g);
          continue;
        }
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
    const before = structuredClone(g.state);
    g.choose(0);
    g.act("attack");
    expect(g.state).toEqual(before);
  });
});

describe("전투 진입", () => {
  it("전투가 벌어지면 선택지가 비고, 전투 중엔 choose 가 무시된다", () => {
    for (let seed = 1; seed <= 200; seed++) {
      const g = newGame(seed);
      const i = g.state.choices.findIndex((c) => c.kind === "battle");
      if (i < 0) continue;
      g.choose(i);
      expect(g.state.battle).not.toBeNull();
      expect(g.state.choices).toEqual([]);
      const step = g.state.step;
      g.choose(0);
      expect(g.state.step).toBe(step);
      return;
    }
    throw new Error("200개 시드 첫 화면에 전투가 하나도 없음");
  });
});
