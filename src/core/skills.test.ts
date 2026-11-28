import { describe, expect, it } from "vitest";
import { RACES } from "../data/races";
import { itemDef } from "../data/items";
import { REGIONS } from "../data/regions";
import { battleTurn, enemyScale } from "./battle";
import { newGame } from "./game";
import { buyPrice, gearTier, sellPrice } from "./items";
import { newPlayer } from "./player";
import { createRng } from "./rng";
import {
  buyRate,
  LEVEL_GAIN,
  levelUp,
  pendingLevels,
  practiceNeeded,
  RISES_PER_LEVEL,
  SKILL_IDS,
  sellRate,
  sneakChance,
  SPEECH,
  START_SKILL,
  train,
} from "./skills";
import { lastOption, reach } from "./testkit";
import type { Battle, Player } from "./types";

const player = (over: Partial<Player> = {}): Player => ({ ...newPlayer("northman"), ...over });
const battle = (over: Partial<Battle> = {}): Battle => ({
  enemy: { id: "wolf", name: "늑대", hp: 30, maxHp: 30, atk: 4, def: 0, gold: [5, 5] },
  opening: true,
  ...over,
});

describe("기술", () => {
  it("기술 6개, 시작값은 공통 + 종족 보너스", () => {
    expect(SKILL_IDS.length).toBe(6);
    for (const r of Object.values(RACES)) {
      const p = newPlayer(r.id);
      for (const s of SKILL_IDS) expect(p.skills[s]).toBe(START_SKILL + (r.skills[s] ?? 0));
    }
  });

  it("연습이 쌓이면 오르고, 높을수록 더 많이 연습해야 오른다", () => {
    expect(practiceNeeded(30)).toBeGreaterThan(practiceNeeded(5));
    const p = player();
    const before = p.skills.sneak;
    expect(train(p, "sneak", practiceNeeded(before) - 1)).toEqual([]);
    expect(p.skills.sneak).toBe(before);
    expect(train(p, "sneak", 1).length).toBe(1);
    expect(p.skills.sneak).toBe(before + 1);
    expect(p.rises).toBe(1);
  });

  it("싸우면 무기술과 방어가 오른다 (한 판 안에서)", () => {
    const g = reach("battle");
    const p = g.state.player;
    const w = p.skills.weapon + p.practice.weapon / 100;
    const b = p.skills.block + p.practice.block / 100;
    for (let i = 0; i < 6 && g.state.battle; i++) g.act("attack");
    expect(p.skills.weapon + p.practice.weapon / 100).toBeGreaterThan(w);
    expect(p.skills.block + p.practice.block / 100).toBeGreaterThan(b);
  });
});

describe("레벨", () => {
  it(`기술이 ${RISES_PER_LEVEL}번 오르면 레벨업 하나가 쌓이고, 고르면 그 수치가 오른다`, () => {
    const p = player();
    p.rises = RISES_PER_LEVEL - 1;
    expect(pendingLevels(p)).toBe(0);
    expect(levelUp(p, "hp")).toBe(false);
    p.rises++;
    expect(pendingLevels(p)).toBe(1);
    const { maxHp, maxSt, carry } = p;
    expect(levelUp(p, "st")).toBe(true);
    expect(p.level).toBe(2);
    expect(p.maxSt).toBe(maxSt + LEVEL_GAIN.st);
    expect(p.carry).toBe(carry + LEVEL_GAIN.carry); // 기력을 고르면 들 수 있는 무게도 는다
    expect(p.maxHp).toBe(maxHp);
    expect(pendingLevels(p)).toBe(0);
  });

  it("전투 중에는 레벨업을 고를 수 없다", () => {
    const g = reach("battle");
    const p = g.state.player;
    p.rises = RISES_PER_LEVEL;
    g.levelUp("hp");
    expect(p.level).toBe(1);
    while (g.state.battle) g.act("attack");
    g.levelUp("mp");
    expect(p.level).toBe(2);
  });

  it("적은 플레이어 레벨에 맞춰 강해진다 (지역과 상관없이)", () => {
    const g = reach("battle", 3);
    g.state.player.level = 1;
    const id = g.state.battle!.enemy.id;
    const def = Object.values(REGIONS).flatMap((r) => r.enemies).find((e) => e.id === id)!;
    expect(g.state.battle!.enemy.maxHp).toBe(Math.ceil(def.maxHp * enemyScale(1)));

    const h = reach("battle", 3);
    h.state.player.level = 9; // 다음 전투부터 반영된다
    while (h.state.battle) h.act("attack");
    for (let n = 0; n < 200 && !h.state.battle; n++) {
      const s = h.state;
      if (s.travel && !s.shop && !s.camp && !s.event && !s.dungeon) {
        const i = s.choices.findIndex((c) => c.kind === "battle");
        h.choose(Math.max(0, i));
      } else if (s.shop) h.leaveShop();
      else if (s.camp) h.rest();
      else if (s.event) h.answer(lastOption(h));
      else if (s.dungeon) h.leaveDungeon();
      else h.depart("pines");
    }
    const e = h.state.battle!.enemy;
    const d = Object.values(REGIONS).flatMap((r) => r.enemies).find((x) => x.id === e.id)!;
    expect(e.maxHp).toBe(Math.ceil(d.maxHp * enemyScale(9)));
  });

  it("장비 등급은 레벨이 오를수록 높아진다", () => {
    expect(gearTier(1)).toBe(0);
    expect(gearTier(5)).toBe(1);
    expect(gearTier(10)).toBe(2);
  });
});

describe("은신", () => {
  it("몰래 지나가면 싸움 없이 끝나고 보상도 없다. 실패하면 들켜서 먼저 맞는다", () => {
    let sneaked = 0;
    let spotted = 0;
    for (let seed = 1; seed <= 300; seed++) {
      const p = player({ hp: 50, maxHp: 50 });
      const b = battle();
      const r = battleTurn(b, p, "sneak", createRng(seed));
      expect(b.opening).toBeUndefined();
      if (r.outcome === "sneaked") {
        sneaked++;
        expect(p.gold).toBe(0);
        expect(p.hp).toBe(50);
      } else {
        spotted++;
        expect(p.hp).toBeLessThan(50);
      }
      expect(r.train.sneak).toBeGreaterThan(0);
    }
    expect(sneaked).toBeGreaterThan(0);
    expect(spotted).toBeGreaterThan(0);
  });

  it("기습에 성공하면 반격 없이 크게 친다", () => {
    for (let seed = 1; seed <= 100; seed++) {
      const p = player();
      const b = battle();
      battleTurn(b, p, "ambush", createRng(seed));
      if (p.hp === p.maxHp && b.enemy.hp < 30) {
        expect(30 - b.enemy.hp).toBeGreaterThan(5);
        return;
      }
    }
    throw new Error("기습이 한 번도 성공하지 않음");
  });

  it("맞서면 그냥 싸움이 시작되고, 시작 전에는 공격할 수 없다", () => {
    const p = player();
    const b = battle();
    battleTurn(b, p, "attack", createRng(1));
    expect(b.opening).toBe(true);
    expect(b.enemy.hp).toBe(30);
    battleTurn(b, p, "fight", createRng(1));
    expect(b.opening).toBeUndefined();
    expect(p.hp).toBe(p.maxHp);
  });

  it("우두머리는 몰래 지나갈 수 없다 (기습은 된다)", () => {
    const b = battle({ chief: true });
    const p = player();
    const r = battleTurn(b, p, "sneak", createRng(1));
    expect(r.outcome).toBe("ongoing");
    expect(b.opening).toBe(true);
  });

  it("은신이 높을수록 잘 숨고, 무거운 갑옷은 크게 방해한다", () => {
    const p = player();
    const base = sneakChance(p);
    p.skills.sneak += 10;
    const skilled = sneakChance(p);
    expect(skilled).toBeGreaterThan(base);
    p.armor = "steel_plate";
    expect(itemDef("steel_plate").heavy).toBe(true);
    expect(sneakChance(p)).toBeLessThan(skilled - 0.15);
  });

  it("이벤트 끝에 벌어진 싸움은 은신 고르기 없이 바로 시작한다", () => {
    for (let seed = 1; seed <= 300; seed++) {
      const g = newGame(seed);
      g.state.player.hp = g.state.player.maxHp = 999;
      g.depart("pines");
      for (let n = 0; n < 50 && g.state.travel; n++) {
        const s = g.state;
        if (s.event) {
          // 싸움으로 이어지는 고를 거리를 찾아 고른다
          g.answer(1);
          if (g.state.battle) {
            expect(g.state.battle.opening).toBeUndefined();
            return;
          }
        } else if (s.battle) g.act(s.battle.opening ? "fight" : "attack");
        else if (s.shop) g.leaveShop();
        else if (s.camp) g.rest();
        else if (s.dungeon) g.leaveDungeon();
        else {
          const i = s.choices.findIndex((c) => c.kind === "event");
          g.choose(Math.max(0, i));
        }
      }
    }
    throw new Error("이벤트 싸움을 만나지 못함");
  });
});

describe("흥정", () => {
  it("흥정이 오를수록 싸게 사고 비싸게 판다 (한도 있음)", () => {
    const p = player();
    const buy0 = buyRate(p);
    const sell0 = sellRate(p);
    p.skills.speech += 20;
    expect(buyRate(p)).toBeLessThan(buy0);
    expect(sellRate(p)).toBeGreaterThan(sell0);
    p.skills.speech = 100;
    expect(buyRate(p)).toBeGreaterThanOrEqual(SPEECH.buyMin);
    expect(sellRate(p)).toBeLessThanOrEqual(SPEECH.sellMax);
    expect(buyPrice(p, 100)).toBe(70);
    expect(sellPrice("bear_pelt", sellRate(p))).toBe(Math.floor(30 * SPEECH.sellMax));
  });

  it("사고팔면 흥정이 오른다", () => {
    const g = newGame(5);
    const p = g.state.player;
    p.gold = 999;
    p.bag = Array(10).fill("bear_pelt");
    g.openShop();
    const before = p.skills.speech;
    for (let i = 0; i < 10; i++) g.sell(0);
    expect(p.skills.speech).toBeGreaterThan(before);
  });
});
