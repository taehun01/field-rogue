// 저장 형식 (F6). 게임 상태를 그대로 JSON 으로 적고, 형식 버전을 같이 적는다.
// 저장은 1칸이고 자동으로만 한다 (마을에 닿을 때, 여관에서 잘 때). 어디에 적을지는 화면 쪽(main.ts)이 정한다.
// 불러오면 무작위 결과는 새로 굴린다: 상태만 되살리고 난수는 새 시드로 시작한다 (game.ts resumeGame).

import type { GameState } from "./types";

/** 상태 모양이 바뀌면 올린다. 다른 버전의 저장은 읽지 않는다 */
export const SAVE_VERSION = 1;

export interface SaveFile {
  version: number;
  /** 저장한 때 (화면에 보여 주기용, ms) */
  savedAt: number;
  state: GameState;
}

export function serialize(state: GameState, now = Date.now()): string {
  const file: SaveFile = { version: SAVE_VERSION, savedAt: now, state };
  return JSON.stringify(file);
}

/** 저장 글을 읽는다. 깨졌거나 버전이 다르면 null */
export function deserialize(text: string | null): SaveFile | null {
  if (!text) return null;
  try {
    const file = JSON.parse(text) as Partial<SaveFile>;
    if (file.version !== SAVE_VERSION || !file.state || typeof file.savedAt !== "number") return null;
    const s = file.state;
    // 최소한의 모양 확인: 이게 없으면 게임을 이어 갈 수 없다
    if (!s.player || typeof s.player.hp !== "number" || !s.at || !Array.isArray(s.quests) || !s.tally) return null;
    return file as SaveFile;
  } catch {
    return null;
  }
}
