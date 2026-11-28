// 화면 그리기. 상태를 읽어 DOM 을 통째로 다시 그린다 (텍스트 게임이라 이 정도로 충분).
// 키보드 1~9 는 .choices 안의 N번째 버튼을 누른다 (main.ts). 그래서 화면마다 버튼 순서 = 키 번호.
// 짐 칸(.bag)의 버튼은 번호 키가 없고 마우스로만 누른다.

import {
  BAG_TEXT,
  CAMP_TEXT,
  ENEMY_STATUS,
  OPENING_TEXT,
  QUEST_TEXT,
  RESUME_TEXT,
  RUNE_TEXT,
  SHOP_TEXT,
  SKILL_NAMES,
  SKILL_TEXT,
  SNEAK_TEXT,
  TOWN_TEXT,
  TRAVEL_TEXT,
} from "../content/text";
import { eventById } from "../data/events";
import { itemDef, type ItemId } from "../data/items";
import { OPENING_START, openingScene } from "../data/opening";
import { RACES } from "../data/races";
import { REGIONS } from "../data/regions";
import { RUNE_IDS, RUNES } from "../data/runes";
import { FLEE_COST, POWER_COST } from "../core/battle";
import { canChoose } from "../core/events";
import { innPrice } from "../core/game";
import { buyPrice, sellPrice } from "../core/items";
import { neighbors } from "../core/map";
import { MAX_QUESTS, questProgress, questTitle } from "../core/quests";
import { attackOf, defenseOf, loadOf, overloaded } from "../core/player";
import { LEVEL_GAIN, pendingLevels, sellRate, SKILL_IDS, sneakChance, type LevelStat } from "../core/skills";
import type { BattleAction, Enemy, GameState, RegionId, RuneId } from "../core/types";
import type { SaveFile } from "../core/save";
import { mapSvg } from "./map";

export interface Handlers {
  /** 마지막 저장에서 이어 한다 (처음 화면, 죽은 뒤) */
  onContinue(): void;
  onOpeningChoose(index: number): void;
  /** 개발용 바로 시작 */
  onSkipOpening(): void;
  onLevelUp(stat: LevelStat): void;
  onInn(): void;
  onOpenShop(): void;
  onOpenRunes(): void;
  onLearnRune(id: RuneId): void;
  onLeaveRunes(): void;
  onDepart(to: RegionId): void;
  /** 마을에서 지도(목적지 목록) 열기/닫기 (화면 상태라 게임 로직엔 없다) */
  onMapMenu(open: boolean): void;
  /** 마을 게시판 열기/닫기 */
  onBoardMenu(open: boolean): void;
  onTakeQuest(index: number): void;
  onAbandonQuest(id: number): void;
  /** 일지 펼치기/접기 */
  onJournal(open: boolean): void;
  onChoose(index: number): void;
  onTurnBack(): void;
  onAct(action: BattleAction, itemIndex?: number): void;
  /** 전투 중 아이템 목록 열기/닫기 (화면 상태라 게임 로직엔 없다) */
  onItemMenu(open: boolean): void;
  /** 전투 중 룬 목록 열기/닫기 */
  onRuneMenu(open: boolean): void;
  onUse(index: number): void;
  onCast(index: number): void;
  onEquip(index: number): void;
  onUnequip(slot: "weapon" | "armor"): void;
  onDrop(index: number): void;
  onBuy(index: number): void;
  onSell(index: number): void;
  /** 상점에서 팔기 목록 열기/닫기 */
  onSellMenu(open: boolean): void;
  onLeaveShop(): void;
  onRest(): void;
  onAnswer(index: number): void;
  onEnterRoom(index: number): void;
  onLeaveDungeon(): void;
  onRestart(): void;
}

/** 게임 상태가 아닌 화면만의 상태 */
export interface UiState {
  itemMenu: boolean;
  runeMenu: boolean;
  mapMenu: boolean;
  sellMenu: boolean;
  boardMenu: boolean;
  journal: boolean;
  /** 처음 화면 (저장이 있으면 이어 할지 묻는다) */
  title: boolean;
  /** 저장이 있나 (죽은 뒤 이어 하기 버튼) */
  hasSave: boolean;
}

/** 처음 화면: 저장이 있으면 이어 하기 / 새로 시작 */
export function renderTitle(root: HTMLElement, save: SaveFile, h: Handlers): void {
  const s = save.state;
  const when = new Date(save.savedAt).toLocaleString("ko-KR", { dateStyle: "short", timeStyle: "short" });
  root.innerHTML = `
    <section class="story title-screen">${RESUME_TEXT.titleLines.map((l) => `<p>${l}</p>`).join("")}</section>
    <section class="choices"></section>
  `;
  const box = root.querySelector<HTMLElement>(".choices")!;
  box.append(button(`1. ${RESUME_TEXT.continue} ${RESUME_TEXT.savedAt(REGIONS[s.at].town, s.player.level, when)}`, h.onContinue));
  box.append(button(`2. ${RESUME_TEXT.newGame}`, h.onRestart));
}

export function render(root: HTMLElement, s: GameState, ui: UiState, h: Handlers): void {
  const p = s.player;
  /** 오프닝 첫 장면(종족을 고르기 전)에는 수치를 숨긴다 */
  const beforeRace = s.opening?.scene === OPENING_START;
  root.innerHTML = `
    <header class="stats"${beforeRace ? " hidden" : ""}>
      <span class="level">레벨 ${p.level}</span>
      <span class="hp">체력 ${p.hp}/${p.maxHp}</span>
      <span class="st">기력 ${p.st}/${p.maxSt}</span>
      <span class="mp">마력 ${p.mp}/${p.maxMp}</span>
      <span>공격 ${attackOf(p)}</span>
      <span>방어 ${defenseOf(p)}</span>
      <span class="gold">골드 ${p.gold}</span>
      <span class="${overloaded(p) ? "heavy" : ""}">무게 ${loadOf(p)}/${p.carry}</span>
      <span class="where">${where(s)}</span>
    </header>
    <div class="art"${s.opening ? " hidden" : ""}>${s.opening ? "" : mapSvg(s)}</div>
    ${s.battle ? enemyLine(s.battle.enemy) : ""}
    <section class="story">${s.story.map((line) => `<p>${line}</p>`).join("")}</section>
    <section class="choices"></section>
    <section class="bag"></section>
    <footer class="dim seed">시드 ${s.seed} · ${s.step}걸음</footer>
  `;

  const box = root.querySelector<HTMLElement>(".choices")!;
  const add = (label: string, onClick: () => void, disabled = false) => {
    // 번호는 버튼만 센다 (안내 문장 <p> 는 빼고). 키보드 1~9 도 버튼 순서를 따른다 (main.ts)
    const b = button(`${box.querySelectorAll(".choice").length + 1}. ${label}`, onClick);
    b.disabled = disabled;
    box.append(b);
  };
  const note = (html: string) => box.insertAdjacentHTML("beforeend", `<p class="dim">${html}</p>`);

  if (!beforeRace) renderBag(root.querySelector<HTMLElement>(".bag")!, s, ui, h);

  // 오프닝 (F7): 장면의 안내와 고를 거리. 싸움 중이면 안내만 붙이고 아래 전투 화면으로 간다
  if (s.opening && !s.dead) {
    const sc = openingScene(s.opening.scene);
    if (sc.tip) note(sc.tip);
    if (import.meta.env.DEV) {
      const skip = small(OPENING_TEXT.skip, h.onSkipOpening);
      skip.classList.add("dev");
      root.querySelector(".seed")!.append(" ", skip);
    }
    if (!s.battle) {
      sc.options.forEach((o, i) => {
        const desc = o.race ? ` <span class="dim">${RACES[o.race].desc}</span>` : "";
        add(o.label + desc, () => h.onOpeningChoose(i));
      });
      return;
    }
  }

  if (s.dead) {
    note(RESUME_TEXT.deathAsk);
    if (ui.hasSave) add(RESUME_TEXT.continue, h.onContinue);
    add(RESUME_TEXT.newGame, h.onRestart);
    return;
  }

  // 레벨업: 전투·이벤트 밖이면 무엇보다 먼저 고른다
  if (pendingLevels(p) > 0 && !s.battle && !s.event) {
    note(`${SKILL_TEXT.levelTitle(p.level + 1)} ${SKILL_TEXT.levelAsk}`);
    add(SKILL_TEXT.hp(LEVEL_GAIN.hp), () => h.onLevelUp("hp"));
    add(SKILL_TEXT.st(LEVEL_GAIN.st, LEVEL_GAIN.carry), () => h.onLevelUp("st"));
    add(SKILL_TEXT.mp(LEVEL_GAIN.mp), () => h.onLevelUp("mp"));
    return;
  }

  // 적이 아직 나를 못 봤다: 몰래 지나가기(우두머리는 안 됨) / 기습 / 맞서기
  if (s.battle?.opening) {
    const e = s.battle.enemy;
    const pct = Math.round(sneakChance(p) * 100);
    note(s.battle.chief ? SNEAK_TEXT.chiefNotice(e.name) : SNEAK_TEXT.notice(e.name));
    if (!s.battle.chief) add(SNEAK_TEXT.sneakLabel(pct), () => h.onAct("sneak"));
    add(SNEAK_TEXT.ambushLabel(pct), () => h.onAct("ambush"));
    add(SNEAK_TEXT.fightLabel, () => h.onAct("fight"));
    return;
  }

  if (s.battle) {
    if (ui.itemMenu) {
      p.bag.forEach((id, i) => {
        const d = itemDef(id);
        if (d.kind === "use" && d.battle) add(itemLabel(id), () => h.onAct("item", i));
      });
      add("돌아가기", () => h.onItemMenu(false));
      return;
    }
    if (ui.runeMenu) {
      p.runes.forEach((id, i) => {
        const r = RUNES[id];
        add(`${r.name} <span class="dim">${r.desc}</span> <span class="mp">마력 ${r.cost}</span>`, () => h.onAct("spell", i), p.mp < r.cost);
      });
      add("돌아가기", () => h.onRuneMenu(false));
      return;
    }
    add("공격", () => h.onAct("attack"));
    add(`강타 <span class="st">기력 ${POWER_COST}</span>`, () => h.onAct("power"), p.st < POWER_COST);
    add("방어", () => h.onAct("guard"));
    add("룬", () => h.onRuneMenu(true), !p.runes.some((id) => p.mp >= RUNES[id].cost));
    add("아이템", () => h.onItemMenu(true), !p.bag.some((id) => itemDef(id).kind === "use" && itemDef(id).battle));
    add(`도망 <span class="st">기력 ${FLEE_COST}</span>`, () => h.onAct("flee"), p.st < FLEE_COST);
    return;
  }

  if (s.shop) {
    if (ui.sellMenu) {
      if (p.bag.length === 0) note(SHOP_TEXT.nothingToSell);
      p.bag.forEach((id, i) => add(`${itemLabel(id)} <span class="gold">+${sellPrice(id, sellRate(p))}골드</span>`, () => h.onSell(i)));
      add(SHOP_TEXT.sellBack, () => h.onSellMenu(false));
      return;
    }
    s.shop.stock.forEach((id, i) => {
      const price = buyPrice(p, itemDef(id).price);
      add(`${itemLabel(id)} <span class="gold">${price}골드</span>`, () => h.onBuy(i), p.gold < price);
    });
    add(SHOP_TEXT.sellMenu, () => h.onSellMenu(true));
    add("떠난다", h.onLeaveShop);
    return;
  }

  if (s.camp) {
    add(CAMP_TEXT.campfireLabel, h.onRest);
    return;
  }

  if (s.runeShop) {
    const left = RUNE_IDS.filter((id) => !p.runes.includes(id));
    if (left.length === 0) note(RUNE_TEXT.allLearned);
    for (const id of left) {
      const r = RUNES[id];
      const price = buyPrice(p, r.price);
      add(`${RUNE_TEXT.learn(r.name, price)} <span class="dim">${r.desc} · 마력 ${r.cost}</span>`, () => h.onLearnRune(id), p.gold < price);
    }
    add(RUNE_TEXT.back, h.onLeaveRunes);
    return;
  }

  if (s.event) {
    eventById(s.event.id).options.forEach((opt, i) => {
      const r = opt.require;
      const tag = r?.gold ? ` <span class="gold">${r.gold}골드</span>` : r?.item ? ` <span class="dim">(${itemDef(r.item).name} 필요)</span>` : "";
      add(opt.label + tag, () => h.onAnswer(i), !canChoose(opt, p));
    });
    return;
  }

  // 너무 무거우면 걷는 버튼이 모두 꺼진다. 짐 칸에서 버리거나, 마을이면 상인에게 판다
  const heavy = overloaded(p);
  if (heavy) note(BAG_TEXT.overloaded);

  // 던전 갈림길: 단서 2개 + 나가기 (남은 방 수는 숨긴다)
  if (s.dungeon) {
    s.dungeon.choices.forEach((c, i) => add(c.hint, () => h.onEnterRoom(i), heavy));
    add(`나간다 <span class="dim">(보상 없이)</span>`, h.onLeaveDungeon, heavy);
    return;
  }

  // 길 위: 단서만 보여 준다. 무엇이 벌어질지는 고른 뒤에 안다. 마지막은 되돌아가기
  if (s.travel) {
    s.choices.forEach((c, i) => add(c.hint, () => h.onChoose(i), heavy));
    add(TRAVEL_TEXT.turnBack(REGIONS[s.travel.from].town), h.onTurnBack, heavy);
    return;
  }

  // 마을: 지도를 펼쳤으면 갈 곳, 아니면 여관·상점·지도
  if (ui.boardMenu) {
    note(QUEST_TEXT.boardTitle);
    if (s.board.length === 0) note(QUEST_TEXT.boardEmpty);
    if (s.quests.length >= MAX_QUESTS) note(QUEST_TEXT.full(MAX_QUESTS));
    s.board.forEach((q, i) => {
      const reward = QUEST_TEXT.reward(q.reward.gold, q.reward.item ? itemDef(q.reward.item).name : null);
      add(`${q.unique ? `<span class="quest">★</span> ` : ""}${questTitle(q)} ${reward}`, () => h.onTakeQuest(i), s.quests.length >= MAX_QUESTS);
    });
    add(QUEST_TEXT.boardBack, () => h.onBoardMenu(false));
    return;
  }
  if (ui.mapMenu) {
    note(TOWN_TEXT.mapTitle);
    for (const n of neighbors(s.at)) add(TRAVEL_TEXT.go(REGIONS[n.to].name, n.steps), () => h.onDepart(n.to), heavy);
    add(TOWN_TEXT.mapBack, () => h.onMapMenu(false));
    return;
  }
  const town = REGIONS[s.at];
  const inn = innPrice(p.level);
  add(TOWN_TEXT.inn(town.inn, inn), h.onInn, p.gold < inn || (p.hp >= p.maxHp && p.st >= p.maxSt && p.mp >= p.maxMp));
  add(TOWN_TEXT.shop, h.onOpenShop);
  add(RUNE_TEXT.shop, h.onOpenRunes);
  add(QUEST_TEXT.boardButton, () => h.onBoardMenu(true));
  add(TOWN_TEXT.map, () => h.onMapMenu(true));
}

/** 머리줄의 지금 위치: 마을 이름, 또는 길 위 남은 걸음 (던전 안이면 던전 이름) */
function where(s: GameState): string {
  if (s.opening) return openingScene(s.opening.scene).place;
  if (s.dungeon) return `<span class="dungeon">${REGIONS[s.dungeon.region].dungeon.name}</span>`;
  if (s.travel) return TRAVEL_TEXT.left(REGIONS[s.travel.to].town, s.travel.total - s.travel.walked);
  return REGIONS[s.at].town;
}

/** 짐 칸: 장착한 장비와 짐. 전투·이벤트 중이 아니면 쓰기·장착·버리기를 할 수 있다 (번호 키 없음) */
function renderBag(el: HTMLElement, s: GameState, ui: UiState, h: Handlers) {
  const p = s.player;
  const free = !s.dead && !s.battle && !s.event && !s.opening; // 짐을 만질 수 있나
  const field = free && !s.shop && !s.camp && !s.runeShop; // 쓰는 물건은 마을·길·던전 갈림길에서만
  const slot = (label: string, id: ItemId | null, which: "weapon" | "armor") => {
    const row = document.createElement("div");
    row.className = "slot";
    row.innerHTML = `<span class="dim">${label}</span> ${id ? `${itemDef(id).name} <span class="dim">${gearInfo(id)}</span>` : `<span class="dim">없음</span>`}`;
    if (id && free) row.append(small("벗기", () => h.onUnequip(which)));
    el.append(row);
  };
  slot("무기", p.weapon, "weapon");
  slot("갑옷", p.armor, "armor");

  // 새긴 룬. 전투 밖에서 쓸 수 있는 룬(치유)은 여기서 바로 쓴다
  const runes = document.createElement("div");
  runes.className = "slot";
  runes.innerHTML = `<span class="dim">룬</span>`;
  p.runes.forEach((id, i) => {
    const r = RUNES[id];
    const tag = document.createElement("span");
    tag.className = "item";
    tag.innerHTML = `${r.name} <span class="mp">${r.cost}</span>`;
    tag.title = r.desc;
    if (r.field && field) tag.append(small("쓰기", () => h.onCast(i)));
    runes.append(tag);
  });
  el.append(runes);

  // 기술 (F4)
  const skills = document.createElement("div");
  skills.className = "slot skills";
  skills.innerHTML = `<span class="dim">기술</span> ${SKILL_IDS.map((id) => `${SKILL_NAMES[id]} <b>${p.skills[id]}</b>`).join(" · ")}`;
  el.append(skills);

  // 일지 (F5): 맡은 의뢰와 지난 일. 접어 둘 수 있다
  const jr = document.createElement("div");
  jr.className = "journal";
  const toggle = small(`${QUEST_TEXT.journal} (${s.quests.length}/${MAX_QUESTS})`, () => h.onJournal(!ui.journal));
  jr.append(toggle);
  if (ui.journal) {
    const active = document.createElement("div");
    active.innerHTML = `<p class="dim">${QUEST_TEXT.journalActive}</p>${s.quests.length ? "" : `<p class="dim">${QUEST_TEXT.journalNone}</p>`}`;
    for (const q of s.quests) {
      const row = document.createElement("p");
      row.innerHTML = `${q.unique ? `<span class="quest">★</span> ` : ""}${questTitle(q)} <span class="dim">— ${questProgress(q)}</span> `;
      if (free) row.append(small(QUEST_TEXT.abandon, () => h.onAbandonQuest(q.id)));
      active.append(row);
    }
    const past = document.createElement("div");
    past.innerHTML = `<p class="dim">${QUEST_TEXT.journalPast}</p>${
      s.journal.length ? s.journal.map((l) => `<p class="past">${l}</p>`).join("") : `<p class="dim">${QUEST_TEXT.journalPastNone}</p>`
    }`;
    jr.append(active, past);
  }
  el.append(jr);

  const list = document.createElement("div");
  list.className = "items";
  p.bag.forEach((id, i) => {
    const d = itemDef(id);
    const row = document.createElement("span");
    row.className = "item";
    row.innerHTML = `${d.name}${d.kind === "weapon" || d.kind === "armor" ? ` <span class="dim">${gearInfo(id)}</span>` : ""}`;
    row.title = `${d.desc} · 무게 ${d.weight}`;
    if (d.kind === "use" && d.field && field) row.append(small("쓰기", () => h.onUse(i)));
    if ((d.kind === "weapon" || d.kind === "armor") && free) row.append(small("장착", () => h.onEquip(i)));
    if (d.kind === "quest") row.classList.add("quest-item");
    if (free && !(s.shop && ui.sellMenu)) row.append(small("버리기", () => h.onDrop(i)));
    list.append(row);
  });
  if (p.bag.length === 0) list.innerHTML = `<span class="dim">짐이 비었다</span>`;
  el.append(list);
}

/** 장비의 짧은 수치 설명 */
function gearInfo(id: ItemId): string {
  const d = itemDef(id);
  if (d.kind === "weapon") return `(공격 ${d.atk} · ${d.hand === "one" ? "한손" : "양손"})`;
  if (d.kind === "armor") return `(방어 ${d.def}${d.heavy ? " · 무거움" : ""})`;
  return "";
}

/** 상점·아이템 목록 한 줄: 이름, 설명(장비면 수치), 무게 */
function itemLabel(id: ItemId): string {
  const d = itemDef(id);
  const info = d.kind === "weapon" || d.kind === "armor" ? gearInfo(id) : d.desc;
  return `${d.name} <span class="dim">${info} · 무게 ${d.weight}</span>`;
}

function button(html: string, onClick: () => void): HTMLButtonElement {
  const b = document.createElement("button");
  b.className = "choice";
  b.innerHTML = html;
  b.addEventListener("click", onClick);
  return b;
}

/** 짐 칸의 작은 버튼 */
function small(label: string, onClick: () => void): HTMLButtonElement {
  const b = document.createElement("button");
  b.className = "mini";
  b.textContent = label;
  b.addEventListener("click", onClick);
  return b;
}

/** 적 이름과 상태 묘사. 개발 모드(npm run dev)에서는 밸런스·디버깅용 숫자도 같이 보인다 */
function enemyLine(e: Enemy): string {
  const ratio = e.hp / e.maxHp;
  const status = ENEMY_STATUS.find((st) => ratio >= st.min)!.text;
  const debug = import.meta.env.DEV
    ? ` <span class="dim debug">[체력 ${e.hp}/${e.maxHp} 공 ${e.atk} 방 ${e.def}]</span>`
    : "";
  return `<p class="enemy">${e.name} — ${status}${debug}</p>`;
}
