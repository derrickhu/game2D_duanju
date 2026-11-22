/** 纯数值公式与多维商业乘区耦合，不改存档。 */
import { BALANCE, BOND_LEVELS, MAX_BOND, MAX_STAR, STAFF_BALANCE } from '../data/balance.ts';
import { STAFF, staffById, type StaffId } from '../data/staff.ts';
import { heroById, heroForShop, type HeroId } from '../data/story.ts';
import { AREAS, SHOPS, shopById, type AreaId, type ShopDef, type ShopId } from '../data/world.ts';
import type { BuyMode, GameSave } from './save.ts';
import { effectiveBond, unlockedOutfits } from './unlocks.ts';

export interface EmpireSynergies {
  tapMult: number;
  tapShare: number;
  allShopMult: number;
  staffMult: number;
  costDiscount: number;
  rushMult: number;
  offlineRate: number;
  offlineExtraSec: number;
  feverBonus: number;
  areaBonus: number;
  critChance: number;
  autoTapPerSec: number;
  outfitBonus: number;
  fameBonus: number;
  seasonMult: number;
  empireMult: number;
}

function shopSynergyVal(save: GameSave, shop: ShopDef): number {
  const lv = save.shops[shop.id] ?? 0;
  if (lv >= 50) return shop.synergy.lv50;
  if (lv >= 25) return shop.synergy.lv25;
  return 0;
}

/** 汇总门店光环、男主合伙人特权、衣橱加成与跨城赛季名望 */
export function computeSynergies(save: GameSave): EmpireSynergies {
  const syn = new Map<ShopId, number>();
  for (const s of SHOPS) syn.set(s.id, shopSynergyVal(save, s));

  const luyu = save.bonds.luyu ?? 0;
  const jiang = save.bonds.jiangxubai ?? 0;
  const guye = save.bonds.guye ?? 0;
  const shenyan = save.bonds.shenyan ?? 0;
  const qinye = save.bonds.qinye ?? 0;
  const xu = save.bonds.xuzhiheng ?? 0;
  const zhou = save.bonds.zhouyining ?? 0;
  const huo = save.bonds.huotingchen ?? 0;
  const fu = Math.max(0, effectiveBond(save, 'fujingshen') - 1);

  const outfitCount = Math.max(0, unlockedOutfits(save.netWorth).length - 1);
  const outfitBonus = outfitCount * BALANCE.outfitEmpireBonus;
  const fameBonus = fu * 0.05;
  const seasonMult = BALANCE.seasonBaseMult ** Math.max(0, (save.season ?? 1) - 1);

  const tapMult = (1 + (syn.get('stall') ?? 0)) * (allStaffHired(save) ? STAFF_BALANCE.allHiredTapMult : 1);
  const tapShare = BALANCE.tapIncomeShare + (syn.get('gym') ?? 0);
  const allShopMult = 1 + (syn.get('dessert') ?? 0);
  const staffMult = (1 + (syn.get('cafe') ?? 0)) * (1 + guye * 0.18);
  const costDiscount = Math.min(0.45, (syn.get('law') ?? 0) + shenyan * 0.03);
  const rushMult = (1 + (syn.get('garage') ?? 0)) * (1 + qinye * 0.22);
  const offlineRate = Math.min(0.95, BALANCE.offlineRate + (syn.get('clinic') ?? 0) + xu * 0.04);
  const offlineExtraSec = xu * 1800;
  const feverBonus = (syn.get('agency') ?? 0) + zhou * 0.25;
  const areaBonus = syn.get('hotel') ?? 0;
  const critChance = Math.min(0.5, luyu * 0.07);
  const autoTapPerSec = jiang * 0.35;
  const empireMult = (1 + (syn.get('group') ?? 0)) * (1 + huo * 0.12) * (1 + outfitBonus + fameBonus) * seasonMult;

  return {
    tapMult, tapShare, allShopMult, staffMult, costDiscount, rushMult,
    offlineRate, offlineExtraSec, feverBonus, areaBonus, critChance,
    autoTapPerSec, outfitBonus, fameBonus, seasonMult, empireMult,
  };
}

export function milestoneMultiplier(level: number, milestones: readonly number[]): number {
  let mult = 1;
  for (const m of milestones) if (level >= m) mult *= 2;
  return mult;
}

/** 距离下一个里程碑还差几级（level=0 时先升 1 级开业/录用） */
export function levelsToNextMilestone(level: number, milestones: readonly number[]): number {
  if (level <= 0) return 1;
  for (const m of milestones) {
    if (level < m) return m - level;
  }
  const step = 50;
  return Math.ceil((level + 1) / step) * step - level;
}

/** 门店原始单级花费（不含法务折扣） */
export function shopUpgradeCost(id: ShopId, level: number): number {
  return shopById(id).baseCost * BALANCE.shopCostGrowth ** level;
}

/** 从 level 连升 count 级的原始总花费 */
export function shopUpgradeCostN(id: ShopId, level: number, count: number): number {
  if (count <= 0) return 0;
  const g = BALANCE.shopCostGrowth;
  return shopUpgradeCost(id, level) * (g ** count - 1) / (g - 1);
}

/** 计入律所与沈砚法务折扣后的门店升级花费 */
export function shopUpgradeCostIn(save: GameSave, id: ShopId, level: number, count = 1): number {
  const factor = 1 - computeSynergies(save).costDiscount;
  return shopUpgradeCostN(id, level, count) * factor;
}

/** 现有钱最多能连升几级（可选折扣系数） */
export function maxAffordableLevels(id: ShopId, level: number, money: number, discount = 0): number {
  const first = shopUpgradeCost(id, level) * (1 - discount);
  if (money < first) return 0;
  const g = BALANCE.shopCostGrowth;
  return Math.max(1, Math.floor(Math.log(money * (g - 1) / first + 1) / Math.log(g)));
}

export function resolveShopBuyCount(save: GameSave, id: ShopId, mode: BuyMode | number | 'max'): number {
  const level = save.shops[id] ?? 0;
  const discount = computeSynergies(save).costDiscount;
  if (typeof mode === 'number') return mode;
  if (mode === 'max') return Math.max(1, maxAffordableLevels(id, level, save.money, discount));
  if (mode === '10') return level === 0 ? 1 : 10;
  if (mode === 'next') return levelsToNextMilestone(level, BALANCE.shopMilestones);
  return 1;
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

export function isFeverActive(save: GameSave, now: number): boolean {
  return now < (save.feverUntil ?? 0);
}

export function activeBoostMultiplier(save: GameSave, now: number): number {
  const syn = computeSynergies(save);
  let mult = 1;
  if (now < save.boostUntil) mult *= BALANCE.liveBoostMultiplier + syn.feverBonus * 0.5;
  if (isFeverActive(save, now)) mult *= BALANCE.feverBaseMultiplier + syn.feverBonus;
  return mult;
}

export function boostMultiplier(save: GameSave, now: number): number {
  return activeBoostMultiplier(save, now);
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

export function staffUpgradeCostN(id: StaffId, level: number, count: number): number {
  if (count <= 0) return 0;
  let total = 0;
  let cur = level;
  let rem = count;
  if (cur === 0) {
    total += staffHireCost(id);
    cur = 1;
    rem -= 1;
  }
  if (rem > 0) {
    const g = STAFF_BALANCE.costGrowth;
    total += staffUpgradeCost(id, cur) * (g ** rem - 1) / (g - 1);
  }
  return total;
}

export function resolveStaffBuyCount(save: GameSave, id: StaffId, mode: BuyMode | number): number {
  const level = save.staff[id] ?? 0;
  if (typeof mode === 'number') return mode;
  if (level === 0) return 1;
  if (mode === '10') return 10;
  if (mode === 'next') return levelsToNextMilestone(level, STAFF_BALANCE.starLevels);
  return 1;
}

export function staffIncome(id: StaffId, level: number): number {
  if (level <= 0) return 0;
  const s = staffById(id);
  return shopById(s.shop).baseIncome * STAFF_BALANCE.income[s.slot] * level * 2 ** (staffStar(level) - 1);
}

export function staffIncomeIn(save: GameSave, id: StaffId, level = save.staff[id] ?? 0): number {
  const syn = computeSynergies(save);
  return staffIncome(id, level) * syn.staffMult * syn.empireMult;
}

export function staffInArea(area: AreaId): StaffId[] {
  const shops = new Set(SHOPS.filter((s) => s.area === area).map((s) => s.id));
  return STAFF.filter((s) => shops.has(s.shop)).map((s) => s.id);
}

/** 团建加成：录满城区 ×2，全员 ★5 再 ×2，受云顶酒店光环进一步放大 */
export function areaStaffMultiplier(save: GameSave, area: AreaId): number {
  const ids = staffInArea(area);
  if (!ids.length || !ids.every((id) => (save.staff[id] ?? 0) > 0)) return 1;
  const maxed = ids.every((id) => staffStar(save.staff[id] ?? 0) >= MAX_STAR);
  const hotelLv = save.shops.hotel ?? 0;
  const hotelBonus = hotelLv >= 50 ? shopById('hotel').synergy.lv50 : hotelLv >= 25 ? shopById('hotel').synergy.lv25 : 0;
  const base = STAFF_BALANCE.areaHiredMult * (maxed ? STAFF_BALANCE.areaMaxStarMult : 1);
  return base * (1 + hotelBonus);
}

export function allStaffHired(save: GameSave): boolean {
  return STAFF.every((s) => (save.staff[s.id] ?? 0) > 0);
}

/** 门店在当前存档里的实际每秒收益：含羁绊、团建、甜品店光环与帝国总乘区 */
export function shopIncomeIn(save: GameSave, id: ShopId, level = save.shops[id] ?? 0): number {
  const syn = computeSynergies(save);
  const hero = heroForShop(id);
  const raw = shopIncome(id, level, hero ? save.bonds[hero.id] ?? 0 : 0);
  return raw * areaStaffMultiplier(save, shopById(id).area) * syn.allShopMult * syn.empireMult;
}

export function staffIncomePerSec(save: GameSave): number {
  const syn = computeSynergies(save);
  let total = 0;
  for (const s of STAFF) total += staffIncome(s.id, save.staff[s.id] ?? 0);
  return total * syn.staffMult * syn.empireMult;
}

/** 不含直播与爆单临时加成的每秒收益 */
export function baseIncomePerSec(save: GameSave): number {
  const syn = computeSynergies(save);
  let shopsTotal = 0;
  for (const area of AREAS) {
    const mult = areaStaffMultiplier(save, area.id);
    for (const shop of SHOPS) {
      if (shop.area !== area.id) continue;
      const hero = heroForShop(shop.id);
      shopsTotal += shopIncome(shop.id, save.shops[shop.id] ?? 0, hero ? save.bonds[hero.id] ?? 0 : 0) * mult;
    }
  }
  const combinedShops = shopsTotal * syn.allShopMult * syn.empireMult;
  return combinedShops + staffIncomePerSec(save);
}

export function incomePerSec(save: GameSave, now: number): number {
  return baseIncomePerSec(save) * activeBoostMultiplier(save, now);
}

export function skillValue(level: number): number {
  return BALANCE.skillBaseValue * level * milestoneMultiplier(level, BALANCE.skillMilestones);
}

export function skillUpgradeCost(level: number): number {
  return BALANCE.skillCostBase * BALANCE.skillCostGrowth ** (level - 1);
}

export function skillUpgradeCostN(level: number, count: number): number {
  if (count <= 0) return 0;
  const g = BALANCE.skillCostGrowth;
  return skillUpgradeCost(level) * (g ** count - 1) / (g - 1);
}

export function resolveSkillBuyCount(save: GameSave, mode: BuyMode | number): number {
  if (typeof mode === 'number') return mode;
  if (mode === '10') return 10;
  if (mode === 'next') return levelsToNextMilestone(save.skillLevel, BALANCE.skillMilestones);
  return 1;
}

export function tapValue(save: GameSave, now: number, combo: boolean): number {
  const syn = computeSynergies(save);
  const raw = skillValue(save.skillLevel) * syn.empireMult + baseIncomePerSec(save) * syn.tapShare;
  return raw * syn.tapMult * activeBoostMultiplier(save, now) * (combo ? BALANCE.comboMultiplier : 1);
}

/** 升下一级羁绊所需的心动玫瑰数量 */
export function bondRoseCost(heroId: HeroId, level: number): number {
  const hero = heroById(heroId);
  if (!hero.shop || level >= MAX_BOND) return Infinity;
  return BOND_LEVELS[level].roseCost;
}

/** 玫瑰不足时用现金直购礼盒升羁绊的价格 */
export function bondUpgradeCost(heroId: HeroId, level: number): number {
  const hero = heroById(heroId);
  if (!hero.shop || level >= MAX_BOND) return Infinity;
  return shopById(hero.shop).baseCost * BOND_LEVELS[level].fallbackCashFactor;
}

export function canAffordBond(save: GameSave, heroId: HeroId): boolean {
  const level = save.bonds[heroId] ?? 0;
  const roses = bondRoseCost(heroId, level);
  if (save.roses >= roses) return true;
  return save.money >= bondUpgradeCost(heroId, level);
}
