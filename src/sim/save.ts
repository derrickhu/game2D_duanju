import type { StaffId } from '../data/staff.ts';
import type { StockId } from '../data/stocks.ts';
import type { HeroId } from '../data/story.ts';
import type { AreaId, OutfitId, ShopId } from '../data/world.ts';

export const SAVE_VERSION = 1;

export type BuyMode = '1' | '10' | 'next';

export interface StockPosition {
  shares: number;
  avgPrice: number;
  direction: 'long' | 'short';
  invested: number;
}

export interface ActiveDispatch {
  slotIdx: number;
  missionId: string;
  staffIds: StaffId[];
  startAt: number;
  endAt: number;
}

export interface GameSave {
  version: number;
  money: number;
  /** 身价 = 当前赛季历史累计总收入，只涨不跌 */
  netWorth: number;
  /** 心动玫瑰：用于培养男主羁绊，不挤占开店现金 */
  roses: number;
  /** 爆品研发灵感点：点击/出单/外勤掉落，用于调配 B~SS 传世招牌爆品 */
  inspiration: number;
  /** 商海内幕研报券：外勤/商战掉落，可立即推进一轮股市行情并锁定内幕 */
  insiderTokens: number;
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
  /** 爆单 Fever 结束时间戳与当前积累热度（0~1） */
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

  /** 已研发解锁的爆品配方 comboKey -> 研发熟练阶数 (1~5) */
  discoveredRecipes: Record<string, number>;
  /** 各门店当前挂载的镇店招牌爆品 comboKey */
  equippedRecipes: Partial<Record<ShopId, string>>;
  /** 各门店任命的驻店金牌店长 */
  shopManagers: Partial<Record<ShopId, StaffId>>;
  /** 正在执行中的商业外勤队列 */
  dispatches: ActiveDispatch[];
  /** 当前待接取的 4 个商业外勤悬赏 ID */
  dispatchBoard: string[];
  /** 5 支股票的历史价格序列（最近 16 轮） */
  stockPrices: Partial<Record<StockId, number[]>>;
  /** 当前生效的商海风声/男主密报 ID */
  stockRumorId: string;
  /** 下一轮股市行情跳动时间戳 */
  stockNextTickAt: number;
  /** 当前持仓（支持买入做多与借券做空） */
  stockPositions: Partial<Record<StockId, StockPosition>>;
  /** 6 大城区商圈冠名竞标夺冠阶数 (0~3) */
  areaCrownLevels: Partial<Record<AreaId, number>>;
}

const DEFAULT_BOARD = ['dp_osmanthus_pick', 'dp_night_delivery', 'dp_street_busking', 'dp_campus_fest'];
const DEFAULT_PRICES: Record<StockId, number[]> = {
  sushi: [54, 53.5, 55, 52.8, 51.5, 53.2, 52],
  oldst: [22.5, 23, 22.8, 23.4, 23.9, 23.6, 24],
  chain: [35, 35.8, 36.4, 35.5, 34.9, 35.6, 36],
  glow: [80, 81.2, 82.5, 81.8, 83.4, 82.9, 84],
  star: [62, 60.5, 63.2, 65.0, 63.8, 62.9, 64],
};

export function createSave(now = Date.now()): GameSave {
  return {
    version: SAVE_VERSION,
    money: 0,
    netWorth: 0,
    roses: 0,
    inspiration: 3, // 初始赠送 3 点灵感，开局即可体验首次招牌爆品研发
    insiderTokens: 1,
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
    discoveredRecipes: {},
    equippedRecipes: {},
    shopManagers: {},
    dispatches: [],
    dispatchBoard: [...DEFAULT_BOARD],
    stockPrices: {
      sushi: [...DEFAULT_PRICES.sushi],
      oldst: [...DEFAULT_PRICES.oldst],
      chain: [...DEFAULT_PRICES.chain],
      glow: [...DEFAULT_PRICES.glow],
      star: [...DEFAULT_PRICES.star],
    },
    stockRumorId: 'rm_sushi_fake_cream',
    stockNextTickAt: now + 20_000,
    stockPositions: {},
    areaCrownLevels: {},
  };
}

/** 读档兜底：缺字段补默认值，脏数据（NaN / 负数）归零，老存档 100% 无损兼容。 */
export function normalizeSave(raw: unknown, now = Date.now()): GameSave {
  const base = createSave(now);
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Partial<GameSave>;
  if (r.version !== SAVE_VERSION) return base;
  const buyMode: BuyMode = r.buyMode === '10' || r.buyMode === 'next' ? r.buyMode : '1';

  const stockPrices: Partial<Record<StockId, number[]>> = {};
  for (const k of ['sushi', 'oldst', 'chain', 'glow', 'star'] as const) {
    const arr = r.stockPrices?.[k];
    stockPrices[k] = Array.isArray(arr) && arr.length >= 2
      ? arr.filter((n) => typeof n === 'number' && Number.isFinite(n) && n > 0)
      : [...DEFAULT_PRICES[k]];
    if ((stockPrices[k]?.length ?? 0) < 2) stockPrices[k] = [...DEFAULT_PRICES[k]];
  }

  return {
    ...base,
    ...r,
    money: nonNegative(r.money),
    netWorth: Math.max(nonNegative(r.netWorth), nonNegative(r.money)),
    roses: Math.floor(nonNegative(r.roses)),
    inspiration: r.inspiration === undefined ? 3 : Math.floor(nonNegative(r.inspiration)),
    insiderTokens: r.insiderTokens === undefined ? 1 : Math.floor(nonNegative(r.insiderTokens)),
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
    discoveredRecipes: r.discoveredRecipes && typeof r.discoveredRecipes === 'object' ? { ...r.discoveredRecipes } : {},
    equippedRecipes: r.equippedRecipes && typeof r.equippedRecipes === 'object' ? { ...r.equippedRecipes } : {},
    shopManagers: r.shopManagers && typeof r.shopManagers === 'object' ? { ...r.shopManagers } : {},
    dispatches: Array.isArray(r.dispatches) ? [...r.dispatches] : [],
    dispatchBoard: Array.isArray(r.dispatchBoard) && r.dispatchBoard.length > 0 ? [...r.dispatchBoard] : [...DEFAULT_BOARD],
    stockPrices,
    stockRumorId: typeof r.stockRumorId === 'string' && r.stockRumorId ? r.stockRumorId : 'rm_sushi_fake_cream',
    stockNextTickAt: nonNegative(r.stockNextTickAt) || now + 20_000,
    stockPositions: r.stockPositions && typeof r.stockPositions === 'object' ? { ...r.stockPositions } : {},
    areaCrownLevels: r.areaCrownLevels && typeof r.areaCrownLevels === 'object' ? { ...r.areaCrownLevels } : {},
    rushOrder: { ...base.rushOrder, ...(r.rushOrder ?? {}) },
    lastActiveAt: nonNegative(r.lastActiveAt) || now,
  };
}

function nonNegative(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0;
}
