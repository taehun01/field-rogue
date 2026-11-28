// 테스트에서 판을 진행시키는 도우미. 게임 코드는 이 파일을 쓰지 않는다.
// 화면마다 무난한 행동 하나를 골라 한 번 움직인다. 규칙이 바뀌면 여기만 고치면 된다.

import { eventById } from "../data/events";
import { newGame, type Game } from "./game";
import { neighbors } from "./map";
import { overloaded } from "./player";
import { pendingLevels } from "./skills";
import type { SceneKind } from "./types";

/** 이벤트의 마지막 고를 거리 (늘 "지나간다", 조건 없음) */
export const lastOption = (g: Game) => eventById(g.state.event!.id).options.length - 1;

/** 전투 한 번 진행: 적이 아직 못 봤으면 맞서고, 아니면 공격 */
export function fightOnce(g: Game) {
  g.act(g.state.battle?.opening ? "fight" : "attack");
}

/** 전투 시작 전 은신 고르기를 건너뛰고 맞선다 (이미 맞섰으면 아무 일도 없다) */
export function engage(g: Game) {
  if (g.state.battle?.opening) g.act("fight");
}

/** 마을도 길 위 선택지도 아닌 장면 중인가 */
export const inScene = (g: Game) => {
  const s = g.state;
  return s.battle !== null || s.shop !== null || s.camp || s.event !== null || s.dungeon !== null;
};

/**
 * 한 번 움직인다. 전투는 공격, 상점은 떠남, 쉴 곳은 모닥불, 이벤트는 지나감,
 * 던전 갈림길은 index 번 방, 길 위면 index 번 선택지, 마을이면 index 번 이웃으로 떠난다.
 */
export function stepOnce(g: Game, index = 0) {
  const s = g.state;
  if (s.dead) return;
  // 너무 무거우면 걷기 전에 짐을 앞에서부터 버린다
  if (!s.battle && !s.event && overloaded(s.player)) {
    while (overloaded(s.player) && s.player.bag.length) g.drop(0);
  }
  if (pendingLevels(s.player) > 0 && !s.battle && !s.event) g.levelUp("hp");
  else if (s.battle) fightOnce(g);
  else if (s.shop) g.leaveShop();
  else if (s.camp) g.rest();
  else if (s.event) g.answer(lastOption(g));
  else if (s.dungeon) g.enterRoom(index % s.dungeon.choices.length);
  else if (s.travel) g.choose(index % s.choices.length);
  else {
    const n = neighbors(s.at);
    g.depart(n[index % n.length].to);
  }
}

/** 죽지 않게 체력을 크게 두고, 전리품이 쌓여도 걸을 수 있게 들 수 있는 무게도 크게 둔 판 */
export function sturdy(seed: number): Game {
  const g = newGame(seed);
  g.state.player.hp = g.state.player.maxHp = 9999;
  g.state.player.carry = 99999;
  return g;
}

/**
 * kind 장면이 벌어지는 선택지를 골라 그 장면 안에 들어선 판. 가는 길의 다른 일은 무난히 넘긴다.
 * 던전은 들어가지 않고 나온다 (kind 가 dungeon 이 아니면).
 */
export function reach(kind: SceneKind, seed = 1): Game {
  for (let s = seed; s < seed + 500; s++) {
    const g = sturdy(s);
    for (let n = 0; n < 300 && !g.state.dead; n++) {
      const st = g.state;
      if (st.travel && !inScene(g)) {
        const i = st.choices.findIndex((c) => c.kind === kind);
        g.choose(Math.max(0, i));
        if (i >= 0) {
          engage(g);
          if (g.state.battle || kind !== "battle") return g;
          break; // 맞서자마자 끝나는 일은 없지만, 혹시 끝났으면 다른 시드로
        }
      } else if (st.dungeon && !st.battle && !st.event) g.leaveDungeon();
      else stepOnce(g);
    }
  }
  throw new Error(`${kind} 에 닿지 못함`);
}

/** 길 위 선택지 화면에 선 판 (출발 직후) */
export function onRoad(seed = 1): Game {
  const g = sturdy(seed);
  g.depart(neighbors(g.state.at)[0].to);
  return g;
}
