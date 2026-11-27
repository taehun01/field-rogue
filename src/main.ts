import { newGame, type Game } from "./core/game";
import { randomSeed } from "./core/rng";
import type { BattleAction } from "./core/types";
import { BATTLE_ACTIONS, render } from "./ui/render";

const app = document.querySelector<HTMLDivElement>("#app")!;

// 주소에 ?seed=123 을 붙이면 같은 판을 다시 볼 수 있다 (버그 재현용)
const urlSeed = Number(new URLSearchParams(location.search).get("seed"));
let game: Game = newGame(Number.isInteger(urlSeed) && urlSeed > 0 ? urlSeed : randomSeed());

const handlers = {
  onChoose(i: number) {
    game.choose(i);
    draw();
  },
  onAct(action: BattleAction) {
    game.act(action);
    draw();
  },
  onRestart() {
    game = newGame(randomSeed());
    draw();
  },
};

function draw() {
  render(app, game.state, handlers);
}

// 키보드: 1~3 으로 선택(전투 중엔 1~4 로 행동), 죽었으면 Enter 로 다시 시작
window.addEventListener("keydown", (e) => {
  if (game.state.dead) {
    if (e.key === "Enter") handlers.onRestart();
    return;
  }
  const n = Number(e.key);
  if (game.state.battle) {
    if (n >= 1 && n <= BATTLE_ACTIONS.length) handlers.onAct(BATTLE_ACTIONS[n - 1].action);
    return;
  }
  if (n >= 1 && n <= game.state.choices.length) handlers.onChoose(n - 1);
});

draw();
