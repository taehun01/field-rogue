// 지역 데이터 (F1). 지역마다 길 위 단서, 적 3종, 던전과 우두머리, 마을이 있다. 세계관은 docs/world/regions.md.
// 지역 이벤트는 data/events/ 에 region 으로 붙어 있다.
// 이 파일만 고치면 지역의 글과 적을 바꿀 수 있다. 숫자는 모두 [임시값].

import type { RegionId } from "../core/types";

/** 적 하나의 기본 능력치 (레벨 1 기준). 실제 능력치는 core/battle.ts 가 레벨에 맞춰 키운다 */
export interface EnemyDef {
  id: string;
  name: string;
  maxHp: number;
  atk: number;
  def: number;
  /** 이기면 얻는 골드 [최소, 최대] */
  gold: [number, number];
  /** 이 지역에서 나올 가중치 */
  weight: number;
}

/** 길 위 단서 (이벤트 단서는 이벤트마다 data/events/ 에 있다) */
export interface RoadHints {
  battle: readonly string[];
  rest: readonly string[];
  shop: readonly string[];
  dungeon: readonly string[];
}

export interface RegionDef {
  id: RegionId;
  name: string;
  /** 지역 마을 이름 */
  town: string;
  /** 여관 이름 */
  inn: string;
  /** 마을에 닿았을 때 */
  arrive: readonly string[];
  /** 길을 떠날 때 (이 지역에서 출발) */
  depart: string;
  hints: RoadHints;
  enemies: readonly EnemyDef[];
  dungeon: {
    name: string;
    enter: readonly string[];
    chief: EnemyDef & { intro: readonly string[]; won: string };
  };
}

// 적 세 갈래 (MVP의 약함·단단함·사나움): 흔하고 약한 것 / 오래 버티는 것 / 아프게 때리는 것
export const REGIONS: Record<RegionId, RegionDef> = {
  harbor: {
    id: "harbor",
    name: "서리항",
    town: "서리항",
    inn: "젖은 닻",
    arrive: [
      "서리항에 닿았다. 생선 비린내와 타르 냄새가 뒤섞인다.",
      "부두마다 배가 묶여 있고, 여관 '젖은 닻' 굴뚝에서 연기가 오른다.",
    ],
    depart: "부두를 등지고 길을 나선다. 갈매기 소리가 한참 따라온다.",
    hints: {
      battle: ["부두 쪽에서 고함이 오간다", "젖은 그물 뒤에 누가 숨어 있다", "까마귀 떼가 한곳을 맴돈다"],
      rest: ["바람을 막아 주는 뒤집힌 배", "절벽 아래 마른 동굴", "타다 남은 유목 더미"],
      shop: ["짐 진 행상이 해안 길을 걷는다", "생선 굽는 냄새", "방울 단 노새 소리"],
      dungeon: ["절벽 동굴로 밧줄이 늘어져 있다", "바위틈으로 횃불 빛이 샌다", "썰물에 드러난 돌계단"],
    },
    enemies: [
      { id: "crows", name: "바다 까마귀 떼", maxHp: 8, atk: 4, def: 0, gold: [2, 5], weight: 50 },
      { id: "thug", name: "부두 깡패", maxHp: 14, atk: 4, def: 2, gold: [5, 9], weight: 25 },
      { id: "smuggler", name: "칼 든 밀수꾼", maxHp: 7, atk: 7, def: 0, gold: [6, 10], weight: 25 },
    ],
    dungeon: {
      name: "해적 소굴",
      enter: ["밧줄을 타고 절벽 동굴로 내려간다. 파도 소리가 등 뒤에서 멀어진다.", "젖은 통로가 둘로 갈린다."],
      chief: {
        id: "pirate_chief",
        name: "외팔이 하랄",
        maxHp: 18,
        atk: 5,
        def: 1,
        gold: [6, 12],
        weight: 0,
        intro: [
          "가장 안쪽, 빼앗은 궤짝 더미 위에 외팔이 사내가 앉아 있다.",
          "\"여기까지 왔으면 돌아갈 생각은 없겠군.\" 남은 한 손에 갈고리 칼이 들려 있다.",
        ],
        won: "하랄이 궤짝 위로 무너진다. 소굴이 조용해졌다.",
      },
    },
  },

  pines: {
    id: "pines",
    name: "솔그늘",
    town: "송진골",
    inn: "송진 단지",
    arrive: [
      "솔그늘의 송진골에 닿았다. 사방이 소나무고, 어디서나 도끼 소리가 난다.",
      "통나무를 쌓아 둔 공터 옆에 여관 '송진 단지'가 있다.",
    ],
    depart: "송진골을 벗어나자 소나무가 하늘을 덮는다.",
    hints: {
      battle: ["나무 사이로 낮은 으르렁 소리", "길에 화살 하나가 꽂혀 있다", "부러진 가지가 아직 흔들린다"],
      rest: ["바람 없는 소나무 아래", "사냥꾼이 쓰던 빈 움막", "송진 냄새 나는 모닥불 자리"],
      shop: ["통나무 수레가 삐걱인다", "모피를 잔뜩 진 사냥꾼", "숲길에 천막 하나"],
      dungeon: ["산비탈에 버려진 갱도 입구", "녹슨 수레가 굴 안쪽을 향해 있다", "땅속에서 찬 바람이 올라온다"],
    },
    enemies: [
      { id: "wolf", name: "굶주린 늑대", maxHp: 8, atk: 4, def: 0, gold: [2, 5], weight: 50 },
      { id: "bear", name: "갈색 곰", maxHp: 16, atk: 5, def: 1, gold: [4, 8], weight: 25 },
      { id: "bandit", name: "숲 도적", maxHp: 7, atk: 7, def: 0, gold: [6, 10], weight: 25 },
    ],
    dungeon: {
      name: "버려진 광산",
      enter: ["녹슨 레일을 따라 갱도로 들어간다. 송진 냄새가 금세 흙냄새로 바뀐다.", "갱도가 둘로 갈린다."],
      chief: {
        id: "mother_bear",
        name: "갱도의 늙은 곰",
        maxHp: 22,
        atk: 5,
        def: 0,
        gold: [6, 12],
        weight: 0,
        intro: [
          "가장 깊은 굴, 광부들의 뼈 무더기 위에서 집채만 한 곰이 고개를 든다.",
          "털이 군데군데 빠지고 한쪽 눈이 하얗다. 오래 살아남은 짐승이다.",
        ],
        won: "늙은 곰이 뼈 무더기 위로 쓰러진다. 굴 안에 숨소리가 하나 줄었다.",
      },
    },
  },

  bones: {
    id: "bones",
    name: "뼈의 골짜기",
    town: "뼈울타리",
    inn: "갈비뼈 지붕",
    arrive: [
      "뼈의 골짜기 마을 뼈울타리에 닿았다. 집 기둥 몇 개는 나무가 아니라 누런 뼈다.",
      "여관 '갈비뼈 지붕'에서 고분 이야기가 낮게 오간다.",
    ],
    depart: "뼈울타리를 나선다. 봉분들이 길 양옆으로 줄지어 있다.",
    hints: {
      battle: ["봉분 하나가 파헤쳐져 있다", "누런 뼈 사이로 발소리", "삽 긁는 소리가 멎었다"],
      rest: ["거인 갈비뼈가 지붕처럼 덮인 자리", "바람 막힌 바위 그늘", "누가 쌓다 만 돌담"],
      shop: ["뼈 장신구를 늘어놓은 좌판", "등짐 진 뼈 장수", "멀리 수레바퀴 소리"],
      dungeon: ["봉분 옆구리에 돌문이 나 있다", "무너진 고분 입구에서 찬 숨이 새어 나온다", "돌계단에 오래된 룬이 새겨져 있다"],
    },
    enemies: [
      { id: "robber", name: "무덤 도굴꾼", maxHp: 8, atk: 4, def: 0, gold: [3, 6], weight: 50 },
      { id: "draugr", name: "고분 망자", maxHp: 15, atk: 4, def: 2, gold: [4, 8], weight: 25 },
      { id: "collector", name: "뼈 수집꾼", maxHp: 7, atk: 7, def: 0, gold: [6, 10], weight: 25 },
    ],
    dungeon: {
      name: "고분",
      enter: ["돌문을 밀고 고분 안으로 내려간다. 공기가 차고 오래됐다.", "무덤길이 둘로 갈린다."],
      chief: {
        id: "barrow_warrior",
        name: "고분의 옛 전사",
        maxHp: 18,
        atk: 5,
        def: 1,
        gold: [6, 12],
        weight: 0,
        intro: [
          "가장 안쪽 관 뚜껑이 밀려나 있다.",
          "녹슨 투구를 쓴 망자가 천천히 일어나 도끼 자루를 쥔다. 눈구멍에 푸른 빛이 돈다.",
        ],
        won: "옛 전사가 무릎을 꿇고, 뼈마디가 하나씩 흩어진다.",
      },
    },
  },

  plateau: {
    id: "plateau",
    name: "하얀 고원",
    town: "바람막이 초소",
    inn: "푸른 불",
    arrive: [
      "하얀 고원의 바람막이 초소에 닿았다. 돌벽 몇 겹 뒤에 사람들이 웅크리고 산다.",
      "하늘에 오로라가 걸려 있다. 여관이라 부르기 민망한 움막 '푸른 불'이 하나 있다.",
    ],
    depart: "초소 돌벽을 벗어나자 바람이 얼굴을 때린다.",
    hints: {
      battle: ["눈 위에 커다란 발자국이 이어진다", "바람 속에 쇳소리 같은 울음", "얼음 결정이 허공에 떠 있다"],
      rest: ["바람을 등진 얼음 바위", "버려진 순찰대 천막", "오로라 아래 평평한 눈밭"],
      shop: ["썰매 개 짖는 소리", "털가죽을 뒤집어쓴 행상", "눈보라 속 등불 하나"],
      dungeon: ["빙하 틈이 깊게 갈라져 있다", "얼음 동굴 입구가 푸르게 빛난다", "눈에 반쯤 묻힌 돌기둥"],
    },
    enemies: [
      { id: "snow_wolf", name: "설원 늑대", maxHp: 9, atk: 4, def: 0, gold: [2, 5], weight: 50 },
      { id: "troll", name: "서리 트롤", maxHp: 17, atk: 4, def: 2, gold: [5, 9], weight: 25 },
      { id: "wisp", name: "얼음 정령", maxHp: 6, atk: 8, def: 0, gold: [6, 10], weight: 25 },
    ],
    dungeon: {
      name: "얼음 동굴",
      enter: ["빙하 틈으로 미끄러져 내려간다. 푸른 얼음벽에 내 얼굴이 비친다.", "얼음 통로가 둘로 갈린다."],
      chief: {
        id: "old_troll",
        name: "얼음 동굴의 늙은 트롤",
        maxHp: 20,
        atk: 5,
        def: 1,
        gold: [6, 12],
        weight: 0,
        intro: [
          "동굴 가장 안쪽, 얼음에 박힌 뼈를 씹던 트롤이 몸을 일으킨다.",
          "털에 고드름이 주렁주렁 매달려 있다. 숨을 쉴 때마다 하얀 김이 쏟아진다.",
        ],
        won: "늙은 트롤이 얼음 바닥에 엎어진다. 고드름이 우수수 부서져 내린다.",
      },
    },
  },
};

export const REGION_IDS = Object.keys(REGIONS) as RegionId[];

/** 적 id 로 찾는다 (일반 적과 우두머리 모두) */
export function enemyById(id: string): EnemyDef {
  for (const r of REGION_IDS) {
    const reg = REGIONS[r];
    const e = reg.enemies.find((x) => x.id === id) ?? (reg.dungeon.chief.id === id ? reg.dungeon.chief : undefined);
    if (e) return e;
  }
  throw new Error(`없는 적: ${id}`);
}
