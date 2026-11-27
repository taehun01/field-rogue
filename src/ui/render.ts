// 화면 그리기. 상태를 읽어 DOM 을 통째로 다시 그린다 (텍스트 게임이라 이 정도로 충분).
// 키보드 1~9 는 .choices 안의 N번째 버튼을 누른다 (main.ts). 그래서 화면마다 버튼 순서 = 키 번호.

import { CAMP_TEXT, ENEMY_STATUS, ITEM_DESC, ITEM_NAMES } from "../content/placeholder";
import { eventById } from "../data/events";
import { canChoose } from "../core/events";
import { INN_PRICE, type CampOption } from "../core/game";
import { INVENTORY_SIZE, ITEMS } from "../core/items";
import type { BattleAction, Enemy, GameState, ItemId } from "../core/types";

export interface Handlers {
  onChoose(index: number): void;
  onAct(action: BattleAction, itemIndex?: number): void;
  /** 전투 중 아이템 목록 열기/닫기 (화면 상태라 게임 로직엔 없다) */
  onItemMenu(open: boolean): void;
  onUse(index: number): void;
  onBuy(index: number): void;
  onLeaveShop(): void;
  onRest(option: CampOption): void;
  onAnswer(index: number): void;
  onRestart(): void;
}

/** 게임 상태가 아닌 화면만의 상태 */
export interface UiState {
  itemMenu: boolean;
}

export function render(root: HTMLElement, s: GameState, ui: UiState, h: Handlers): void {
  const p = s.player;
  root.innerHTML = `
    <header class="stats">
      <span class="hp">체력 ${p.hp}/${p.maxHp}</span>
      <span>공격 ${p.atk}</span>
      <span>방어 ${p.def}</span>
      <span class="gold">골드 ${p.gold}</span>
      <span class="dim">${s.step}걸음</span>
    </header>
    <div class="art" aria-hidden="true"></div>
    ${s.battle ? enemyLine(s.battle.enemy) : ""}
    <section class="story">${s.story.map((line) => `<p>${line}</p>`).join("")}</section>
    <section class="choices"></section>
    <section class="inventory"></section>
    <footer class="dim seed">시드 ${s.seed}</footer>
  `;

  const box = root.querySelector<HTMLElement>(".choices")!;
  const add = (label: string, onClick: () => void, disabled = false) => {
    const b = button(`${box.children.length + 1}. ${label}`, onClick);
    b.disabled = disabled;
    box.append(b);
  };

  renderInventory(root.querySelector<HTMLElement>(".inventory")!, s, h);

  if (s.dead) {
    box.append(button("다시 시작 (Enter)", h.onRestart));
    return;
  }

  if (s.battle) {
    if (ui.itemMenu) {
      p.items.forEach((id, i) => add(itemLabel(id), () => h.onAct("item", i), !ITEMS[id].battle));
      add("돌아가기", () => h.onItemMenu(false));
      return;
    }
    add("공격", () => h.onAct("attack"));
    add("방어", () => h.onAct("guard"));
    add("아이템", () => h.onItemMenu(true), !p.items.some((id) => ITEMS[id].battle));
    add("도망", () => h.onAct("flee"));
    return;
  }

  if (s.shop) {
    const full = p.items.length >= INVENTORY_SIZE;
    s.shop.stock.forEach((id, i) => {
      const price = ITEMS[id].price;
      add(`${itemLabel(id)} <span class="gold">${price}골드</span>`, () => h.onBuy(i), full || p.gold < price);
    });
    add("떠난다", h.onLeaveShop);
    return;
  }

  if (s.camp) {
    add(`모닥불 <span class="dim">(무료, 조금 회복)</span>`, () => h.onRest("campfire"));
    add(
      `여관 <span class="gold">${INN_PRICE}골드</span> <span class="dim">(전부 회복)</span>`,
      () => h.onRest("inn"),
      p.gold < INN_PRICE,
    );
    if (p.gold < INN_PRICE) box.insertAdjacentHTML("beforeend", `<p class="dim">${CAMP_TEXT.poor}</p>`);
    return;
  }

  if (s.event) {
    eventById(s.event.id).options.forEach((opt, i) => {
      const r = opt.require;
      const note = r?.gold ? ` <span class="gold">${r.gold}골드</span>` : r?.item ? ` <span class="dim">(${ITEM_NAMES[r.item]} 필요)</span>` : "";
      add(opt.label + note, () => h.onAnswer(i), !canChoose(opt, p));
    });
    return;
  }

  // 단서만 보여 준다. 무엇이 벌어질지는 고른 뒤에 안다.
  s.choices.forEach((c, i) => add(c.hint, () => h.onChoose(i)));
}

/** 소지품 칸. 선택지 화면에서는 회복약·숫돌을 여기서 바로 쓸 수 있다 (번호 키 없음) */
function renderInventory(el: HTMLElement, s: GameState, h: Handlers) {
  const items = s.player.items;
  const field = !s.dead && !s.battle && !s.shop && !s.camp && !s.event;
  el.innerHTML = `<span class="dim">소지품 ${items.length}/${INVENTORY_SIZE}</span>`;
  items.forEach((id, i) => {
    const usable = field && ITEMS[id].field;
    const b = document.createElement("button");
    b.className = "item";
    b.innerHTML = usable ? `${ITEM_NAMES[id]} 쓰기` : ITEM_NAMES[id];
    b.title = ITEM_DESC[id];
    b.disabled = !usable;
    b.addEventListener("click", () => h.onUse(i));
    el.append(b);
  });
}

function itemLabel(id: ItemId): string {
  return `${ITEM_NAMES[id]} <span class="dim">${ITEM_DESC[id]}</span>`;
}

function button(html: string, onClick: () => void): HTMLButtonElement {
  const b = document.createElement("button");
  b.className = "choice";
  b.innerHTML = html;
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
