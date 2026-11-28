// 의뢰 (F5). 게시판에 붙고, 받으면 진행하고, 해내면 보상을 받는다.
// - 처치: 지정한 지역의 지정한 적을 N마리 (몰래 지나간 적은 세지 않는다). 해내고 의뢰를 준 마을로 돌아가야 끝난다.
// - 던전: 지정한 지역 던전의 우두머리를 쓰러뜨린다. 해내고 의뢰를 준 마을로 돌아가야 끝난다.
// - 배달: 받을 때 물건이 짐에 들어오고, 목적지 마을에 닿으면 끝난다. 물건을 버리거나 팔면 실패한다.
// 동시에 MAX_QUESTS 개까지, 기한은 없고 언제든 포기할 수 있다. 게시판은 마을에 닿을 때마다 새로 붙는다.
// 마을마다 고유 인물의 한 번짜리 의뢰가 하나씩 게시판에 같이 붙는다 (data/quests.ts). 숫자는 모두 [임시값].

import { QUEST_TEXT } from "../content/text";
import { itemDef } from "../data/items";
import { PARCELS, UNIQUE_QUESTS, uniqueQuest } from "../data/quests";
import { REGIONS, REGION_IDS } from "../data/regions";
import { GEAR_IDS, gearTier } from "./items";
import { distance } from "./map";
import type { Rng } from "./rng";
import type { GameState, Quest, QuestKind, RegionId } from "./types";

export const MAX_QUESTS = 3;
/** [임시값] 게시판의 반복 의뢰 수 */
export const BOARD_SIZE = 3;
/** [임시값] 반복 의뢰 종류 가중치 */
export const QUEST_WEIGHTS: Record<QuestKind, number> = { hunt: 40, deliver: 35, clear: 25 };
/** [임시값] 처치·던전 의뢰가 다른 지역 것일 확률 */
export const AWAY_CHANCE = 0.5;
/** [임시값] 보상 골드: 기본값과, 레벨 1 위로 한 레벨마다 오르는 비율. 반복 의뢰 보상에 장비가 붙을 확률 */
export const QUEST_GOLD = { huntBase: 5, huntPer: 4, away: 10, deliverBase: 5, deliverPerStep: 1.5, clear: 30, perLevel: 0.05 };
export const QUEST_GEAR_CHANCE = 0.25;
/** [임시값] 일지의 지난 일을 몇 개까지 남기나 */
export const JOURNAL_SIZE = 30;

function weightedKind(rng: Rng): QuestKind {
  const kinds = Object.keys(QUEST_WEIGHTS) as QuestKind[];
  let roll = rng.next() * kinds.reduce((s, k) => s + QUEST_WEIGHTS[k], 0);
  return kinds.find((k) => (roll -= QUEST_WEIGHTS[k]) < 0) ?? kinds[kinds.length - 1];
}

/** 처치·던전 의뢰의 대상 지역: 반은 이 마을 지역, 반은 다른 지역 */
function pickRegion(rng: Rng, town: RegionId): RegionId {
  return rng.next() < AWAY_CHANCE ? rng.pick(REGION_IDS.filter((r) => r !== town)) : town;
}

/** 반복 의뢰 하나를 만든다 */
export function rollQuest(rng: Rng, town: RegionId, level: number, id: number): Quest {
  const mult = 1 + QUEST_GOLD.perLevel * Math.max(0, level - 1);
  const kind = weightedKind(rng);
  let quest: Quest;
  if (kind === "hunt") {
    const region = pickRegion(rng, town);
    const enemy = rng.pick(REGIONS[region].enemies);
    // 흔한 적(가중치가 큰 적)은 더 많이 잡아야 한다
    const count = enemy.weight >= 50 ? rng.int(3, 4) : rng.int(2, 3);
    const gold = (QUEST_GOLD.huntBase + QUEST_GOLD.huntPer * count + (region === town ? 0 : QUEST_GOLD.away)) * mult;
    quest = { id, kind, giver: town, region, enemy: enemy.id, count, progress: 0, reward: { gold: Math.round(gold) } };
  } else if (kind === "deliver") {
    const region = rng.pick(REGION_IDS.filter((r) => r !== town));
    const gold = (QUEST_GOLD.deliverBase + QUEST_GOLD.deliverPerStep * distance(town, region)) * mult;
    quest = { id, kind, giver: town, region, item: rng.pick(PARCELS), progress: 0, reward: { gold: Math.round(gold) } };
  } else {
    const region = pickRegion(rng, town);
    const gold = (QUEST_GOLD.clear + (region === town ? 0 : QUEST_GOLD.away)) * mult;
    quest = { id, kind, giver: town, region, progress: 0, reward: { gold: Math.round(gold) } };
  }
  if (rng.next() < QUEST_GEAR_CHANCE) {
    quest.reward.item = rng.pick(GEAR_IDS.filter((g) => itemDef(g).tier! <= gearTier(level)));
  }
  return quest;
}

/** 고유 의뢰 정의 → 의뢰 */
function fromUnique(id: string, qid: number): Quest {
  const u = uniqueQuest(id);
  return {
    id: qid,
    kind: u.kind,
    giver: u.town,
    region: u.region,
    enemy: u.enemy,
    count: u.count,
    progress: 0,
    item: u.item,
    reward: { ...u.reward },
    unique: u.id,
  };
}

/** 마을에 닿았을 때 게시판을 새로 붙인다: 반복 의뢰 BOARD_SIZE 개 + (아직 안 끝냈고 진행 중이 아니면) 그 마을 고유 의뢰 */
export function postBoard(s: GameState, rng: Rng, town: RegionId) {
  s.board = [];
  for (let i = 0; i < BOARD_SIZE; i++) s.board.push(rollQuest(rng, town, s.player.level, s.questSeq++));
  for (const u of UNIQUE_QUESTS) {
    if (u.town !== town || s.uniqueDone.includes(u.id) || s.quests.some((q) => q.unique === u.id)) continue;
    s.board.push(fromUnique(u.id, s.questSeq++));
  }
}

function log(s: GameState, line: string) {
  s.journal.unshift(line);
  s.journal.length = Math.min(s.journal.length, JOURNAL_SIZE);
}

/** 게시판 index 번 의뢰를 받는다. 받을 수 없으면 null, 받으면 이야기 문장 */
export function takeQuest(s: GameState, index: number): string[] | null {
  const q = s.board[index];
  if (!q || s.quests.length >= MAX_QUESTS) return null;
  s.board.splice(index, 1);
  s.quests.push(q);
  if (q.kind === "deliver") s.player.bag.push(q.item!);
  const lines = q.unique ? [...uniqueQuest(q.unique).intro] : [];
  lines.push(QUEST_TEXT.taken(questTitle(q)));
  if (q.kind === "deliver") lines.push(QUEST_TEXT.gotParcel(itemDef(q.item!).name));
  return lines;
}

/** 의뢰를 포기한다. 배달 물건은 짐에서 빠진다. 고유 의뢰면 다음에 그 마을 게시판에 다시 붙는다 */
export function abandonQuest(s: GameState, id: number): string[] | null {
  const i = s.quests.findIndex((q) => q.id === id);
  if (i < 0) return null;
  const [q] = s.quests.splice(i, 1);
  if (q.kind === "deliver") {
    const j = s.player.bag.indexOf(q.item!);
    if (j >= 0) s.player.bag.splice(j, 1);
  }
  log(s, QUEST_TEXT.logAbandoned(questTitle(q)));
  return [QUEST_TEXT.abandoned(questTitle(q))];
}

/** 적을 쓰러뜨렸다 (몰래 지나간 것은 부르지 않는다). 처치 의뢰가 오르면 그 문장 */
export function onKill(s: GameState, enemyId: string, region: RegionId): string[] {
  const lines: string[] = [];
  for (const q of s.quests) {
    if (q.kind !== "hunt" || q.enemy !== enemyId || q.region !== region || q.progress >= q.count!) continue;
    q.progress++;
    lines.push(q.progress >= q.count! ? QUEST_TEXT.huntDone(questTitle(q), REGIONS[q.giver].town) : QUEST_TEXT.huntProgress(q.progress, q.count!));
  }
  return lines;
}

/** 던전 우두머리를 쓰러뜨렸다 */
export function onChief(s: GameState, region: RegionId, chiefName: string): string[] {
  s.tally.chiefs++;
  log(s, QUEST_TEXT.logChief(chiefName, REGIONS[region].dungeon.name));
  const lines: string[] = [];
  for (const q of s.quests) {
    if (q.kind !== "clear" || q.region !== region || q.progress >= 1) continue;
    q.progress = 1;
    lines.push(QUEST_TEXT.clearDone(questTitle(q), REGIONS[q.giver].town));
  }
  return lines;
}

/** 이 의뢰를 지금 마을에서 마칠 수 있나 */
export function completable(s: GameState, q: Quest, town: RegionId): boolean {
  if (q.kind === "deliver") return q.region === town && s.player.bag.includes(q.item!);
  return q.giver === town && q.progress >= (q.kind === "hunt" ? q.count! : 1);
}

/** 마을에 닿으면 마칠 수 있는 의뢰를 모두 마치고 보상을 준다. 보상 문장을 돌려준다 */
export function turnIn(s: GameState, town: RegionId): string[] {
  const lines: string[] = [];
  for (const q of [...s.quests]) {
    if (!completable(s, q, town)) continue;
    s.quests.splice(s.quests.indexOf(q), 1);
    if (q.kind === "deliver") s.player.bag.splice(s.player.bag.indexOf(q.item!), 1);
    if (q.unique) {
      s.uniqueDone.push(q.unique);
      lines.push(...uniqueQuest(q.unique).done);
    }
    s.player.gold += q.reward.gold;
    if (q.reward.item) s.player.bag.push(q.reward.item);
    lines.push(QUEST_TEXT.completed(questTitle(q), q.reward.gold, q.reward.item ? itemDef(q.reward.item).name : null));
    s.tally.questsDone++;
    log(s, QUEST_TEXT.logDone(questTitle(q)));
  }
  return lines;
}

/** 배달 물건을 버리거나 팔아서 짐에 모자라면 그 의뢰는 실패한다 (나중에 받은 것부터) */
export function checkDeliveries(s: GameState): string[] {
  const lines: string[] = [];
  const have = new Map<string, number>();
  for (const id of s.player.bag) have.set(id, (have.get(id) ?? 0) + 1);
  for (const q of [...s.quests]) {
    if (q.kind !== "deliver") continue;
    const n = have.get(q.item!) ?? 0;
    if (n > 0) {
      have.set(q.item!, n - 1);
      continue;
    }
    s.quests.splice(s.quests.indexOf(q), 1);
    log(s, QUEST_TEXT.logFailed(questTitle(q)));
    lines.push(QUEST_TEXT.failed(questTitle(q)));
  }
  return lines;
}

/** 게시판·일지에 보이는 의뢰 한 줄 */
export function questTitle(q: Quest): string {
  if (q.unique) return uniqueQuest(q.unique).title;
  const where = REGIONS[q.region];
  if (q.kind === "hunt") {
    const name = where.enemies.find((e) => e.id === q.enemy)!.name;
    return QUEST_TEXT.hunt(where.name, name, q.count!);
  }
  if (q.kind === "deliver") return QUEST_TEXT.deliver(itemDef(q.item!).name, where.town);
  return QUEST_TEXT.clear(where.name, where.dungeon.name, where.dungeon.chief.name);
}

/** 일지에 보이는 진행 상황 */
export function questProgress(q: Quest): string {
  if (q.kind === "hunt") return q.progress >= q.count! ? QUEST_TEXT.reportTo(REGIONS[q.giver].town) : `${q.progress}/${q.count}`;
  if (q.kind === "clear") return q.progress >= 1 ? QUEST_TEXT.reportTo(REGIONS[q.giver].town) : QUEST_TEXT.notYet;
  return QUEST_TEXT.carryTo(REGIONS[q.region].town);
}
