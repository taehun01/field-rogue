// [임시 문장] 1단계에서 루프가 돌아가는지 보기 위한 자리표시 글이다.
// 최종 문장도 Claude가 쓰고 Taehun이 플레이하며 판단한다 (CLAUDE.md 역할 분담). 이 파일만 고치면 화면 글이 바뀐다.

import type { EnemyId, ItemId, SceneKind } from "../core/types";

/** 선택지에 보이는 짧은 단서. 종류마다 여러 개 중 하나가 무작위로 나온다. */
export const HINTS: Record<SceneKind, readonly string[]> = {
  battle: ["풀숲이 이상하게 조용하다", "멀리서 쇳소리가 들린다", "짐승 냄새가 짙다"],
  event: ["길가에 누군가 서 있다", "부서진 수레가 보인다", "낯선 노랫소리가 난다"],
  rest: ["바람이 잦아드는 언덕", "꺼지지 않은 모닥불 자국", "맑은 샘물 소리"],
  shop: ["연기 나는 굴뚝", "짐을 잔뜩 실은 노새", "흥정하는 목소리"],
  dungeon: ["땅이 아래로 꺼져 있다", "돌문 틈으로 찬 바람", "이끼 낀 계단"],
};

export const OPENING = ["[임시] 눈을 뜨니 낯선 길 위다.", "어디로 갈까."];

/** [임시] 적 이름 (문장 쪽에 [임시] 표시가 있으니 이름엔 붙이지 않음) */
export const ENEMY_NAMES: Record<EnemyId, string> = {
  weak: "약한 짐승",
  tough: "단단한 무언가",
  fierce: "사나운 무언가",
};

/** 적의 남은 체력 비율에 따른 묘사. 위에서부터 보고 비율이 min 이상인 첫 줄을 쓴다 */
export const ENEMY_STATUS: readonly { min: number; text: string }[] = [
  { min: 1, text: "멀쩡하다" },
  { min: 0.6, text: "조금 다쳤다" },
  { min: 0.3, text: "비틀거린다" },
  { min: 0, text: "쓰러지기 직전이다" },
];

export const BATTLE_TEXT = {
  start: (name: string) => `[임시] ${name}이(가) 길을 막는다.`,
  attack: (name: string, dmg: number) => `[임시] ${name}을(를) 베었다. (${dmg})`,
  hit: (name: string, dmg: number) => `[임시] ${name}의 공격. 체력 -${dmg}`,
  guard: "[임시] 몸을 웅크려 막는다.",
  noItem: "[임시] 쓸 만한 것이 없다.",
  fled: "[임시] 등을 돌려 달아났다.",
  fleeFailed: "[임시] 달아나려 했지만 붙잡혔다.",
  won: (name: string, gold: number) => `[임시] ${name}을(를) 쓰러뜨렸다. 골드 +${gold}`,
};

/** [임시] 아이템 이름 */
export const ITEM_NAMES: Record<ItemId, string> = {
  potion: "회복약",
  bomb: "폭탄",
  smoke: "연막탄",
  whetstone: "숫돌",
  charm: "부활 부적",
};

/** 아이템 설명 (상점·소지품에 보임) */
export const ITEM_DESC: Record<ItemId, string> = {
  potion: "체력 회복",
  bomb: "전투 중 적에게 큰 피해",
  smoke: "전투에서 반드시 달아남",
  whetstone: "공격력이 영구히 오름",
  charm: "쓰러질 때 한 번 버팀",
};

export const ITEM_TEXT = {
  potion: (heal: number) => `[임시] 회복약을 마셨다. 체력 +${heal}`,
  bomb: (name: string, dmg: number) => `[임시] ${name}에게 폭탄을 던졌다. (${dmg})`,
  smoke: "[임시] 연기를 피워 몸을 숨기고 빠져나왔다.",
  whetstone: (atk: number) => `[임시] 날을 갈았다. 공격 +${atk}`,
  charm: (hp: number) => `[임시] 부적이 부서지며 몸이 버텨 냈다. 체력 ${hp}`,
};

export const SHOP_TEXT = {
  enter: "[임시] 떠돌이 상인이 짐을 푼다.",
  bought: (name: string) => `[임시] ${name}을(를) 샀다.`,
  full: "[임시] 더 들 곳이 없다.",
  poor: "[임시] 골드가 모자란다.",
  leave: "[임시] 상인과 헤어졌다.",
};

export const CAMP_TEXT = {
  enter: "[임시] 쉴 만한 곳이 보인다. 근처에 여관 불빛도 있다.",
  campfire: (heal: number) => `[임시] 모닥불 곁에서 쉬었다. 체력 +${heal}`,
  inn: (heal: number, price: number) => `[임시] 여관에서 푹 잤다. 체력 +${heal}, 골드 -${price}`,
  poor: "[임시] 여관에 묵을 돈이 없다.",
};

/** 단서와 다른 일이 벌어졌을 때 맨 앞에 붙는 문장 */
export const DECEIVED = "[임시] 생각했던 것과 다르다.";

export const DEATH = "[임시] 쓰러졌다. 여행은 여기서 끝난다.";
