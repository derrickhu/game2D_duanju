/** 数值常量，对应策划案 §4 及增量深度改造方案。改这里后跑 `npm run sim` 看节奏。 */
export const BALANCE = {
  shopCostGrowth: 1.15,
  /** 门店等级达到这些值时，该门店收益 ×2，并奖励心动玫瑰 */
  shopMilestones: [10, 25, 50, 100, 200] as readonly number[],
  /** 门店首次跨过里程碑时赠送的心动玫瑰数量 */
  milestoneRoses: [2, 4, 6, 10, 15] as readonly number[],

  skillBaseValue: 5,
  skillCostBase: 50,
  skillCostGrowth: 1.32,
  skillMilestones: [10, 25, 50, 100, 150, 200] as readonly number[],
  /** 单次点击额外获得每秒收益的这个比例 */
  tapIncomeShare: 0.04,

  comboTapsPerSec: 5,
  comboDurationSec: 3,
  comboMultiplier: 2,

  /** 爆单 Fever 能量槽：约每 45~60 秒活跃游玩触发一次 8 秒高光爆单 */
  feverPerTap: 0.008,
  feverPerOrder: 0.10,
  feverDurationSec: 8,
  feverBaseMultiplier: 2.2,

  /** 顾客点单气泡刷新间隔与点击收益倍率 */
  orderSpawnIntervalSec: 8,
  orderMaxCount: 3,
  orderTapMult: 2.5,
  orderIncomeSec: 0.8,

  /** 随机街头/打脸奇遇间隔 */
  streetEventMinSec: 45,
  streetEventMaxSec: 75,
  streetEventRewardSec: 45,
  streetEventRoses: 3,

  offlineRate: 0.5,
  offlineCapSecBase: 2 * 3600,
  /** 每推进一章，离线上限 +45 分钟，封顶 12 小时 */
  offlineCapSecPerChapter: 45 * 60,
  offlineCapSecMax: 12 * 3600,

  rushOrderIncomeSec: 240,
  rushOrderMin: 1000,
  rushOrderCooldownSec: 180,
  rushOrderDailyCap: 20,

  liveBoostSec: 600,
  liveBoostMaxSec: 3600,
  liveBoostMultiplier: 2,

  renovateBonusLevels: 10,

  /** 每解锁一套高定服装，全帝国收益 +8% */
  outfitEmpireBonus: 0.08,
  /** 每开启一个新赛季（转生扩城），全帝国永久 ×2.2 */
  seasonBaseMult: 2.2,
} as const;

/** 店员（策划案 §4.7）：价格、收益都按所属门店的基础价 / 基础收益算 */
export const STAFF_BALANCE = {
  hireCost: { A: 2.5, B: 6.0 },
  upgradeCost: { A: 0.55, B: 0.85 },
  costGrowth: 1.15,
  income: { A: 0.45, B: 0.60 },
  /** 达到这些等级各升一星，每星收益 ×2 */
  starLevels: [10, 25, 50, 100] as readonly number[],
  /** 录满一个城区：该城区门店 ×2；全员 ★5 再 ×2 */
  areaHiredMult: 2,
  areaMaxStarMult: 2,
  /** 20 人全部录用：点击 ×2 */
  allHiredTapMult: 2,
  /** 店员录用或升星时赠送玫瑰 */
  hireRoses: 1,
  starUpRoses: 2,
} as const;

export const MAX_STAR = 5;

/**
 * 男主羁绊：独立消耗「心动玫瑰」（roseCost），不再抢占开店现金流；
 * 当玫瑰不足时也支持按关联门店基础价 × fallbackCashFactor 购买礼盒直升。
 */
export const BOND_LEVELS = [
  { level: 1, stage: '初遇', roseCost: 0, fallbackCashFactor: 0, incomeMult: 1 },
  { level: 2, stage: '心动', roseCost: 6, fallbackCashFactor: 18, incomeMult: 1.4 },
  { level: 3, stage: '暧昧', roseCost: 14, fallbackCashFactor: 120, incomeMult: 1.9 },
  { level: 4, stage: '告白', roseCost: 26, fallbackCashFactor: 800, incomeMult: 2.6 },
  { level: 5, stage: '专属约会', roseCost: 42, fallbackCashFactor: 4000, incomeMult: 3.8 },
] as const;

export const MAX_BOND = BOND_LEVELS.length;
