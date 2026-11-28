// 서리항 길 이벤트 (region: "harbor"). 지역 설정은 docs/world/regions.md.
// 숫자는 모두 [임시값]. 형식은 ./types.ts.
import type { EventDef } from "./types";

export const HARBOR_EVENTS: readonly EventDef[] = [
  {
    id: "net",
    place: "field",
    region: "harbor",
    hints: ["부두 끝에서 누가 그물을 끌어올린다", "젖은 밧줄이 바위에 쓸리는 소리"],
    intro: [
      "부두 끝에서 늙은 어부 둘이 그물을 끌어올리고 있다.",
      "그물이 무겁다. 한 사람이 당신을 보고 턱짓을 한다. 손 좀 보태라는 뜻이다.",
    ],
    options: [
      {
        label: "그물을 같이 당긴다",
        outcomes: [
          {
            weight: 6,
            text: ["은빛 대구가 갑판에 쏟아진다.", "어부가 말없이 동전 몇 닢을 쥐여 준다. 그걸로 끝이다."],
            effect: { gold: [5, 9] },
          },
          {
            weight: 4,
            text: ["그물이 확 당겨지며 발이 미끄러졌다.", "얼음 같은 바닷물에 빠졌다가 겨우 기어 올라왔다. 어부들은 웃지도 않는다."],
            effect: { hp: -4 },
          },
        ],
      },
      {
        label: "생선 한 마리를 슬쩍한다",
        outcomes: [
          { weight: 6, text: ["아무도 못 봤다. 바위 뒤에서 구워 먹으니 속이 든든하다."], effect: { hp: 6 } },
          {
            weight: 4,
            text: ["\"거기.\" 등 뒤에서 낮은 목소리가 난다.", "부두를 지키던 깡패가 손가락 마디를 꺾고 있다."],
            effect: { battle: true, enemy: "thug" },
          },
        ],
      },
      {
        label: "지나간다",
        outcomes: [{ weight: 1, text: ["어부들은 당신이 지나가도 고개를 들지 않는다."] }],
      },
    ],
  },
  {
    id: "smugglers",
    place: "field",
    region: "harbor",
    hints: ["뒤집힌 배 아래 불빛", "누가 낮게 휘파람을 분다"],
    intro: [
      "뒤집힌 배 밑에 사내 셋이 웅크리고 궤짝을 나누고 있다. 은그릇, 수놓은 천, 어느 귀한 집 살림을 통째로 실어 낸 것 같다.",
      "하나가 당신을 보고 칼자루에 손을 얹는다. \"일거리를 찾나, 무덤을 찾나?\"",
    ],
    options: [
      {
        label: "궤짝 나르는 일을 거든다",
        outcomes: [
          {
            weight: 7,
            text: ["궤짝은 무겁고, 사내들은 말이 없다. 동굴 입구까지 날라 주자 품삯을 던져 준다."],
            effect: { gold: [12, 18] },
          },
          {
            weight: 3,
            text: ["동굴 앞에서 다른 패거리가 기다리고 있었다.", "사내들은 궤짝을 버리고 달아났다. 남은 건 당신뿐이다."],
            effect: { battle: true, enemy: "smuggler" },
          },
        ],
      },
      {
        label: "부두 경비에게 알리겠다고 한다",
        outcomes: [
          {
            weight: 5,
            text: ["사내들이 눈빛을 주고받는다. 하나가 주머니를 던진다.", "\"우린 서로 못 본 거다.\""],
            effect: { gold: [8, 12] },
          },
          {
            weight: 5,
            text: ["\"그럼 입을 닫게 해 주지.\" 가장 젊은 놈이 칼을 뽑는다."],
            effect: { battle: true, enemy: "smuggler" },
          },
        ],
      },
      {
        label: "못 본 척 지나간다",
        outcomes: [{ weight: 1, text: ["등 뒤에서 칼집에 칼이 다시 들어가는 소리가 난다."] }],
      },
    ],
  },
  {
    id: "sailor",
    place: "field",
    region: "harbor",
    hints: ["누군가 노래를 고래고래 부른다", "빈 술병이 길에 굴러다닌다"],
    intro: [
      "길가 바위에 덩치 큰 선원이 걸터앉아 벌꿀술을 병째 들이켜고 있다.",
      "\"팔씨름 한 판! 이기면 이 병을 주지. 지면 네 돈을 내고.\"",
    ],
    options: [
      {
        label: "팔씨름을 한다",
        require: { gold: 5 },
        outcomes: [
          {
            weight: 45,
            text: ["선원의 팔이 바위에 쾅 떨어진다. 그는 껄껄 웃으며 돈과 술병을 내민다.", "술은 독하고 따뜻하다."],
            effect: { gold: 5, hp: 3 },
          },
          {
            weight: 55,
            text: ["손목이 꺾이는 줄 알았다. 선원은 동전을 낚아채고 다시 노래를 부른다."],
            effect: { gold: -5, hp: -2 },
          },
        ],
      },
      {
        label: "술 한 모금만 얻어 마신다",
        outcomes: [
          { weight: 6, text: ["선원이 병을 내민다. 목이 타들어 가더니 몸이 데워진다."], effect: { hp: 4 } },
          { weight: 4, text: ["한 모금이 세 모금이 됐다. 정신을 차려 보니 주머니가 가볍다."], effect: { gold: [-6, -3] } },
        ],
      },
      {
        label: "지나간다",
        outcomes: [{ weight: 1, text: ["노랫소리가 바닷바람에 찢겨 흩어진다."] }],
      },
    ],
  },
];
