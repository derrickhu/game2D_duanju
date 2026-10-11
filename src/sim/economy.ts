/** 纯数值公式，不改存档。对应策划案 §4。 */
import { BALANCE, BOND_LEVELS, MAX_BOND } from '../data/balance.ts';
import { heroById, heroForShop, type HeroId } from '../data/story.ts';
import { SHOPS, shopById, type ShopId } from '../data/world.ts';
import type { GameSave } from './save.ts';

export function milestoneMultiplier(level: number, milestones: readonly number[]): number {
  let mult = 1;
  for (const m of milestones) if (level >= m) mult *= 2;
  return mult;
}

/** 门店从 level 升到 level + 1 的花费（level = 0 即开店价） */
export function shopUpgradeCost(id: ShopId, level: number): number {
  return shopById(id).baseCost * BALANCE.shopCostGrowth ** level;
}

/** 从 level 连升 count 级的总花费 */
export function shopUpgradeCostN(id: ShopId, level: number, count: number): number {
  const g = BALANCE.shopCostGrowth;
  return shopUpgradeCost(id, level) * (g ** count - 1) / (g - 1);
}

/** 现有钱最多能连升几级 */
export function maxAffordableLevels(id: ShopId, level: number, money: number): number {
  const first = shopUpgradeCost(id, level);
  if (money < first) return 0;
  const g = BALANCE.shopCostGrowth;
  return Math.max(1, Math.floor(Math.log(money * (g - 1) / first + 1) / Math.log(g)));
}

export function bondMultiplier(bondLevel: number): number {
  if (bondLevel <= 0) return 1;
  return BOND_LEVELS[Math.min(bondLevel, MAX_BOND) - 1].incomeMult;
}

export function shopIncome(id: ShopId, level: number, bondLevel: number): number {
  if (level <= 0) return 0;
  return shopById(id).baseIncome * level
    * milestoneMultiplier(level, BALANCE.shopMilestones)
    * bondMultiplier(bondLevel);
}

export function boostMultiplier(save: GameSave, now: number): number {
  return now < save.boostUntil ? BALANCE.liveBoostMultiplier : 1;
}

/** 不含直播加成的每秒收益 */
export function baseIncomePerSec(save: GameSave): number {
  let total = 0;
  for (const shop of SHOPS) {
    const hero = heroForShop(shop.id);
    total += shopIncome(shop.id, save.shops[shop.id] ?? 0, hero ? save.bonds[hero.id] ?? 0 : 0);
  }
  return total;
}

export function incomePerSec(save: GameSave, now: number): number {
  return baseIncomePerSec(save) * boostMultiplier(save, now);
}

export function skillValue(level: number): number {
  return BALANCE.skillBaseValue * level * milestoneMultiplier(level, BALANCE.skillMilestones);
}

export function skillUpgradeCost(level: number): number {
  return BALANCE.skillCostBase * BALANCE.skillCostGrowth ** (level - 1);
}

export function tapValue(save: GameSave, now: number, combo: boolean): number {
  const raw = skillValue(save.skillLevel) + baseIncomePerSec(save) * BALANCE.tapIncomeShare;
  return raw * boostMultiplier(save, now) * (combo ? BALANCE.comboMultiplier : 1);
}

/** 羁绊从 level 升到 level + 1 的花费；不能投资时返回 Infinity */
export function bondUpgradeCost(heroId: HeroId, level: number): number {
  const hero = heroById(heroId);
  if (!hero.shop || level >= MAX_BOND) return Infinity;
  return shopById(hero.shop).baseCost * BOND_LEVELS[level].costFactor;
}