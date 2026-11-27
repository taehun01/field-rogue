// 장면-선택지 루프 (1단계). 다음 선택지를 뽑는 규칙은 choices.ts (2단계).
// 선택지 2~3개 → 고르면 장면 하나가 벌어짐 → 다음 선택지. 되돌아가기 없음. 체력 0이면 끝.
// 전투(3단계), 상점·휴식(4단계), 이벤트(5단계)는 선택지 대신 자기 화면을 띄우고, 끝나면 다음 선택지로 돌아온다.
// 던전(6단계)은 안에서 갈림길을 고르며 방을 지나고, 방 안의 전투·이벤트가 끝나면 필드 대신 던전 갈림길로 돌아온다.
// 보스(7단계)는 네 가지 길로 만난다 (core/boss.ts). 보스전이 끝나면 던전 안이었어도 바깥 선택지로 나온다.
// 화면과 분리된 순수 로직이라 테스트와 밸런스 시뮬레이션에서 그대로 돌릴 수 있다.

import {
  BATTLE_TEXT,
  BOSS_TEXT,
  CAMP_TEXT,
  DEATH,
  DECEIVED,
  DUNGEON_TEXT,
  ITEM_NAMES,
  ITEM_TEXT,
  OPENING,
  SHOP_TEXT,
} from "../content/placeholder";
import { battleTurn, startBattle } from "./battle";
import { BOSS_PATHS, BOSS_REWARD_ITEM, OMEN_NEEDED, RUMOR_GAIN, RUMOR_LIMIT, startBoss } from "./boss";
import { rollChoices } from "./choices";
import { EMPTY_ROOM_GOLD, newDungeon, rollReward, rollRoomChoices } from "./dungeon";
import { eventById } from "../data/events";
import { resolveOption } from "./events";
import { CHARM_REVIVE, INVENTORY_SIZE, ITEMS, SHOP_ITEM_IDS, useItem } from "./items";
import { createRng, type Rng } from "./rng";
import type { BattleAction, BossPath, GameState, ItemId, Player, SceneKind } from "./types";

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
  /** 이벤트에서 index 번 고를 거리를 고른다. 조건이 안 되면 아무 일도 없다. */
  answer(index: number): void;
  /** 던전 갈림길 index 번으로 들어간다. */
  enterRoom(index: number): void;
  /** 던전 갈림길 화면에서 밖으로 나간다 (끝 보상 없음). 끝 상자를 연 뒤라면 그냥 나간다. */
  leaveDungeon(): void;
  /** 던전 끝 상자를 연 뒤 더 깊이 들어간다 (보스). */
  goDeeper(): void;
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
    event: null,
    dungeon: null,
    boss: { omens: 0, rumor: 0, met: null },
    choices: [],
    since: {},
    lastHints: [],
    story: [...OPENING],
    dead: false,
  };
  const p = state.player;

  /** 선택지 화면이 아닌 다른 화면(전투·상점·휴식·이벤트) 중인가 */
  const busy = () =>
    state.battle !== null || state.shop !== null || state.camp || state.event !== null || state.dungeon !== null;

  /** 던전 갈림길 화면인가 (방 안에서 일이 벌어지는 중이 아님) */
  const atFork = () => state.dungeon !== null && state.battle === null && state.event === null;

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
    state.event = null;
    state.dungeon = null;
    state.story.push(DEATH);
    state.choices = [];
    return true;
  }

  /** 보스 길이 열려 있나: 켜져 있고, 아직 보스를 만나지 않았다 */
  const open = (path: BossPath) => BOSS_PATHS[path] && state.boss.met === null;

  /** 보스와 마주친다. lines 는 이야기 칸에 덧붙일 만남 문장 */
  function meetBoss(path: BossPath, lines: readonly string[]) {
    state.boss.met = path;
    state.since.battle = 0; // 보스전도 전투라서 다음 화면엔 전투가 안 나온다
    state.battle = startBoss(state.step);
    state.choices = [];
    state.story.push(...lines, BOSS_TEXT.start);
  }

  /** 다음 선택지. 소문이 기준을 넘었으면 선택지 대신 보스가 찾아온다 */
  function nextChoices() {
    if (open("rumor") && state.boss.rumor >= RUMOR_LIMIT) {
      meetBoss("rumor", BOSS_TEXT.rumorMet);
      return;
    }
    state.choices = rollChoices(rng, {
      since: state.since,
      lastHints: state.lastHints,
      omen: open("omen"),
      chance: open("chance"),
    });
  }

  /** 보스전이 끝났다 (이겼거나 달아났다). 던전 안이었어도 밖으로 나와 다음 선택지 */
  function bossDone(won: boolean) {
    if (won) {
      const fits = p.items.length < INVENTORY_SIZE;
      if (fits) p.items.push(BOSS_REWARD_ITEM);
      state.story.push(fits ? `${BOSS_TEXT.won} ${ITEM_NAMES[BOSS_REWARD_ITEM]} +1` : BOSS_TEXT.rewardFull);
    }
    state.dungeon = null;
    state.story.push(BOSS_TEXT.after);
    nextChoices();
  }

  /** 장면(전투·이벤트)이 끝났다. 던전 안이면 방 하나를 지난 것이고, 아니면 다음 선택지 */
  function sceneDone() {
    if (state.dungeon) roomDone();
    else nextChoices();
  }

  /** 던전 방 하나를 지났다. 마지막 방이면 보상을 받고 밖으로, 아니면 다음 갈림길 */
  function roomDone() {
    const d = state.dungeon!;
    d.cleared++;
    if (d.cleared < d.rooms) {
      d.choices = rollRoomChoices(rng);
      state.story.push(DUNGEON_TEXT.next(d.cleared));
      return;
    }
    const { gold, item } = rollReward(rng);
    p.gold += gold;
    const fits = p.items.length < INVENTORY_SIZE;
    if (fits) p.items.push(item);
    state.story.push(DUNGEON_TEXT.treasure, (fits ? DUNGEON_TEXT.reward : DUNGEON_TEXT.rewardFull)(gold, ITEM_NAMES[item]));
    // 던전 길이 열려 있으면 바로 나가지 않고 더 깊이 갈지 묻는다
    if (open("deep")) {
      d.choices = [];
      d.deep = true;
      state.story.push(BOSS_TEXT.deepAsk);
      return;
    }
    state.story.push(DUNGEON_TEXT.out);
    state.dungeon = null;
    nextChoices();
  }

  // 첫 화면도 같은 규칙으로 (징조·우연이 섞일 수 있다)
  nextChoices();

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

      if (choice.boss && open("chance")) {
        state.story = [];
        meetBoss("chance", BOSS_TEXT.chanceMet);
        return;
      }
      // 징조가 다 차면 고른 장면 대신 보스
      const omen = choice.omen !== undefined && open("omen");
      if (omen && ++state.boss.omens >= OMEN_NEEDED) {
        state.story = [];
        meetBoss("omen", BOSS_TEXT.omenMet);
        return;
      }
      if (choice.kind === "battle") state.boss.rumor += RUMOR_GAIN.battle;
      if (choice.kind === "dungeon") state.boss.rumor += RUMOR_GAIN.dungeon;

      switch (choice.kind) {
        case "battle":
          state.battle = startBattle(rng, state.step);
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
        case "event": {
          const ev = eventById(choice.eventId!);
          state.event = { id: ev.id };
          state.story = [...ev.intro];
          break;
        }
        case "dungeon":
          state.dungeon = newDungeon(rng);
          state.story = [...DUNGEON_TEXT.enter];
      }
      if (choice.kind !== choice.hintKind) state.story.unshift(DECEIVED);
      if (omen) state.story.unshift(BOSS_TEXT.omenSeen(state.boss.omens));
    },

    act(action, itemIndex = 0) {
      if (state.dead || !state.battle) return;
      const { lines, outcome } = battleTurn(state.battle, p, action, rng, itemIndex);
      state.story = lines;
      if (checkDeath()) return;
      if (outcome !== "ongoing") {
        const boss = state.battle.boss === true;
        state.battle = null;
        if (boss) bossDone(outcome === "won");
        else sceneDone();
      }
    },

    use(index) {
      // 필드 선택지 화면과 던전 갈림길 화면에서 쓸 수 있다
      if (state.dead || (busy() && !atFork())) return;
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

    answer(index) {
      if (state.dead || !state.event) return;
      const result = resolveOption(eventById(state.event.id), index, p, rng);
      if (!result) return;
      state.event = null;
      state.story = result.lines;
      if (checkDeath()) return;
      if (result.battle) {
        state.boss.rumor += RUMOR_GAIN.battle;
        state.battle = startBattle(rng, state.step);
        state.story.push(BATTLE_TEXT.start(state.battle.enemy.name));
      } else {
        sceneDone();
      }
    },

    enterRoom(index) {
      if (state.dead || !atFork()) return;
      const d = state.dungeon!;
      const room = d.choices[index];
      if (!room) return;
      // 방 하나도 한 걸음으로 친다 (적이 강해지는 기준). 필드 since 는 건드리지 않는다
      state.step++;
      d.choices = [];
      switch (room.kind) {
        case "battle":
          state.boss.rumor += RUMOR_GAIN.battle;
          state.battle = startBattle(rng, state.step);
          state.story = [BATTLE_TEXT.start(state.battle.enemy.name)];
          break;
        case "event": {
          const ev = eventById(room.eventId!);
          state.event = { id: ev.id };
          state.story = [...ev.intro];
          break;
        }
        case "empty": {
          const gold = rng.int(EMPTY_ROOM_GOLD[0], EMPTY_ROOM_GOLD[1]);
          p.gold += gold;
          state.story = [DUNGEON_TEXT.empty(gold)];
          roomDone();
        }
      }
      if (room.kind !== room.hintKind) state.story.unshift(DECEIVED);
    },

    leaveDungeon() {
      if (state.dead || !atFork()) return;
      const end = state.dungeon!.deep === true;
      state.dungeon = null;
      state.story = [end ? DUNGEON_TEXT.out : DUNGEON_TEXT.leave];
      nextChoices();
    },

    goDeeper() {
      if (state.dead || !atFork() || !state.dungeon!.deep) return;
      delete state.dungeon!.deep;
      state.story = [];
      meetBoss("deep", BOSS_TEXT.deepMet);
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

/** 상점 진열: 상점 아이템 5종 중 서로 다른 SHOP_STOCK 개 */
function rollStock(rng: Rng): ItemId[] {
  const pool = [...SHOP_ITEM_IDS];
  const out: ItemId[] = [];
  while (out.length < SHOP_STOCK && pool.length > 0) {
    out.push(pool.splice(rng.int(0, pool.length - 1), 1)[0]);
  }
  return out;
}
