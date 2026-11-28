// 게임 루프. 마을 ↔ 지도 ↔ 길 (F1).
// - 마을: 여관(전부 회복), 상점, 지도(이웃 지역으로 길을 떠남)
// - 길: 걸음마다 선택지 2~3개 → 고르면 장면 하나(전투·이벤트·모닥불·떠돌이 상인·던전 입구) → 다음 선택지.
//   걸음을 다 채우면 도착해 마을이 된다. 선택지 화면에서 되돌아갈 수 있다 (core/map.ts).
//   다음 선택지를 뽑는 규칙은 choices.ts.
// - 던전: 갈림길을 고르며 방을 지나고, 방을 다 지나면 우두머리. 이기면 보물을 받고 길로 나온다 (dungeon.ts).
// - 캐릭터 (F2): 종족을 고르고 시작한다. 무기·갑옷 칸, 짐은 무게로 센다. 무게를 넘으면 걷지 못한다 (player.ts).
// - 세 자원 (F3): 기력(강타·도망), 마력(룬). 쉬면 다 차고, 길에서는 걸음마다 조금 찬다. 룬은 룬새김이에게 새긴다.
// - 기술 성장 (F4): 쓰는 기술이 오르고, 오른 횟수로 레벨이 오른다 (skills.ts). 적은 플레이어 레벨에 맞춰 강해진다.
//   레벨업은 고를 때까지 쌓여 있고(pendingLevels), 화면이 전투·이벤트 밖에서 고르게 한다.
// - 의뢰 (F5): 마을에 닿으면 마칠 수 있는 의뢰를 마치고, 게시판을 새로 붙인다 (quests.ts).
// - 저장 (F6): 마을에 닿을 때와 여관에서 잘 때 hooks.onSave 를 부른다. resumeGame 은 저장된 상태에서
//   새 시드로 다시 시작한다 (불러오면 무작위 결과를 새로 굴린다, save.ts).
// - 오프닝 (F7): 죄수선에서 종족을 고르고 정해진 고분 튜토리얼을 지나 서리항에 닿는다 (data/opening.ts).
//   오프닝 안에서는 죽지 않는다: 쓰러지면 동행이 끌어내고 다음 장면으로 간다.
// 화면과 분리된 순수 로직이라 테스트와 밸런스 시뮬레이션에서 그대로 돌릴 수 있다.

import {
  BAG_TEXT,
  BATTLE_TEXT,
  CAMP_TEXT,
  QUEST_TEXT,
  RUNE_TEXT,
  SKILL_TEXT,
  DEATH,
  DECEIVED,
  DUNGEON_TEXT,
  ITEM_TEXT,
  SHOP_TEXT,
  TOWN_TEXT,
  TRAVEL_TEXT,
} from "../content/text";
import { itemDef } from "../data/items";
import { OPENING_RESCUE, OPENING_START, openingScene } from "../data/opening";
import { RUNE_IDS, RUNES } from "../data/runes";
import { REGIONS } from "../data/regions";
import { eventById } from "../data/events";
import { battleTurn, makeEnemy, startBattle, startBattleWith } from "./battle";
import { rollChoices } from "./choices";
import { EMPTY_ROOM_GOLD, newDungeon, rollReward, rollRoomChoices } from "./dungeon";
import { resolveOption } from "./events";
import { buyPrice, CHARM_REVIVE, gearTier, rollDrops, rollStock, sellPrice, useItem } from "./items";
import { castRune, RUNE_PRACTICE } from "./magic";
import { levelUp, sellRate, speechPractice, train, type LevelStat } from "./skills";
import { equip, newPlayer, overloaded, regen, restoreAll, unequip } from "./player";
import { abandonQuest, checkDeliveries, MAX_QUESTS, onChief, onKill, postBoard, takeQuest, turnIn } from "./quests";
import { regionAt, reverse, roadBetween, START_REGION } from "./map";
import { createRng } from "./rng";
import type { BattleAction, GameState, RaceId, RegionId, RuneId, SceneKind, SkillId } from "./types";
import { RESUME_TEXT } from "../content/text";

/** [임시값] 모닥불 회복 비율 (최대 체력 기준) */
export const CAMPFIRE_HEAL = 0.2;
/** [임시값] 여관 가격 (전부 회복): 기본값에 레벨 1 위로 한 레벨마다 더한다 (F8: 골드가 너무 남아서) */
export const INN_PRICE = { base: 10, perLevel: 3 };

export function innPrice(level: number): number {
  return INN_PRICE.base + INN_PRICE.perLevel * Math.max(0, level - 1);
}
/** [임시값] 길에서 한 걸음(던전 방 하나)마다 차는 기력·마력. 마력 1 이면 눈요정이 던전 끝에서 마력이 말라 쓰러졌다 (F8) */
export const STEP_REGEN = { st: 2, mp: 2 };

export interface Game {
  readonly state: GameState;
  // ── 레벨업 (F4) ──
  /** 쌓인 레벨업 하나를 써서 체력·기력·마력 중 하나를 키운다. 전투·이벤트 중에는 안 된다. */
  levelUp(stat: LevelStat): void;
  // ── 오프닝 (F7) ──
  /** 오프닝 장면의 index 번 고를 거리를 고른다. 싸움 중이거나 오프닝이 아니면 아무 일도 없다. */
  openingChoose(index: number): void;
  /** 개발용 바로 시작: 오프닝을 건너뛰고 서리항에 닿는다. 종족을 아직 안 골랐으면 북방인. */
  skipOpening(): void;
  // ── 짐 (전투·이벤트 중이 아니면 어디서나) ──
  /** 짐 index 번 장비를 장착한다. 원래 끼던 것은 짐으로. */
  equip(index: number): void;
  /** 장착한 장비를 벗는다. */
  unequip(slot: "weapon" | "armor"): void;
  /** 짐 index 번을 버린다 (사라진다). */
  drop(index: number): void;
  /** 상점에서 짐 index 번을 판다. */
  sell(index: number): void;
  // ── 마을 ──
  /** 여관에서 묵는다 (전부 회복). */
  inn(): void;
  /** 마을 상점에 들어간다. */
  openShop(): void;
  /** 마을 룬새김이에게 간다. */
  openRunes(): void;
  /** 마을 게시판 index 번 의뢰를 맡는다 (최대 MAX_QUESTS 개). */
  takeQuest(index: number): void;
  /** 맡은 의뢰를 포기한다 (전투·이벤트 중이 아니면 어디서나). */
  abandonQuest(id: number): void;
  /** 룬새김이에게 룬을 새긴다. */
  learnRune(id: RuneId): void;
  /** 룬새김이 집을 나선다. */
  leaveRunes(): void;
  /** 이웃한 지역으로 길을 떠난다. 길이 없으면 아무 일도 없다. */
  depart(to: RegionId): void;
  // ── 길 ──
  /** 선택지 index 를 고른다. 다른 화면 중이거나 죽었거나 범위 밖이면 아무 일도 없다. */
  choose(index: number): void;
  /** 길 위 선택지 화면에서 떠난 곳으로 되돌아간다. */
  turnBack(): void;
  /** 쉴 곳에서 모닥불을 피운다. */
  rest(): void;
  // ── 장면 ──
  /** 전투 행동을 한다. "item" 이면 index 번 짐, "spell" 이면 index 번 룬을 쓴다. 전투 중이 아니면 아무 일도 없다. */
  act(action: BattleAction, index?: number): void;
  /** 전투 밖에서 index 번 룬을 쓴다 (치유 룬). */
  cast(index: number): void;
  /** 전투 밖에서 소지품 index 번을 쓴다 (회복약, 숫돌). */
  use(index: number): void;
  /** 상점 진열 index 번을 산다. 무게를 넘어도 살 수 있다 (넘으면 걷지 못한다). */
  buy(index: number): void;
  /** 상점을 떠난다. */
  leaveShop(): void;
  /** 이벤트에서 index 번 고를 거리를 고른다. 조건이 안 되면 아무 일도 없다. */
  answer(index: number): void;
  /** 던전 갈림길 index 번으로 들어간다. */
  enterRoom(index: number): void;
  /** 던전 갈림길 화면에서 밖으로 나간다 (끝 보상 없음). */
  leaveDungeon(): void;
}

/** 게임 밖(화면)에 알리는 일 */
export interface GameHooks {
  /** 자동 저장할 때 (마을에 닿을 때, 여관에서 잘 때). 상태를 그대로 넘긴다 */
  onSave?(state: GameState): void;
}

/**
 * 새 판. race 를 주면 오프닝 없이 그 종족으로 서리항에서 시작하고 (테스트·개발용), null 이면 오프닝부터.
 */
export function newGame(seed: number, race: RaceId | null = "northman", hooks: GameHooks = {}): Game {
  return runGame(initialState(seed, race), seed, hooks, true);
}

/**
 * 저장된 상태에서 이어 한다. 상태는 그대로 되살리고, 무작위는 새 seed 로 굴린다 (docs/game.md 저장).
 * 저장은 마을에서만 하므로 마을 화면에서 다시 시작한다.
 */
export function resumeGame(saved: GameState, seed: number, hooks: GameHooks = {}, afterDeath = false): Game {
  const state = structuredClone(saved);
  state.seed = seed;
  state.dead = false;
  state.story = [...(afterDeath ? RESUME_TEXT.woke : RESUME_TEXT.back)];
  return runGame(state, seed, hooks, false);
}

function initialState(seed: number, race: RaceId | null): GameState {
  return {
    seed,
    opening: race === null ? { scene: OPENING_START } : null,
    step: 0,
    player: newPlayer(race ?? "northman"),
    at: START_REGION,
    travel: null,
    here: START_REGION,
    battle: null,
    shop: null,
    townStock: [],
    camp: false,
    runeShop: false,
    board: [],
    quests: [],
    uniqueDone: [],
    questSeq: 1,
    journal: [],
    tally: { questsDone: 0, chiefs: 0 },
    event: null,
    dungeon: null,
    choices: [],
    since: {},
    lastHints: [],
    story: [],
    dead: false,
  };
}

/** 상태 하나를 붙잡고 게임을 돌린다. fresh 면 첫 화면(만들기 또는 서리항 도착)을 연다 */
function runGame(state: GameState, seed: number, hooks: GameHooks, fresh: boolean): Game {
  const rng = createRng(seed);
  const p = state.player;

  /** 마을 화면도 길 위 선택지 화면도 아닌 다른 화면(만들기·전투·상점·휴식·이벤트·던전) 중인가 */
  const busy = () =>
    state.opening !== null ||
    state.battle !== null ||
    state.shop !== null ||
    state.runeShop ||
    state.camp ||
    state.event !== null ||
    state.dungeon !== null;

  /** 짐을 만질 수 있나: 오프닝·전투·이벤트 중이 아니면 어디서나 */
  const canHandleBag = () => !state.dead && state.opening === null && state.battle === null && state.event === null;

  /** 너무 무거우면 걷지 못한다. 걸으려 할 때 확인하고, 막혔으면 true */
  function blocked(): boolean {
    if (!overloaded(p)) return false;
    state.story = [BAG_TEXT.overloaded];
    return true;
  }

  /** 지금 나올 수 있는 장비 등급 */
  const tier = () => gearTier(p.level);

  /** 기술을 연습시키고, 오른 기술이 있으면 이야기 칸 끝에 붙인다 */
  function practice(skill: SkillId, amount: number) {
    const rose = train(p, skill, amount);
    if (rose.length) state.story.push(rose.join(" "));
  }

  /** 마을에서 아무 화면도 열지 않은 상태인가 */
  const inTown = () => !state.dead && state.travel === null && !busy();

  /** 길 위 선택지 화면인가 */
  const onRoad = () => !state.dead && state.travel !== null && !busy();

  /** 던전 갈림길 화면인가 (방 안에서 일이 벌어지는 중이 아님) */
  const atFork = () => state.dungeon !== null && state.battle === null && state.event === null;

  /** 체력이 0 이하면 부활 부적을 쓰거나, 없으면 죽음 처리하고 true */
  function checkDeath(): boolean {
    if (p.hp > 0) return false;
    const charm = p.bag.indexOf("charm");
    if (charm >= 0) {
      p.bag.splice(charm, 1);
      p.hp = Math.ceil(p.maxHp * CHARM_REVIVE);
      state.story.push(ITEM_TEXT.charm(p.hp));
      return false;
    }
    p.hp = 0;
    state.dead = true;
    state.battle = null;
    state.shop = null;
    state.runeShop = false;
    state.camp = false;
    state.event = null;
    state.dungeon = null;
    state.story.push(DEATH);
    state.choices = [];
    return true;
  }

  /** 마을에 닿았다 (처음 시작, 도착, 되돌아와 도착) */
  function arrive(region: RegionId) {
    state.at = region;
    state.here = region;
    state.travel = null;
    state.choices = [];
    state.townStock = rollStock(rng, true, tier());
    state.story.push(...REGIONS[region].arrive);
    state.story.push(...turnIn(state, region));
    postBoard(state, rng, region);
    hooks.onSave?.(state);
  }

  /** 다음 걸음. 길을 다 걸었으면 도착, 아니면 그 걸음 지역의 선택지 */
  function nextStep() {
    const t = state.travel;
    if (!t) return;
    if (t.walked >= t.total) {
      state.story.push(TRAVEL_TEXT.arriving(REGIONS[t.to].town));
      arrive(t.to);
      return;
    }
    state.here = regionAt(t, t.walked);
    state.choices = rollChoices(rng, { since: state.since, lastHints: state.lastHints, region: state.here });
  }

  /** 장면(전투·이벤트)이 끝났다. 던전 안이면 방 하나를 지난 것이고, 아니면 다음 걸음 */
  function sceneDone() {
    if (state.dungeon) roomDone();
    else nextStep();
  }

  /** 던전 방 하나를 지났다. 방을 다 지났으면 우두머리, 아니면 다음 갈림길 */
  function roomDone() {
    const d = state.dungeon!;
    d.cleared++;
    if (d.cleared < d.rooms) {
      d.choices = rollRoomChoices(rng);
      state.story.push(DUNGEON_TEXT.next(d.cleared));
      return;
    }
    const chief = REGIONS[d.region].dungeon.chief;
    d.choices = [];
    // 우두머리는 몰래 지나갈 수 없지만, 아직 나를 못 봤으니 기습은 할 수 있다
    state.battle = { enemy: makeEnemy(chief, p.level), chief: true, opening: true };
    state.story.push(...chief.intro);
  }

  /** 우두머리전이 끝났다. 이겼으면 궤짝을 열고, 달아났으면 빈손으로 나온다. 어느 쪽이든 길로 돌아간다 */
  function chiefDone(won: boolean) {
    const d = state.dungeon!;
    if (won) {
      const { gold, item } = rollReward(rng, tier());
      const chief = REGIONS[d.region].dungeon.chief;
      p.gold += gold;
      p.bag.push(item);
      state.story.push(
        chief.won,
        DUNGEON_TEXT.treasure,
        DUNGEON_TEXT.reward(gold, itemDef(item).name),
        ...onChief(state, d.region, chief.name),
        DUNGEON_TEXT.out,
      );
    } else {
      state.story.push(DUNGEON_TEXT.fledChief);
    }
    state.dungeon = null;
    nextStep();
  }

  /** 오프닝 장면에 들어선다. prefix 는 앞 장면에서 이어지는 글 */
  function enterScene(id: string, prefix: string[] = []) {
    if (id === "end") {
      state.opening = null;
      state.story = [...prefix];
      arrive(START_REGION);
      return;
    }
    const sc = openingScene(id);
    state.opening = { scene: id };
    state.story = [...prefix, ...sc.lines];
    if (sc.breath) p.st = p.maxSt;
    if (sc.hurt) {
      const loss = Math.min(sc.hurt, p.hp - 1); // 오프닝에서는 쓰러지지 않는다
      p.hp -= loss;
      state.story.push(`체력 -${loss}`);
    }
    if (sc.battle) {
      state.battle = { enemy: makeEnemy(sc.battle.enemy, p.level) };
      if (sc.battle.sneak) state.battle.opening = true;
      if (sc.battle.chief) state.battle.chief = true;
    }
  }

  if (fresh) {
    if (state.opening) enterScene(state.opening.scene);
    else arrive(START_REGION);
  }

  return {
    state,

    levelUp(stat) {
      if (state.dead || state.battle || state.event) return;
      if (!levelUp(p, stat)) return;
      state.story = [SKILL_TEXT.grew({ hp: "체력", st: "기력", mp: "마력" }[stat], p.level)];
    },

    openingChoose(index) {
      if (state.dead || !state.opening || state.battle) return;
      const opt = openingScene(state.opening.scene).options[index];
      if (!opt) return;
      const prefix: string[] = [...(opt.say ?? [])];
      if (opt.race) Object.assign(p, newPlayer(opt.race));
      if (opt.castHeal) {
        const cast = castRune(p, "heal", null);
        prefix.push(...cast.lines);
        if (cast.skill) prefix.push(...train(p, cast.skill, RUNE_PRACTICE));
      }
      enterScene(opt.next, prefix);
    },

    skipOpening() {
      if (!state.opening) return;
      state.battle = null;
      enterScene("end");
    },

    equip(index) {
      if (!canHandleBag()) return;
      const id = p.bag[index];
      if (id && equip(p, index)) state.story = [BAG_TEXT.equipped(itemDef(id).name)];
    },

    unequip(slot) {
      if (!canHandleBag()) return;
      const id = p[slot];
      if (id && unequip(p, slot)) state.story = [BAG_TEXT.unequipped(itemDef(id).name)];
    },

    drop(index) {
      if (!canHandleBag()) return;
      const id = p.bag[index];
      if (!id) return;
      p.bag.splice(index, 1);
      state.story = [BAG_TEXT.dropped(itemDef(id).name), ...checkDeliveries(state)];
    },

    sell(index) {
      if (state.dead || !state.shop) return;
      const id = p.bag[index];
      if (!id) return;
      const gold = sellPrice(id, sellRate(p));
      p.bag.splice(index, 1);
      p.gold += gold;
      state.story = [SHOP_TEXT.sold(itemDef(id).name, gold), ...checkDeliveries(state)];
      practice("speech", speechPractice(gold));
    },

    inn() {
      if (!inTown()) return;
      const name = REGIONS[state.at].inn;
      const price = innPrice(p.level);
      if (p.gold < price) {
        state.story = [TOWN_TEXT.innPoor];
        return;
      }
      p.gold -= price;
      restoreAll(p);
      state.story = [TOWN_TEXT.slept(name, price)];
      hooks.onSave?.(state);
    },

    openShop() {
      if (!inTown()) return;
      state.shop = { stock: state.townStock, town: true };
      state.story = [TOWN_TEXT.shopEnter];
    },

    takeQuest(index) {
      if (!inTown()) return;
      if (state.quests.length >= MAX_QUESTS) {
        state.story = [QUEST_TEXT.full(MAX_QUESTS)];
        return;
      }
      const lines = takeQuest(state, index);
      if (lines) state.story = lines;
    },

    abandonQuest(id) {
      if (!canHandleBag()) return;
      const lines = abandonQuest(state, id);
      if (lines) state.story = lines;
    },

    openRunes() {
      if (!inTown()) return;
      state.runeShop = true;
      state.story = [RUNE_TEXT.shopEnter];
    },

    learnRune(id) {
      if (state.dead || !state.runeShop || p.runes.includes(id) || !RUNE_IDS.includes(id)) return;
      const r = RUNES[id];
      const price = buyPrice(p, r.price);
      if (p.gold < price) {
        state.story = [SHOP_TEXT.poor];
        return;
      }
      p.gold -= price;
      p.runes.push(id);
      state.story = [RUNE_TEXT.learned(r.name)];
      practice("speech", speechPractice(price));
    },

    leaveRunes() {
      if (state.dead || !state.runeShop) return;
      state.runeShop = false;
      state.story = [RUNE_TEXT.leave];
    },

    depart(to) {
      if (!inTown()) return;
      const road = roadBetween(state.at, to);
      if (!road || blocked()) return;
      state.travel = { from: state.at, to, total: road.steps, walked: 0 };
      state.townStock = [];
      state.story = [REGIONS[state.at].depart];
      nextStep();
    },

    choose(index) {
      if (!onRoad()) return;
      const choice = state.choices[index];
      if (!choice || blocked()) return;
      state.step++;
      state.travel!.walked++;
      regen(p, STEP_REGEN.st, STEP_REGEN.mp);
      for (const k of Object.keys(state.since) as SceneKind[]) state.since[k]! += 1;
      state.since[choice.kind] = 0;
      state.lastHints = state.choices.map((c) => c.hint);
      state.choices = [];

      switch (choice.kind) {
        case "battle":
          state.battle = startBattle(rng, state.here, p.level);
          state.story = [BATTLE_TEXT.spot(state.battle.enemy.name)];
          break;
        case "shop":
          state.shop = { stock: rollStock(rng, false, tier()), town: false };
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
        case "dungeon": {
          const dg = REGIONS[state.here].dungeon;
          state.dungeon = newDungeon(rng, state.here);
          state.story = [...dg.enter];
        }
      }
      if (choice.kind !== choice.hintKind) state.story.unshift(DECEIVED);
    },

    turnBack() {
      if (!onRoad() || blocked()) return;
      state.travel = reverse(state.travel!);
      state.story = [TRAVEL_TEXT.turnedBack(REGIONS[state.travel.to].town)];
      nextStep();
    },

    act(action, index = 0) {
      if (state.dead || !state.battle) return;
      const { lines, outcome, train: trained } = battleTurn(state.battle, p, action, rng, index);
      state.story = lines;
      for (const [skill, n] of Object.entries(trained) as [SkillId, number][]) practice(skill, n);
      if (state.opening) {
        // 오프닝 싸움: 지면 동행이 끌어내고, 끝나면(이기든 달아나든) 다음 장면으로
        const next = openingScene(state.opening.scene).battle!.next;
        if (p.hp <= 0) {
          p.hp = Math.max(1, Math.ceil(p.maxHp * 0.3));
          state.battle = null;
          enterScene(next, [...state.story, ...OPENING_RESCUE]);
        } else if (outcome !== "ongoing") {
          state.battle = null;
          enterScene(next, [...state.story]);
        }
        return;
      }
      if (checkDeath()) return;
      if (outcome === "won") {
        const loot = rollDrops(rng, state.battle.enemy.id, tier());
        p.bag.push(...loot);
        if (loot.length) state.story.push(BAG_TEXT.loot(loot.map((id) => itemDef(id).name)));
        const region = state.dungeon ? state.dungeon.region : state.here;
        if (!state.battle.chief) state.story.push(...onKill(state, state.battle.enemy.id, region));
      }
      if (outcome !== "ongoing") {
        const chief = state.battle.chief === true;
        state.battle = null;
        // 몰래 지나갔으면 도망친 것처럼 보상 없이 지나간다 (우두머리는 몰래 지나갈 수 없다)
        if (chief) chiefDone(outcome === "won");
        else sceneDone();
      }
    },

    use(index) {
      // 마을, 길 위 선택지 화면, 던전 갈림길 화면에서 쓸 수 있다
      if (state.dead || state.opening || (busy() && !atFork())) return;
      const used = useItem(p, index, null);
      if (used) state.story = used.lines;
    },

    cast(index) {
      // 물건 쓰기와 같은 곳에서 쓸 수 있다
      if (state.dead || state.opening || (busy() && !atFork())) return;
      const rune = p.runes[index];
      if (!rune) return;
      const cast = castRune(p, rune, null);
      state.story = cast.lines;
      if (cast.skill) practice(cast.skill, RUNE_PRACTICE);
    },

    buy(index) {
      if (state.dead || !state.shop) return;
      const id = state.shop.stock[index];
      if (!id) return;
      const price = buyPrice(p, itemDef(id).price);
      if (p.gold < price) {
        state.story = [SHOP_TEXT.poor];
        return;
      }
      p.gold -= price;
      p.bag.push(id);
      state.shop.stock.splice(index, 1);
      state.story = [SHOP_TEXT.bought(itemDef(id).name)];
      practice("speech", speechPractice(price));
    },

    leaveShop() {
      if (state.dead || !state.shop) return;
      const town = state.shop.town;
      state.shop = null;
      state.story = [town ? TOWN_TEXT.shopLeave : SHOP_TEXT.leave];
      if (!town) nextStep();
    },

    answer(index) {
      if (state.dead || !state.event) return;
      const result = resolveOption(eventById(state.event.id), index, p, rng);
      if (!result) return;
      state.event = null;
      state.story = result.lines;
      if (checkDeath()) return;
      if (result.battle) {
        // 이벤트 끝에 벌어지는 싸움은 이미 마주친 상태라 몰래 지나가거나 기습할 수 없다
        state.battle = result.enemy ? startBattleWith(result.enemy, p.level) : startBattle(rng, state.here, p.level);
        delete state.battle.opening;
        state.story.push(BATTLE_TEXT.start(state.battle.enemy.name));
      } else {
        sceneDone();
      }
    },

    enterRoom(index) {
      if (state.dead || !atFork()) return;
      const d = state.dungeon!;
      const room = d.choices[index];
      if (!room || blocked()) return;
      // 방 하나도 한 걸음으로 친다 (적이 강해지는 기준). 여행 걸음과 필드 since 는 건드리지 않는다
      state.step++;
      regen(p, STEP_REGEN.st, STEP_REGEN.mp);
      d.choices = [];
      switch (room.kind) {
        case "battle":
          state.battle = startBattle(rng, d.region, p.level);
          state.story = [BATTLE_TEXT.spot(state.battle.enemy.name)];
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
      if (state.dead || !atFork() || blocked()) return;
      state.dungeon = null;
      state.story = [DUNGEON_TEXT.leave];
      nextStep();
    },

    rest() {
      if (state.dead || !state.camp) return;
      const heal = Math.min(p.maxHp - p.hp, Math.ceil(p.maxHp * CAMPFIRE_HEAL));
      p.hp += heal;
      regen(p, p.maxSt, p.maxMp);
      state.story = [CAMP_TEXT.campfire(heal)];
      state.camp = false;
      nextStep();
    },
  };
}
