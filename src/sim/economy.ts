/** 纯数值公式，不改存档。对应策划案 §4。 */
import { BALANCE, BOND_LEVELS, MAX_BOND, MAX_STAR, STAFF_BALANCE } from '../data/balance.ts';
import { STAFF, staffById, type StaffId } from '../data/staff.ts';
import { heroById, heroForShop, type HeroId } from '../data/story.ts';
import { AREAS, SHOPS, shopById, type AreaId, type ShopId } from '../data/world.ts';
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

export function staffStar(level: number): number {
  if (level <= 0) return 0;
  return Math.min(MAX_STAR, 1 + STAFF_BALANCE.starLevels.filter((l) => level >= l).length);
}

export function staffHireCost(id: StaffId): number {
  const s = staffById(id);
  return shopById(s.shop).baseCost * STAFF_BALANCE.hireCost[s.slot];
}

/** 店员从 level 升到 level + 1 的花费（level = 0 即录用价） */
export function staffUpgradeCost(id: StaffId, level: number): number {
  if (level <= 0) return staffHireCost(id);
  const s = staffById(id);
  return shopById(s.shop).baseCost * STAFF_BALANCE.upgradeCost[s.slot] * STAFF_BALANCE.costGrowth ** (level - 1);
}

export function staffIncome(id: StaffId, level: number): number {
  if (level <= 0) return 0;
  const s = staffById(id);
  return shopById(s.shop).baseIncome * STAFF_BALANCE.income[s.slot] * level * 2 ** (staffStar(level) - 1);
}

export function staffInArea(area: AreaId): StaffId[] {
  const shops = new Set(SHOPS.filter((s) => s.area === area).map((s) => s.id));
  return STAFF.filter((s) => shops.has(s.shop)).map((s) => s.id);
}

/** 团建加成：录满城区 ×2，全员 ★5 再 ×2 */
export function areaStaffMultiplier(save: GameSave, area: AreaId): number {
  const ids = staffInArea(area);
  if (!ids.length || !ids.every((id) => (save.staff[id] ?? 0) > 0)) return 1;
  const maxed = ids.every((id) => staffStar(save.staff[id] ?? 0) >= MAX_STAR);
  return STAFF_BALANCE.areaHiredMult * (maxed ? STAFF_BALANCE.areaMaxStarMult : 1);
}

export function allStaffHired(save: GameSave): boolean {
  return STAFF.every((s) => (save.staff[s.id] ?? 0) > 0);
}

/** 门店在当前存档里的实际收益：含羁绊和团建 */
export function shopIncomeIn(save: GameSave, id: ShopId, level = save.shops[id] ?? 0): number {
  const hero = heroForShop(id);
  return shopIncome(id, level, hero ? save.bonds[hero.id] ?? 0 : 0) * areaStaffMultiplier(save, shopById(id).area);
}

export function staffIncomePerSec(save: GameSave): number {
  let total = 0;
  for (const s of STAFF) total += staffIncome(s.id, save.staff[s.id] ?? 0);
  return total;
}

/** 不含直播加成的每秒收益 */
export function baseIncomePerSec(save: GameSave): number {
  let total = 0;
  for (const area of AREAS) {
    const mult = areaStaffMultiplier(save, area.id);
    for (const shop of SHOPS) {
      if (shop.area !== area.id) continue;
      const hero = heroForShop(shop.id);
      total += shopIncome(shop.id, save.shops[shop.id] ?? 0, hero ? save.bonds[hero.id] ?? 0 : 0) * mult;
    }
  }
  return total + staffIncomePerSec(save);
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
  const staffMult = allStaffHired(save) ? STAFF_BALANCE.allHiredTapMult : 1;
  return raw * staffMult * boostMultiplier(save, now) * (combo ? BALANCE.comboMultiplier : 1);
}

/** 羁绊从 level 升到 level + 1 的花费；不能投资时返回 Infinity */
export function bondUpgradeCost(heroId: HeroId, level: number): number {
  const hero = heroById(heroId);
  if (!hero.shop || level >= MAX_BOND) return Infinity;
  return shopById(hero.shop).baseCost * BOND_LEVELS[level].costFactor;
}