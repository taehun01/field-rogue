// 밸런스 시뮬레이션 실행기 (F8). 봇(bot.ts)으로 판을 많이 돌려 숫자를 모은다.
// 한 판 = 서리항에서 시작해 STEPS 걸음까지. 죽으면 마지막 저장에서 이어 한다 (실제 게임과 같다).
// npm run sim 으로 돌린다 (src/sim/balance.sim.test.ts). 일반 테스트(npm test)에는 들어가지 않는다.

import { RACE_IDS } from "../data/races";
import { newGame, resumeGame, type Game } from "../core/game";
import { loadOf } from "../core/player";
import { createRng } from "../core/rng";
import type { GameState, RaceId } from "../core/types";
import { botStep } from "./bot";

export interface RunResult {
  race: RaceId;
  /** 처음 죽은 걸음 (안 죽었으면 null) */
  firstDeath: number | null;
  /** 레벨 구간별 [걸은 걸음, 죽은 횟수] */
  byLevel: Map<number, { steps: number; deaths: number }>;
  /** 정해진 걸음에서의 레벨·골드 */
  checkpoints: Map<number, { level: number; gold: number }>;
  deaths: number;
  goldIn: number;
  goldOut: number;
  questsDone: number;
  chiefs: number;
  /** 걸은 걸음 가운데 짐이 들 수 있는 무게의 80%를 넘었던 걸음 비율 */
  heavySteps: number;
  steps: number;
}

export const CHECKPOINTS = [50, 100, 200, 400, 600];

/** 레벨 구간: 1~2, 3~4, 5~6, 7~9, 10+ */
export function levelBand(level: number): number {
  return level <= 2 ? 1 : level <= 4 ? 3 : level <= 6 ? 5 : level <= 9 ? 7 : 10;
}

export function runOne(seed: number, maxSteps = 600, race: RaceId = RACE_IDS[seed % RACE_IDS.length]): RunResult {
  let lastSave: GameState | null = null;
  const hooks = { onSave: (s: GameState) => (lastSave = structuredClone(s)) };
  let g: Game = newGame(seed, race, hooks);
  const rng = createRng(seed * 7919 + 1);
  const r: RunResult = {
    race,
    firstDeath: null,
    byLevel: new Map(),
    checkpoints: new Map(),
    deaths: 0,
    goldIn: 0,
    goldOut: 0,
    questsDone: 0,
    chiefs: 0,
    heavySteps: 0,
    steps: 0,
  };
  let lastStep = 0;
  let lastGold = g.state.player.gold;
  let guard = 0;

  while (lastStep < maxSteps && guard++ < maxSteps * 60) {
    botStep(g, rng);
    const s = g.state;
    // 골드 들고 남
    const dg = s.player.gold - lastGold;
    if (dg > 0) r.goldIn += dg;
    else r.goldOut -= dg;
    lastGold = s.player.gold;
    r.questsDone = s.tally.questsDone;
    r.chiefs = s.tally.chiefs;
    if (s.step > lastStep) {
      const band = levelBand(s.player.level);
      const b = r.byLevel.get(band) ?? { steps: 0, deaths: 0 };
      b.steps += s.step - lastStep;
      r.byLevel.set(band, b);
      if (loadOf(s.player) > s.player.carry * 0.8) r.heavySteps += s.step - lastStep;
      for (const c of CHECKPOINTS) if (lastStep < c && s.step >= c) r.checkpoints.set(c, { level: s.player.level, gold: s.player.gold });
      lastStep = s.step;
    }
    if (s.dead) {
      r.deaths++;
      if (r.firstDeath === null) r.firstDeath = s.step;
      const band = levelBand(s.player.level);
      const b = r.byLevel.get(band) ?? { steps: 0, deaths: 0 };
      b.deaths++;
      r.byLevel.set(band, b);
      // 마지막 저장에서 이어 한다. 걸음 수는 이어서 센다 (진행을 잃은 만큼은 다시 걷는다)
      const step = s.step;
      g = resumeGame(lastSave!, seed * 31 + r.deaths, hooks, true);
      g.state.step = step;
      lastGold = g.state.player.gold;
    }
  }
  r.steps = lastStep;
  return r;
}

const pct = (n: number, d: number) => (d ? `${((n / d) * 100).toFixed(1)}%` : "-");
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[s.length >> 1] : 0;
};

/** 여러 판을 돌리고 마크다운 표로 정리한다 */
export function report(runs: RunResult[]): string {
  const out: string[] = [];
  const n = runs.length;
  const early = runs.filter((r) => r.firstDeath !== null && r.firstDeath <= 30).length;
  const firsts = runs.map((r) => r.firstDeath).filter((x): x is number => x !== null);
  out.push(`판 수 ${n}, 판마다 ${runs[0]?.steps ?? 0}걸음까지 (죽으면 마지막 저장에서 이어 함)`);
  out.push("");
  out.push("| 지표 | 값 |", "|---|---|");
  out.push(`| 30걸음 안에 처음 죽은 판 | ${pct(early, n)} |`);
  out.push(`| 한 번이라도 죽은 판 | ${pct(firsts.length, n)} |`);
  out.push(`| 처음 죽은 걸음 (중간값) | ${median(firsts)} |`);
  out.push(`| 판당 죽은 횟수 (평균) | ${avg(runs.map((r) => r.deaths)).toFixed(2)} |`);
  out.push(`| 판당 끝낸 의뢰 (평균) | ${avg(runs.map((r) => r.questsDone)).toFixed(1)} |`);
  out.push(`| 판당 쓰러뜨린 우두머리 (평균) | ${avg(runs.map((r) => r.chiefs)).toFixed(1)} |`);
  out.push(`| 판당 번 골드 / 쓴 골드 (평균) | ${avg(runs.map((r) => r.goldIn)).toFixed(0)} / ${avg(runs.map((r) => r.goldOut)).toFixed(0)} |`);
  out.push(`| 짐이 80%를 넘은 걸음 비율 | ${pct(runs.reduce((a, r) => a + r.heavySteps, 0), runs.reduce((a, r) => a + r.steps, 0))} |`);
  out.push("");
  out.push("레벨 곡선과 골드 (걸음별 중간값)", "", "| 걸음 | 레벨 | 골드 |", "|---|---|---|");
  for (const c of CHECKPOINTS) {
    const cs = runs.map((r) => r.checkpoints.get(c)).filter((x) => x !== undefined);
    out.push(`| ${c} | ${median(cs.map((x) => x!.level))} | ${median(cs.map((x) => x!.gold))} |`);
  }
  out.push("");
  out.push("레벨 구간별 위험 (100걸음당 죽은 횟수)", "", "| 레벨 | 걸음 | 100걸음당 죽음 |", "|---|---|---|");
  for (const band of [1, 3, 5, 7, 10]) {
    let steps = 0;
    let deaths = 0;
    for (const r of runs) {
      const b = r.byLevel.get(band);
      if (b) (steps += b.steps), (deaths += b.deaths);
    }
    const label = { 1: "1~2", 3: "3~4", 5: "5~6", 7: "7~9", 10: "10+" }[band];
    out.push(`| ${label} | ${steps} | ${steps ? ((deaths / steps) * 100).toFixed(2) : "-"} |`);
  }
  out.push("");
  out.push("종족별", "", "| 종족 | 30걸음 안 죽음 | 판당 죽음 | 600걸음 레벨 |", "|---|---|---|---|");
  for (const race of RACE_IDS) {
    const rs = runs.filter((r) => r.race === race);
    const e = rs.filter((r) => r.firstDeath !== null && r.firstDeath <= 30).length;
    const lv = rs.map((r) => r.checkpoints.get(600)?.level).filter((x): x is number => x !== undefined);
    out.push(`| ${race} | ${pct(e, rs.length)} | ${avg(rs.map((r) => r.deaths)).toFixed(2)} | ${median(lv)} |`);
  }
  return out.join("\n");
}
