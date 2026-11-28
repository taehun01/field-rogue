import { describe, expect, it } from "vitest";
import { createRng } from "./rng";

describe("createRng", () => {
  it("같은 시드면 같은 수열", () => {
    const a = createRng(42);
    const b = createRng(42);
    for (let i = 0; i < 100; i++) expect(a.next()).toBe(b.next());
  });

  it("다른 시드면 다른 수열", () => {
    expect(createRng(1).next()).not.toBe(createRng(2).next());
  });

  it("int 는 양 끝을 포함한 범위 안", () => {
    const r = createRng(7);
    const seen = new Set<number>();
    for (let i = 0; i < 1000; i++) {
      const v = r.int(1, 3);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(3);
      seen.add(v);
    }
    expect(seen).toEqual(new Set([1, 2, 3]));
  });

  it("pick 은 빈 배열이면 에러", () => {
    expect(() => createRng(1).pick([])).toThrow();
  });
});

import { josa } from "../content/text";

describe("조사", () => {
  it("받침에 따라 조사를 고른다", () => {
    expect(josa("늑대", "이/가")).toBe("늑대가");
    expect(josa("서리 트롤", "이/가")).toBe("서리 트롤이");
    expect(josa("바다 까마귀 떼", "을/를")).toBe("바다 까마귀 떼를");
    expect(josa("서리항", "으로/로")).toBe("서리항으로");
    expect(josa("송진골", "으로/로")).toBe("송진골로");
    expect(josa("뼈울타리", "으로/로")).toBe("뼈울타리로");
    expect(josa("회복약", "은/는")).toBe("회복약은");
  });
});
