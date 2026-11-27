// [임시 문장] 1단계에서 루프가 돌아가는지 보기 위한 자리표시 글이다.
// 세계관·톤이 정해지지 않아 이 파일의 글은 모두 임시다. [임시] 표시는 화면에 띄우지 않고 이 주석으로 대신한다.
// 최종 문장도 Claude가 쓰고 Taehun이 플레이하며 판단한다 (CLAUDE.md 역할 분담). 이 파일만 고치면 화면 글이 바뀐다.

import { FIELD_EVENTS } from "../data/events";
import type { EnemyId, ItemId, RoomKind, SceneKind } from "../core/types";

/** 선택지에 보이는 짧은 단서. 종류마다 여러 개 중 하나가 무작위로 나온다. */
export const HINTS: Record<SceneKind, readonly string[]> = {
  battle: ["풀숲이 이상하게 조용하다", "멀리서 쇳소리가 들린다", "짐승 냄새가 짙다"],
  // 이벤트 단서는 이벤트마다 data/events.ts 에 있다. 이 단서를 고르면 그 이벤트가 벌어진다
  event: FIELD_EVENTS.flatMap((e) => e.hints),
  rest: ["바람이 잦아드는 언덕", "꺼지지 않은 모닥불 자국", "맑은 샘물 소리"],
  shop: ["연기 나는 굴뚝", "짐을 잔뜩 실은 노새", "흥정하는 목소리"],
  dungeon: ["땅이 아래로 꺼져 있다", "돌문 틈으로 찬 바람", "이끼 낀 계단"],
};

/** 던전 갈림길 단서. 이벤트 단서는 이벤트마다 data/events.ts 에 있다 */
export const ROOM_HINTS: Record<Exclude<RoomKind, "event">, readonly string[]> = {
  battle: ["뼈 부스러기가 흩어진 통로", "어둠 속에서 숨소리가 난다", "벽에 긁힌 자국이 길다"],
  empty: ["먼지만 쌓인 좁은 방", "물방울 떨어지는 소리뿐", "무너진 선반이 보인다"],
};

export const DUNGEON_TEXT = {
  enter: ["이끼 낀 계단을 따라 내려간다. 바깥 소리가 끊긴다.", "앞에 길이 둘로 갈린다."],
  /** 방을 하나 지나고 다음 갈림길 앞에 섰을 때. n = 지나온 방 수 */
  next: (n: number) => `${["첫", "두", "세", "네"][n - 1] ?? n} 번째 방을 지났다. 길은 더 안쪽으로 이어진다.`,
  empty: (gold: number) => `아무것도 없다. 먼지 속에서 동전 몇 닢을 주웠다. 골드 +${gold}`,
  leave: "발길을 돌려 계단을 올라왔다. 햇빛이 눈부시다.",
  /** 마지막 방을 지나면 */
  treasure: "마지막 방 한가운데 녹슨 상자가 놓여 있다.",
  reward: (gold: number, item: string) => `상자를 열었다. 골드 +${gold}, ${item} +1`,
  rewardFull: (gold: number, item: string) => `상자를 열었다. 골드 +${gold}. ${item}은(는) 들 곳이 없어 두고 간다.`,
  out: "상자 뒤편의 좁은 틈으로 기어 나오니 다시 바깥이다.",
};

export const OPENING = ["눈을 뜨니 낯선 길 위다.", "어디로 갈까."];

/** [임시] 적 이름 */
export const ENEMY_NAMES: Record<EnemyId, string> = {
  weak: "약한 짐승",
  tough: "단단한 무언가",
  fierce: "사나운 무언가",
  boss: "검은 뿔의 짐승",
};

/** 적의 남은 체력 비율에 따른 묘사. 위에서부터 보고 비율이 min 이상인 첫 줄을 쓴다 */
export const ENEMY_STATUS: readonly { min: number; text: string }[] = [
  { min: 1, text: "멀쩡하다" },
  { min: 0.6, text: "조금 다쳤다" },
  { min: 0.3, text: "비틀거린다" },
  { min: 0, text: "쓰러지기 직전이다" },
];

export const BATTLE_TEXT = {
  start: (name: string) => `${name}이(가) 길을 막는다.`,
  attack: (name: string, dmg: number) => `${name}을(를) 베었다. (${dmg})`,
  hit: (name: string, dmg: number) => `${name}의 공격. 체력 -${dmg}`,
  guard: "몸을 웅크려 막는다.",
  noItem: "쓸 만한 것이 없다.",
  fled: "등을 돌려 달아났다.",
  fleeFailed: "달아나려 했지만 붙잡혔다.",
  won: (name: string, gold: number) => `${name}을(를) 쓰러뜨렸다. 골드 +${gold}`,
};

/** [임시] 아이템 이름 */
export const ITEM_NAMES: Record<ItemId, string> = {
  potion: "회복약",
  bomb: "폭탄",
  smoke: "연막탄",
  whetstone: "숫돌",
  charm: "부활 부적",
  heart: "단단한 심장",
};

/** 아이템 설명 (상점·소지품에 보임) */
export const ITEM_DESC: Record<ItemId, string> = {
  potion: "체력 회복",
  bomb: "전투 중 적에게 큰 피해",
  smoke: "전투에서 반드시 달아남",
  whetstone: "공격력이 영구히 오름",
  charm: "쓰러질 때 한 번 버팀",
  heart: "최대 체력이 영구히 오름",
};

export const ITEM_TEXT = {
  potion: (heal: number) => `회복약을 마셨다. 체력 +${heal}`,
  bomb: (name: string, dmg: number) => `${name}에게 폭탄을 던졌다. (${dmg})`,
  smoke: "연기를 피워 몸을 숨기고 빠져나왔다.",
  whetstone: (atk: number) => `날을 갈았다. 공격 +${atk}`,
  heart: (n: number) => `아직 뛰는 심장을 삼켰다. 가슴 속에서 무언가 단단해진다. 최대 체력 +${n}`,
  charm: (hp: number) => `부적이 부서지며 몸이 버텨 냈다. 체력 ${hp}`,
};

export const SHOP_TEXT = {
  enter: "떠돌이 상인이 짐을 푼다.",
  bought: (name: string) => `${name}을(를) 샀다.`,
  full: "더 들 곳이 없다.",
  poor: "골드가 모자란다.",
  leave: "상인과 헤어졌다.",
};

export const CAMP_TEXT = {
  enter: "쉴 만한 곳이 보인다. 근처에 여관 불빛도 있다.",
  campfire: (heal: number) => `모닥불 곁에서 쉬었다. 체력 +${heal}`,
  inn: (heal: number, price: number) => `여관에서 푹 잤다. 체력 +${heal}, 골드 -${price}`,
  poor: "여관에 묵을 돈이 없다.",
};

/** 단서와 다른 일이 벌어졌을 때 맨 앞에 붙는 문장 */
export const DECEIVED = "생각했던 것과 다르다.";

export const DEATH = "쓰러졌다. 여행은 여기서 끝난다.";

/** 보스와 네 가지 길 (7단계, core/boss.ts) */
export const BOSS_TEXT = {
  name: "검은 뿔의 짐승",
  /** 선택지 단서 뒤에 붙는 징조 */
  omens: ["까마귀 한 마리가 따라온다", "나무껍질에 뿔에 긁힌 자국", "풀이 한쪽으로 쓰러져 있다", "멀리서 낮은 울음"],
  /** 징조를 고른 뒤. n = 지금까지 고른 징조 수 (보스 직전 숫자까지만 쓰인다) */
  omenSeen: (n: number) => [
    "등 뒤가 서늘하다. 무언가 같은 길을 걷고 있다.",
    "징조가 또 보인다. 이번엔 더 가깝다.",
  ][n - 1] ?? "징조가 겹친다.",
  /** 징조가 다 찼을 때 (고른 장면 대신) */
  omenMet: ["징조가 가리키던 것이 거기 있었다.", "검은 뿔이 나무 사이로 솟는다."],
  /** 소문이 기준을 넘었을 때 (다음 선택지 대신) */
  rumorMet: ["땅이 울린다. 당신 이야기를 들은 무언가가 먼저 찾아왔다.", "검은 뿔의 짐승이 길 한가운데 서 있다."],
  /** 우연히 섞이는 보스 단서 */
  chanceHints: ["나무들이 한쪽으로 꺾여 있다", "발자국이 사람 몸통만 하다"],
  chanceMet: ["꺾인 나무를 따라가자 숨소리가 들린다.", "검은 뿔의 짐승이 고개를 든다."],
  /** 던전 끝 상자를 연 뒤 */
  deepAsk: "상자 뒤 벽이 무너져 있다. 더 아래로 이어지는 계단에서 뜨거운 바람이 올라온다.",
  deepLabel: "더 깊이 들어간다",
  outLabel: "밖으로 나간다",
  deepMet: ["계단 끝, 넓은 동굴 한가운데 검은 뿔의 짐승이 웅크리고 있다.", "눈이 마주쳤다."],
  start: "검은 뿔의 짐승이 앞을 막는다. 달아나기 쉽지 않아 보인다.",
  won: "짐승이 무너진다. 뿔 아래에서 아직 뛰는 심장을 꺼냈다.",
  rewardFull: "뿔 아래 심장이 있었지만 들 곳이 없어 두고 간다.",
  /** 보스전을 끝내고 (이겼든 달아났든) 다시 길 위로 */
  after: "다시 길 위다. 이 근방에서 그 짐승의 흔적은 더 보이지 않는다.",
};
