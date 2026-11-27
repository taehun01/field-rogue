// 게임 상태의 모양. 로직(game.ts)과 화면(ui)이 함께 본다.

/** 선택지를 고르면 벌어지는 일의 종류 (docs/01-mvp.md 한 판의 흐름 3번) */
export type SceneKind = "battle" | "event" | "rest" | "shop" | "dungeon";

export interface Player {
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  gold: number;
  items: string[];
}

/** 화면에 보이는 선택지 하나. 단서만 보이고, 무엇이 벌어질지는 고른 뒤에 안다. */
export interface Choice {
  /** 단서가 가리키는 종류 */
  hintKind: SceneKind;
  hint: string;
  /** 실제로 벌어질 종류. 대개 hintKind 와 같고, 가끔 속임이면 다르다 */
  kind: SceneKind;
}

export interface GameState {
  seed: number;
  /** 지금까지 고른 횟수 (= 여행한 걸음 수) */
  step: number;
  player: Player;
  /** 지금 고를 수 있는 선택지 2~3개. 죽었으면 빈 배열 */
  choices: Choice[];
  /** 종류별로 마지막으로 벌어진 뒤 지난 걸음 수 (0 = 방금). 다음 선택지 규칙이 참고한다 */
  since: Partial<Record<SceneKind, number>>;
  /** 방금 벌어진 일의 문장들 (화면 위쪽 이야기 칸) */
  story: string[];
  dead: boolean;
}
