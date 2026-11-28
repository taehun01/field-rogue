// 던전 갈림길 전용 이벤트 (place: "dungeon"). 필드 이벤트가 던전에서 나오면 어색해서 따로 둔다.
// 숫자는 모두 [임시값]. 형식은 ./types.ts.
import type { EventDef } from "./types";

export const DUNGEON_ONLY_EVENTS: readonly EventDef[] = [
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
