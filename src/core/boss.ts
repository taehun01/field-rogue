// 보스와 만나는 네 가지 길 (7단계). docs/01-mvp.md 한 판의 흐름 5번.
// 넷 다 '다음 장면을 섞는 규칙'이다 (decisions.md). 실제로 섞는 일은 choices.ts(징조·우연)와 game.ts(소문·던전)가 한다.
// - 징조: 선택지 단서에 가끔 징조가 붙고, 징조가 붙은 선택을 OMEN_NEEDED 번 고르면 그 장면 대신 보스
// - 소문: 싸우거나 던전에 들어갈 때마다 숨은 수치가 오르고, 기준을 넘으면 다음 선택지 대신 보스가 찾아온다
// - 우연: 드물게 보스 단서가 선택지에 섞인다
// - 던전: 던전 끝 상자를 연 뒤 "더 깊이 들어간다"를 고르면 보스
// 보스는 한 판에 한 번만. 어느 길로든 만나면 나머지 길은 모두 닫힌다 (open-questions.md 기본안).

import { BOSS_TEXT } from "../content/placeholder";
import { enemyScale } from "./battle";
import type { Rng } from "./rng";
import type { Battle, BossPath } from "./types";

/** 길마다 켜고 끌 수 있다. 밸런스 시뮬레이션에서 길 하나씩 떼어 보려고 */
export const BOSS_PATHS: Record<BossPath, boolean> = { omen: true, rumor: true, chance: true, deep: true };

/** [임시값] 보스 능력치. 보통 적처럼 걸음 수에 따라 강해진다 (battle.ts enemyScale) */
export const BOSS = { maxHp: 30, atk: 6, def: 1, gold: [40, 60] as [number, number] };

/** [임시값] 보스에게서 도망칠 확률 (보통 적 0.5). 연막탄은 그대로 통한다. 도망칠 수 있는지는 open-questions.md */
export const BOSS_FLEE_CHANCE = 0.25;

/** [임시값] 보스를 쓰러뜨리면 골드와 함께 얻는 것. 무엇을 줄지는 open-questions.md */
export const BOSS_REWARD_ITEM = "heart" as const;

/** [임시값] 선택지 하나에 징조가 붙을 확률 */
export const OMEN_CHANCE = 0.1;
/** [임시값] 징조를 몇 번 고르면 보스와 마주치나. 띄엄띄엄 세도 된다 (연달아인지는 open-questions.md) */
export const OMEN_NEEDED = 3;

/** [임시값] 소문 수치가 오르는 일과 양, 보스가 찾아오는 기준 */
export const RUMOR_GAIN = { battle: 1, dungeon: 2 };
export const RUMOR_LIMIT = 12;

/** [임시값] 필드 선택지 화면 하나에 보스 단서가 섞일 확률 */
export const BOSS_CHANCE = 0.02;

/** 보스 전투를 연다. step 은 강해지는 기준 */
export function startBoss(step: number): Battle {
  const m = enemyScale(step);
  const maxHp = Math.ceil(BOSS.maxHp * m);
  const atk = Math.ceil(BOSS.atk * m);
  return {
    enemy: { id: "boss", name: BOSS_TEXT.name, maxHp, hp: maxHp, atk, def: BOSS.def, gold: BOSS.gold },
    boss: true,
  };
}

/** 징조 문장 하나 (선택지 단서 뒤에 붙는다) */
export function rollOmen(rng: Rng): string {
  return rng.pick(BOSS_TEXT.omens);
}
