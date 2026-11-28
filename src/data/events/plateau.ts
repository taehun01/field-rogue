// 하얀 고원 길 이벤트 (region: "plateau"). 지역 설정은 docs/world/regions.md.
// 숫자는 모두 [임시값]. 형식은 ./types.ts.
import type { EventDef } from "./types";

export const PLATEAU_EVENTS: readonly EventDef[] = [
  {
    id: "frozen",
    place: "field",
    region: "plateau",
    hints: ["눈 속에 손 하나가 삐져나와 있다", "까마귀가 눈밭을 쪼고 있다"],
    intro: ["눈 더미 밖으로 장갑 낀 손이 나와 있다. 파 보니 얼어 죽은 여행자다. 짐을 멘 그대로다."],
    options: [
      {
        label: "짐을 뒤진다",
        outcomes: [
          { weight: 5, text: ["얼어붙은 주머니를 칼로 쪼개 열었다. 동전이 들어 있다."], effect: { gold: [8, 14] } },
          { weight: 2, text: ["짐 속에 마개도 따지 않은 약병이 있다."], effect: { gainItem: "potion" } },
          {
            weight: 3,
            text: ["시체의 입에서 하얀 김이 새어 나온다. 그건 숨이 아니다.", "냉기가 사람 모양으로 일어선다."],
            effect: { battle: true, enemy: "wisp" },
          },
        ],
      },
      {
        label: "눈을 덮어 묻어 준다",
        outcomes: [
          { weight: 6, text: ["손가락이 얼어 감각이 없다. 그래도 다 덮었다."], effect: { hp: -3 } },
          { weight: 4, text: ["눈을 덮다가 그의 허리춤에서 동전 주머니를 발견했다. 받아 두기로 했다."], effect: { gold: [5, 9] } },
        ],
      },
      {
        label: "지나간다",
        outcomes: [{ weight: 1, text: ["까마귀들이 다시 내려앉는다."] }],
      },
    ],
  },
  {
    id: "hot_spring",
    place: "field",
    region: "plateau",
    hints: ["얼음 사이로 김이 오른다", "눈이 녹은 둥근 자리"],
    intro: ["얼음 바위 사이에 둥근 웅덩이가 있다. 물에서 김이 오르고, 둘레만 눈이 녹아 이끼가 파랗다."],
    options: [
      {
        label: "몸을 담근다",
        outcomes: [
          { weight: 7, text: ["뜨거운 물이 언 뼈마디를 하나씩 풀어 준다. 한참 그대로 있었다."], effect: { hp: 10 } },
          {
            weight: 3,
            text: ["물 건너편 김 속에서 커다란 그림자가 몸을 일으킨다.", "이 물을 아는 건 사람만이 아니다."],
            effect: { battle: true, enemy: "troll" },
          },
        ],
      },
      {
        label: "물을 떠 간다",
        outcomes: [{ weight: 1, text: ["빈 병에 물을 받았다. 식어도 약 기운은 남을 것이다."], effect: { gainItem: "potion" } }],
      },
      {
        label: "지나간다",
        outcomes: [{ weight: 1, text: ["김이 바람에 꺾여 흩어진다."] }],
      },
    ],
  },
  {
    id: "patrol",
    place: "field",
    region: "plateau",
    hints: ["바람 속에서 뿔피리가 울린다", "눈에 꽂힌 창 하나"],
    intro: [
      "눈보라 속에서 털가죽을 뒤집어쓴 순찰병 하나가 비틀거리며 나타난다.",
      "\"초소가... 어느 쪽이오? 동료들을 잃었소.\"",
    ],
    options: [
      {
        label: "초소까지 같이 걷는다",
        outcomes: [
          {
            weight: 6,
            text: ["한참을 같이 걸었다. 돌벽이 보이자 순찰병이 품삯을 나눠 준다.", "\"이 고원에선 혼자 다니지 마시오.\""],
            effect: { gold: [8, 12] },
          },
          {
            weight: 4,
            text: ["둘의 발자국을 따라온 것이 있었다. 눈보라 속에서 이빨이 번쩍인다."],
            effect: { battle: true, enemy: "snow_wolf" },
          },
        ],
      },
      {
        label: "방향만 가리켜 준다",
        outcomes: [{ weight: 1, text: ["순찰병은 고개를 끄덕이고 눈보라 속으로 사라진다."] }],
      },
      {
        label: "지나간다",
        outcomes: [{ weight: 1, text: ["뿔피리 소리가 한 번 더 울리고 끊긴다."] }],
      },
    ],
  },
];
