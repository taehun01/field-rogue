import { newGame, resumeGame, type Game, type GameHooks } from "./core/game";
import { randomSeed } from "./core/rng";
import { render, renderTitle, type Handlers, type UiState } from "./ui/render";
import { readSave, writeSave } from "./ui/storage";

const app = document.querySelector<HTMLDivElement>("#app")!;

/** 자동 저장 (F6): 게임이 마을에 닿거나 여관에서 자면 부른다 */
const hooks: GameHooks = { onSave: (s) => writeSave(s) };

// 주소에 ?seed=123 을 붙이면 같은 판을 다시 볼 수 있다 (버그 재현용, 저장은 무시하고 새 판)
const urlSeed = Number(new URLSearchParams(location.search).get("seed"));
const fixedSeed = Number.isInteger(urlSeed) && urlSeed > 0 ? urlSeed : null;

/** 새 판은 오프닝(죄수선에서 종족 고르기)부터 시작한다 */
const fresh = (seed = randomSeed()) => newGame(seed, null, hooks);

let game: Game = fresh(fixedSeed ?? undefined);
const ui: UiState = {
  itemMenu: false,
  runeMenu: false,
  mapMenu: false,
  sellMenu: false,
  boardMenu: false,
  journal: false,
  // 저장이 있으면 처음 화면에서 이어 할지 묻는다
  title: fixedSeed === null && readSave() !== null,
  hasSave: readSave() !== null,
};

/** 게임을 움직이는 일을 하고 다시 그린다. 행동을 하면 아이템 목록·지도 목록은 닫힌다 */
const run = (f: () => void) => () => {
  f();
  ui.itemMenu = false;
  ui.runeMenu = false;
  ui.mapMenu = false;
  ui.boardMenu = false;
  draw();
};

/** 메뉴를 닫지 않고 움직인다 (팔기 목록에서 여러 개를 연달아 팔 때, 짐 칸에서 버리고 장착할 때) */
const keep = (f: () => void) => () => {
  f();
  draw();
};

/** 마지막 저장에서 이어 한다. 저장이 없으면 새로 시작 */
function continueSaved(afterDeath: boolean) {
  const save = readSave();
  game = save ? resumeGame(save.state, randomSeed(), hooks, afterDeath) : fresh();
  ui.title = false;
}

const handlers: Handlers = {
  onContinue: run(() => continueSaved(game.state.dead)),
  onOpeningChoose: (i) => run(() => game.openingChoose(i))(),
  onSkipOpening: run(() => game.skipOpening()),
  onLevelUp: (stat) => keep(() => game.levelUp(stat))(),
  onInn: run(() => game.inn()),
  onOpenShop: run(() => game.openShop()),
  onOpenRunes: run(() => game.openRunes()),
  onLearnRune: (id) => keep(() => game.learnRune(id))(),
  onLeaveRunes: run(() => game.leaveRunes()),
  onDepart: (to) => run(() => game.depart(to))(),
  onBoardMenu(open) {
    ui.boardMenu = open;
    draw();
  },
  onTakeQuest: (i) => keep(() => game.takeQuest(i))(),
  onAbandonQuest: (id) => keep(() => game.abandonQuest(id))(),
  onJournal(open) {
    ui.journal = open;
    draw();
  },
  onMapMenu(open) {
    ui.mapMenu = open;
    draw();
  },
  onChoose: (i) => run(() => game.choose(i))(),
  onTurnBack: run(() => game.turnBack()),
  onAct: (a, i) => run(() => game.act(a, i))(),
  onItemMenu(open) {
    ui.itemMenu = open;
    draw();
  },
  onRuneMenu(open) {
    ui.runeMenu = open;
    draw();
  },
  onUse: (i) => keep(() => game.use(i))(),
  onCast: (i) => keep(() => game.cast(i))(),
  onEquip: (i) => keep(() => game.equip(i))(),
  onUnequip: (slot) => keep(() => game.unequip(slot))(),
  onDrop: (i) => keep(() => game.drop(i))(),
  onBuy: (i) => keep(() => game.buy(i))(),
  onSell: (i) => keep(() => game.sell(i))(),
  onSellMenu(open) {
    ui.sellMenu = open;
    draw();
  },
  onLeaveShop: run(() => {
    ui.sellMenu = false;
    game.leaveShop();
  }),
  onRest: run(() => game.rest()),
  onAnswer: (i) => run(() => game.answer(i))(),
  onEnterRoom: (i) => run(() => game.enterRoom(i))(),
  onLeaveDungeon: run(() => game.leaveDungeon()),
  onRestart: run(() => {
    game = fresh();
    ui.title = false;
  }),
};

function draw() {
  ui.hasSave = readSave() !== null;
  if (ui.title) renderTitle(app, readSave()!, handlers);
  else render(app, game.state, ui, handlers);
}

// 키보드: 1~9 는 화면의 N번째 버튼(처음 화면·마을·선택지·전투·상점·휴식·이벤트·죽음 공통)
window.addEventListener("keydown", (e) => {
  const n = Number(e.key);
  if (!(n >= 1 && n <= 9)) return;
  const b = app.querySelectorAll<HTMLButtonElement>(".choices .choice")[n - 1];
  if (b && !b.disabled) b.click();
});

draw();
