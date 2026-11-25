/**
 * 店员专长驻店 & 商业外勤委派纯逻辑：
 * 1. 门店金牌主理人（驻店店长）收益乘区计算；
 * 2. 外勤组队契合度、大成功暴击率 (15%~100%)、自动推荐最优空闲队伍与任务刷新。
 */
import { DISPATCH_BY_ID, DISPATCH_MISSIONS, type DispatchMissionDef } from '../data/dispatch.ts';
import { STAFF, staffById, type StaffId, type StaffSpecialty } from '../data/staff.ts';
import { shopById, type ShopId } from '../data/world.ts';
import { currentChapter } from './unlocks.ts';
import type { ActiveDispatch, GameSave } from './save.ts';

function starOfLevel(lv: number): number {
  if (lv <= 0) return 0;
  let s = 1;
  for (const m of [10, 25, 50, 100]) if (lv >= m) s += 1;
  return Math.min(5, s);
}

/** 某店员当前是否正在执行外勤 */
export function isStaffOnDispatch(save: GameSave, staffId: StaffId): boolean {
  return (save.dispatches ?? []).some((d) => d.staffIds.includes(staffId));
}

/** 某店员当前驻守在哪家门店（没有则返回 null） */
export function assignedShopOfStaff(save: GameSave, staffId: StaffId): ShopId | null {
  for (const [shopId, sId] of Object.entries(save.shopManagers ?? {}) as [ShopId, StaffId | undefined][]) {
    if (sId === staffId) return shopId;
  }
  return null;
}

/** 门店驻店店长提供的独立收益乘区（未任命为 1；每星 +14%，专长契合门店额外 ×1.35） */
export function shopManagerMultiplier(save: GameSave, shopId: ShopId): number {
  const managerId = save.shopManagers?.[shopId];
  if (!managerId) return 1;
  const lv = save.staff?.[managerId] ?? 0;
  if (lv <= 0) return 1;
  const star = starOfLevel(lv);
  const def = staffById(managerId);
  const shop = shopById(shopId);
  const baseBonus = star * 0.14;
  const matchFactor = def.specialty === shop.preferredSpecialty ? 1.35 : 1;
  return 1 + baseBonus * matchFactor;
}

/** 统计玩家已录用店员在某一专长上的总星级（供奇遇检定、股市风声与商战牌力使用） */
export function specialtyTotalStars(save: GameSave, specialty: StaffSpecialty): number {
  let sum = 0;
  for (const s of STAFF) {
    if (s.specialty !== specialty) continue;
    const lv = save.staff?.[s.id] ?? 0;
    if (lv > 0) sum += starOfLevel(lv);
  }
  return sum;
}

/** 计算一组派遣店员在指定外勤商单上的「大成功暴击率」(0.15 ~ 1.0) */
export function calcDispatchGreatChance(save: GameSave, mission: DispatchMissionDef, staffIds: readonly StaffId[]): number {
  if (!staffIds.length) return 0;
  let score = 0.18;
  const remainingReqs = [...mission.requiredSpecialties];

  for (const id of staffIds) {
    const lv = save.staff?.[id] ?? 0;
    if (lv <= 0) continue;
    const star = starOfLevel(lv);
    const def = staffById(id);
    score += (star / mission.stars) * 0.16;
    const reqIdx = remainingReqs.indexOf(def.specialty);
    if (reqIdx >= 0) {
      remainingReqs.splice(reqIdx, 1);
      score += 0.28;
    } else {
      score += 0.06;
    }
  }
  return Math.max(0.15, Math.min(1, Number(score.toFixed(2))));
}

/** 一键智能挑选当前空闲且契合度最高的店员队伍 */
export function recommendDispatchTeam(save: GameSave, mission: DispatchMissionDef): StaffId[] {
  const free = STAFF.filter((s) => (save.staff?.[s.id] ?? 0) > 0 && !isStaffOnDispatch(save, s.id));
  if (!free.length) return [];

  const picked: StaffId[] = [];
  const reqs = [...mission.requiredSpecialties];

  // 先逐个满足专长需求
  for (const req of reqs) {
    if (picked.length >= mission.slots) break;
    const bestMatch = free
      .filter((s) => !picked.includes(s.id) && s.specialty === req)
      .sort((a, b) => (save.staff[b.id] ?? 0) - (save.staff[a.id] ?? 0))[0];
    if (bestMatch) picked.push(bestMatch.id);
  }

  // 剩余槽位按最高等级补满
  if (picked.length < mission.slots) {
    const rest = free
      .filter((s) => !picked.includes(s.id))
      .sort((a, b) => (save.staff[b.id] ?? 0) - (save.staff[a.id] ?? 0));
    for (const r of rest) {
      if (picked.length >= mission.slots) break;
      picked.push(r.id);
    }
  }
  return picked;
}

/** 补充刷新待接取的 4 张外勤商单悬赏 */
export function rollDispatchBoard(save: GameSave): string[] {
  const ch = currentChapter(save.netWorth);
  const activeIds = new Set((save.dispatches ?? []).map((d) => d.missionId));
  const pool = DISPATCH_MISSIONS.filter((m) => ch >= m.minChapter && !activeIds.has(m.id));
  const fallback = pool.length >= 4 ? pool : DISPATCH_MISSIONS.slice(0, 6);
  const shuffled = [...fallback].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 4).map((m) => m.id);
}

/** 是否有已完成待领取的外勤任务 */
export function hasCompletedDispatch(save: GameSave, now: number): boolean {
  return (save.dispatches ?? []).some((d) => now >= d.endAt);
}

export function getMissionOrFallback(id: string): DispatchMissionDef {
  return DISPATCH_BY_ID.get(id) ?? DISPATCH_MISSIONS[0];
}

export function activeDispatchInSlot(save: GameSave, slotIdx: number): ActiveDispatch | undefined {
  return (save.dispatches ?? []).find((d) => d.slotIdx === slotIdx);
}
