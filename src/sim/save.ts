import type { StaffId } from '../data/staff.ts';
import type { HeroId } from '../data/story.ts';
import type { OutfitId, ShopId } from '../data/world.ts';

export const SAVE_VERSION = 1;

export interface GameSave {
  version: number;
  money: number;
  /** 身价 = 历史累计总收入，只涨不跌 */
  netWorth: number;
  skillLevel: number;
  /** 门店等级，0 或缺省表示未开店 */
  shops: Partial<Record<ShopId, number>>;
  /** 羁绊等级，0 或缺省表示未相遇 */
  bonds: Partial<Record<HeroId, number>>;
  watched: string[];
  adUnlocked: string[];
  outfit: OutfitId;
  boostUntil: number;
  rushOrder: { day: string; count: number; lastAt: number };
  lastActiveAt: number;
  tutorialStep: number;
  createdAt: number;
  taps: number;
  /** 店员等级，0 或缺省表示未录用 */
  staff: Partial<Record<StaffId, number>>;
  /** 当前主线任务序号（已领奖的条数） */
  questIndex: number;
  liveBoosts: number;
}

export function createSave(now = Date.now()): GameSave {
  return {
    version: SAVE_VERSION,
    money: 0,
    netWorth: 0,
    skillLevel: 1,
    shops: {},
    bonds: {},
    watched: [],
    adUnlocked: [],
    outfit: 'tee',
    boostUntil: 0,
    rushOrder: { day: '', count: 0, lastAt: 0 },
    lastActiveAt: now,
    tutorialStep: 0,
    createdAt: now,
    taps: 0,
    staff: {},
    questIndex: 0,
    liveBoosts: 0,
  };
}

/** 读档兜底：缺字段补默认值，脏数据（NaN / 负数）归零。 */
export function normalizeSave(raw: unknown, now = Date.now()): GameSave {
  const base = createSave(now);
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Partial<GameSave>;
  if (r.version !== SAVE_VERSION) return base;
  return {
    ...base,
    ...r,
    money: nonNegative(r.money),
    netWorth: Math.max(nonNegative(r.netWorth), nonNegative(r.money)),
    skillLevel: Math.max(1, Math.floor(nonNegative(r.skillLevel) || 1)),
    shops: { ...(r.shops ?? {}) },
    bonds: { ...(r.bonds ?? {}) },
    staff: { ...(r.staff ?? {}) },
    questIndex: Math.floor(nonNegative(r.questIndex)),
    liveBoosts: Math.floor(nonNegative(r.liveBoosts)),
    watched: Array.isArray(r.watched) ? [...r.watched] : [],
    adUnlocked: Array.isArray(r.adUnlocked) ? [...r.adUnlocked] : [],
    rushOrder: { ...base.rushOrder, ...(r.rushOrder ?? {}) },
    lastActiveAt: nonNegative(r.lastActiveAt) || now,
  };
}

function nonNegative(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0;
}
