// 장면-선택지 루프 (1단계). 다음 선택지를 뽑는 규칙은 choices.ts (2단계).
// 선택지 2~3개 → 고르면 장면 하나가 벌어짐 → 다음 선택지. 되돌아가기 없음. 체력 0이면 끝.
// 화면과 분리된 순수 로직이라 테스트와 밸런스 시뮬레이션에서 그대로 돌릴 수 있다.

import { DEATH, DECEIVED, OPENING } from "../content/placeholder";
import { rollChoices } from "./choices";
import { createRng, type Rng } from "./rng";
import type { GameState, Player, SceneKind } from "./types";

/** [임시값] 시작 능력치 */
export const START_PLAYER: Player = { hp: 20, maxHp: 20, atk: 3, def: 1, gold: 0, items: [] };

export interface Game {
  readonly state: GameState;
  /** 선택지 index 를 고른다. 죽었거나 범위 밖이면 아무 일도 없다. */
  choose(index: number): void;
}

export function newGame(seed: number): Game {
  const rng = createRng(seed);
  const state: GameState = {
    seed,
    step: 0,
    player: structuredClone(START_PLAYER),
    choices: [],
    since: {},
    story: [...OPENING],
    dead: false,
  };
  state.choices = rollChoices(rng);

  return {
    state,
    choose(index) {
      if (state.dead) return;
      const choice = state.choices[index];
      if (!choice) return;
      state.step++;
      state.story = resolve(choice.kind, state.player, rng);
      if (choice.kind !== choice.hintKind) state.story.unshift(DECEIVED);
      for (const k of Object.keys(state.since) as SceneKind[]) state.since[k]! += 1;
      state.since[choice.kind] = 0;
      if (state.player.hp <= 0) {
        state.player.hp = 0;
        state.dead = true;
        state.story.push(DEATH);
        state.choices = [];
        return;
      }
      state.choices = rollChoices(rng, {
        since: state.since,
        lastHints: state.choices.map((c) => c.hint),
      });
    },
  };
}

/**
 * 장면 하나를 처리하고 보여줄 문장을 돌려준다. player 를 직접 바꾼다.
 * 1단계에서는 전부 자리표시: 전투는 자동 정산, 상점·던전은 입구만.
 * 2단계 이후 종류별로 제대로 된 처리(턴제 전투, 상점 화면, 던전 방)로 바뀐다.
 */
function resolve(kind: SceneKind, p: Player, rng: Rng): string[] {
  switch (kind) {
    case "battle": {
      const dmg = Math.max(1, rng.int(3, 7) - p.def);
      const gold = rng.int(3, 8);
      p.hp -= dmg;
      p.gold += gold;
      return [`[임시] 무언가와 싸웠다. 체력 -${dmg}, 골드 +${gold}`];
    }
    case "event": {
      if (rng.next() < 0.5) {
        const gold = rng.int(2, 6);
        p.gold += gold;
        return [`[임시] 길에서 동전 주머니를 주웠다. 골드 +${gold}`];
      }
      const dmg = rng.int(1, 3);
      p.hp -= dmg;
      return [`[임시] 덫을 밟았다. 체력 -${dmg}`];
    }
    case "rest": {
      const heal = Math.min(p.maxHp - p.hp, Math.ceil(p.maxHp * 0.3));
      p.hp += heal;
      return [`[임시] 잠시 쉬었다. 체력 +${heal}`];
    }
    case "shop":
      return ["[임시] 떠돌이 상인을 만났다. 아직 파는 물건이 없다."];
    case "dungeon":
      return ["[임시] 던전 입구를 발견했다. 아직 들어갈 수 없다."];
  }
}
