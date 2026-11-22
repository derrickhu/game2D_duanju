import type { StaffId } from '../data/staff.ts';
import type { HeroId } from '../data/story.ts';
import type { OutfitId, ShopId } from '../data/world.ts';

export const SAVE_VERSION = 1;

export type BuyMode = '1' | '10' | 'next';

export interface GameSave {
  version: number;
  money: number;
  /** 身价 = 当前赛季历史累计总收入，只涨不跌 */
  netWorth: number;
  /** 心动玫瑰：用于培养男主羁绊，不挤占开店现金 */
  roses: number;
  /** 当前商业版图赛季（1 = 云城首季，2+ = 跨城扩业，享永久名望倍率） */
  season: number;
  skillLevel: number;
  /** 门店等级，0 或缺省表示未开店 */
  shops: Partial<Record<ShopId, number>>;
  /** 羁绊等级，0 或缺省表示未相遇 */
  bonds: Partial<Record<HeroId, number>>;
  watched: string[];
  adUnlocked: string[];
  outfit: OutfitId;
  boostUntil: number;
  /** 爆单 Fever 结束时间戳與当前积累热度（0~1） */
  feverUntil: number;
  feverHeat: number;
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
  /** 批量升级档位偏好 */
  buyMode: BuyMode;
  /** 已回复的微聊条目 id -> 选了第几项 (0 | 1) */
  repliedChats: Record<string, number>;
  /** 已点赞的朋友圈 id */
  likedMoments: string[];
  /** 已通关商战碾压对决的章节 id */
  clearedBattles: number[];
  /** 已完成章节高潮二选一抉择的章节 id */
  claimedClimaxes: number[];
}

export function createSave(now = Date.now()): GameSave {
  return {
    version: SAVE_VERSION,
    money: 0,
    netWorth: 0,
    roses: 0,
    season: 1,
    skillLevel: 1,
    shops: {},
    bonds: {},
    watched: [],
    adUnlocked: [],
    outfit: 'tee',
    boostUntil: 0,
    feverUntil: 0,
    feverHeat: 0,
    rushOrder: { day: '', count: 0, lastAt: 0 },
    lastActiveAt: now,
    tutorialStep: 0,
    createdAt: now,
    taps: 0,
    staff: {},
    questIndex: 0,
    liveBoosts: 0,
    buyMode: '1',
    repliedChats: {},
    likedMoments: [],
    clearedBattles: [],
    claimedClimaxes: [],
  };
}

/** 读档兜底：缺字段补默认值，脏数据（NaN / 负数）归零。 */
export function normalizeSave(raw: unknown, now = Date.now()): GameSave {
  const base = createSave(now);
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Partial<GameSave>;
  if (r.version !== SAVE_VERSION) return base;
  const buyMode: BuyMode = r.buyMode === '10' || r.buyMode === 'next' ? r.buyMode : '1';
  return {
    ...base,
    ...r,
    money: nonNegative(r.money),
    netWorth: Math.max(nonNegative(r.netWorth), nonNegative(r.money)),
    roses: Math.floor(nonNegative(r.roses)),
    season: Math.max(1, Math.floor(nonNegative(r.season) || 1)),
    skillLevel: Math.max(1, Math.floor(nonNegative(r.skillLevel) || 1)),
    shops: { ...(r.shops ?? {}) },
    bonds: { ...(r.bonds ?? {}) },
    staff: { ...(r.staff ?? {}) },
    questIndex: Math.floor(nonNegative(r.questIndex)),
    liveBoosts: Math.floor(nonNegative(r.liveBoosts)),
    feverUntil: nonNegative(r.feverUntil),
    feverHeat: Math.min(1, nonNegative(r.feverHeat)),
    buyMode,
    watched: Array.isArray(r.watched) ? [...r.watched] : [],
    adUnlocked: Array.isArray(r.adUnlocked) ? [...r.adUnlocked] : [],
    repliedChats: r.repliedChats && typeof r.repliedChats === 'object' ? { ...r.repliedChats } : {},
    likedMoments: Array.isArray(r.likedMoments) ? [...r.likedMoments] : [],
    clearedBattles: Array.isArray(r.clearedBattles) ? [...r.clearedBattles] : [],
    claimedClimaxes: Array.isArray(r.claimedClimaxes) ? [...r.claimedClimaxes] : [],
    rushOrder: { ...base.rushOrder, ...(r.rushOrder ?? {}) },
    lastActiveAt: nonNegative(r.lastActiveAt) || now,
  };
}

function nonNegative(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0;
}
