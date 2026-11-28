// 의뢰 데이터 (F5). 반복 의뢰의 배달 물건과, 마을마다 하나씩 있는 고유 인물의 한 번짜리 의뢰.
// 고유 의뢰는 이야기로 이어지지 않는다 (docs/game.md 마을과 의뢰). 인물은 docs/world/people.md.
// 숫자는 모두 [임시값]. 처리하는 쪽은 core/quests.ts.

import type { RegionId } from "../core/types";
import type { ItemId } from "./items";

/** 반복 배달 의뢰에 쓰는 물건 (data/items.ts 의 kind: "quest") */
export const PARCELS: readonly ItemId[] = ["sealed_letter", "fish_barrel", "herb_bundle"];

export interface UniqueQuestDef {
  id: string;
  /** 의뢰를 주는 마을 */
  town: RegionId;
  giver: string;
  kind: "hunt" | "deliver" | "clear";
  /** 처치·던전: 그 지역, 배달: 목적지 마을 */
  region: RegionId;
  enemy?: string;
  count?: number;
  item?: ItemId;
  reward: { gold: number; item?: ItemId };
  /** 게시판에 보이는 한 줄 */
  title: string;
  /** 받을 때 듣는 말 */
  intro: readonly string[];
  /** 마칠 때 듣는 말 */
  done: readonly string[];
}

export const UNIQUE_QUESTS: readonly UniqueQuestDef[] = [
  {
    id: "bran",
    town: "harbor",
    giver: "부두 감독관 브란",
    kind: "clear",
    region: "harbor",
    reward: { gold: 60, item: "iron_sword" },
    title: "부두 감독관 브란: 해적 소굴의 외팔이 하랄을 치워 달라",
    intro: [
      "브란은 낮부터 벌꿀술 냄새를 풍긴다. 부두 감독관 띠는 아직 차고 있다.",
      "\"하랄 그놈이 절벽 소굴에서 내 부두를 쥐고 흔든다. 경비는 겁먹었고 영주는 바쁘시지.\" 그는 잔을 내려놓는다. \"치워 주면 내 칼을 주지. 나한텐 이제 필요 없으니.\"",
    ],
    done: ["브란이 한참 말없이 부두 쪽을 본다.", "\"…그래. 이제 배가 들어오겠군.\" 그는 벽에 걸어 둔 칼을 내려 건넨다."],
  },
  {
    id: "einar",
    town: "pines",
    giver: "늙은 사냥꾼 에이나르",
    kind: "hunt",
    region: "pines",
    enemy: "wolf",
    count: 4,
    reward: { gold: 40, item: "leather" },
    title: "사냥꾼 에이나르: 마을 가축을 노리는 늑대 넷을 잡아 달라",
    intro: [
      "에이나르는 부목을 댄 다리를 의자에 올려놓고 있다.",
      "\"이 다리로는 숲에 못 들어가. 그사이 늑대 놈들이 우리 염소를 셋이나 물어 갔지. 넷만 잡아 오게. 내가 쓰던 가죽 갑옷을 주지.\"",
    ],
    done: ["에이나르가 늑대 이야기를 끝까지 듣고 고개를 끄덕인다.", "\"잘했어. 이건 이제 자네 거야. 나보다 자네 등에 더 잘 맞겠군.\""],
  },
  {
    id: "hild",
    town: "bones",
    giver: "대장장이 아내 힐드",
    kind: "deliver",
    region: "plateau",
    item: "hild_axe",
    reward: { gold: 30, item: "iron_greatsword" },
    title: "대장장이 아내 힐드: 남편의 도끼를 바람막이 초소의 시동생에게",
    intro: [
      "힐드는 천에 싼 도끼를 탁자 위에 올려놓는다. 날이 잘 서 있다.",
      "\"남편이 가을에 갔어요. 이건 바람막이 초소에 있는 시동생한테 가야 할 물건이에요. 저는 고원까지 못 가요.\" 무겁다.",
    ],
    done: [
      "초소의 젊은 순찰병이 도끼를 받아 들고 한참 날을 쓰다듬는다.",
      "\"형님 거군요.\" 그는 제 대검을 벽에서 내려 건넨다. \"이건 형님이 저한테 만들어 준 거예요. 형님 도끼를 가져다준 사람이 가져가야죠.\"",
    ],
  },
  {
    id: "ulf",
    town: "plateau",
    giver: "초소장 울프",
    kind: "hunt",
    region: "plateau",
    enemy: "troll",
    count: 2,
    reward: { gold: 50, item: "chainmail" },
    title: "초소장 울프: 순찰로를 막는 서리 트롤 둘을 처리해 달라",
    intro: [
      "울프는 지도를 펴 놓고 손가락으로 순찰로를 짚는다. 두 군데에 숯으로 동그라미가 쳐져 있다.",
      "\"트롤 둘이 여기 자리를 잡았다. 순찰병을 둘 잃었어. 처리해 주면 창고에서 사슬 갑옷 하나 내주지.\"",
    ],
    done: ["울프가 지도의 동그라미 두 개를 손가락으로 문질러 지운다.", "\"창고 열쇠다. 사슬 갑옷은 맨 안쪽에 있어.\""],
  },
];

export function uniqueQuest(id: string): UniqueQuestDef {
  const q = UNIQUE_QUESTS.find((x) => x.id === id);
  if (!q) throw new Error(`없는 고유 의뢰: ${id}`);
  return q;
}
