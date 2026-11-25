/** 改存档的玩家操作。全部同步、纯数据，UI 层负责发事件和存盘。 */
import { BALANCE, MAX_BOND, STAFF_BALANCE } from '../data/balance.ts';
import { CHAPTER_BATTLES, getAreaCrownEncounter } from '../data/battleCards.ts';
import { DISPATCH_BY_ID } from '../data/dispatch.ts';
import { CHAT_THREADS, MOMENT_POSTS } from '../data/phoneMessages.ts';
import { RECIPE_BASES, RECIPE_HYPES, RECIPE_SOULS } from '../data/recipes.ts';
import type { StaffId } from '../data/staff.ts';
import type { StockId } from '../data/stocks.ts';
import { CHAPTERS, HEROES, heroForShop, type HeroId } from '../data/story.ts';
import {
  CHAPTER_CLIMAXES,
  type StreetCheckOption,
  type StreetEventDef,
  type StreetGambleOption,
} from '../data/streetEvents.ts';
import { AREAS, type AreaId, type ShopId } from '../data/world.ts';
import {
  activeDispatchInSlot,
  calcDispatchGreatChance,
  isStaffOnDispatch,
  rollDispatchBoard,
  specialtyTotalStars,
} from './dispatchSim.ts';
import {
  baseIncomePerSec, bondRoseCost, bondUpgradeCost, computeSynergies,
  incomePerSec, isFeverActive, resolveShopBuyCount, resolveSkillBuyCount,
  resolveStaffBuyCount, shopUpgradeCostIn, skillUpgradeCostN,
  staffStar, staffUpgradeCostN, tapValue,
} from './economy.ts';
import { inspirationBuyCost, makeComboKey, resolveRecipe, type ResolvedRecipe } from './recipeSim.ts';
import type { BuyMode, GameSave } from './save.ts';
import { advanceStockMarket, closeStockPosition, openOrAddPosition } from './stockSim.ts';
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

export function addInspiration(save: GameSave, count: number): void {
  if (!(count > 0)) return;
  save.inspiration = Math.floor((save.inspiration ?? 0) + count);
}

export function addInsiderTokens(save: GameSave, count: number): void {
  if (!(count > 0)) return;
  save.insiderTokens = Math.floor((save.insiderTokens ?? 0) + count);
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
  inspirationGained: number;
}

/** 主界面交互点击：支持陆屿/爆品暴击、爆单 Fever 蓄力与随机灵感火花掉落 */
export function tapInteractive(save: GameSave, now: number, combo: boolean, rand = Math.random()): InteractiveTapResult {
  const syn = computeSynergies(save);
  const crit = syn.critChance > 0 && rand < syn.critChance;
  const base = tapValue(save, now, combo);
  const amount = crit ? base * 3 : base;
  earn(save, amount);
  save.taps += 1;

  let inspirationGained = 0;
  if (save.taps % 28 === 0) {
    addInspiration(save, 1);
    inspirationGained = 1;
  }

  let feverTriggered = false;
  if (!isFeverActive(save, now)) {
    save.feverHeat = Math.min(1, (save.feverHeat ?? 0) + BALANCE.feverPerTap);
    if (save.feverHeat >= 1 - 1e-9) {
      save.feverHeat = 0;
      save.feverUntil = now + BALANCE.feverDurationSec * 1000;
      feverTriggered = true;
    }
  }
  return { amount, crit, feverTriggered, inspirationGained };
}

/** 接待一位前景吧台顾客气泡：高倍率出单 + 大幅积攒爆单热度 + 必得 1 点研发灵感 */
export function serveCustomerOrder(save: GameSave, now: number): {
  amount: number;
  feverTriggered: boolean;
  inspirationGained: number;
} {
  const amount = tapValue(save, now, false) * BALANCE.orderTapMult + baseIncomePerSec(save) * BALANCE.orderIncomeSec;
  earn(save, amount);
  save.taps += 1;
  addInspiration(save, 1);

  let feverTriggered = false;
  if (!isFeverActive(save, now)) {
    save.feverHeat = Math.min(1, (save.feverHeat ?? 0) + BALANCE.feverPerOrder);
    if (save.feverHeat >= 1 - 1e-9) {
      save.feverHeat = 0;
      save.feverUntil = now + BALANCE.feverDurationSec * 1000;
      feverTriggered = true;
    }
  }
  return { amount, feverTriggered, inspirationGained: 1 };
}

export function tick(save: GameSave, dtSec: number, now: number): number {
  const syn = computeSynergies(save);
  const autoTapIncome = syn.autoTapPerSec > 0 ? syn.autoTapPerSec * tapValue(save, now, false) * dtSec : 0;
  const amount = incomePerSec(save, now) * dtSec + autoTapIncome;
  earn(save, amount);
  if (now >= (save.stockNextTickAt || 0)) {
    advanceStockMarket(save, now);
  }
  save.lastActiveAt = now;
  return amount;
}

export interface BuyShopResult {
  levels: number;
  cost: number;
  metHero: HeroId | null;
  rosesGained: number;
  milestoneReached: number;
}

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
  newStar: number;
  rosesGained: number;
}

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

export function claimRushOrder(save: GameSave, now: number): number {
  const day = dayKey(now);
  if (save.rushOrder.day !== day) save.rushOrder = { day, count: 0, lastAt: 0 };
  const amount = rushOrderReward(save);
  earn(save, amount);
  save.rushOrder.count += 1;
  save.rushOrder.lastAt = now;
  return amount;
}

export function startLiveBoost(save: GameSave, now: number): void {
  const from = Math.max(now, save.boostUntil);
  const until = from + BALANCE.liveBoostSec * 1000;
  save.boostUntil = Math.min(until, now + BALANCE.liveBoostMaxSec * 1000);
  save.liveBoosts += 1;
}

// ==================== 1. 突发奇遇与检定/豪赌总裁决策卡 ====================

/** 计算选项二「专长/实力检定」的实时通过概率 (0.25 ~ 1.0) */
export function evalStreetCheckChance(save: GameSave, opt: StreetCheckOption): {
  chance: number;
  currentVal: number;
} {
  let cur = 0;
  if (opt.checkType === 'specialty' && opt.specialty) {
    cur = specialtyTotalStars(save, opt.specialty);
  } else if (opt.checkType === 'shopLevel' && opt.shopId) {
    cur = save.shops[opt.shopId] ?? 0;
  } else if (opt.checkType === 'recipes') {
    cur = Object.keys(save.discoveredRecipes ?? {}).length + specialtyTotalStars(save, 'craft');
  }
  const ratio = cur / Math.max(1, opt.targetVal);
  const chance = ratio >= 1 ? 0.96 : Math.max(0.28, Number((0.28 + ratio * 0.65).toFixed(2)));
  return { chance: Math.min(1, chance), currentVal: cur };
}

/** 计算选项三「资本豪赌反杀」的实时胜率 (0.58 ~ 0.88) */
export function evalStreetGambleChance(save: GameSave, opt: StreetGambleOption): {
  chance: number;
  stake: number;
} {
  const bonus = (specialtyTotalStars(save, 'fin') + specialtyTotalStars(save, 'pr')) * 0.025;
  const chance = Math.min(0.88, Number((opt.baseChance + bonus).toFixed(2)));
  const stake = Math.floor(save.money * opt.stakeRatio);
  return { chance, stake };
}

export interface StreetEventResolution {
  won: boolean;
  cash: number;
  stakeLost: number;
  roses: number;
  inspiration: number;
  feverTriggered: boolean;
  outcomeText: string;
}

export function resolveStreetEvent(
  save: GameSave,
  event: StreetEventDef,
  optionIdx: 0 | 1 | 2,
  now: number,
  rand = Math.random(),
): StreetEventResolution {
  const syn = computeSynergies(save);

  if (optionIdx === 0) {
    const opt = event.options[0];
    const cash = Math.max(opt.minCash, baseIncomePerSec(save) * opt.cashSec) * syn.rushMult;
    earn(save, cash);
    addRoses(save, opt.roses);
    const insp = opt.inspiration ?? 1;
    addInspiration(save, insp);
    let feverTriggered = false;
    if (!isFeverActive(save, now)) {
      save.feverHeat = Math.min(1, (save.feverHeat ?? 0) + opt.feverAdd);
      if (save.feverHeat >= 1 - 1e-9) {
        save.feverHeat = 0;
        save.feverUntil = now + BALANCE.feverDurationSec * 1000;
        feverTriggered = true;
      }
    }
    return { won: true, cash, stakeLost: 0, roses: opt.roses, inspiration: insp, feverTriggered, outcomeText: opt.outcome };
  }

  if (optionIdx === 1) {
    const opt = event.options[1];
    const { chance } = evalStreetCheckChance(save, opt);
    const won = rand < chance;
    const baseCash = Math.max(opt.minCash, baseIncomePerSec(save) * opt.cashSec) * syn.rushMult;
    const cash = won ? baseCash : baseCash * 0.30;
    const roses = won ? opt.roses : 1;
    const insp = won ? opt.inspiration : 1;
    earn(save, cash);
    addRoses(save, roses);
    addInspiration(save, insp);

    let feverTriggered = false;
    if (won && !isFeverActive(save, now)) {
      save.feverHeat = Math.min(1, (save.feverHeat ?? 0) + opt.feverAdd);
      if (save.feverHeat >= 1 - 1e-9) {
        save.feverHeat = 0;
        save.feverUntil = now + BALANCE.feverDurationSec * 1000;
        feverTriggered = true;
      }
    }
    return {
      won,
      cash,
      stakeLost: 0,
      roses,
      inspiration: insp,
      feverTriggered,
      outcomeText: won ? opt.outcomeWin : opt.outcomeFail,
    };
  }

  // optionIdx === 2: 高风险资本豪赌
  const opt = event.options[2];
  const { chance, stake } = evalStreetGambleChance(save, opt);
  save.money = Math.max(0, save.money - stake);
  const won = rand < chance;
  if (won) {
    const bonusCash = Math.max(opt.minCash, baseIncomePerSec(save) * opt.cashSec) * syn.rushMult;
    const profit = stake * (opt.winMult - 1) + bonusCash;
    // 退还押注本金 + 赚取巨额净利（仅净利计入 netWorth）
    save.money += stake;
    earn(save, profit);
    addRoses(save, opt.roses);
    addInspiration(save, 2);
    save.feverHeat = 0;
    save.feverUntil = Math.max(save.feverUntil ?? 0, now + BALANCE.feverDurationSec * 1000);
    return {
      won: true,
      cash: profit,
      stakeLost: 0,
      roses: opt.roses,
      inspiration: 2,
      feverTriggered: true,
      outcomeText: opt.outcomeWin,
    };
  }

  // 豪赌失利：本金损失（绝不倒扣历史身价），给 2 朵玫瑰与 1 点灵感做声望安慰
  addRoses(save, 2);
  addInspiration(save, 1);
  return {
    won: false,
    cash: 0,
    stakeLost: stake,
    roses: 2,
    inspiration: 1,
    feverTriggered: false,
    outcomeText: opt.outcomeFail,
  };
}

// ==================== 2. 商战对决与商圈冠名战 ====================

export function clearChapterBattle(save: GameSave, chapterId: number): number {
  if (save.clearedBattles.includes(chapterId)) return 0;
  const ch = CHAPTERS.find((c) => c.id === chapterId);
  if (!ch || save.netWorth < ch.unlockNetWorth) return 0;
  save.clearedBattles.push(chapterId);

  const enc = CHAPTER_BATTLES.get(chapterId);
  const roses = ch.rival?.roseReward ?? enc?.roseReward ?? 0;
  addRoses(save, roses);
  if (enc) {
    const bonusCash = Math.max(ch.unlockNetWorth * 0.12, baseIncomePerSec(save) * enc.cashRewardSec);
    earn(save, bonusCash);
    if (enc.insiderReward > 0) addInsiderTokens(save, enc.insiderReward);
  }
  return roses;
}

export function winAreaCrownBattle(save: GameSave, areaId: AreaId): {
  newTier: number;
  cash: number;
  roses: number;
  insider: number;
} | null {
  const curTier = save.areaCrownLevels?.[areaId] ?? 0;
  if (curTier >= 3) return null;
  const nextTier = (curTier + 1) as 1 | 2 | 3;
  const area = AREAS.find((a) => a.id === areaId);
  if (!area || save.netWorth < area.unlockNetWorth) return null;

  const enc = getAreaCrownEncounter(areaId, area.name, nextTier);
  save.areaCrownLevels[areaId] = nextTier;
  const cash = Math.max((area.unlockNetWorth || 2000) * 0.25 * nextTier, baseIncomePerSec(save) * enc.cashRewardSec);
  earn(save, cash);
  addRoses(save, enc.roseReward);
  if (enc.insiderReward > 0) addInsiderTokens(save, enc.insiderReward);
  return { newTier: nextTier, cash, roses: enc.roseReward, insider: enc.insiderReward };
}

export function claimChapterClimax(save: GameSave, chapterId: number, choice: 'A' | 'B'): number {
  if (save.claimedClimaxes.includes(chapterId)) return 0;
  const def = CHAPTER_CLIMAXES.get(chapterId);
  if (!def) return 0;
  save.claimedClimaxes.push(chapterId);
  const picked = choice === 'A' ? def.choiceA : def.choiceB;
  addRoses(save, picked.roses);
  addInspiration(save, picked.inspiration);
  addInsiderTokens(save, picked.insiderTokens);
  return picked.roses;
}

// ==================== 3. 招牌爆品研发室与镇店挂载 ====================

export interface CraftRecipeResult {
  recipe: ResolvedRecipe;
  isNew: boolean;
  rosesGained: number;
}

export function craftRecipe(
  save: GameSave,
  baseId: string,
  soulId: string,
  hypeId: string,
): CraftRecipeResult | null {
  if ((save.inspiration ?? 0) < 1) return null;
  const base = RECIPE_BASES.find((b) => b.id === baseId);
  const soul = RECIPE_SOULS.find((s) => s.id === soulId);
  const hype = RECIPE_HYPES.find((h) => h.id === hypeId);
  if (!base || !soul || !hype) return null;
  if (save.netWorth < base.unlockNetWorth || save.netWorth < soul.unlockNetWorth || save.netWorth < hype.unlockNetWorth) {
    return null;
  }

  save.inspiration -= 1;
  const key = makeComboKey(baseId, soulId, hypeId);
  const prevLv = save.discoveredRecipes[key] ?? 0;
  const isNew = prevLv === 0;
  const nextLv = Math.min(5, prevLv + 1);
  save.discoveredRecipes[key] = nextLv;

  const resolved = resolveRecipe(key, nextLv);
  const rosesGained = isNew ? resolved.roseFirstReward : 0;
  if (rosesGained > 0) addRoses(save, rosesGained);

  return { recipe: resolved, isNew, rosesGained };
}

export function buyInspiration(save: GameSave): boolean {
  const cost = inspirationBuyCost(baseIncomePerSec(save));
  if (save.money < cost) return false;
  save.money -= cost;
  addInspiration(save, 1);
  return true;
}

export function equipShopRecipe(save: GameSave, shopId: ShopId, comboKey: string | null): boolean {
  if ((save.shops[shopId] ?? 0) <= 0) return false;
  if (!comboKey) {
    delete save.equippedRecipes[shopId];
    return true;
  }
  if ((save.discoveredRecipes[comboKey] ?? 0) <= 0) return false;
  // 每款招牌爆品同一时刻独家镇守一家门店
  for (const [k, v] of Object.entries(save.equippedRecipes) as [ShopId, string | undefined][]) {
    if (v === comboKey) delete save.equippedRecipes[k];
  }
  save.equippedRecipes[shopId] = comboKey;
  return true;
}

// ==================== 4. 店员专长驻店 & 商业外勤差遣 ====================

export function assignShopManager(save: GameSave, shopId: ShopId, staffId: StaffId | null): boolean {
  if ((save.shops[shopId] ?? 0) <= 0) return false;
  if (!staffId) {
    delete save.shopManagers[shopId];
    return true;
  }
  if ((save.staff[staffId] ?? 0) <= 0) return false;
  for (const [k, v] of Object.entries(save.shopManagers) as [ShopId, StaffId | undefined][]) {
    if (v === staffId) delete save.shopManagers[k];
  }
  save.shopManagers[shopId] = staffId;
  return true;
}

export function startStaffDispatch(
  save: GameSave,
  slotIdx: number,
  missionId: string,
  staffIds: StaffId[],
  now: number,
): boolean {
  if (slotIdx < 0 || slotIdx > 3) return false;
  if (activeDispatchInSlot(save, slotIdx)) return false;
  const mission = DISPATCH_BY_ID.get(missionId);
  if (!mission || staffIds.length === 0 || staffIds.length > mission.slots) return false;

  const unique = new Set(staffIds);
  if (unique.size !== staffIds.length) return false;
  for (const id of staffIds) {
    if ((save.staff[id] ?? 0) <= 0 || isStaffOnDispatch(save, id)) return false;
  }

  save.dispatches.push({
    slotIdx,
    missionId,
    staffIds: [...staffIds],
    startAt: now,
    endAt: now + mission.durationSec * 1000,
  });
  return true;
}

export interface DispatchClaimResult {
  greatSuccess: boolean;
  cash: number;
  roses: number;
  inspiration: number;
  insiderTokens: number;
}

export function claimStaffDispatch(
  save: GameSave,
  slotIdx: number,
  now: number,
  rand = Math.random(),
): DispatchClaimResult | null {
  const idx = save.dispatches.findIndex((d) => d.slotIdx === slotIdx);
  if (idx < 0) return null;
  const active = save.dispatches[idx];
  if (now < active.endAt) return null;

  const mission = DISPATCH_BY_ID.get(active.missionId);
  save.dispatches.splice(idx, 1);
  save.dispatchBoard = rollDispatchBoard(save);
  if (!mission) return null;

  const greatChance = calcDispatchGreatChance(save, mission, active.staffIds);
  const greatSuccess = rand < greatChance;
  const syn = computeSynergies(save);
  const baseCash = Math.max(mission.minCash, baseIncomePerSec(save) * mission.cashSec) * syn.rushMult;
  const cash = greatSuccess ? baseCash * 2.3 : baseCash;
  const roses = mission.roses + (greatSuccess ? 2 : 0);
  const inspiration = mission.inspiration + (greatSuccess ? 1 : 0);
  const insiderTokens = mission.insiderTokens + (greatSuccess ? 1 : 0);

  earn(save, cash);
  addRoses(save, roses);
  addInspiration(save, inspiration);
  addInsiderTokens(save, insiderTokens);

  return { greatSuccess, cash, roses, inspiration, insiderTokens };
}

export function refreshDispatchBoard(save: GameSave): void {
  save.dispatchBoard = rollDispatchBoard(save);
}

// ==================== 5. 晚星风投 · 股市做空操盘 ====================

export function tradeStock(
  save: GameSave,
  stockId: StockId,
  direction: 'long' | 'short',
  budgetRatio: number,
): { ok: boolean; reason?: string; invested: number } {
  return openOrAddPosition(save, stockId, direction, budgetRatio);
}

export function settleStock(
  save: GameSave,
  stockId: StockId,
): { ok: boolean; payout: number; pnl: number; pnlPct: number; wasShortSushi: boolean } {
  return closeStockPosition(save, stockId);
}

export function spendInsiderToken(save: GameSave, now: number): boolean {
  if ((save.insiderTokens ?? 0) < 1) return false;
  save.insiderTokens -= 1;
  advanceStockMarket(save, now);
  return true;
}

// ==================== 6. 微聊、朋友圈、转生与开发指令 ====================

export function replyChat(save: GameSave, threadId: string, optionIdx: 0 | 1): number {
  if (save.repliedChats[threadId] !== undefined) return 0;
  const chat = CHAT_THREADS.find((c) => c.id === threadId);
  if (!chat || !isChatUnlocked(save, chat)) return 0;
  save.repliedChats[threadId] = optionIdx;
  const roses = chat.replies[optionIdx].roses;
  addRoses(save, roses);
  return roses;
}

export function likeMoment(save: GameSave, postId: string): number {
  if (save.likedMoments.includes(postId)) return 0;
  const post = MOMENT_POSTS.find((p) => p.id === postId);
  if (!post) return 0;
  save.likedMoments.push(postId);
  addRoses(save, 1);
  return 1;
}

/** 开启新商业赛季（二周目扩城转生）：保留男主羁绊、玫瑰、灵感、爆品配方图鉴与衣橱 */
export function prestigeSeason(save: GameSave, now: number): boolean {
  if (!canPrestigeSeason(save)) return false;
  save.season = (save.season ?? 1) + 1;
  save.money = 0;
  save.netWorth = 0;
  save.skillLevel = 1;
  save.shops = {};
  save.staff = {};
  save.equippedRecipes = {};
  save.shopManagers = {};
  save.dispatches = [];
  save.stockPositions = {};
  save.areaCrownLevels = {};
  save.questIndex = 0;
  save.feverHeat = 0;
  save.feverUntil = 0;
  save.clearedBattles = [];
  save.claimedClimaxes = [];
  save.lastActiveAt = now;
  addRoses(save, 15);
  addInspiration(save, 5);
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

export function gmAddMoney(save: GameSave): number {
  const amount = Math.max(1e4, save.netWorth * 9);
  earn(save, amount);
  addRoses(save, 10);
  addInspiration(save, 5);
  addInsiderTokens(save, 3);
  return amount;
}

export function gmUnlockAllVideos(save: GameSave): void {
  const target = CHAPTERS[CHAPTERS.length - 1].unlockNetWorth;
  if (save.netWorth < target) save.netWorth = target;
  save.roses = Math.max(save.roses, 200);
  save.inspiration = Math.max(save.inspiration, 20);
  save.insiderTokens = Math.max(save.insiderTokens, 10);
  for (const hero of HEROES) {
    if (hero.shop) save.bonds[hero.id] = Math.max(save.bonds[hero.id] ?? 0, MAX_BOND);
    if (!save.adUnlocked.includes(hero.extraVideo)) save.adUnlocked.push(hero.extraVideo);
  }
}

export function isChapterCleared(save: GameSave, chapterId: number): boolean {
  const ch = CHAPTERS.find((c) => c.id === chapterId);
  return !!ch && ch.videos.every((v) => save.watched.includes(v));
}
