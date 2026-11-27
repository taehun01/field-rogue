// 이벤트 데이터 (5단계). 이벤트 하나 = 단서 + 처음 문장 + 고를 거리 2~3개, 고를 거리마다 결과가 가중치로 갈린다.
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
  /** 선택지에 보이는 단서. 이 단서를 고르면 이 이벤트가 벌어진다 */
  hints: string[];
  intro: string[];
  options: EventOption[];
}

export const EVENTS: readonly EventDef[] = [
  {
    id: "wounded",
    hints: ["부서진 수레가 보인다", "신음 소리가 들린다"],
    intro: [
      "[임시] 바퀴가 빠진 수레 곁에 여행자 하나가 주저앉아 있다.",
      "다리에 감은 천이 검붉게 젖었다. 당신을 보자 손을 내민다.",
    ],
    options: [
      {
        label: "회복약을 건넨다",
        require: { item: "potion" },
        outcomes: [
          {
            weight: 1,
            text: ["[임시] 여행자는 약을 단숨에 비우고 한참 숨을 고른다.", "\"빚은 갚는 사람이오.\" 묵직한 주머니가 손에 쥐어진다."],
            effect: { loseItem: "potion", gold: [12, 18] },
          },
        ],
      },
      {
        label: "수레 짐을 뒤진다",
        outcomes: [
          {
            weight: 6,
            text: ["[임시] 여행자는 말릴 힘도 없이 바라볼 뿐이다.", "짐 밑바닥에서 동전 몇 닢이 나온다."],
            effect: { gold: [5, 10] },
          },
          {
            weight: 4,
            text: ["[임시] 짐에 손을 대는 순간, 여행자가 멀쩡한 다리로 벌떡 일어선다.", "덫이었다."],
            effect: { battle: true },
          },
        ],
      },
      {
        label: "못 본 척 지나간다",
        outcomes: [{ weight: 1, text: ["[임시] 등 뒤의 신음 소리가 점점 멀어진다."] }],
      },
    ],
  },
  {
    id: "well",
    hints: ["낯선 노랫소리가 난다", "덩굴 덮인 돌 우물"],
    intro: [
      "[임시] 덩굴에 덮인 오래된 우물이 있다.",
      "노랫소리는 그 밑바닥에서 올라온다. 가사는 알아들을 수 없다.",
    ],
    options: [
      {
        label: "동전을 던진다",
        require: { gold: 5 },
        outcomes: [
          {
            weight: 1,
            text: ["[임시] 동전이 떨어지자 노래가 멎는다.", "따뜻한 기운이 발끝에서 차오른다."],
            effect: { gold: -5, maxHp: 3, hp: 3 },
          },
          {
            weight: 1,
            text: ["[임시] 동전 떨어지는 소리만 길게 울린다.", "노래는 아무 일 없다는 듯 이어진다."],
            effect: { gold: -5 },
          },
        ],
      },
      {
        label: "물을 길어 마신다",
        outcomes: [
          { weight: 6, text: ["[임시] 물은 차고 달다. 상처가 조금씩 아문다."], effect: { hp: 8 } },
          { weight: 4, text: ["[임시] 한 모금 넘기자마자 속이 뒤집힌다. 물이 썩어 있었다."], effect: { hp: -4 } },
        ],
      },
      {
        label: "귀를 막고 지나간다",
        outcomes: [{ weight: 1, text: ["[임시] 노랫소리는 언덕을 넘을 때까지 따라온다."] }],
      },
    ],
  },
  {
    id: "gambler",
    hints: ["길가에 누군가 서 있다", "주사위 구르는 소리"],
    intro: [
      "[임시] 외눈 사내가 그루터기 위에 주사위를 굴리고 있다.",
      "\"한 판 어때? 높은 수가 이기는 거야. 아주 공정하지.\"",
    ],
    options: [
      {
        label: "10골드를 건다",
        require: { gold: 10 },
        outcomes: [
          { weight: 45, text: ["[임시] 당신의 주사위가 더 높다. 사내가 혀를 차며 동전을 밀어 준다."], effect: { gold: 10 } },
          { weight: 55, text: ["[임시] 사내의 주사위가 또 6이다. \"운이 없구먼.\""], effect: { gold: -10 } },
        ],
      },
      {
        label: "주사위를 빼앗는다",
        outcomes: [
          {
            weight: 1,
            text: ["[임시] 손을 뻗자 사내가 웃으며 그루터기 뒤에서 몽둥이를 집어 든다."],
            effect: { battle: true },
          },
        ],
      },
      {
        label: "거절하고 지나간다",
        outcomes: [{ weight: 1, text: ["[임시] \"겁쟁이 같으니.\" 등 뒤로 주사위 소리가 다시 구른다."] }],
      },
    ],
  },
];

/** 단서 문장으로 이벤트를 찾는다. 없으면 undefined */
export function eventByHint(hint: string): EventDef | undefined {
  return EVENTS.find((e) => e.hints.includes(hint));
}

export function eventById(id: string): EventDef {
  const e = EVENTS.find((ev) => ev.id === id);
  if (!e) throw new Error(`없는 이벤트: ${id}`);
  return e;
}
