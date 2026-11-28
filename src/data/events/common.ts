// 어느 지역 길에서나 나오는 필드 이벤트 (region 없음).
// 숫자는 모두 [임시값]. 형식은 ./types.ts.
import type { EventDef } from "./types";

export const COMMON_EVENTS: readonly EventDef[] = [
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
];
