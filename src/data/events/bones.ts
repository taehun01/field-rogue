// 뼈의 골짜기 길 이벤트 (region: "bones"). 지역 설정은 docs/world/regions.md.
// 숫자는 모두 [임시값]. 형식은 ./types.ts.
import type { EventDef } from "./types";

export const BONES_EVENTS: readonly EventDef[] = [
  {
    id: "digger",
    place: "field",
    region: "bones",
    hints: ["누가 삽을 메고 손짓한다", "파헤친 흙냄새가 진하다"],
    intro: [
      "봉분 옆에서 비쩍 마른 사내가 삽질을 하다 허리를 편다.",
      "\"혼자 파기엔 크단 말이야. 나눠 갖자고. 반반.\"",
    ],
    options: [
      {
        label: "같이 판다",
        outcomes: [
          {
            weight: 6,
            text: ["썩은 관 뚜껑 아래 녹슨 장신구와 동전이 나온다.", "사내는 약속대로 반을 내민다. 의외다."],
            effect: { gold: [10, 16] },
          },
          {
            weight: 4,
            text: ["관 뚜껑이 안쪽에서 밀려 올라온다.", "사내는 삽을 버리고 벌써 저만치 달아났다."],
            effect: { battle: true, enemy: "draugr" },
          },
        ],
      },
      {
        label: "도굴꾼을 쫓아낸다",
        outcomes: [
          {
            weight: 5,
            text: ["사내가 삽을 내던지고 달아난다. 흘린 주머니에 동전이 들어 있다."],
            effect: { gold: [4, 8] },
          },
          { weight: 5, text: ["사내가 삽을 고쳐 쥔다. \"내가 먼저 찾은 무덤이다.\""], effect: { battle: true, enemy: "robber" } },
        ],
      },
      {
        label: "지나간다",
        outcomes: [{ weight: 1, text: ["삽질 소리가 다시 시작된다."] }],
      },
    ],
  },
  {
    id: "giant_rib",
    place: "field",
    region: "bones",
    hints: ["거대한 뼈에 룬이 새겨져 있다", "뼈에서 낮게 웅웅 소리가 난다"],
    intro: [
      "땅에서 집채만 한 갈비뼈가 솟아 있다. 표면에 사람 손으로 새긴 옛 글자가 빼곡하다.",
      "손을 대지 않았는데도 뼈 속에서 낮은 울림이 올라온다.",
    ],
    options: [
      {
        label: "글자를 소리 내 읽어 본다",
        outcomes: [
          {
            weight: 4,
            text: ["뜻은 모르지만 입이 저절로 움직인다.", "마지막 글자를 읽자 뼛속까지 무언가가 울린다. 몸이 단단해졌다."],
            effect: { maxHp: 3, hp: 3 },
          },
          {
            weight: 6,
            text: ["세 번째 글자에서 혀가 얼어붙었다.", "코피가 흐르고 한참 동안 귀가 울린다."],
            effect: { hp: -4 },
          },
        ],
      },
      {
        label: "뼈 조각을 떼어 간다",
        outcomes: [
          { weight: 7, text: ["손바닥만 한 조각을 떼어 냈다. 길에서 만난 뼈 장수가 바로 값을 쳐 줬다."], effect: { gold: [6, 10] } },
          { weight: 3, text: ["뼈가 손을 밀어낸다. 손목이 시퍼렇게 멍들었다."], effect: { hp: -3 } },
        ],
      },
      {
        label: "손대지 않는다",
        outcomes: [{ weight: 1, text: ["울림은 한참 동안 발밑에서 따라온다."] }],
      },
    ],
  },
  {
    id: "widow",
    place: "field",
    region: "bones",
    hints: ["새 봉분 앞에 누가 앉아 있다", "곡하는 소리가 바람에 실린다"],
    intro: [
      "흙이 아직 젖은 봉분 앞에 여자가 앉아 있다.",
      "\"밤마다 도굴꾼이 와요. 남편은 아직 따뜻한데.\" 여자가 올려다본다. \"하룻밤만 지켜 주실래요?\"",
    ],
    options: [
      {
        label: "밤새 무덤을 지킨다",
        outcomes: [
          {
            weight: 6,
            text: ["밤새 아무도 오지 않았다. 추위에 이가 덜덜 떨렸다.", "새벽에 여자가 말없이 동전 주머니를 놓고 간다."],
            effect: { gold: [8, 12], hp: -2 },
          },
          {
            weight: 4,
            text: ["자정 무렵, 삽을 멘 그림자가 봉분으로 다가온다."],
            effect: { battle: true, enemy: "robber" },
          },
        ],
      },
      {
        label: "잠깐 같이 앉아 있다 간다",
        outcomes: [
          {
            weight: 1,
            text: ["둘 다 말이 없다. 바람만 분다.", "일어설 때 여자가 고개를 한 번 숙인다. 이상하게 몸이 가볍다."],
            effect: { hp: 4 },
          },
        ],
      },
      {
        label: "지나간다",
        outcomes: [{ weight: 1, text: ["곡소리가 다시 이어진다."] }],
      },
    ],
  },
];
