// 밸런스 시뮬레이션용 봇 (F8). 화면 없이 게임 로직만 돌린다.
// "무난하게 하는 플레이어"를 흉내 낸다: 다치면 쉬고, 의뢰를 맡아 그쪽으로 가고, 잡동사니는 팔고, 더 좋은 장비는 낀다.
// 봇의 판단은 일부러 단순하다. 숫자를 맞출 기준선이지 최선의 플레이가 아니다.

import { eventById } from "../data/events";
import { itemDef, type ItemId } from "../data/items";
import { RUNES } from "../data/runes";
import { FLEE_COST, POWER_COST } from "../core/battle";
import { canChoose } from "../core/events";
import { innPrice, type Game } from "../core/game";
import { buyPrice } from "../core/items";
import { distance, neighbors } from "../core/map";
import { loadOf, overloaded } from "../core/player";
import { MAX_QUESTS } from "../core/quests";
import { pendingLevels, sneakChance } from "../core/skills";
import type { Rng } from "../core/rng";
import type { RegionId } from "../core/types";

/** 지금 화면에서 한 번 움직인다 */
export function botStep(g: Game, rng: Rng) {
  const s = g.state;
  const p = s.player;
  const hpRate = p.hp / p.maxHp;

  if (pendingLevels(p) > 0 && !s.battle && !s.event) {
    // 눈요정은 마력, 나머지는 체력·기력을 번갈아
    const stat = p.race === "snowelf" ? (p.level % 2 ? "mp" : "hp") : p.level % 2 ? "hp" : "st";
    g.levelUp(stat);
    return;
  }

  if (s.battle) {
    const b = s.battle;
    if (b.opening) {
      const c = sneakChance(p);
      if (!b.chief && hpRate < 0.5 && c > 0.5) g.act("sneak");
      else if (c >= 0.5) g.act("ambush");
      else g.act("fight");
      return;
    }
    const heal = p.runes.indexOf("heal");
    const fire = p.runes.findIndex((r) => r === "fire" || r === "frost");
    const potion = p.bag.indexOf("potion");
    if (hpRate < 0.4 && heal >= 0 && p.mp >= RUNES.heal.cost) g.act("spell", heal);
    else if (hpRate < 0.3 && potion >= 0) g.act("item", potion);
    else if (hpRate < 0.2 && p.st >= FLEE_COST && !b.chief) g.act("flee");
    else if (fire >= 0 && p.mp >= RUNES[p.runes[fire]].cost + RUNES.heal.cost) g.act("spell", fire);
    else if (p.st >= POWER_COST) g.act("power");
    else g.act("attack");
    return;
  }

  if (!s.event && overloaded(p)) {
    // 가장 싼 잡동사니(무게당 값)부터 버린다. 배달 물건은 버리지 않는다
    const order = p.bag
      .map((id, i) => ({ id, i, v: itemDef(id).price / itemDef(id).weight }))
      .filter((x) => itemDef(x.id).kind !== "quest")
      .sort((a, b) => a.v - b.v);
    if (order.length) g.drop(order[0].i);
    else g.drop(0);
    return;
  }

  if (s.event) {
    const opts = eventById(s.event.id).options;
    const ok = opts.map((_, i) => i).filter((i) => canChoose(opts[i], p));
    // 다쳤으면 마지막(지나가기), 아니면 아무거나
    g.answer(hpRate < 0.35 ? ok[ok.length - 1] : rng.pick(ok));
    return;
  }
  if (s.camp) return g.rest();
  if (s.shop) return shop(g);
  if (s.runeShop) {
    const want = (["fire", "frost"] as const).find((r) => !p.runes.includes(r) && p.gold >= buyPrice(p, RUNES[r].price) + 30);
    if (want) g.learnRune(want);
    else g.leaveRunes();
    return;
  }
  if (s.dungeon) {
    if (hpRate < 0.55) g.leaveDungeon();
    else g.enterRoom(rng.int(0, s.dungeon.choices.length - 1));
    return;
  }
  if (s.travel) {
    const cs = s.choices;
    // 다쳤으면 쉴 곳·상인을 찾고 싸움·던전을 피한다. 멀쩡하면 아무거나 (던전은 넉넉할 때만)
    const safe = cs.findIndex((c) => c.hintKind === "rest" || c.hintKind === "shop");
    const calm = cs.findIndex((c) => c.hintKind !== "battle" && c.hintKind !== "dungeon");
    if (hpRate < 0.4 && p.mp >= RUNES.heal.cost) return g.cast(p.runes.indexOf("heal"));
    if (hpRate < 0.45) return g.choose(safe >= 0 ? safe : calm >= 0 ? calm : 0);
    const pool = cs.map((_, i) => i).filter((i) => cs[i].hintKind !== "dungeon" || hpRate > 0.75);
    return g.choose(rng.pick(pool.length ? pool : [0]));
  }
  town(g, rng);
}

/** 마을: 여관 → 장비 정리 → 상점 → 룬 → 의뢰 → 떠나기. 한 번에 한 가지씩 한다 */
function town(g: Game, rng: Rng) {
  const s = g.state;
  const p = s.player;
  const flags = visit(s);
  if (p.hp < p.maxHp * 0.8 && p.gold >= innPrice(p.level) && !flags.slept) {
    flags.slept = true;
    return g.inn();
  }
  // 더 좋은 장비가 짐에 있으면 낀다
  const better = p.bag.findIndex((id) => {
    const d = itemDef(id);
    if (d.kind === "weapon") return d.atk! > (p.weapon ? itemDef(p.weapon).atk! : 0);
    if (d.kind === "armor") return d.def! > (p.armor ? itemDef(p.armor).def! : 0) && (!d.heavy || p.race !== "wolfblood");
    return false;
  });
  if (better >= 0) return g.equip(better);
  if (!flags.shopped) {
    flags.shopped = true;
    return g.openShop();
  }
  if (!flags.runes && p.gold > 60) {
    flags.runes = true;
    return g.openRunes();
  }
  if (s.quests.length < MAX_QUESTS && s.board.length > 0) {
    // 배달은 가까운 곳, 처치·던전은 아무거나
    const i = s.board.findIndex((q) => q.kind !== "deliver" || distance(s.at, q.region) <= 9);
    if (i >= 0) return g.takeQuest(i);
  }
  g.depart(nextTown(s.at, s, rng));
}

/** 의뢰가 가리키는 곳 쪽으로, 없으면 아무 이웃으로 */
function nextTown(at: RegionId, s: Game["state"], rng: Rng): RegionId {
  const targets: RegionId[] = [];
  for (const q of s.quests) {
    if (q.kind === "deliver") targets.push(q.region);
    else if (q.progress >= (q.kind === "hunt" ? q.count! : 1)) targets.push(q.giver);
    else targets.push(q.region);
  }
  const ns = neighbors(at);
  const goal = targets.find((t) => t !== at);
  if (goal) return ns.reduce((a, b) => (distance(b.to, goal) + b.steps < distance(a.to, goal) + a.steps ? b : a)).to;
  return rng.pick(ns).to;
}

/** 상점: 잡동사니·안 쓰는 장비를 팔고, 물약을 채우고, 살 수 있는 더 좋은 장비를 산다 */
function shop(g: Game) {
  const s = g.state;
  const p = s.player;
  const sellable = p.bag.findIndex((id) => {
    const d = itemDef(id);
    if (d.kind === "junk") return true;
    if (d.kind === "weapon") return d.atk! <= (p.weapon ? itemDef(p.weapon).atk! : 0);
    if (d.kind === "armor") return d.def! <= (p.armor ? itemDef(p.armor).def! : 0);
    return false;
  });
  if (sellable >= 0) return g.sell(sellable);
  const potions = p.bag.filter((x) => x === "potion").length;
  const pot = s.shop!.stock.indexOf("potion");
  if (pot >= 0 && potions < 3 && p.gold >= buyPrice(p, itemDef("potion").price) + 10) return g.buy(pot);
  const gear = s.shop!.stock.findIndex((id: ItemId) => {
    const d = itemDef(id);
    const price = buyPrice(p, d.price);
    if (p.gold < price + 15) return false;
    if (d.kind === "weapon") return d.atk! > (p.weapon ? itemDef(p.weapon).atk! : 0);
    if (d.kind === "armor") {
      const heavyOk = !d.heavy || p.race !== "wolfblood";
      return heavyOk && d.def! > (p.armor ? itemDef(p.armor).def! : 0) && loadOf(p) + d.weight <= p.carry;
    }
    return false;
  });
  if (gear >= 0) return g.buy(gear);
  g.leaveShop();
}

/** 마을에 머무는 동안 한 일 (같은 마을 방문 안에서만 기억) */
const visits = new WeakMap<object, { key: string; slept: boolean; shopped: boolean; runes: boolean }>();
function visit(s: Game["state"]) {
  const key = `${s.at}:${s.questSeq}`; // 마을에 닿을 때마다 게시판이 새로 붙어 questSeq 가 바뀐다
  let v = visits.get(s);
  if (!v || v.key !== key) {
    v = { key, slept: false, shopped: false, runes: false };
    visits.set(s, v);
  }
  return v;
}
