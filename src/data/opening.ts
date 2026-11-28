// 고정 오프닝 (F7). 죄수선 → 난파 → 무너진 고분(튜토리얼) → 서리항. docs/world/README.md 오프닝.
// 장면마다 글과 고를 거리가 있고, 싸움이 있는 장면은 싸움이 끝나야(이기든 달아나든 몰래 지나가든) 다음 장면으로 간다.
// 오프닝 안에서는 죽지 않는다: 쓰러지면 이르사가 끌어내고 다음 장면으로 이어진다 (core/opening.ts).
// 무작위 없이 매번 같다. 숫자는 [임시값].

import type { RaceId } from "../core/types";
import type { EnemyDef } from "./regions";

export interface OpeningOption {
  label: string;
  /** 다음 장면 id. "end" 면 오프닝이 끝나고 서리항에 닿는다 */
  next: string;
  /** 고르면 종족이 정해진다 (배 안, 간수의 물음) */
  race?: RaceId;
  /** 고르면 다음 장면 글 앞에 붙는 말 */
  say?: readonly string[];
  /** 고르면 치유 룬을 써 본다 (마력이 모자라면 그냥 넘어간다) */
  castHeal?: true;
}

export interface OpeningScene {
  id: string;
  /** 머리줄에 보이는 곳 이름 */
  place: string;
  lines: readonly string[];
  /** 이 장면에 들어서며 받는 피해 (오프닝에서는 1 아래로 내려가지 않는다) */
  hurt?: number;
  /** 이 장면에 들어서며 숨을 고른다 (기력이 다 찬다). 강타를 써 보는 방 앞에서 */
  breath?: true;
  /** 이 장면의 싸움. sneak 이면 적이 아직 나를 못 봤다 (몰래 지나가기·기습·맞서기). chief 면 우두머리 (몰래 지나갈 수 없다) */
  battle?: { enemy: EnemyDef; sneak?: boolean; chief?: boolean; next: string };
  /** 싸움 전에 보이는 안내 (화면 아래 작은 글) */
  tip?: string;
  options: readonly OpeningOption[];
}

/** 튜토리얼 고분의 망자들. 레벨 1 기준이고 지역 적보다 조금 약하다 */
const SLEEPER: EnemyDef = { id: "tut_sleeper", name: "잠든 망자", maxHp: 8, atk: 3, def: 0, gold: [2, 4], weight: 0 };
const DOORWARD: EnemyDef = { id: "tut_doorward", name: "문을 막은 망자", maxHp: 10, atk: 3, def: 1, gold: [3, 5], weight: 0 };
const KEEPER: EnemyDef = { id: "tut_keeper", name: "고분지기", maxHp: 16, atk: 4, def: 1, gold: [10, 15], weight: 0 };

export const OPENING_ENEMIES = [SLEEPER, DOORWARD, KEEPER];

export const OPENING_START = "hold";

export const OPENING_SCENES: readonly OpeningScene[] = [
  {
    id: "hold",
    place: "죄수선 밑창",
    lines: [
      "배 밑창은 축축하고 어둡다. 발목의 쇠사슬이 옆 사람의 사슬과 한데 묶여 있다.",
      "옆자리에는 젊은 여자가 앉아 있다. 몸에 맞지 않는 죄수 옷을 입었는데, 등만은 이상하게 곧다. 한 손을 가슴께에 꼭 쥐고, 배가 출렁일 때마다 눈을 감는다.",
      "사다리 위에서 등불이 내려온다. 간수 하콘이 장부를 펴고 죄수를 하나씩 훑는다.",
      "\"이르사. 몰수된 영주가 은붙이를 훔친 도둑.\" 하콘이 여자의 주먹을 내려다본다. 손가락 사이로 은 머리핀 끝이 비어져 나와 있다. \"증거물은 내놓으라고 했을 텐데.\" 여자는 대답하지 않는다. 주먹도 펴지 않는다.",
      "\"이름은 관심 없다. 어디서 굴러먹던 놈이냐.\" 등불이 당신 얼굴 앞에서 멈춘다.",
    ],
    options: [
      { label: "\"북방인이다. 이 땅에서 났다.\"", next: "wreck", race: "northman" },
      { label: "\"반거인이다. 뼈의 골짜기에서 왔다.\"", next: "wreck", race: "halfgiant" },
      { label: "\"눈요정이다. 하얀 고원에서 내려왔다.\"", next: "wreck", race: "snowelf" },
      { label: "\"늑대혈족이다.\" (사람들이 움찔한다)", next: "wreck", race: "wolfblood" },
    ],
  },
  {
    id: "wreck",
    place: "죄수선 밑창",
    lines: [
      "하콘이 장부에 무언가 적고 사다리를 올라간다. 이르사는 그 뒤로도 한참 사다리 쪽을 올려다본다.",
      "한밤중, 배가 통째로 비명을 지른다. 뱃전이 안쪽으로 휘어 들어오고, 바닷물이 쏟아진다. 유빙이다.",
      "사슬을 고정한 고리가 벽째 뜯겨 나갔다. 이르사와 당신은 아직 한 사슬에 묶여 있다. 이르사는 물이 차오르는 바닥을 내려다본 채 움직이지 않는다.",
    ],
    options: [
      {
        label: "이르사를 끌고 갈라진 틈으로 나간다",
        next: "ice",
        say: ["이르사의 팔을 붙잡고 틈으로 밀어 올렸다. 그가 뒤돌아 당신의 손목을 붙든다. 입술이 달싹이는데, 말이 되어 나오지 않는다."],
      },
      {
        label: "사슬을 끌어당겨 먼저 빠져나간다",
        next: "ice",
        say: ["먼저 틈으로 몸을 밀어 넣었다. 사슬이 팽팽해지고, 뒤에서 이르사가 끌려 나온다. 비명 한 번 지르지 않는다."],
      },
    ],
  },
  {
    id: "ice",
    place: "유빙 위",
    lines: [
      "얼음 위로 기어 나오자 배가 천천히 기울며 검은 물속으로 들어간다. 다른 사람은 보이지 않는다.",
      "이르사는 얼음 위에 주저앉아 가라앉는 배를 본다. 그러다 주먹을 펴 머리핀이 아직 있는지 보고, 다시 쥔다.",
      "당신이 돌멩이로 사슬 고리를 내리친다. 몇 번 만에 고리가 쪼개진다. 이르사는 제 발목을 한 번 문지를 뿐이다.",
      "얼음 끝에 해안 절벽이 있다. 절벽 아래가 무너져 안쪽으로 돌계단이 보인다. 바람을 피할 곳은 거기뿐이다.",
    ],
    options: [{ label: "무너진 틈으로 내려간다", next: "sleeper" }],
  },
  {
    id: "sleeper",
    place: "무너진 고분",
    lines: [
      "고분이다. 벽감마다 누런 뼈가 누워 있고, 공기가 차고 오래됐다.",
      "통로 한가운데 망자 하나가 벽에 기대 앉아 있다. 머리가 앞으로 꺾여 있다. 자는 것 같다.",
      "이르사가 당신 소매를 붙들고 고개를 젓는다. 깨우지 말라는 뜻이다.",
    ],
    tip: "적이 아직 당신을 보지 못했다. 몰래 지나가거나, 기습하거나, 맞설 수 있다. 몰래 다닐수록 은신이 오른다.",
    battle: { enemy: SLEEPER, sneak: true, next: "trap" },
    options: [],
  },
  {
    id: "trap",
    place: "무너진 고분",
    hurt: 7,
    lines: [
      "다음 방 문턱을 밟는 순간 바닥 돌이 꺼지고, 벽에서 녹슨 창날이 튀어나온다. 옆구리가 베였다.",
      "이르사가 당신 옆구리를 보고, 당신 손등을 본다. 이 땅에서 자란 사람이면 누구나 새기는 작은 치유 룬이다. 그가 떨리는 손가락으로 룬을 가리킨다.",
    ],
    tip: "룬은 마력을 써서 쓴다. 치유 룬은 싸움 밖에서도 쓸 수 있다. 마력은 쉬거나 걸으면 다시 찬다.",
    options: [
      { label: "치유 룬에 힘을 준다", next: "door", castHeal: true },
      { label: "참고 간다", next: "door", say: ["피가 배어 나온다. 이르사가 입술을 깨문다."] },
    ],
  },
  {
    id: "door",
    place: "무너진 고분",
    breath: true,
    lines: [
      "벽에 기대 숨을 고른다. 다리에 다시 힘이 들어온다.",
      "통로 끝의 돌문 앞을 덩치 큰 망자가 막고 서 있다. 이쪽을 이미 보고 있다.",
      "이르사가 벽에 등을 붙이고 숨을 죽인다. 몰래 지나갈 길은 없다. 부딪쳐야 한다.",
    ],
    tip: "강타는 기력을 써서 크게 친다. 기력은 걸으면 조금씩, 쉬면 다 찬다. 방어는 받는 피해를 줄인다.",
    battle: { enemy: DOORWARD, next: "keeper" },
    options: [],
  },
  {
    id: "keeper",
    place: "무너진 고분",
    lines: [
      "돌문 너머는 둥근 방이다. 가운데 관 위에 투구를 쓴 망자가 앉아 있다가, 천천히 일어선다.",
      "관 뒤편 벽이 무너져 바깥 빛이 들어온다. 저 틈으로 나가야 한다.",
      "이르사가 당신 뒤로 한 걸음 물러선다. 저것만 넘으면 된다.",
    ],
    tip: "던전의 끝에는 이렇게 우두머리가 있다. 우두머리는 몰래 지나갈 수 없지만, 아직 당신을 못 봤다면 기습은 된다.",
    battle: { enemy: KEEPER, sneak: true, chief: true, next: "out" },
    options: [],
  },
  {
    id: "out",
    place: "해안 절벽",
    lines: [
      "무너진 틈으로 기어 나오자 바람이 얼굴을 때린다. 해안을 따라 멀리 연기 기둥 몇 개가 보인다. 서리항이다.",
      "부두 어귀까지 같이 걸었다. 경비 초소의 깃발이 보이자 이르사가 걸음을 멈춘다. 그리고 처음으로 당신을 똑바로 본다.",
      "\"빚은 나중에 갚을게.\" 처음 듣는 목소리다. 낮고, 조금 갈라져 있다. 그는 머리핀을 쥔 손을 한 번 들어 보이고 생선 창고 뒤로 사라진다.",
    ],
    options: [{ label: "서리항으로 들어간다", next: "end" }],
  },
];

export function openingScene(id: string): OpeningScene {
  const s = OPENING_SCENES.find((x) => x.id === id);
  if (!s) throw new Error(`없는 오프닝 장면: ${id}`);
  return s;
}

/** 오프닝 싸움에서 쓰러졌을 때 (죽지 않고 다음 장면으로) */
export const OPENING_RESCUE = [
  "눈앞이 하얘진다.",
  "누군가 뒷덜미를 잡아끈다. 정신을 차려 보니 이르사가 당신을 벽에 기대 놓고, 떨리는 두 손으로 상처를 누르고 있다. 아무 말도 하지 않는다.",
];
