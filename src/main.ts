import { newGame, type Game } from "./core/game";
import { randomSeed } from "./core/rng";
import { render, type Handlers, type UiState } from "./ui/render";

const app = document.querySelector<HTMLDivElement>("#app")!;

// 주소에 ?seed=123 을 붙이면 같은 판을 다시 볼 수 있다 (버그 재현용)
const urlSeed = Number(new URLSearchParams(location.search).get("seed"));
let game: Game = newGame(Number.isInteger(urlSeed) && urlSeed > 0 ? urlSeed : randomSeed());
const ui: UiState = { itemMenu: false };

/** 게임을 움직이는 일을 하고 다시 그린다. 행동을 하면 아이템 목록은 닫힌다 */
const run = (f: () => void) => () => {
  f();
  ui.itemMenu = false;
  draw();
};

const handlers: Handlers = {
  onChoose: (i) => run(() => game.choose(i))(),
  onAct: (a, i) => run(() => game.act(a, i))(),
  onItemMenu(open) {
    ui.itemMenu = open;
    draw();
  },
  onUse: (i) => run(() => game.use(i))(),
  onBuy: (i) => run(() => game.buy(i))(),
  onLeaveShop: run(() => game.leaveShop()),
  onRest: (o) => run(() => game.rest(o))(),
  onAnswer: (i) => run(() => game.answer(i))(),
  onEnterRoom: (i) => run(() => game.enterRoom(i))(),
  onLeaveDungeon: run(() => game.leaveDungeon()),
  onRestart: run(() => {
    game = newGame(randomSeed());
  }),
};

function draw() {
  render(app, game.state, ui, handlers);
}

// 키보드: 1~9 는 화면의 N번째 버튼(선택지·전투·상점·휴식·이벤트 공통), 죽었으면 Enter 로 다시 시작
window.addEventListener("keydown", (e) => {
  if (game.state.dead) {
    if (e.key === "Enter") handlers.onRestart();
    return;
  }
  const n = Number(e.key);
  if (!(n >= 1 && n <= 9)) return;
  const b = app.querySelectorAll<HTMLButtonElement>(".choices .choice")[n - 1];
  if (b && !b.disabled) b.click();
});

draw();
