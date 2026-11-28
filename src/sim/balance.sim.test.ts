// npm run sim: 밸런스 시뮬레이션 (F8). 결과 표를 콘솔에 찍는다. 판 수는 SIM_RUNS 로 바꾼다.
import { it } from "vitest";
import { report, runOne } from "./run";

// 노드 타입 없이 환경 변수만 읽는다
declare const process: { env: Record<string, string | undefined> };

it("밸런스 시뮬레이션", () => {
  const n = Number(process.env.SIM_RUNS ?? 400);
  const steps = Number(process.env.SIM_STEPS ?? 600);
  const runs = Array.from({ length: n }, (_, i) => runOne(i + 1, steps));
  console.log("\n" + report(runs));
}, 600_000);
