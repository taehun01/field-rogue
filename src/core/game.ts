// 장면-선택지 루프 (1단계). 다음 선택지를 뽑는 규칙은 choices.ts (2단계).
// 선택지 2~3개 → 고르면 장면 하나가 벌어짐 → 다음 선택지. 되돌아가기 없음. 체력 0이면 끝.
// 전투(3단계), 상점·휴식(4단계)은 선택지 대신 자기 화면을 띄우고, 끝나면 다음 선택지로 돌아온다.
// 화면과 분리된 순수 로직이라 테스트와 밸런스 시뮬레이션에서 그대로 돌릴 수 있다.

import {
  BATTLE_TEXT,
  CAMP_TEXT,
  DEATH,
  DECEIVED,
  ITEM_NAMES,
  ITEM_TEXT,
  OPENING,
  SHOP_TEXT,
} from "../content/placeholder";
import { battleTurn, startBattle } from "./battle";
import { rollChoices } from "./choices";
import { CHARM_REVIVE, INVENTORY_SIZE, ITEM_IDS, ITEMS, useItem } from "./items";
import { createRng, type Rng } from "./rng";
import type { BattleAction, GameState, ItemId, Player, SceneKind } from "./types";

/** [임시값] 시작 능력치 */
export const START_PLAYER: Player = { hp: 20, maxHp: 20, atk: 3, def: 1, gold: 0, items: ["potion"] };

/** [임시값] 상점 진열 수 */
export const SHOP_STOCK = 3;
/** [임시값] 모닥불 회복 비율 (최대 체력 기준) */
export const CAMPFIRE_HEAL = 0.2;
/** [임시값] 여관 가격 (전부 회복) */
export const INN_PRICE = 10;

export type CampOption = "campfire" | "inn";

export interface Game {
  readonly state: GameState;
  /** 선택지 index 를 고른다. 다른 화면 중이거나 죽었거나 범위 밖이면 아무 일도 없다. */
  choose(index: number): void;
  /** 전투 행동을 한다. "item" 이면 itemIndex 번 소지품을 쓴다. 전투 중이 아니면 아무 일도 없다. */
  act(action: BattleAction, itemIndex?: number): void;
  /** 전투 밖에서 소지품 index 번을 쓴다 (회복약, 숫돌). */
  use(index: number): void;
  /** 상점 진열 index 번을 산다. */
  buy(index: number): void;
  /** 상점을 떠난다. */
  leaveShop(): void;
  /** 쉴 곳에서 모닥불 또는 여관을 고른다. */
  rest(option: CampOption): void;
}

export function newGame(seed: number): Game {
  const rng = createRng(seed);
  const state: GameState = {
    seed,
    step: 0,
    player: structuredClone(START_PLAYER),
    battle: null,
    shop: null,
    camp: false,
    choices: [],
    since: {},
    lastHints: [],
    story: [...OPENING],
    dead: false,
  };
  state.choices = rollChoices(rng);
  const p = state.player;

  /** 선택지 화면이 아닌 다른 화면(전투·상점·휴식) 중인가 */
  const busy = () => state.battle !== null || state.shop !== null || state.camp;

  /** 체력이 0 이하면 부활 부적을 쓰거나, 없으면 죽음 처리하고 true */
  function checkDeath(): boolean {
    if (p.hp > 0) return false;
    const charm = p.items.indexOf("charm");
    if (charm >= 0) {
      p.items.splice(charm, 1);
      p.hp = Math.ceil(p.maxHp * CHARM_REVIVE);
      state.story.push(ITEM_TEXT.charm(p.hp));
      return false;
    }
    p.hp = 0;
    state.dead = true;
    state.battle = null;
    state.shop = null;
    state.camp = false;
    state.story.push(DEATH);
    state.choices = [];
    return true;
  }

  function nextChoices() {
    state.choices = rollChoices(rng, { since: state.since, lastHints: state.lastHints });
  }

  return {
    state,
    choose(index) {
      if (state.dead || busy()) return;
      const choice = state.choices[index];
      if (!choice) return;
      state.step++;
      for (const k of Object.keys(state.since) as SceneKind[]) state.since[k]! += 1;
      state.since[choice.kind] = 0;
      state.lastHints = state.choices.map((c) => c.hint);
      state.choices = [];

      switch (choice.kind) {
        case "battle":
          state.battle = startBattle(rng);
          state.story = [BATTLE_TEXT.start(state.battle.enemy.name)];
          break;
        case "shop":
          state.shop = { stock: rollStock(rng) };
          state.story = [SHOP_TEXT.enter];
          break;
        case "rest":
          state.camp = true;
          state.story = [CAMP_TEXT.enter];
          break;
        default:
          state.story = resolve(choice.kind, p, rng);
          if (!checkDeath()) nextChoices();
      }
      if (choice.kind !== choice.hintKind) state.story.unshift(DECEIVED);
    },

    act(action, itemIndex = 0) {
      if (state.dead || !state.battle) return;
      const { lines, outcome } = battleTurn(state.battle, p, action, rng, itemIndex);
      state.story = lines;
      if (checkDeath()) return;
      if (outcome !== "ongoing") {
        state.battle = null;
        nextChoices();
      }
    },

    use(index) {
      if (state.dead || busy()) return;
      const used = useItem(p, index, null);
      if (used) state.story = used.lines;
    },

    buy(index) {
      if (state.dead || !state.shop) return;
      const id = state.shop.stock[index];
      if (!id) return;
      if (p.items.length >= INVENTORY_SIZE) {
        state.story = [SHOP_TEXT.full];
        return;
      }
      if (p.gold < ITEMS[id].price) {
        state.story = [SHOP_TEXT.poor];
        return;
      }
      p.gold -= ITEMS[id].price;
      p.items.push(id);
      state.shop.stock.splice(index, 1);
      state.story = [SHOP_TEXT.bought(ITEM_NAMES[id])];
    },

    leaveShop() {
      if (state.dead || !state.shop) return;
      state.shop = null;
      state.story = [SHOP_TEXT.leave];
      nextChoices();
    },

    rest(option) {
      if (state.dead || !state.camp) return;
      if (option === "inn") {
        if (p.gold < INN_PRICE) {
          state.story = [CAMP_TEXT.poor];
          return;
        }
        const heal = p.maxHp - p.hp;
        p.gold -= INN_PRICE;
        p.hp = p.maxHp;
        state.story = [CAMP_TEXT.inn(heal, INN_PRICE)];
      } else {
        const heal = Math.min(p.maxHp - p.hp, Math.ceil(p.maxHp * CAMPFIRE_HEAL));
        p.hp += heal;
        state.story = [CAMP_TEXT.campfire(heal)];
      }
      state.camp = false;
      nextChoices();
    },
  };
}

/** 상점 진열: 5종 중 서로 다른 SHOP_STOCK 개 */
function rollStock(rng: Rng): ItemId[] {
  const pool = [...ITEM_IDS];
  const out: ItemId[] = [];
  while (out.length < SHOP_STOCK && pool.length > 0) {
    out.push(pool.splice(rng.int(0, pool.length - 1), 1)[0]);
  }
  return out;
}

/**
 * 선택지 화면에서 바로 끝나는 장면을 처리하고 보여줄 문장을 돌려준다. player 를 직접 바꾼다.
 * 전투는 battle.ts, 상점·휴식은 위의 자기 화면. 이벤트(5단계)·던전(6단계)은 아직 자리표시.
 */
function resolve(kind: "event" | "dungeon", p: Player, rng: Rng): string[] {
  switch (kind) {
    case "event": {
      if (rng.next() < 0.5) {
        const gold = rng.int(2, 6);
        p.gold += gold;
        return [`[임시] 길에서 동전 주머니를 주웠다. 골드 +${gold}`];
      }
      const dmg = rng.int(1, 3);
      p.hp -= dmg;
      return [`[임시] 덫을 밟았다. 체력 -${dmg}`];
    }
    case "dungeon":
      return ["[임시] 던전 입구를 발견했다. 아직 들어갈 수 없다."];
  }
}
