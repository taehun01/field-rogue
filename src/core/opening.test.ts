import { describe, expect, it } from "vitest";
import { OPENING_RESCUE, OPENING_SCENES, OPENING_START, openingScene } from "../data/opening";
import { REGIONS } from "../data/regions";
import { RACES } from "../data/races";
import { newGame, type Game } from "./game";
import { BASE } from "./player";
import type { GameState } from "./types";

/** 오프닝을 끝까지: 장면은 첫 고를 거리(종족은 race), 싸움은 기습(못 쓰면 공격) */
function playOpening(g: Game, race = 0, fightWith: "attack" | "flee" | "lose" = "attack") {
  for (let n = 0; n < 200 && g.state.opening; n++) {
    const s = g.state;
    if (s.battle) {
      if (fightWith === "lose") {
        s.player.hp = 1;
        s.battle.enemy.atk = 999;
        g.act(s.battle.opening ? "fight" : "guard");
      } else if (s.battle.opening) g.act("fight");
      else g.act(fightWith === "flee" && s.player.st >= 3 ? "flee" : "attack");
    } else g.openingChoose(s.opening!.scene === OPENING_START ? race : 0);
  }
}

describe("오프닝 데이터", () => {
  it("모든 장면의 다음 장면이 있고, 끝까지 이어진다", () => {
    const ids = new Set(OPENING_SCENES.map((s) => s.id));
    for (const s of OPENING_SCENES) {
      for (const o of s.options) expect(o.next === "end" || ids.has(o.next)).toBe(true);
      if (s.battle) expect(ids.has(s.battle.next)).toBe(true);
      // 싸움이 없는 장면은 고를 거리가 있어야 막히지 않는다
      if (!s.battle) expect(s.options.length).toBeGreaterThan(0);
    }
    expect(openingScene(OPENING_START).options.map((o) => o.race)).toEqual(Object.keys(RACES));
  });

  it("은신·룬·강타를 하나씩 써 보는 방 셋과 우두머리가 있다", () => {
    const battles = OPENING_SCENES.filter((s) => s.battle);
    expect(battles.length).toBe(3);
    expect(battles.filter((s) => s.battle!.sneak).length).toBe(2);
    // 마지막 우두머리는 몰래 지나갈 수 없다
    expect(battles.filter((s) => s.battle!.chief).map((s) => s.id)).toEqual(["keeper"]);
    expect(OPENING_SCENES.some((s) => s.options.some((o) => o.castHeal))).toBe(true);
  });
});

describe("오프닝 진행", () => {
  it("race 없이 새 판을 열면 죄수선에서 시작하고, 마을 행동은 할 수 없다", () => {
    const g = newGame(1, null);
    expect(g.state.opening).toEqual({ scene: OPENING_START });
    expect(g.state.story).toEqual([...openingScene(OPENING_START).lines]);
    g.depart("pines");
    g.inn();
    g.choose(0);
    expect(g.state.travel).toBeNull();
    expect(g.state.opening).not.toBeNull();
  });

  it("간수의 물음에 답하면 종족이 정해진다", () => {
    const g = newGame(1, null);
    g.openingChoose(2);
    expect(g.state.player.race).toBe("snowelf");
    expect(g.state.player.maxHp).toBe(BASE.hp + RACES.snowelf.hp);
    expect(g.state.opening!.scene).toBe("wreck");
  });

  it("끝까지 가면 서리항에 닿고, 저장된다 (무작위 없이 매번 같은 장면)", () => {
    const saves: GameState[] = [];
    const g = newGame(1, null, { onSave: (s) => saves.push(s) });
    playOpening(g, 3);
    expect(g.state.opening).toBeNull();
    expect(g.state.at).toBe("harbor");
    expect(g.state.player.race).toBe("wolfblood");
    expect(g.state.story).toEqual(expect.arrayContaining([...REGIONS.harbor.arrive]));
    expect(saves.length).toBe(1);
  });

  it("오프닝 안에서는 쓰러져도 죽지 않고 다음 장면으로 이어진다", () => {
    const g = newGame(2, null);
    playOpening(g, 0, "lose");
    expect(g.state.dead).toBe(false);
    expect(g.state.opening).toBeNull();
    expect(g.state.at).toBe("harbor");
  });

  it("쓰러지면 동행이 끌어내는 글이 나온다", () => {
    const g = newGame(3, null);
    while (!g.state.battle) g.openingChoose(0);
    g.state.player.hp = 1;
    g.state.battle!.enemy.atk = 999;
    g.act("fight"); // 맞서기만 하고 아직 맞지 않는다
    g.act("guard");
    expect(g.state.story).toEqual(expect.arrayContaining(OPENING_RESCUE));
    expect(g.state.player.hp).toBeGreaterThan(0);
    expect(g.state.battle).toBeNull();
  });

  it("함정 방은 체력을 깎지만 1 아래로는 내리지 않고, 치유 룬을 써 볼 수 있다", () => {
    const g = newGame(4, null);
    while (g.state.opening!.scene !== "trap") {
      if (g.state.battle) g.act(g.state.battle.opening ? "fight" : "attack");
      else g.openingChoose(0);
    }
    const hp = g.state.player.hp;
    const mp = g.state.player.mp;
    g.openingChoose(0); // 치유 룬
    expect(g.state.player.hp).toBeGreaterThan(hp);
    expect(g.state.player.mp).toBeLessThan(mp);
  });

  it("강타를 써 보는 방 앞에서는 숨을 골라 기력이 다 찬다 (기력이 적은 반거인도 강타를 쓸 수 있게)", () => {
    const g = newGame(7, null);
    g.openingChoose(1); // 반거인
    while (g.state.opening!.scene !== "door") {
      g.state.player.st = 0;
      if (g.state.battle) g.act(g.state.battle.opening ? "fight" : "attack");
      else g.openingChoose(0);
    }
    expect(g.state.player.st).toBe(g.state.player.maxSt);
  });

  it("몰래 지나가도, 달아나도 다음 장면으로 간다", () => {
    const g = newGame(5, null);
    playOpening(g, 1, "flee");
    expect(g.state.opening).toBeNull();
  });

  it("바로 시작(개발)은 오프닝을 건너뛰고 서리항에 닿는다", () => {
    const g = newGame(6, null);
    g.skipOpening();
    expect(g.state.opening).toBeNull();
    expect(g.state.at).toBe("harbor");
    expect(g.state.player.race).toBe("northman");
  });
});
