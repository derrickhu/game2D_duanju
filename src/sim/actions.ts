/** 改存档的玩家操作。全部同步、纯数据，UI 层负责发事件和存盘。 */
import { BALANCE, MAX_BOND } from '../data/balance.ts';
import type { StaffId } from '../data/staff.ts';
import { CHAPTERS, heroForShop, type HeroId } from '../data/story.ts';
import type { ShopId } from '../data/world.ts';
import {
  bondUpgradeCost, incomePerSec, baseIncomePerSec, maxAffordableLevels,
  shopUpgradeCostN, skillUpgradeCost, staffStar, staffUpgradeCost, tapValue,
} from './economy.ts';
import type { GameSave } from './save.ts';
import { bondBlockReason, currentChapter, isShopUnlocked, isStaffAvailable } from './unlocks.ts';

export function earn(save: GameSave, amount: number): void {
  if (!(amount > 0)) return;
  save.money += amount;
  save.netWorth += amount;
}

export function tap(save: GameSave, now: number, combo: boolean): number {
  const amount = tapValue(save, now, combo);
  earn(save, amount);
  save.taps += 1;
  return amount;
}

export function tick(save: GameSave, dtSec: number, now: number): number {
  const amount = incomePerSec(save, now) * dtSec;
  earn(save, amount);
  save.lastActiveAt = now;
  return amount;
}

export interface BuyShopResult {
  levels: number;
  cost: number;
  /** 第一次开店时遇到的男主 */
  metHero: HeroId | null;
}

/** count = 'max' 时买到钱不够为止 */
export function buyShop(save: GameSave, id: ShopId, count: number | 'max'): BuyShopResult | null {
  if (!isShopUnlocked(save, id)) return null;
  const level = save.shops[id] ?? 0;
  const n = count === 'max' ? maxAffordableLevels(id, level, save.money) : count;
  if (n <= 0) return null;
  const cost = shopUpgradeCostN(id, level, n);
  if (cost > save.money) return null;
  save.money -= cost;
  save.shops[id] = level + n;

  let metHero: HeroId | null = null;
  const hero = heroForShop(id);
  if (level === 0 && hero && !(save.bonds[hero.id] ?? 0)) {
    save.bonds[hero.id] = 1;
    metHero = hero.id;
  }
  return { levels: n, cost, metHero };
}

export interface StaffUpgradeResult {
  level: number;
  cost: number;
  hired: boolean;
  /** 这次升级跨过的新星级；没升星为 0 */
  newStar: number;
}

/** 录用（level 0 → 1）或升一级 */
export function upgradeStaff(save: GameSave, id: StaffId): StaffUpgradeResult | null {
  if (!isStaffAvailable(save, id)) return null;
  const level = save.staff[id] ?? 0;
  const cost = staffUpgradeCost(id, level);
  if (save.money < cost) return null;
  save.money -= cost;
  save.staff[id] = level + 1;
  const before = staffStar(level);
  const after = staffStar(level + 1);
  return { level: level + 1, cost, hired: level === 0, newStar: level > 0 && after > before ? after : 0 };
}

export function upgradeSkill(save: GameSave): boolean {
  const cost = skillUpgradeCost(save.skillLevel);
  if (save.money < cost) return false;
  save.money -= cost;
  save.skillLevel += 1;
  return true;
}

export function investBond(save: GameSave, heroId: HeroId): boolean {
  if (bondBlockReason(save, heroId)) return false;
  const level = save.bonds[heroId] ?? 0;
  const cost = bondUpgradeCost(heroId, level);
  if (save.money < cost) return false;
  save.money -= cost;
  save.bonds[heroId] = Math.min(MAX_BOND, level + 1);
  return true;
}

export function offlineCapSec(save: GameSave): number {
  const chapter = currentChapter(save.netWorth);
  return Math.min(
    BALANCE.offlineCapSecMax,
    BALANCE.offlineCapSecBase + chapter * BALANCE.offlineCapSecPerChapter,
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
  return { seconds, amount: baseIncomePerSec(save) * seconds * BALANCE.offlineRate };
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
  return Math.max(BALANCE.rushOrderMin, baseIncomePerSec(save) * BALANCE.rushOrderIncomeSec);
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

export function markWatched(save: GameSave, videoId: string): boolean {
  if (save.watched.includes(videoId)) return false;
  save.watched.push(videoId);
  return true;
}

export function unlockByAd(save: GameSave, videoId: string): void {
  if (!save.adUnlocked.includes(videoId)) save.adUnlocked.push(videoId);
}

/** 本章所有视频都看过了 */
export function isChapterCleared(save: GameSave, chapterId: number): boolean {
  const ch = CHAPTERS.find((c) => c.id === chapterId);
  return !!ch && ch.videos.every((v) => save.watched.includes(v));
}
