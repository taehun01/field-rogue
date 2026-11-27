// 이벤트 데이터 (5단계). 이벤트 하나 = 단서 + 처음 문장 + 고를 거리 2~3개, 고를 거리마다 결과가 가중치로 갈린다.
// place 로 필드 이벤트와 던전 이벤트를 나눈다 (6단계). 필드 선택지에는 필드 것만, 던전 갈림길에는 던전 것만 나온다.
// 이 파일만 고치면 이벤트를 더하고 빼고 바꿀 수 있다. 처리하는 쪽은 core/events.ts.
// 결과의 숫자 변화(체력 +8 등)는 처리하는 쪽이 문장 끝에 붙이므로, 문장에는 숫자를 쓰지 않는다.
// [임시] 세계관·톤이 정해지지 않아 문장과 숫자는 모두 임시다.

import type { ItemId } from "../core/types";

/** 고정값 또는 [최소, 최대] 범위 */
export type Amount = number | [number, number];

/** 결과 하나가 플레이어에게 하는 일. 적은 것만 일어난다 */
export interface EventEffect {
  hp?: Amount;
  maxHp?: number;
  gold?: Amount;
  /** 소지품에서 하나 빠진다 */
  loseItem?: ItemId;
  /** 소지품에 하나 들어온다 (가득 찼으면 못 얻는다) */
  gainItem?: ItemId;
  /** 결과 문장 뒤에 전투가 시작된다 (보통 적, 걸음 수에 따라 강해짐) */
  battle?: true;
}

export interface EventOutcome {
  /** 같은 고를 거리 안에서 이 결과가 나올 가중치 */
  weight: number;
  text: string[];
  effect?: EventEffect;
}

export interface EventOption {
  label: string;
  /** 이 조건이 안 되면 버튼이 꺼진다 */
  require?: { gold?: number; item?: ItemId };
  outcomes: EventOutcome[];
}

export interface EventDef {
  id: string;
  /** 어디서 벌어지나 */
  place: "field" | "dungeon";
  /** 선택지에 보이는 단서. 이 단서를 고르면 이 이벤트가 벌어진다 */
  hints: string[];
  intro: string[];
  options: EventOption[];
}

export const EVENTS: readonly EventDef[] = [
  {
    id: "wounded",
    place: "field",
    hints: ["부서진 수레가 보인다", "신음 소리가 들린다"],
    intro: [
      "바퀴가 빠진 수레 곁에 여행자 하나가 주저앉아 있다.",
      "다리에 감은 천이 검붉게 젖었다. 당신을 보자 손을 내민다.",
    ],
    options: [
      {
        label: "회복약을 건넨다",
        require: { item: "potion" },
        outcomes: [
          {
            weight: 1,
            text: ["여행자는 약을 단숨에 비우고 한참 숨을 고른다.", "\"빚은 갚는 사람이오.\" 묵직한 주머니가 손에 쥐어진다."],
            effect: { loseItem: "potion", gold: [12, 18] },
          },
        ],
      },
      {
        label: "수레 짐을 뒤진다",
        outcomes: [
          {
            weight: 6,
            text: ["여행자는 말릴 힘도 없이 바라볼 뿐이다.", "짐 밑바닥에서 동전 몇 닢이 나온다."],
            effect: { gold: [5, 10] },
          },
          {
            weight: 4,
            text: ["짐에 손을 대는 순간, 여행자가 멀쩡한 다리로 벌떡 일어선다.", "덫이었다."],
            effect: { battle: true },
          },
        ],
      },
      {
        label: "못 본 척 지나간다",
        outcomes: [{ weight: 1, text: ["등 뒤의 신음 소리가 점점 멀어진다."] }],
      },
    ],
  },
  {
    id: "well",
    place: "field",
    hints: ["낯선 노랫소리가 난다", "덩굴 덮인 돌 우물"],
    intro: [
      "덩굴에 덮인 오래된 우물이 있다.",
      "노랫소리는 그 밑바닥에서 올라온다. 가사는 알아들을 수 없다.",
    ],
    options: [
      {
        label: "동전을 던진다",
        require: { gold: 5 },
        outcomes: [
          {
            weight: 1,
            text: ["동전이 떨어지자 노래가 멎는다.", "따뜻한 기운이 발끝에서 차오른다."],
            effect: { gold: -5, maxHp: 3, hp: 3 },
          },
          {
            weight: 1,
            text: ["동전 떨어지는 소리만 길게 울린다.", "노래는 아무 일 없다는 듯 이어진다."],
            effect: { gold: -5 },
          },
        ],
      },
      {
        label: "물을 길어 마신다",
        outcomes: [
          { weight: 6, text: ["물은 차고 달다. 상처가 조금씩 아문다."], effect: { hp: 8 } },
          { weight: 4, text: ["한 모금 넘기자마자 속이 뒤집힌다. 물이 썩어 있었다."], effect: { hp: -4 } },
        ],
      },
      {
        label: "귀를 막고 지나간다",
        outcomes: [{ weight: 1, text: ["노랫소리는 언덕을 넘을 때까지 따라온다."] }],
      },
    ],
  },
  {
    id: "gambler",
    place: "field",
    hints: ["길가에 누군가 서 있다", "주사위 구르는 소리"],
    intro: [
      "외눈 사내가 그루터기 위에 주사위를 굴리고 있다.",
      "\"한 판 어때? 높은 수가 이기는 거야. 아주 공정하지.\"",
    ],
    options: [
      {
        label: "10골드를 건다",
        require: { gold: 10 },
        outcomes: [
          { weight: 45, text: ["당신의 주사위가 더 높다. 사내가 혀를 차며 동전을 밀어 준다."], effect: { gold: 10 } },
          { weight: 55, text: ["사내의 주사위가 또 6이다. \"운이 없구먼.\""], effect: { gold: -10 } },
        ],
      },
      {
        label: "주사위를 빼앗는다",
        outcomes: [
          {
            weight: 1,
            text: ["손을 뻗자 사내가 웃으며 그루터기 뒤에서 몽둥이를 집어 든다."],
            effect: { battle: true },
          },
        ],
      },
      {
        label: "거절하고 지나간다",
        outcomes: [{ weight: 1, text: ["\"겁쟁이 같으니.\" 등 뒤로 주사위 소리가 다시 구른다."] }],
      },
    ],
  },

  // ── 던전 이벤트 (6단계) ──
  {
    id: "knight",
    place: "dungeon",
    hints: ["녹슨 갑옷이 벽에 기대 있다", "쇠붙이 삐걱이는 소리"],
    intro: [
      "방 구석에 갑옷 한 벌이 벽에 등을 대고 앉아 있다.",
      "투구 틈으로 누런 뼈가 보인다. 무릎 위에 올린 손가락 사이로 금빛이 비친다.",
    ],
    options: [
      {
        label: "갑옷을 뒤진다",
        outcomes: [
          {
            weight: 6,
            text: ["뼈마디가 바스러지는 소리만 난다.", "장갑 속에서 오래된 금화가 쏟아진다."],
            effect: { gold: [10, 16] },
          },
          {
            weight: 4,
            text: ["금화에 손이 닿는 순간, 투구가 천천히 이쪽으로 돈다.", "갑옷이 삐걱이며 일어선다."],
            effect: { battle: true },
          },
        ],
      },
      {
        label: "숨을 죽이고 지나간다",
        outcomes: [{ weight: 1, text: ["등 뒤에서 쇠붙이가 한 번 덜컥인다. 돌아보지 않았다."] }],
      },
    ],
  },
  {
    id: "chest",
    place: "dungeon",
    hints: ["반쯤 열린 상자가 보인다", "바닥에 동전 한 닢이 떨어져 있다"],
    intro: [
      "통로 한가운데 나무 상자가 놓여 있다. 뚜껑이 손가락 한 마디만큼 들려 있다.",
      "틈 사이로 무언가 반짝인다. 너무 쉽게 놓여 있다.",
    ],
    options: [
      {
        label: "뚜껑을 연다",
        outcomes: [
          { weight: 4, text: ["경첩이 비명을 지르며 열린다. 동전이 가득하다."], effect: { gold: [10, 16] } },
          { weight: 2, text: ["기름 먹인 천에 싸인 무언가가 들어 있다."], effect: { gainItem: "bomb" } },
          {
            weight: 4,
            text: ["뚜껑이 저절로 확 열린다. 안쪽에 이빨이 줄지어 있다.", "상자가 아니었다."],
            effect: { battle: true },
          },
        ],
      },
      {
        label: "칼끝으로 먼저 찔러 본다",
        outcomes: [
          {
            weight: 6,
            text: ["그냥 나무다. 칼끝을 비틀어 뚜껑을 열자 동전 몇 닢이 나온다.", "서두르다 몇 닢은 틈으로 굴러 떨어졌다."],
            effect: { gold: [5, 9] },
          },
          {
            weight: 4,
            text: ["상자가 꿈틀하더니 칼날째 손을 물고 늘어진다.", "간신히 떼어 내자 상자는 어둠 속으로 기어 달아난다."],
            effect: { hp: -3 },
          },
        ],
      },
      {
        label: "건드리지 않고 지나간다",
        outcomes: [{ weight: 1, text: ["지나쳐 몇 걸음 가자, 뒤에서 뚜껑 닫히는 소리가 났다."] }],
      },
    ],
  },
  {
    id: "altar",
    place: "dungeon",
    hints: ["검붉게 얼룩진 돌판", "쇠비린내가 짙다"],
    intro: [
      "방 안쪽에 낮은 돌 제단이 있다. 표면은 오래 말라붙은 핏자국으로 검다.",
      "가운데 파인 홈 아래로 금화가 빼곡히 박혀 있다. 홈은 비어 있다. 무언가를 기다리는 것처럼.",
    ],
    options: [
      {
        label: "손바닥을 긋고 피를 바친다",
        outcomes: [
          {
            weight: 7,
            text: ["피가 홈을 따라 흐르자 돌이 갈라지며 금화가 쏟아진다.", "손바닥이 욱신거린다."],
            effect: { hp: -6, gold: [18, 26] },
          },
          {
            weight: 3,
            text: ["피는 돌 속으로 스며들어 사라진다.", "제단은 아무것도 내주지 않는다. 배가 부른 것 같다."],
            effect: { hp: -6 },
          },
        ],
      },
      {
        label: "물러난다",
        outcomes: [{ weight: 1, text: ["제단에서 눈을 떼기가 생각보다 어렵다."] }],
      },
    ],
  },
  {
    id: "mushroom",
    place: "dungeon",
    hints: ["희미한 푸른 빛이 새어 나온다", "축축한 흙냄새"],
    intro: [
      "무너진 벽 틈에 주먹만 한 버섯이 무리 지어 자란다.",
      "갓에서 푸른 빛이 숨 쉬듯 밝아졌다 어두워진다.",
    ],
    options: [
      {
        label: "하나 따서 먹는다",
        outcomes: [
          { weight: 6, text: ["쓰고 시원하다. 몸 안쪽까지 푸른 빛이 번지는 것 같다."], effect: { hp: 10 } },
          { weight: 4, text: ["삼키자마자 혀가 굳는다. 벽을 짚고 한참 토했다."], effect: { hp: -5 } },
        ],
      },
      {
        label: "조심스레 캐서 챙긴다",
        outcomes: [
          {
            weight: 6,
            text: ["뿌리째 캐어 천에 싼다. 빛이 천 너머로 은은하게 비친다.", "달여 마시면 약이 되겠다."],
            effect: { gainItem: "potion" },
          },
          {
            weight: 4,
            text: ["손이 닿자 갓이 터지며 포자가 얼굴을 덮친다.", "눈이 따갑고 숨이 막힌다."],
            effect: { hp: -3 },
          },
        ],
      },
      {
        label: "지나간다",
        outcomes: [{ weight: 1, text: ["푸른 빛이 등 뒤에서 천천히 어두워진다."] }],
      },
    ],
  },
];

/** 필드 선택지에 나오는 이벤트 */
export const FIELD_EVENTS = EVENTS.filter((e) => e.place === "field");
/** 던전 갈림길에 나오는 이벤트 */
export const DUNGEON_EVENTS = EVENTS.filter((e) => e.place === "dungeon");

/** 단서 문장으로 이벤트를 찾는다. 없으면 undefined */
export function eventByHint(hint: string): EventDef | undefined {
  return EVENTS.find((e) => e.hints.includes(hint));
}

export function eventById(id: string): EventDef {
  const e = EVENTS.find((ev) => ev.id === id);
  if (!e) throw new Error(`없는 이벤트: ${id}`);
  return e;
}
