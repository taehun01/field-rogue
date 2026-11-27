import { describe, expect, it } from "vitest";
import { battleTurn, type NormalEnemyId, ENEMIES, enemyScale, FLEE_CHANCE, SCALE_EVERY, startBattle } from "./battle";
import { POTION_HEAL } from "./items";
import { createRng } from "./rng";
import type { Battle, Player } from "./types";

const player = (over: Partial<Player> = {}): Player => ({
  hp: 20, maxHp: 20, atk: 3, def: 1, gold: 0, items: ["potion"], ...over,
});

const battle = (over: Partial<Battle["enemy"]> = {}): Battle => ({
  enemy: { id: "weak", name: "적", hp: 8, maxHp: 8, atk: 4, def: 0, gold: [3, 6], ...over },
});

describe("적", () => {
  it("3종이 모두 나오고, 체력이 가득 찬 채 시작한다", () => {
    const rng = createRng(1);
    const seen = new Set<string>();
    for (let i = 0; i < 500; i++) {
      const b = startBattle(rng);
      seen.add(b.enemy.id);
      expect(b.enemy.hp).toBe(ENEMIES[b.enemy.id as NormalEnemyId].maxHp);
    }
    expect(seen.size).toBe(3);
  });
});

describe("멀리 갈수록 강해지는 적", () => {
  it(`${SCALE_EVERY}걸음 전까지는 원래 수치, 그 뒤로 체력·공격이 오른다 (방어·골드는 그대로)`, () => {
    expect(enemyScale(0)).toBe(1);
    expect(enemyScale(SCALE_EVERY - 1)).toBe(1);
    expect(enemyScale(SCALE_EVERY)).toBeGreaterThan(1);

    // 같은 시드면 같은 적이 뽑히므로 걸음 수만 바꿔 비교한다
    const early = startBattle(createRng(9), 0).enemy;
    const late = startBattle(createRng(9), SCALE_EVERY * 10).enemy;
    expect(late.id).toBe(early.id);
    expect(late.maxHp).toBeGreaterThan(early.maxHp);
    expect(late.hp).toBe(late.maxHp);
    expect(late.atk).toBeGreaterThan(early.atk);
    expect(late.def).toBe(early.def);
    expect(late.gold).toEqual(early.gold);
  });
});

describe("행동", () => {
  it("공격: 적 체력이 줄고, 0이 되면 이기고 골드를 얻으며 반격은 없다", () => {
    const rng = createRng(2);
    const b = battle({ hp: 1 });
    const p = player();
    const r = battleTurn(b, p, "attack", rng);
    expect(r.outcome).toBe("won");
    expect(p.hp).toBe(20);
    expect(p.gold).toBeGreaterThanOrEqual(3);
  });

  it("방어: 받는 피해가 절반(올림)", () => {
    const p = player();
    battleTurn(battle({ atk: 9 }), p, "guard", createRng(3));
    const guarded = 20 - p.hp;
    // 방어 없이 맞는 피해는 atk 9 - def 1 ±1 = 7~9 → 절반 올림 4~5
    expect(guarded).toBeGreaterThanOrEqual(4);
    expect(guarded).toBeLessThanOrEqual(5);
  });

  it("아이템: 회복약을 쓰면 회복하고 하나 줄어든다. 없으면 턴을 쓰지 않는다", () => {
    const p = player({ hp: 5 });
    battleTurn(battle({ atk: 1 }), p, "item", createRng(4));
    expect(p.items).toEqual([]);
    expect(p.hp).toBe(5 + POTION_HEAL - 1); // 적 공격 1 (최소 피해)

    const empty = player({ items: [] });
    const r = battleTurn(battle(), empty, "item", createRng(4));
    expect(r.outcome).toBe("ongoing");
    expect(empty.hp).toBe(20);
  });

  it("도망: 성공 비율이 FLEE_CHANCE 근처, 성공하면 안 맞고 실패하면 맞는다", () => {
    const rng = createRng(5);
    let fled = 0;
    const N = 10_000;
    for (let i = 0; i < N; i++) {
      const p = player();
      const r = battleTurn(battle(), p, "flee", rng);
      if (r.outcome === "fled") {
        fled++;
        expect(p.hp).toBe(20);
      } else {
        expect(p.hp).toBeLessThan(20);
      }
    }
    expect(Math.abs(fled / N - FLEE_CHANCE)).toBeLessThan(0.02);
  });
});
