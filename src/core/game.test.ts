import { describe, expect, it } from "vitest";
import { REGIONS } from "../data/regions";
import { fieldEvents, eventById } from "../data/events";
import { innPrice, newGame, type Game } from "./game";
import { neighbors, regionAt, roadBetween, START_REGION } from "./map";
import { inScene, onRoad, stepOnce, sturdy } from "./testkit";

/** 항상 첫 번째를 고르고, 싸우면 공격만 하며 죽을 때까지 돌린다 */
function playUntilDeath(seed: number, limit = 10_000) {
  const g = newGame(seed);
  while (!g.state.dead && g.state.step < limit) stepOnce(g, g.state.step);
  return g;
}

/** 장면을 다 넘기고 길 위 선택지나 마을 화면으로 돌아온다 */
function settle(g: Game) {
  while (!g.state.dead && inScene(g)) {
    if (g.state.dungeon && !g.state.battle && !g.state.event) g.leaveDungeon();
    else stepOnce(g);
  }
}

describe("시작과 마을", () => {
  it("서리항 마을에서 시작한다. 선택지는 없고 상점 진열이 정해져 있다", () => {
    const g = newGame(1);
    expect(g.state.at).toBe(START_REGION);
    expect(g.state.travel).toBeNull();
    expect(g.state.choices).toEqual([]);
    expect(g.state.townStock.length).toBeGreaterThan(0);
    expect(g.state.story).toEqual([...REGIONS.harbor.arrive]);
  });

  it("여관은 골드를 내고 전부 회복한다. 모자라면 아무 일 없다", () => {
    const g = newGame(1);
    const p = g.state.player;
    p.hp = 3;
    p.gold = innPrice(1) - 1;
    g.inn();
    expect(p.hp).toBe(3);
    p.gold = innPrice(1) + 2;
    g.inn();
    expect(p.hp).toBe(p.maxHp);
    expect(p.gold).toBe(2);
  });

  it("마을 상점은 나갔다 들어와도 같은 진열이고, 산 것은 빠진 채로 남는다", () => {
    const g = newGame(2);
    g.state.player.gold = 999;
    g.state.player.bag = [];
    const first = [...g.state.townStock];
    g.openShop();
    g.buy(0);
    g.leaveShop();
    expect(g.state.travel).toBeNull();
    expect(g.state.choices).toEqual([]);
    g.openShop();
    expect(g.state.shop!.stock).toEqual(first.slice(1));
  });

  it("마을에서는 길 위 선택을 고를 수 없고, 길이 없는 곳으로는 못 떠난다", () => {
    const g = newGame(3);
    g.choose(0);
    expect(g.state.step).toBe(0);
    g.depart("plateau"); // 서리항–하얀 고원은 길이 없다
    expect(g.state.travel).toBeNull();
  });
});

describe("지도와 길", () => {
  it("떠나면 길 거리만큼 걸어야 도착하고, 도착하면 그 마을이 된다", () => {
    for (const n of neighbors(START_REGION)) {
      const g = sturdy(4);
      g.depart(n.to);
      expect(g.state.travel).toEqual({ from: START_REGION, to: n.to, total: n.steps, walked: 0 });
      let walked = 0;
      while (g.state.travel) {
        if (!inScene(g)) walked++;
        stepOnce(g);
        settle(g);
      }
      expect(walked).toBe(n.steps);
      expect(g.state.at).toBe(n.to);
      expect(g.state.choices).toEqual([]);
      expect(g.state.story).toEqual(expect.arrayContaining([...REGIONS[n.to].arrive]));
    }
  });

  it("길 앞쪽 절반은 떠난 지역, 뒤쪽 절반은 갈 지역의 일이 벌어진다 (시드 100개)", () => {
    for (let seed = 1; seed <= 100; seed++) {
      const g = onRoad(seed);
      while (g.state.travel && !g.state.dead) {
        const t = g.state.travel;
        expect(g.state.here).toBe(regionAt(t, t.walked));
        for (const c of g.state.choices) {
          if (c.kind !== "event") continue;
          const ev = eventById(c.eventId!);
          expect(fieldEvents(g.state.here)).toContain(ev);
        }
        if (g.state.choices[0].kind === "battle") {
          g.choose(0);
          expect(REGIONS[g.state.here].enemies.map((e) => e.id)).toContain(g.state.battle!.enemy.id);
        } else g.choose(0);
        settle(g);
      }
    }
  });

  it("되돌아가면 방향이 바뀌고, 지금까지 걸은 만큼 다시 걸어 떠난 곳에 닿는다", () => {
    const g = onRoad(5);
    const { from, to, total } = g.state.travel!;
    g.choose(0);
    settle(g);
    g.choose(0);
    settle(g);
    expect(g.state.travel!.walked).toBe(2);
    g.turnBack();
    expect(g.state.travel).toEqual({ from: to, to: from, total, walked: total - 2 });
    let walked = 0;
    while (g.state.travel) {
      if (!inScene(g)) walked++;
      stepOnce(g);
      settle(g);
    }
    expect(walked).toBe(2);
    expect(g.state.at).toBe(from);
  });

  it("장면 중에는 되돌아갈 수 없다", () => {
    const g = onRoad(6);
    g.choose(0);
    if (!inScene(g)) return;
    const t = structuredClone(g.state.travel);
    g.turnBack();
    expect(g.state.travel).toEqual(t);
  });

  it("길 위 쉴 곳은 모닥불뿐이다 (여관은 마을에만)", () => {
    const g = onRoad(7);
    for (let n = 0; n < 200 && !g.state.camp; n++) {
      const i = g.state.choices.findIndex((c) => c.kind === "rest");
      if (i >= 0 && !inScene(g)) g.choose(i);
      else stepOnce(g, n);
    }
    expect(g.state.camp).toBe(true);
    g.state.player.hp = 1;
    g.rest();
    expect(g.state.camp).toBe(false);
    expect(g.state.player.hp).toBeGreaterThan(1);
  });

  it("모든 지역 사이를 오갈 수 있다 (지도는 이어져 있다)", () => {
    const seen = new Set([START_REGION]);
    const queue = [START_REGION];
    while (queue.length) for (const n of neighbors(queue.shift()!)) if (!seen.has(n.to)) seen.add(n.to), queue.push(n.to);
    expect(seen.size).toBe(Object.keys(REGIONS).length);
    expect(roadBetween("harbor", "plateau")).toBeUndefined();
  });
});

describe("한 판", () => {
  it("같은 시드, 같은 선택이면 같은 판", () => {
    const a = newGame(99);
    const b = newGame(99);
    for (let i = 0; i < 80 && !a.state.dead; i++) {
      stepOnce(a, i);
      stepOnce(b, i);
    }
    expect(a.state).toEqual(b.state);
  });

  it("같은 종류가 연달아 벌어지지 않는다 (시드 100개)", () => {
    for (let seed = 1; seed <= 100; seed++) {
      const g = sturdy(seed);
      let last = null;
      for (let n = 0; n < 400 && !g.state.dead; n++) {
        if (!g.state.travel || inScene(g)) {
          if (!g.state.travel) last = null; // 마을을 거치면 새로 센다
          stepOnce(g, n);
          continue;
        }
        const i = n % g.state.choices.length;
        const kind = g.state.choices[i].kind;
        expect(kind).not.toBe(last);
        g.choose(i);
        last = kind;
      }
    }
  });

  it("범위 밖 선택은 무시", () => {
    const g = onRoad(5);
    g.choose(7);
    expect(g.state.step).toBe(0);
  });

  it("죽을 때까지 끊기지 않고 돌아간다 (시드 300개)", () => {
    for (let seed = 1; seed <= 300; seed++) {
      const g = playUntilDeath(seed);
      expect(g.state.dead).toBe(true);
      expect(g.state.player.hp).toBe(0);
      expect(g.state.choices).toEqual([]);
    }
  });

  it("죽은 뒤에는 아무것도 할 수 없다", () => {
    const g = playUntilDeath(3);
    const before = structuredClone(g.state);
    g.choose(0);
    g.act("attack");
    g.inn();
    g.depart("pines");
    g.turnBack();
    expect(g.state).toEqual(before);
  });
});
