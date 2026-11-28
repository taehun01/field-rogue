// 이벤트 데이터 (5단계). 이벤트 하나 = 단서 + 처음 문장 + 고를 거리 2~3개, 고를 거리마다 결과가 가중치로 갈린다.
// place 로 필드 이벤트와 던전 이벤트를 나눈다 (6단계). 필드 선택지에는 필드 것만, 던전 갈림길에는 던전 것만 나온다.
// 필드 이벤트에 region 이 있으면 그 지역 길에서만, 없으면 어느 길에서나 나온다 (F1).
// 이 파일만 고치면 이벤트를 더하고 빼고 바꿀 수 있다. 처리하는 쪽은 core/events.ts.
// 결과의 숫자 변화(체력 +8 등)는 처리하는 쪽이 문장 끝에 붙이므로, 문장에는 숫자를 쓰지 않는다.
// 숫자는 모두 [임시값]. 세계관은 docs/world.md.

import type { RegionId } from "../core/types";
import type { ItemId } from "./items";

/** 고정값 또는 [최소, 최대] 범위 */
export type Amount = number | [number, number];

/** 결과 하나가 플레이어에게 하는 일. 적은 것만 일어난다 */
export interface EventEffect {
  hp?: Amount;
  maxHp?: number;
  gold?: Amount;
  /** 짐에서 하나 빠진다 */
  loseItem?: ItemId;
  /** 짐에 하나 들어온다 (무게를 넘어도 든다) */
  gainItem?: ItemId;
  /** 결과 문장 뒤에 전투가 시작된다. 적은 지금 지역 적 가운데 무작위, enemy 가 있으면 그 적 (data/regions.ts id) */
  battle?: true;
  enemy?: string;
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
  /** 필드 이벤트가 나오는 지역. 없으면 어느 지역에서나 */
  region?: RegionId;
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

  // ── 서리항 (F1) ──
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
      "뒤집힌 배 밑에 사내 셋이 웅크리고 궤짝을 나누고 있다. 영주의 인장이 뜯겨 나간 궤짝이다.",
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

  // ── 솔그늘 (F1) ──
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

  // ── 뼈의 골짜기 (F1) ──
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

  // ── 하얀 고원 (F1) ──
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

/** region 지역 길에서 나오는 이벤트: 그 지역 것 + 어느 지역에서나 나오는 것 */
export function fieldEvents(region: RegionId): EventDef[] {
  return FIELD_EVENTS.filter((e) => e.region === undefined || e.region === region);
}
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
