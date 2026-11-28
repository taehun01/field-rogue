// 저장 칸 (F6). 브라우저 localStorage 에 한 칸만 둔다. 포장(exe) 방식이 정해지면 여기만 바꾼다.

import { deserialize, serialize, type SaveFile } from "../core/save";
import type { GameState } from "../core/types";

const KEY = "text-skyrim.save";

export function readSave(): SaveFile | null {
  try {
    return deserialize(localStorage.getItem(KEY));
  } catch {
    return null;
  }
}

export function writeSave(state: GameState): void {
  try {
    localStorage.setItem(KEY, serialize(state));
  } catch {
    // 저장소가 막혀 있으면 (사생활 보호 모드 등) 조용히 넘어간다. 게임은 계속된다
  }
}
