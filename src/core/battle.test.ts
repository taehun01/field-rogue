import { describe, expect, it } from "vitest";
import { REGIONS, REGION_IDS } from "../data/regions";
import { battleTurn, ENEMY_LEVEL, enemyScale, FLEE_CHANCE, GUARD_RATE, startBattle, startBattleWith } from "./battle";
import { POTION_HEAL } from "./items";
import { newPlayer } from "./player";
import { createRng } from "./rng";
import type { Battle, Player } from "./types";

// 낡은 손도끼(공격 3), 해진 털옷(방어 1)
const player = (over: Partial<Player> = {}): Player => ({ ...newPlayer("northman"), hp: 20, maxHp: 20, bag: ["potion"], ...over });

const battle = (over: Partial<Battle["enemy"]> = {}): Battle => ({
  enemy: { id: "weak", name: "적", hp: 8, maxHp: 8, atk: 4, def: 0, gold: [3, 6], ...over },
});

describe("적", () => {
  it("지역마다 그 지역 적 3종이 모두 나오고, 체력이 가득 찬 채 시작한다", () => {
    const rng = createRng(1);
    for (const r of REGION_IDS) {
      const defs = REGIONS[r].enemies;
      expect(defs.length).toBe(3);
      const seen = new Set<string>();
      for (let i = 0; i < 500; i++) {
        const b = startBattle(rng, r);
        seen.add(b.enemy.id);
        expect(b.enemy.hp).toBe(defs.find((d) => d.id === b.enemy.id)!.maxHp);
      }
      expect(seen.size).toBe(3);
    }
  });

  it("이벤트가 정한 적, 던전 우두머리도 id 로 열 수 있다", () => {
    expect(startBattleWith("troll").enemy.name).toBe("서리 트롤");
    expect(startBattleWith(REGIONS.bones.dungeon.chief.id).enemy.name).toBe(REGIONS.bones.dungeon.chief.name);
  });
});

describe("레벨에 맞춰 강해지는 적", () => {
  it("레벨 1은 원래 수치, 레벨이 오를수록 체력·공격이 오르고 방어는 가끔 오른다", () => {
    expect(enemyScale(1)).toBe(1);
    expect(enemyScale(2)).toBeCloseTo(1 + ENEMY_LEVEL.early);
    // 꺾이는 곳 뒤로는 천천히 오른다
    const k = ENEMY_LEVEL.knee;
    expect(enemyScale(k + 1) - enemyScale(k)).toBeCloseTo(ENEMY_LEVEL.late);

    // 같은 시드면 같은 적이 뽑히므로 레벨만 바꿔 비교한다
    const low = startBattle(createRng(9), "pines", 1).enemy;
    const high = startBattle(createRng(9), "pines", 10).enemy;
    expect(high.id).toBe(low.id);
    expect(high.maxHp).toBeGreaterThan(low.maxHp);
    expect(high.hp).toBe(high.maxHp);
    expect(high.atk).toBeGreaterThan(low.atk);
    expect(high.def).toBeGreaterThan(low.def);
    expect(high.gold).toEqual(low.gold); // 골드는 레벨을 따라 오르지 않는다
  });

  it("지역과 상관없이 같은 레벨이면 같은 배율이다", () => {
    for (const r of REGION_IDS) {
      const e = startBattle(createRng(1), r, 5).enemy;
      const def = REGIONS[r].enemies.find((d) => d.id === e.id)!;
      expect(e.maxHp).toBe(Math.ceil(def.maxHp * enemyScale(5)));
    }
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

  it("방어: 받는 피해가 무기에 따라 줄어든다 (한손 낡은 손도끼)", () => {
    const p = player();
    battleTurn(battle({ atk: 9 }), p, "guard", createRng(3));
    const guarded = 20 - p.hp;
    // 방어 없이 맞는 피해는 atk 9 - def 1 ±1 = 7~9 → 한손 비율을 곱해 올림
    expect(guarded).toBeGreaterThanOrEqual(Math.ceil(7 * GUARD_RATE.one));
    expect(guarded).toBeLessThanOrEqual(Math.ceil(9 * GUARD_RATE.one));
  });

  it("아이템: 회복약을 쓰면 회복하고 하나 줄어든다. 없으면 턴을 쓰지 않는다", () => {
    const p = player({ hp: 5 });
    battleTurn(battle({ atk: 1 }), p, "item", createRng(4));
    expect(p.bag).toEqual([]);
    expect(p.hp).toBe(5 + POTION_HEAL - 1); // 적 공격 1 (최소 피해)

    const empty = player({ bag: [] });
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
