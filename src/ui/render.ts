// 화면 그리기. 상태를 읽어 DOM 을 통째로 다시 그린다 (텍스트 게임이라 이 정도로 충분).

import { POTION } from "../core/battle";
import { ENEMY_STATUS } from "../content/placeholder";
import type { BattleAction, Enemy, GameState } from "../core/types";

/** 전투 버튼 순서 = 키보드 1~4 */
export const BATTLE_ACTIONS: readonly { action: BattleAction; label: string }[] = [
  { action: "attack", label: "공격" },
  { action: "guard", label: "방어" },
  { action: "item", label: "아이템" },
  { action: "flee", label: "도망" },
];

export interface Handlers {
  onChoose(index: number): void;
  onAct(action: BattleAction): void;
  onRestart(): void;
}

export function render(root: HTMLElement, s: GameState, h: Handlers): void {
  const p = s.player;
  root.innerHTML = `
    <header class="stats">
      <span class="hp">체력 ${p.hp}/${p.maxHp}</span>
      <span>공격 ${p.atk}</span>
      <span>방어 ${p.def}</span>
      <span class="gold">골드 ${p.gold}</span>
      <span>${POTION} ${p.items.filter((i) => i === POTION).length}</span>
      <span class="dim">${s.step}걸음</span>
    </header>
    <div class="art" aria-hidden="true"></div>
    ${s.battle ? enemyLine(s.battle.enemy) : ""}
    <section class="story">${s.story.map((line) => `<p>${line}</p>`).join("")}</section>
    <section class="choices"></section>
    <footer class="dim seed">시드 ${s.seed}</footer>
  `;

  const box = root.querySelector<HTMLElement>(".choices")!;
  if (s.dead) {
    box.append(button("다시 시작 (Enter)", h.onRestart));
    return;
  }
  if (s.battle) {
    const potions = p.items.includes(POTION);
    BATTLE_ACTIONS.forEach(({ action, label }, i) => {
      const b = button(`${i + 1}. ${label}`, () => h.onAct(action));
      if (action === "item" && !potions) b.disabled = true;
      box.append(b);
    });
    return;
  }
  // 단서만 보여 준다. 무엇이 벌어질지는 고른 뒤에 안다.
  s.choices.forEach((c, i) => {
    box.append(button(`${i + 1}. ${c.hint}`, () => h.onChoose(i)));
  });
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
