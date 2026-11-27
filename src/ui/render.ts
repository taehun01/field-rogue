// 화면 그리기. 상태를 읽어 DOM 을 통째로 다시 그린다 (텍스트 게임이라 이 정도로 충분).

import type { GameState } from "../core/types";

export interface Handlers {
  onChoose(index: number): void;
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
      <span class="dim">${s.step}걸음</span>
    </header>
    <div class="art" aria-hidden="true"></div>
    <section class="story">${s.story.map((line) => `<p>${line}</p>`).join("")}</section>
    <section class="choices"></section>
    <footer class="dim seed">시드 ${s.seed}</footer>
  `;

  const box = root.querySelector<HTMLElement>(".choices")!;
  if (s.dead) {
    box.append(button("다시 시작 (Enter)", h.onRestart));
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
