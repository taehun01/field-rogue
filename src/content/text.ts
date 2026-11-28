// 화면에 보이는 공통 글 (지역마다 다른 글은 data/regions.ts, 이벤트는 data/events.ts).
// 세계관은 docs/world.md 를 따른다. 글은 Claude가 완성본으로 쓰고 Taehun이 플레이하며 판단한다 (CLAUDE.md).
// 아직 다듬지 않은 글이 있어도 화면에 [임시]를 붙이지 않는다.

import type { RoomKind, SkillId } from "../core/types";

/** 받침을 보고 조사를 붙인다. josa("늑대", "이/가") → "늑대가", josa("서리항", "으로/로") → "서리항으로" */
export function josa(word: string, pair: "이/가" | "을/를" | "은/는" | "과/와" | "으로/로"): string {
  const [withFinal, without] = pair.split("/");
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  if (code < 0 || code > 11171) return word + without;
  const final = code % 28;
  // "로"는 받침이 없거나 ㄹ(8) 받침일 때
  if (pair === "으로/로") return word + (final === 0 || final === 8 ? without : withFinal);
  return word + (final === 0 ? without : withFinal);
}

/** 던전 갈림길 단서. 이벤트 단서는 이벤트마다 data/events.ts 에 있다 */
export const ROOM_HINTS: Record<Exclude<RoomKind, "event">, readonly string[]> = {
  battle: ["뼈 부스러기가 흩어진 통로", "어둠 속에서 숨소리가 난다", "벽에 긁힌 자국이 길다"],
  empty: ["먼지만 쌓인 좁은 방", "물방울 떨어지는 소리뿐", "무너진 선반이 보인다"],
};

export const DUNGEON_TEXT = {
  /** 방을 하나 지나고 다음 갈림길 앞에 섰을 때. n = 지나온 방 수 */
  next: (n: number) => `${["첫", "두", "세", "네"][n - 1] ?? n} 번째 방을 지났다. 길은 더 안쪽으로 이어진다.`,
  empty: (gold: number) => `아무것도 없다. 먼지 속에서 동전 몇 닢을 주웠다. 골드 +${gold}`,
  leave: "발길을 돌려 밖으로 나왔다. 찬 바람이 반갑다.",
  /** 우두머리를 쓰러뜨린 뒤 */
  treasure: "우두머리가 지키던 자리 뒤에 묵직한 궤짝이 있다.",
  reward: (gold: number, item: string) => `궤짝을 열었다. 골드 +${gold}, ${item} +1`,
  rewardFull: (gold: number, item: string) => `궤짝을 열었다. 골드 +${gold}. ${josa(item, "은/는")} 들 곳이 없어 두고 간다.`,
  out: "궤짝 뒤편의 좁은 틈으로 기어 나오니 다시 바깥이다.",
  /** 우두머리에게서 달아났을 때 */
  fledChief: "등을 돌려 왔던 길을 내달렸다. 궤짝은 포기했다.",
};

/** 지도와 여행 (F1) */
export const TRAVEL_TEXT = {
  /** 지도에서 목적지 버튼 */
  go: (name: string, steps: number) => `${josa(name, "으로/로")} 간다 <span class="dim">(${steps}걸음)</span>`,
  /** 길 위에서 남은 걸음 표시 */
  left: (name: string, steps: number) => (steps > 0 ? `${name}까지 ${steps}걸음` : `${name} 어귀`),
  turnBack: (name: string) => `되돌아간다 <span class="dim">(${josa(name, "으로/로")})</span>`,
  turnedBack: (name: string) => `발길을 돌렸다. 다시 ${josa(name, "으로/로")} 향한다.`,
  /** 길을 다 걷고 마을이 보일 때 */
  arriving: (town: string) => `멀리 ${town}의 연기가 보인다.`,
};

/** 마을 (F1 임시 마을. 게시판은 F5) */
export const TOWN_TEXT = {
  inn: (name: string, price: number) => `여관 '${name}'에서 묵는다 <span class="gold">${price}골드</span> <span class="dim">(체력·기력·마력 전부 회복)</span>`,
  slept: (name: string, price: number) => `'${name}'의 짚 침대에서 푹 잤다. 몸이 다 풀렸다. 골드 -${price}`,
  innPoor: "주인이 고개를 젓는다. 돈이 모자란다.",
  shop: "상인에게 간다",
  shopEnter: "상인이 카운터 너머로 고개를 든다. \"보고 가시오.\"",
  shopLeave: "상점 문을 닫고 나왔다.",
  map: "지도를 펼친다 (길을 떠난다)",
  mapTitle: "어디로 갈까.",
  mapBack: "지도를 접는다",
};

/** 적의 남은 체력 비율에 따른 묘사. 위에서부터 보고 비율이 min 이상인 첫 줄을 쓴다 */
export const ENEMY_STATUS: readonly { min: number; text: string }[] = [
  { min: 1, text: "멀쩡하다" },
  { min: 0.6, text: "조금 다쳤다" },
  { min: 0.3, text: "비틀거린다" },
  { min: 0, text: "쓰러지기 직전이다" },
];

export const BATTLE_TEXT = {
  /** 이벤트 끝에 마주친 싸움 */
  start: (name: string) => `${josa(name, "이/가")} 길을 막는다.`,
  /** 길·던전에서 먼저 발견했을 때 (은신 고르기 전) */
  spot: (name: string) => `앞쪽에 ${josa(name, "이/가")} 보인다.`,
  attack: (name: string, dmg: number) => `${josa(name, "을/를")} 베었다. (${dmg})`,
  hit: (name: string, dmg: number) => `${name}의 공격. 체력 -${dmg}`,
  guard: "몸을 웅크려 막는다.",
  noItem: "쓸 만한 것이 없다.",
  power: (name: string, dmg: number) => `온몸을 실어 ${josa(name, "을/를")} 내리쳤다. (${dmg})`,
  noStamina: "숨이 차서 힘을 실을 수 없다. 기력이 모자란다.",
  fleeNoStamina: "다리가 풀려 달아날 수 없다. 기력이 모자란다.",
  frozen: (name: string) => `${josa(name, "이/가")} 얼어붙어 꼼짝하지 못한다.`,
  fled: "등을 돌려 달아났다.",
  fleeFailed: "달아나려 했지만 붙잡혔다.",
  won: (name: string, gold: number) => `${josa(name, "을/를")} 쓰러뜨렸다. 골드 +${gold}`,
};

export const ITEM_TEXT = {
  potion: (heal: number) => `약초 물약을 마셨다. 쓰고 텁텁하다. 체력 +${heal}`,
  bomb: (name: string, dmg: number) => `기름 단지에 불을 붙여 ${josa(name, "을/를")} 향해 던졌다. (${dmg})`,
  smoke: "연기 주머니를 터뜨리고, 연기 속으로 몸을 숨겨 빠져나왔다.",
  whetstone: (atk: number) => `숫돌에 날을 세웠다. 공격 +${atk}`,
  heart: (n: number) => `심장석을 가슴에 대자 돌이 녹아 살 속으로 스며든다. 최대 체력 +${n}`,
  charm: (hp: number) => `뼈 부적이 가루가 되어 흩어지고, 무너지던 몸이 버텨 냈다. 체력 ${hp}`,
};

export const SHOP_TEXT = {
  enter: "떠돌이 상인이 길가에 짐을 푼다.",
  bought: (name: string) => `${josa(name, "을/를")} 샀다.`,
  sold: (name: string, gold: number) => `${josa(name, "을/를")} 팔았다. 골드 +${gold}`,
  poor: "골드가 모자란다.",
  leave: "상인과 헤어졌다.",
  sellMenu: "판다",
  sellBack: "사는 쪽으로 돌아간다",
  nothingToSell: "팔 물건이 없다.",
};

/** 룬 (F3) */
export const RUNE_TEXT = {
  heal: (hp: number) => `손등의 치유 룬이 따뜻하게 빛난다. 상처가 아문다. 체력 +${hp}`,
  fire: (name: string, dmg: number) => `불꽃 룬에서 불길이 뿜어져 ${josa(name, "을/를")} 덮친다. (${dmg})`,
  frost: (name: string, dmg: number) => `서리 룬이 하얗게 번쩍인다. ${josa(name, "이/가")} 얼음에 갇힌다. (${dmg})`,
  noMagicka: "룬이 희미하게 깜빡이다 꺼진다. 마력이 모자란다.",
  fieldOnly: "이 룬은 싸울 때만 쓴다.",
  /** 룬새김이 */
  shop: "룬새김이에게 간다",
  shopEnter: "늙은 룬새김이가 바늘과 먹을 늘어놓는다. \"어디에 새길 텐가.\"",
  learn: (name: string, price: number) => `${name}을 새긴다 <span class="gold">${price}골드</span>`,
  learned: (name: string) => `바늘이 살갗을 파고든다. 한참 뒤, 손등에 ${josa(name, "이/가")} 새겨졌다.`,
  allLearned: "새길 룬이 더 없다.",
  leave: "룬새김이 집을 나섰다. 손등이 욱신거린다.",
  back: "나간다",
};

/** 기술과 레벨 (F4) */
export const SKILL_NAMES: Record<SkillId, string> = {
  weapon: "무기술",
  block: "방어",
  destruction: "파괴",
  restoration: "회복",
  sneak: "은신",
  speech: "흥정",
};

export const SKILL_TEXT = {
  rose: (skill: SkillId, n: number) => `<span class="skill">${SKILL_NAMES[skill]} ${n}</span>`,
  levelTitle: (level: number) => `몸에 익은 것들이 쌓여 한 단계 올라섰다. 레벨 ${level}.`,
  levelAsk: "무엇을 키울까.",
  hp: (n: number) => `체력 <span class="dim">(최대 체력 +${n})</span>`,
  st: (n: number, carry: number) => `기력 <span class="dim">(최대 기력 +${n}, 들 수 있는 무게 +${carry})</span>`,
  mp: (n: number) => `마력 <span class="dim">(최대 마력 +${n})</span>`,
  grew: (what: string, level: number) => `${what}이 늘었다. 이제 레벨 ${level}이다.`,
};

/** 전투 시작 전 은신 (F4). 길과 던전에서 적을 만나면 먼저 고른다 */
export const SNEAK_TEXT = {
  sneakLabel: (pct: number) => `몰래 지나간다 <span class="dim">(${pct}%)</span>`,
  ambushLabel: (pct: number) => `기습한다 <span class="dim">(${pct}%)</span>`,
  fightLabel: "맞선다",
  notice: (name: string) => `${josa(name, "은/는")} 아직 당신을 보지 못했다.`,
  /** 우두머리는 몰래 지나갈 수 없다 */
  chiefNotice: (name: string) => `${josa(name, "은/는")} 아직 당신을 보지 못했다. 그 뒤가 궤짝이다.`,
  sneaked: (name: string) => `숨을 죽이고 ${josa(name, "을/를")} 비켜 지나갔다. 끝내 들키지 않았다.`,
  ambushed: (name: string, dmg: number) => `등 뒤로 다가가 ${josa(name, "을/를")} 덮쳤다. (${dmg})`,
  spotted: (name: string) => `발밑에서 무언가 바스락거렸다. ${josa(name, "이/가")} 고개를 돌린다.`,
  fight: (name: string) => `${josa(name, "을/를")} 마주 본다.`,
};

/** 저장과 이어 하기 (F6) */
export const RESUME_TEXT = {
  /** 죽은 뒤 이어 할 때 */
  woke: ["눈을 뜬다. 여관 천장이다. 어디까지가 꿈이었는지 잘 모르겠다.", "마지막으로 머문 마을이다."],
  /** 처음 화면에서 이어 할 때 */
  back: ["짐을 다시 꾸린다. 마을은 떠날 때 그대로다."],
  continue: "마지막 저장에서 이어 한다",
  newGame: "새로 시작한다",
  saved: "저장됨",
  titleLines: ["흐림마르크.", "거인의 뼈가 산이 된 북쪽 땅."],
  savedAt: (town: string, level: number, when: string) => `<span class="dim">${town} · 레벨 ${level} · ${when}</span>`,
  deathAsk: "다시 일어설 것인가.",
};

/** 게시판과 의뢰, 일지 (F5) */
export const QUEST_TEXT = {
  boardButton: "게시판을 본다",
  boardTitle: "게시판에 쪽지가 몇 장 박혀 있다. 칼끝으로 꽂아 둔 것도 있다.",
  boardEmpty: "남은 쪽지가 없다.",
  boardBack: "게시판에서 물러난다",
  full: (max: number) => `이미 의뢰를 ${max}개 맡았다. 하나를 끝내거나 포기해야 더 받을 수 있다.`,
  reward: (gold: number, item: string | null) => `<span class="gold">${gold}골드</span>${item ? ` + ${item}` : ""}`,
  // 의뢰 제목
  hunt: (region: string, enemy: string, n: number) => `${region}의 ${enemy} ${n}마리를 처치`,
  deliver: (item: string, town: string) => `${josa(item, "을/를")} ${town}에 전달`,
  clear: (region: string, dungeon: string, chief: string) => `${region} ${dungeon}의 ${josa(chief, "을/를")} 처치`,
  // 진행
  taken: (title: string) => `의뢰를 맡았다: ${title}`,
  gotParcel: (item: string) => `${josa(item, "을/를")} 짐에 넣었다. 버리거나 팔면 의뢰는 끝이다.`,
  huntProgress: (n: number, total: number) => `<span class="quest">의뢰 ${n}/${total}</span>`,
  huntDone: (title: string, town: string) => `<span class="quest">의뢰를 해냈다: ${title}. ${town}에 알리러 가자.</span>`,
  clearDone: (title: string, town: string) => `<span class="quest">의뢰를 해냈다: ${title}. ${town}에 알리러 가자.</span>`,
  completed: (title: string, gold: number, item: string | null) =>
    `<span class="quest">의뢰를 마쳤다: ${title}.</span> 골드 +${gold}${item ? `, ${item} +1` : ""}`,
  abandoned: (title: string) => `의뢰를 접었다: ${title}`,
  failed: (title: string) => `<span class="quest">맡은 물건이 없어졌다. 의뢰는 끝났다: ${title}</span>`,
  // 일지
  journal: "일지",
  journalActive: "맡은 의뢰",
  journalNone: "맡은 의뢰가 없다.",
  journalPast: "지난 일",
  journalPastNone: "아직 적어 둔 일이 없다.",
  abandon: "포기",
  reportTo: (town: string) => `${town}에 알리기`,
  carryTo: (town: string) => `${josa(town, "으로/로")} 가져가기`,
  notYet: "아직",
  logDone: (title: string) => `의뢰 완료: ${title}`,
  logAbandoned: (title: string) => `의뢰 포기: ${title}`,
  logFailed: (title: string) => `의뢰 실패: ${title}`,
  logChief: (chief: string, dungeon: string) => `${dungeon}에서 ${josa(chief, "을/를")} 쓰러뜨렸다`,
};

/** 짐과 장비 (F2) */
export const BAG_TEXT = {
  equipped: (name: string) => `${josa(name, "을/를")} 장착했다.`,
  unequipped: (name: string) => `${josa(name, "을/를")} 벗어 짐에 넣었다.`,
  dropped: (name: string) => `${josa(name, "을/를")} 길가에 버렸다.`,
  /** 무게를 넘어 걸을 수 없을 때 */
  overloaded: "짐이 너무 무겁다. 이대로는 한 걸음도 못 뗀다. 무언가 버리거나 팔아야 한다.",
  /** 전투에서 얻은 것 */
  loot: (names: string[]) => `챙긴 것: ${names.join(", ")}`,
};

/** 오프닝 (F7). 장면 글은 data/opening.ts */
export const OPENING_TEXT = {
  skip: "바로 시작 (개발)",
};

export const CAMP_TEXT = {
  enter: "바람을 피할 만한 곳이다. 마른 나뭇가지도 조금 있다.",
  campfireLabel: `모닥불을 피우고 쉰다 <span class="dim">(체력 조금, 기력·마력 전부)</span>`,
  campfire: (heal: number) => `모닥불 곁에서 잠깐 눈을 붙였다. 숨이 고르게 돌아온다. 체력 +${heal}`,
};

/** 단서와 다른 일이 벌어졌을 때 맨 앞에 붙는 문장 */
export const DECEIVED = "생각했던 것과 다르다.";

export const DEATH = "쓰러졌다. 눈이 천천히 몸을 덮는다. 여행은 여기서 끝난다.";
