// 솔그늘 길 이벤트 (region: "pines"). 지역 설정은 docs/world/regions.md.
// 숫자는 모두 [임시값]. 형식은 ./types.ts.
import type { EventDef } from "./types";

export const PINES_EVENTS: readonly EventDef[] = [
  {
    id: "trap",
    place: "field",
    region: "pines",
    hints: ["쇠사슬이 철컥거린다", "누가 살려 달라고 외친다"],
    intro: [
      "곰덫에 발목이 물린 사냥꾼이 나무 밑동에 기대 있다. 눈 위가 붉다.",
      "\"덫 좀 벌려 주시오. 혼자선 못 하겠소.\"",
    ],
    options: [
      {
        label: "덫을 벌린다",
        outcomes: [
          {
            weight: 7,
            text: ["이를 악물고 덫을 벌렸다. 사냥꾼이 다리를 빼낸다.", "그는 품에서 작은 병을 꺼내 건넨다. \"내가 달인 거요. 잘 듣지.\""],
            effect: { gainItem: "potion" },
          },
          {
            weight: 3,
            text: ["덫이 미끄러지며 손등을 물었다.", "둘이 같이 비명을 질렀다. 그래도 사냥꾼은 빠져나왔고, 동전 몇 닢을 놓고 갔다."],
            effect: { hp: -4, gold: [3, 6] },
          },
        ],
      },
      {
        label: "사냥꾼의 짐을 챙긴다",
        outcomes: [
          {
            weight: 5,
            text: ["사냥꾼이 욕을 퍼붓는다. 당신은 돌아보지 않는다.", "짐 속에 동전 주머니가 있었다."],
            effect: { gold: [8, 12] },
          },
          {
            weight: 5,
            text: ["짐을 뒤지는 사이, 피 냄새를 맡은 것이 나무 사이에서 나온다."],
            effect: { battle: true, enemy: "wolf" },
          },
        ],
      },
      {
        label: "지나간다",
        outcomes: [{ weight: 1, text: ["외침은 소나무 사이에서 금세 먹먹해진다."] }],
      },
    ],
  },
  {
    id: "honey",
    place: "field",
    region: "pines",
    hints: ["벌 떼가 윙윙거린다", "나무 구멍에서 단내가 난다"],
    intro: ["속이 빈 고목에 벌집이 들어앉았다. 구멍 가장자리로 꿀이 흘러내려 굳어 있다."],
    options: [
      {
        label: "손을 넣어 꿀을 꺼낸다",
        outcomes: [
          { weight: 6, text: ["몇 방 쏘였지만 꿀은 진하고 달다. 기운이 돈다."], effect: { hp: 8 } },
          { weight: 4, text: ["벌 떼가 한꺼번에 쏟아져 나왔다. 숲길을 한참 뛰었다."], effect: { hp: -3 } },
        ],
      },
      {
        label: "도끼로 고목을 쪼갠다",
        outcomes: [
          {
            weight: 5,
            text: ["고목이 쩍 갈라진다. 벌집 아래, 누가 숨겨 둔 동전 주머니가 박혀 있다."],
            effect: { gold: [6, 10] },
          },
          {
            weight: 5,
            text: ["나무가 쓰러지는 소리에 덤불이 흔들린다.", "꿀 냄새를 먼저 맡은 건 당신이 아니었다."],
            effect: { battle: true, enemy: "bear" },
          },
        ],
      },
      {
        label: "지나간다",
        outcomes: [{ weight: 1, text: ["벌 소리가 등 뒤에서 잦아든다."] }],
      },
    ],
  },
  {
    id: "carved_tree",
    place: "field",
    region: "pines",
    hints: ["나무에 새긴 얼굴이 보인다", "가지마다 뼈 방울이 매달려 있다"],
    intro: [
      "늙은 소나무 줄기에 사람 얼굴이 새겨져 있다. 벌목꾼들이 숲에 바치는 나무다.",
      "가지마다 작은 뼈 방울이 매달려 바람에 딸랑인다. 뿌리께에 동전이 몇 닢 놓여 있다.",
    ],
    options: [
      {
        label: "동전을 바친다",
        require: { gold: 5 },
        outcomes: [
          {
            weight: 1,
            text: ["동전을 뿌리께에 놓자 방울 소리가 한꺼번에 멎는다.", "숨이 깊어진다. 숲이 받아 준 것 같다."],
            effect: { gold: -5, maxHp: 3, hp: 3 },
          },
          { weight: 1, text: ["방울은 아무 일 없다는 듯 계속 딸랑인다."], effect: { gold: -5 } },
        ],
      },
      {
        label: "바쳐진 동전을 챙긴다",
        outcomes: [
          { weight: 5, text: ["동전은 차고 무겁다. 방울 소리가 조금 커진 것 같다."], effect: { gold: [6, 10] } },
          {
            weight: 5,
            text: ["\"신목에 손을 대?\" 나무 뒤에서 활시위 당기는 소리가 난다."],
            effect: { battle: true, enemy: "bandit" },
          },
        ],
      },
      {
        label: "고개만 숙이고 지나간다",
        outcomes: [{ weight: 1, text: ["나무 얼굴이 당신이 지나갈 때까지 보고 있는 것 같다."] }],
      },
    ],
  },
];
