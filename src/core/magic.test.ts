import { describe, expect, it } from "vitest";
import { RUNES } from "../data/runes";
import { RACES } from "../data/races";
import { battleTurn, FLEE_COST, POWER_COST } from "./battle";
import { innPrice, newGame, STEP_REGEN } from "./game";
import { castRune, runeHeal } from "./magic";
import { BASE, newPlayer } from "./player";
import { createRng } from "./rng";
import { onRoad, reach } from "./testkit";
import type { Battle, Player } from "./types";

const player = (over: Partial<Player> = {}): Player => ({ ...newPlayer("northman"), ...over });
const battle = (over: Partial<Battle["enemy"]> = {}): Battle => ({
  enemy: { id: "wolf", name: "늑대", hp: 30, maxHp: 30, atk: 4, def: 2, gold: [1, 1], ...over },
});

describe("세 자원", () => {
  it("시작 기력·마력은 공통 + 종족 보너스. 누구나 치유 룬, 눈요정은 불꽃 룬도", () => {
    for (const r of Object.values(RACES)) {
      const p = newPlayer(r.id);
      expect(p.maxSt).toBe(BASE.stamina + r.stamina);
      expect(p.maxMp).toBe(BASE.magicka + r.magicka);
      expect(p.runes[0]).toBe("heal");
    }
    expect(newPlayer("snowelf").runes).toEqual(["heal", "fire"]);
    expect(newPlayer("northman").runes).toEqual(["heal"]);
  });
});

describe("기력", () => {
  it("강타는 기력을 쓰고 보통 공격보다 세다", () => {
    let normal = 0;
    let power = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const a = battle();
      battleTurn(a, player(), "attack", createRng(seed));
      normal += 30 - a.enemy.hp;
      const b = battle();
      const p = player();
      battleTurn(b, p, "power", createRng(seed));
      power += 30 - b.enemy.hp;
      expect(p.st).toBe(p.maxSt - POWER_COST);
    }
    expect(power).toBeGreaterThan(normal * 1.3);
  });

  it("기력이 모자라면 강타도 도망도 못 하고, 턴도 쓰지 않는다 (적도 안 때린다)", () => {
    const p = player({ st: 0 });
    const b = battle();
    const r1 = battleTurn(b, p, "power", createRng(1));
    const r2 = battleTurn(b, p, "flee", createRng(1));
    expect(r1.outcome).toBe("ongoing");
    expect(r2.outcome).toBe("ongoing");
    expect(b.enemy.hp).toBe(30);
    expect(p.hp).toBe(p.maxHp);
  });

  it("도망은 성공하든 실패하든 기력을 쓴다", () => {
    const p = player();
    battleTurn(battle(), p, "flee", createRng(2));
    expect(p.st).toBe(p.maxSt - FLEE_COST);
  });
});

describe("룬", () => {
  it("불꽃 룬은 방어를 무시하고 마력을 쓴다", () => {
    const p = player({ runes: ["heal", "fire"] });
    const b = battle({ def: 99 });
    battleTurn(b, p, "spell", createRng(1), 1);
    expect(b.enemy.hp).toBe(30 - RUNES.fire.damage!);
    expect(p.mp).toBe(p.maxMp - RUNES.fire.cost);
  });

  it("서리 룬에 얼면 적이 한 번 공격하지 못한다", () => {
    const p = player({ runes: ["frost"], mp: 99 });
    const b = battle({ atk: 10 });
    battleTurn(b, p, "spell", createRng(1), 0);
    expect(p.hp).toBe(p.maxHp); // 얼어서 반격 없음
    expect(b.frozen).toBe(0);
    battleTurn(b, p, "guard", createRng(1));
    expect(p.hp).toBeLessThan(p.maxHp); // 풀리면 다시 때린다
  });

  it("마력이 모자라면 룬이 나가지 않는다", () => {
    const p = player({ mp: 1, hp: 5 });
    const r = castRune(p, "heal", null);
    expect(r.ok).toBe(false);
    expect(p.hp).toBe(5);
    expect(p.mp).toBe(1);
  });

  it("치유 룬은 전투 밖에서도 쓰고, 공격 룬은 전투 밖에서 못 쓴다", () => {
    const g = newGame(1, "snowelf");
    const p = g.state.player;
    p.hp = 5;
    g.cast(0);
    expect(p.hp).toBe(5 + runeHeal(p, "heal"));
    const mp = p.mp;
    g.cast(1); // 불꽃
    expect(p.mp).toBe(mp);
  });
});

describe("차오르기", () => {
  it("길에서 걸음마다 기력·마력이 조금 찬다", () => {
    const g = onRoad(1);
    const p = g.state.player;
    p.st = 0;
    p.mp = 0;
    g.choose(0);
    expect(p.st).toBe(STEP_REGEN.st);
    expect(p.mp).toBe(STEP_REGEN.mp);
  });

  it("전투 중에는 차지 않는다", () => {
    const g = reach("battle");
    const p = g.state.player;
    p.st = 0;
    p.mp = 0;
    g.act("guard");
    expect(p.st).toBe(0);
    expect(p.mp).toBe(0);
  });

  it("모닥불은 기력·마력을 다 채우고, 여관은 셋 다 채운다", () => {
    const g = reach("rest");
    const p = g.state.player;
    p.st = 0;
    p.mp = 0;
    g.rest();
    expect(p.st).toBe(p.maxSt);
    expect(p.mp).toBe(p.maxMp);

    const t = newGame(2);
    const q = t.state.player;
    q.hp = 1;
    q.st = 0;
    q.mp = 0;
    q.gold = innPrice(1);
    t.inn();
    expect([q.hp, q.st, q.mp]).toEqual([q.maxHp, q.maxSt, q.maxMp]);
  });
});

describe("룬새김이", () => {
  it("마을에서만 가고, 돈을 내면 룬을 새긴다. 이미 있는 룬은 다시 못 새긴다", () => {
    const g = newGame(3);
    const p = g.state.player;
    p.gold = 100;
    g.openRunes();
    expect(g.state.runeShop).toBe(true);
    g.learnRune("heal");
    expect(p.gold).toBe(100);
    g.learnRune("frost");
    expect(p.runes).toEqual(["heal", "frost"]);
    expect(p.gold).toBe(100 - RUNES.frost.price);
    g.depart("pines"); // 룬새김이 앞에서는 못 떠난다
    expect(g.state.travel).toBeNull();
    g.leaveRunes();
    expect(g.state.runeShop).toBe(false);
  });

  it("골드가 모자라면 새기지 못한다", () => {
    const g = newGame(4);
    g.state.player.gold = 0;
    g.openRunes();
    g.learnRune("fire");
    expect(g.state.player.runes).toEqual(["heal"]);
  });
});
