import { describe, expect, it } from "vitest";
import { REGION_IDS } from "../data/regions";
import { eventById, fieldEvents } from "../data/events";
import { DECEIVE_CHANCE, EMPTY_CONTEXT, hintsFor, RECOVERY, rollChoices, SCENE_WEIGHTS } from "./choices";
import { createRng } from "./rng";

const N = 20_000;

describe("선택지 기본", () => {
  it("2~3개, 한 화면 안 단서 종류 중복 없음, 단서가 그 종류의 단서", () => {
    const rng = createRng(1);
    for (let i = 0; i < 1000; i++) {
      const cs = rollChoices(rng);
      expect(cs.length).toBeGreaterThanOrEqual(2);
      expect(cs.length).toBeLessThanOrEqual(3);
      expect(new Set(cs.map((c) => c.hintKind)).size).toBe(cs.length);
      for (const c of cs) expect(hintsFor("harbor", c.hintKind)).toContain(c.hint);
    }
  });

  it("지역마다 그 지역 단서와 그 지역 이벤트만 나온다", () => {
    const rng = createRng(9);
    for (const region of REGION_IDS) {
      for (let i = 0; i < 2000; i++) {
        for (const c of rollChoices(rng, { ...EMPTY_CONTEXT, region })) {
          expect(hintsFor(region, c.hintKind)).toContain(c.hint);
          if (c.kind === "event") expect(fieldEvents(region)).toContain(eventById(c.eventId!));
        }
      }
    }
  });
});

describe("단서 반복 막기", () => {
  it("바로 전 화면의 단서 문장은 나오지 않는다", () => {
    const rng = createRng(2);
    let prev = rollChoices(rng);
    for (let i = 0; i < N; i++) {
      const lastHints = prev.map((c) => c.hint);
      const next = rollChoices(rng, { since: {}, lastHints, region: "harbor" });
      for (const c of next) expect(lastHints).not.toContain(c.hint);
      prev = next;
    }
  });
});

describe("연달아 같은 일 막기", () => {
  /** battle 이 since 걸음 전에 벌어졌을 때, 한 화면에 battle 단서가 나오는 비율 */
  function battleRate(since: number | undefined) {
    const rng = createRng(3);
    let hits = 0;
    for (let i = 0; i < N; i++) {
      const cs = rollChoices(rng, { since: { battle: since }, lastHints: [], region: "harbor" });
      if (cs.some((c) => c.hintKind === "battle")) hits++;
    }
    return hits / N;
  }

  it("방금 벌어진 종류는 단서로도, 속임으로도 나오지 않는다", () => {
    const rng = createRng(5);
    for (let i = 0; i < N; i++) {
      for (const c of rollChoices(rng, { since: { battle: 0 }, lastHints: [], region: "harbor" })) {
        expect(c.hintKind).not.toBe("battle");
        expect(c.kind).not.toBe("battle");
      }
    }
  });

  it("그 뒤로 걸음이 지날수록 서서히 원래 확률로 돌아온다", () => {
    const rates = [0, 1, 2, RECOVERY.length].map(battleRate);
    expect(rates[0]).toBe(0);
    for (let i = 1; i < rates.length; i++) expect(rates[i]).toBeGreaterThan(rates[i - 1]);
    expect(Math.abs(rates[rates.length - 1] - battleRate(undefined))).toBeLessThan(0.02);
  });
});

describe("가끔 속임", () => {
  it("속임 비율이 DECEIVE_CHANCE 근처이고, 속일 때는 다른 종류", () => {
    const rng = createRng(4);
    let total = 0;
    let deceived = 0;
    for (let i = 0; i < N; i++) {
      for (const c of rollChoices(rng)) {
        total++;
        if (c.kind !== c.hintKind) deceived++;
        expect(Object.keys(SCENE_WEIGHTS)).toContain(c.kind);
      }
    }
    expect(Math.abs(deceived / total - DECEIVE_CHANCE)).toBeLessThan(0.01);
  });
});
