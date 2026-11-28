// 게임 상태의 모양. 로직(game.ts)과 화면(ui)이 함께 본다.

/** 길 위에서 선택지를 고르면 벌어지는 일의 종류 */
export type SceneKind = "battle" | "event" | "rest" | "shop" | "dungeon";

/** 지역 4곳 (docs/world.md, data/regions.ts) */
export type RegionId = "harbor" | "pines" | "bones" | "plateau";

/** 물건 id (data/items.ts) */
export type { ItemId } from "../data/items";
import type { ItemId } from "../data/items";

/** 종족 4개 (data/races.ts) */
export type RaceId = "northman" | "halfgiant" | "snowelf" | "wolfblood";

/** 룬 3개 (F3) */
export type RuneId = "fire" | "heal" | "frost";

/** 기술 6개 (F4): 무기술, 방어, 파괴, 회복, 은신, 흥정 */
export type SkillId = "weapon" | "block" | "destruction" | "restoration" | "sneak" | "speech";

export interface Player {
  race: RaceId;
  hp: number;
  maxHp: number;
  /** 기력: 강타·도망에 쓴다 (F3) */
  st: number;
  maxSt: number;
  /** 마력: 룬에 쓴다 (F3) */
  mp: number;
  maxMp: number;
  /** 새긴 룬 (F3) */
  runes: RuneId[];
  gold: number;
  /** 짐. 장착한 장비는 여기 없고 weapon·armor 칸에 있다. 무게는 둘 다 센다 (core/player.ts) */
  bag: ItemId[];
  weapon: ItemId | null;
  armor: ItemId | null;
  /** 숫돌과 이벤트로 오른 공격력 (무기 공격력에 더한다) */
  atkBonus: number;
  /** 들 수 있는 무게 */
  carry: number;
  /** 레벨 (F4). 기술이 오른 횟수(rises)로 오르고, 적도 이 레벨에 맞춰 강해진다 */
  level: number;
  skills: Record<SkillId, number>;
  /** 다음 단계까지 쌓인 연습량 */
  practice: Record<SkillId, number>;
  /** 처음부터 지금까지 기술이 오른 횟수 */
  rises: number;
}

/** 화면에 보이는 선택지 하나. 단서만 보이고, 무엇이 벌어질지는 고른 뒤에 안다. */
export interface Choice {
  /** 단서가 가리키는 종류 */
  hintKind: SceneKind;
  hint: string;
  /** 실제로 벌어질 종류. 대개 hintKind 와 같고, 가끔 속임이면 다르다 */
  kind: SceneKind;
  /** kind 가 "event" 면 벌어질 이벤트 id (data/events.ts) */
  eventId?: string;
}

export interface Enemy {
  /** data/regions.ts 의 적 id */
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  /** 이기면 얻는 골드 [최소, 최대] */
  gold: [number, number];
}

/** 던전 방에서 벌어지는 일 */
export type RoomKind = "battle" | "event" | "empty";

/** 던전 갈림길 하나. 필드 선택지처럼 단서만 보이고, 가끔 속인다 */
export interface RoomChoice {
  hintKind: RoomKind;
  hint: string;
  kind: RoomKind;
  eventId?: string;
}

/** 던전 안에 있는 동안의 상태. 방 안에서 전투·이벤트 중이면 battle·event 도 함께 차 있다 */
export interface Dungeon {
  /** 어느 지역 던전인가 (적과 우두머리가 정해진다) */
  region: RegionId;
  /** 이 던전의 방 수 (화면에는 숨긴다). 방을 다 지나면 우두머리가 나온다 */
  rooms: number;
  /** 지나온 방 수 */
  cleared: number;
  /** 지금 고를 갈림길. 방 안에서 일이 벌어지는 중이면 빈 배열 */
  choices: RoomChoice[];
}

/** 공격 / 강타(기력) / 방어 / 룬(마력) / 아이템 / 도망(기력). 전투 시작 전에는 몰래 지나가기 / 기습 / 맞서기 (F4) */
export type BattleAction = "attack" | "power" | "guard" | "spell" | "item" | "flee" | "sneak" | "ambush" | "fight";

/** 진행 중인 전투. 전투 중에는 선택지 대신 전투 행동을 고른다 */
export interface Battle {
  enemy: Enemy;
  /** 던전 우두머리전이면 true (이기면 보물, 달아나면 던전 밖으로) */
  chief?: true;
  /** 서리 룬에 얼어 적이 공격하지 못하는 남은 턴 */
  frozen?: number;
  /** 적이 아직 나를 못 봤다: 몰래 지나가기 / 기습 / 맞서기 중에 고른다 (F4) */
  opening?: true;
}

/** 의뢰 종류 (F5): 처치 / 배달 / 던전(그 지역 던전 우두머리) */
export type QuestKind = "hunt" | "deliver" | "clear";

/** 의뢰 하나. 게시판에 붙어 있을 때도, 받아서 진행 중일 때도 같은 모양 */
export interface Quest {
  /** 한 판 안에서 겹치지 않는 번호 */
  id: number;
  kind: QuestKind;
  /** 의뢰를 붙인 마을. 처치·던전은 해내고 이 마을로 돌아와야 보상을 받는다 */
  giver: RegionId;
  /** 처치: 적이 나오는 지역, 던전: 던전이 있는 지역, 배달: 목적지 마을 */
  region: RegionId;
  /** 처치할 적 id 와 수 */
  enemy?: string;
  count?: number;
  /** 지금까지 해낸 양 (처치 수, 던전은 0/1) */
  progress: number;
  /** 배달 물건 */
  item?: ItemId;
  reward: { gold: number; item?: ItemId };
  /** 마을 고유 인물의 의뢰면 그 id (data/quests.ts) */
  unique?: string;
}

/** 지역 사이를 걷는 중. walked 가 total 에 닿으면 도착한다 */
export interface Travel {
  from: RegionId;
  to: RegionId;
  total: number;
  walked: number;
}

export interface GameState {
  seed: number;
  /** 고정 오프닝 중이면 지금 장면 (F7, data/opening.ts). 끝나면 null */
  opening: { scene: string } | null;
  /** 지금까지 걸은 걸음 수 (길 위 선택 + 던전 방) */
  step: number;
  player: Player;
  /** 마지막으로 머문 마을. 길 위에 있어도 떠난 곳을 기억한다 */
  at: RegionId;
  /** 길 위면 여행 상태, 마을 안이면 null */
  travel: Travel | null;
  /** 지금 벌어지는 일이 어느 지역 것인가 (마을이면 그 마을, 길 위면 지금 걸음의 지역) */
  here: RegionId;
  /** 진행 중인 전투. 없으면 null */
  battle: Battle | null;
  /** 상점에 들어와 있으면 진열된 물건 (산 것은 빠진다). town 이면 마을 상점. 아니면 null */
  shop: { stock: ItemId[]; town: boolean } | null;
  /** 이 마을에 머무는 동안의 상점 진열 (나갔다 들어와도 그대로). 길 위면 빈 배열 */
  townStock: ItemId[];
  /** 이벤트 중이면 그 이벤트 id. 아니면 null */
  event: { id: string } | null;
  /** 던전 안이면 그 상태. 아니면 null */
  dungeon: Dungeon | null;
  /** 길 위 쉴 곳에서 모닥불을 피우는 중 */
  camp: boolean;
  /** 마을 룬새김이 앞 (F3) */
  runeShop: boolean;
  /** 지금 마을 게시판에 붙은 의뢰 (F5). 길 위면 빈 배열 */
  board: Quest[];
  /** 받아서 진행 중인 의뢰 (최대 core/quests.ts MAX_QUESTS) */
  quests: Quest[];
  /** 끝낸 고유 의뢰 id */
  uniqueDone: string[];
  /** 다음 의뢰 번호 */
  questSeq: number;
  /** 일지의 지난 일 (새것이 앞, 개수 제한 있음) */
  journal: string[];
  /** 지금까지 끝낸 의뢰 수와 쓰러뜨린 우두머리 수 (일지 밖 집계, 시뮬레이션도 본다) */
  tally: { questsDone: number; chiefs: number };
  /** 지금 고를 수 있는 길 위 선택지 2~3개. 마을이거나 다른 화면 중이면 빈 배열 */
  choices: Choice[];
  /** 종류별로 마지막으로 벌어진 뒤 지난 걸음 수 (0 = 방금). 다음 선택지 규칙이 참고한다 */
  since: Partial<Record<SceneKind, number>>;
  /** 바로 전 화면에 보였던 단서 문장들. 다음 선택지 규칙이 참고한다 */
  lastHints: string[];
  /** 방금 벌어진 일의 문장들 (화면 위쪽 이야기 칸) */
  story: string[];
  dead: boolean;
}
