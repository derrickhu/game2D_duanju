/** 改存档的玩家操作。全部同步、纯数据，UI 层负责发事件和存盘。 */
import { BALANCE, MAX_BOND, STAFF_BALANCE } from '../data/balance.ts';
import { CHAT_THREADS, MOMENT_POSTS } from '../data/phoneMessages.ts';
import type { StaffId } from '../data/staff.ts';
import { CHAPTERS, HEROES, heroForShop, type HeroId } from '../data/story.ts';
import { CHAPTER_CLIMAXES, type StreetEventDef } from '../data/streetEvents.ts';
import type { ShopId } from '../data/world.ts';
import {
  baseIncomePerSec, bondRoseCost, bondUpgradeCost, computeSynergies,
  incomePerSec, isFeverActive, resolveShopBuyCount, resolveSkillBuyCount,
  resolveStaffBuyCount, shopUpgradeCostIn, skillUpgradeCostN,
  staffStar, staffUpgradeCostN, tapValue,
} from './economy.ts';
import type { BuyMode, GameSave } from './save.ts';
import {
  bondBlockReason, canPrestigeSeason, currentChapter,
  isChatUnlocked, isShopUnlocked, isStaffAvailable,
} from './unlocks.ts';

export function earn(save: GameSave, amount: number): void {
  if (!(amount > 0)) return;
  save.money += amount;
  save.netWorth += amount;
}

export function addRoses(save: GameSave, count: number): void {
  if (!(count > 0)) return;
  save.roses = Math.floor(save.roses + count);
}

/** 基础确定性点击（供数值测试与模拟调用） */
export function tap(save: GameSave, now: number, combo: boolean): number {
  const amount = tapValue(save, now, combo);
  earn(save, amount);
  save.taps += 1;
  return amount;
}

export interface InteractiveTapResult {
  amount: number;
  crit: boolean;
  feverTriggered: boolean;
}

/** 主界面交互点击：支持陆屿暴击与爆单 Fever 蓄力 */
export function tapInteractive(save: GameSave, now: number, combo: boolean, rand = Math.random()): InteractiveTapResult {
  const syn = computeSynergies(save);
  const crit = syn.critChance > 0 && rand < syn.critChance;
  const base = tapValue(save, now, combo);
  const amount = crit ? base * 3 : base;
  earn(save, amount);
  save.taps += 1;

  let feverTriggered = false;
  if (!isFeverActive(save, now)) {
    save.feverHeat = Math.min(1, (save.feverHeat ?? 0) + BALANCE.feverPerTap);
    if (save.feverHeat >= 1 - 1e-9) {
      save.feverHeat = 0;
      save.feverUntil = now + BALANCE.feverDurationSec * 1000;
      feverTriggered = true;
    }
  }
  return { amount, crit, feverTriggered };
}

/** 接待一位前景吧台顾客气泡：高倍率出单 + 大幅积攒爆单热度 */
export function serveCustomerOrder(save: GameSave, now: number): { amount: number; feverTriggered: boolean } {
  const amount = tapValue(save, now, false) * BALANCE.orderTapMult + baseIncomePerSec(save) * BALANCE.orderIncomeSec;
  earn(save, amount);
  save.taps += 1;

  let feverTriggered = false;
  if (!isFeverActive(save, now)) {
    save.feverHeat = Math.min(1, (save.feverHeat ?? 0) + BALANCE.feverPerOrder);
    if (save.feverHeat >= 1 - 1e-9) {
      save.feverHeat = 0;
      save.feverUntil = now + BALANCE.feverDurationSec * 1000;
      feverTriggered = true;
    }
  }
  return { amount, feverTriggered };
}

export function tick(save: GameSave, dtSec: number, now: number): number {
  const syn = computeSynergies(save);
  const autoTapIncome = syn.autoTapPerSec > 0 ? syn.autoTapPerSec * tapValue(save, now, false) * dtSec : 0;
  const amount = incomePerSec(save, now) * dtSec + autoTapIncome;
  earn(save, amount);
  save.lastActiveAt = now;
  return amount;
}

export interface BuyShopResult {
  levels: number;
  cost: number;
  /** 第一次开店时遇到的男主 */
  metHero: HeroId | null;
  /** 本次升级跨过里程碑获得的心动玫瑰 */
  rosesGained: number;
  /** 跨过的最高里程碑等级（用于 UI 特效提示） */
  milestoneReached: number;
}

/** count 支持具体数字、'max' 或 BuyMode（'1' | '10' | 'next'） */
export function buyShop(save: GameSave, id: ShopId, count: number | 'max' | BuyMode): BuyShopResult | null {
  if (!isShopUnlocked(save, id)) return null;
  const level = save.shops[id] ?? 0;
  const n = resolveShopBuyCount(save, id, count);
  if (n <= 0) return null;
  const cost = shopUpgradeCostIn(save, id, level, n);
  if (cost > save.money) return null;
  save.money -= cost;
  const after = level + n;
  save.shops[id] = after;

  let rosesGained = 0;
  let milestoneReached = 0;
  BALANCE.shopMilestones.forEach((m, idx) => {
    if (level < m && after >= m) {
      rosesGained += BALANCE.milestoneRoses[idx] ?? 2;
      milestoneReached = m;
    }
  });
  if (rosesGained > 0) addRoses(save, rosesGained);

  let metHero: HeroId | null = null;
  const hero = heroForShop(id);
  if (level === 0 && hero && !(save.bonds[hero.id] ?? 0)) {
    save.bonds[hero.id] = 1;
    metHero = hero.id;
  }
  return { levels: n, cost, metHero, rosesGained, milestoneReached };
}

export interface StaffUpgradeResult {
  level: number;
  levelsAdded: number;
  cost: number;
  hired: boolean;
  /** 这次升级跨过的新星级；没升星为 0 */
  newStar: number;
  rosesGained: number;
}

/** 录用（level 0 → 1）或按档位连升多级 */
export function upgradeStaff(save: GameSave, id: StaffId, mode: number | BuyMode = 1): StaffUpgradeResult | null {
  if (!isStaffAvailable(save, id)) return null;
  const level = save.staff[id] ?? 0;
  const count = resolveStaffBuyCount(save, id, mode);
  if (count <= 0) return null;
  const cost = staffUpgradeCostN(id, level, count);
  if (save.money < cost) return null;
  save.money -= cost;
  const nextLv = level + count;
  save.staff[id] = nextLv;
  const before = staffStar(level);
  const after = staffStar(nextLv);
  const hired = level === 0;
  const newStar = level > 0 && after > before ? after : 0;
  let rosesGained = 0;
  if (hired) rosesGained += STAFF_BALANCE.hireRoses;
  if (newStar > 0) rosesGained += (after - before) * STAFF_BALANCE.starUpRoses;
  if (rosesGained > 0) addRoses(save, rosesGained);
  return { level: nextLv, levelsAdded: count, cost, hired, newStar, rosesGained };
}

export function upgradeSkill(save: GameSave, mode: number | BuyMode = 1): boolean {
  const count = resolveSkillBuyCount(save, mode);
  if (count <= 0) return false;
  const cost = skillUpgradeCostN(save.skillLevel, count);
  if (save.money < cost) return false;
  save.money -= cost;
  save.skillLevel += count;
  return true;
}

/** 优先消耗心动玫瑰提升羁绊；玫瑰不足时可用现金直购礼盒 */
export function investBond(save: GameSave, heroId: HeroId): boolean {
  if (bondBlockReason(save, heroId)) return false;
  const level = save.bonds[heroId] ?? 0;
  const roseNeed = bondRoseCost(heroId, level);
  if (save.roses >= roseNeed) {
    save.roses -= roseNeed;
    save.bonds[heroId] = Math.min(MAX_BOND, level + 1);
    return true;
  }
  const cashCost = bondUpgradeCost(heroId, level);
  if (save.money < cashCost) return false;
  save.money -= cashCost;
  save.bonds[heroId] = Math.min(MAX_BOND, level + 1);
  return true;
}

export function offlineCapSec(save: GameSave): number {
  const chapter = currentChapter(save.netWorth);
  const syn = computeSynergies(save);
  return Math.min(
    BALANCE.offlineCapSecMax,
    BALANCE.offlineCapSecBase + chapter * BALANCE.offlineCapSecPerChapter + syn.offlineExtraSec,
  );
}

export interface OfflineResult {
  seconds: number;
  amount: number;
}

/** 只算不发：UI 弹窗确认（或看广告翻倍）后再调 earn */
export function computeOffline(save: GameSave, now: number): OfflineResult {
  const elapsed = Math.max(0, (now - save.lastActiveAt) / 1000);
  const seconds = Math.min(elapsed, offlineCapSec(save));
  const syn = computeSynergies(save);
  return { seconds, amount: baseIncomePerSec(save) * seconds * syn.offlineRate };
}

function dayKey(now: number): string {
  const d = new Date(now);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function rushOrderCooldownLeft(save: GameSave, now: number): number {
  return Math.max(0, save.rushOrder.lastAt + BALANCE.rushOrderCooldownSec * 1000 - now) / 1000;
}

export function rushOrdersLeftToday(save: GameSave, now: number): number {
  const used = save.rushOrder.day === dayKey(now) ? save.rushOrder.count : 0;
  return Math.max(0, BALANCE.rushOrderDailyCap - used);
}

export function rushOrderReward(save: GameSave): number {
  const syn = computeSynergies(save);
  return Math.max(BALANCE.rushOrderMin, baseIncomePerSec(save) * BALANCE.rushOrderIncomeSec) * syn.rushMult;
}

/** 激励广告看完后调用 */
export function claimRushOrder(save: GameSave, now: number): number {
  const day = dayKey(now);
  if (save.rushOrder.day !== day) save.rushOrder = { day, count: 0, lastAt: 0 };
  const amount = rushOrderReward(save);
  earn(save, amount);
  save.rushOrder.count += 1;
  save.rushOrder.lastAt = now;
  return amount;
}

/** 激励广告看完后调用：直播带货 ×2，可叠加时长 */
export function startLiveBoost(save: GameSave, now: number): void {
  const from = Math.max(now, save.boostUntil);
  const until = from + BALANCE.liveBoostSec * 1000;
  save.boostUntil = Math.min(until, now + BALANCE.liveBoostMaxSec * 1000);
  save.liveBoosts += 1;
}

/** 处理随机街头奇遇选项 */
export function resolveStreetEvent(
  save: GameSave,
  event: StreetEventDef,
  optionIdx: 0 | 1,
  now: number,
): { cash: number; roses: number; feverTriggered: boolean } {
  const opt = event.options[optionIdx];
  const syn = computeSynergies(save);
  const cash = Math.max(opt.minCash, baseIncomePerSec(save) * opt.cashSec) * syn.rushMult;
  earn(save, cash);
  addRoses(save, opt.roses);

  let feverTriggered = false;
  if (!isFeverActive(save, now)) {
    save.feverHeat = Math.min(1, (save.feverHeat ?? 0) + opt.feverAdd);
    if (save.feverHeat >= 1 - 1e-9) {
      save.feverHeat = 0;
      save.feverUntil = now + BALANCE.feverDurationSec * 1000;
      feverTriggered = true;
    }
  }
  return { cash, roses: opt.roses, feverTriggered };
}

/** 通关章节商战对决，发放宿敌打脸玫瑰奖励 */
export function clearChapterBattle(save: GameSave, chapterId: number): number {
  if (save.clearedBattles.includes(chapterId)) return 0;
  const ch = CHAPTERS.find((c) => c.id === chapterId);
  if (!ch || save.netWorth < ch.unlockNetWorth) return 0;
  save.clearedBattles.push(chapterId);
  const roses = ch.rival?.roseReward ?? 0;
  addRoses(save, roses);
  return roses;
}

/** 领取章节高潮互动抉择奖励 */
export function claimChapterClimax(save: GameSave, chapterId: number, choice: 'A' | 'B'): number {
  if (save.claimedClimaxes.includes(chapterId)) return 0;
  const def = CHAPTER_CLIMAXES.get(chapterId);
  if (!def) return 0;
  save.claimedClimaxes.push(chapterId);
  const roses = choice === 'A' ? def.choiceA.roses : def.choiceB.roses;
  addRoses(save, roses);
  return roses;
}

/** 回复男主微聊消息，获得心动玫瑰 */
export function replyChat(save: GameSave, threadId: string, optionIdx: 0 | 1): number {
  if (save.repliedChats[threadId] !== undefined) return 0;
  const chat = CHAT_THREADS.find((c) => c.id === threadId);
  if (!chat || !isChatUnlocked(save, chat)) return 0;
  save.repliedChats[threadId] = optionIdx;
  const roses = chat.replies[optionIdx].roses;
  addRoses(save, roses);
  return roses;
}

/** 点赞朋友圈动态，奖励 1 朵玫瑰 */
export function likeMoment(save: GameSave, postId: string): number {
  if (save.likedMoments.includes(postId)) return 0;
  const post = MOMENT_POSTS.find((p) => p.id === postId);
  if (!post) return 0;
  save.likedMoments.push(postId);
  addRoses(save, 1);
  return 1;
}

/** 开启新商业赛季（二周目扩城转生）：保留男主羁绊、玫瑰、衣橱收藏记录与图鉴，换取永久名望倍率 */
export function prestigeSeason(save: GameSave, now: number): boolean {
  if (!canPrestigeSeason(save)) return false;
  save.season = (save.season ?? 1) + 1;
  save.money = 0;
  save.netWorth = 0;
  save.skillLevel = 1;
  save.shops = {};
  save.staff = {};
  save.questIndex = 0;
  save.feverHeat = 0;
  save.feverUntil = 0;
  save.clearedBattles = [];
  save.claimedClimaxes = [];
  save.lastActiveAt = now;
  addRoses(save, 15);
  return true;
}

export function markWatched(save: GameSave, videoId: string): boolean {
  if (save.watched.includes(videoId)) return false;
  save.watched.push(videoId);
  return true;
}

export function unlockByAd(save: GameSave, videoId: string): void {
  if (!save.adUnlocked.includes(videoId)) save.adUnlocked.push(videoId);
}

/** 开发用：现金和身价一起涨，大约变成现在的 10 倍，至少加 1 万，并附赠 10 朵玫瑰 */
export function gmAddMoney(save: GameSave): number {
  const amount = Math.max(1e4, save.netWorth * 9);
  earn(save, amount);
  addRoses(save, 10);
  return amount;
}

/** 开发用：身价拉到终章，门店男主羁绊拉满，广告视频直接可看。 */
export function gmUnlockAllVideos(save: GameSave): void {
  const target = CHAPTERS[CHAPTERS.length - 1].unlockNetWorth;
  if (save.netWorth < target) save.netWorth = target;
  save.roses = Math.max(save.roses, 200);
  for (const hero of HEROES) {
    if (hero.shop) save.bonds[hero.id] = Math.max(save.bonds[hero.id] ?? 0, MAX_BOND);
    if (!save.adUnlocked.includes(hero.extraVideo)) save.adUnlocked.push(hero.extraVideo);
  }
}

/** 本章所有视频都看过了 */
export function isChapterCleared(save: GameSave, chapterId: number): boolean {
  const ch = CHAPTERS.find((c) => c.id === chapterId);
  return !!ch && ch.videos.every((v) => save.watched.includes(v));
}
