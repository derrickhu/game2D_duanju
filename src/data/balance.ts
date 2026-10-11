/** 数值常量，对应策划案 §4。改这里后跑 `npm run sim` 看节奏。 */
export const BALANCE = {
  shopCostGrowth: 1.12,
  /** 门店等级达到这些值时，该门店收益 ×2 */
  shopMilestones: [10, 25, 50, 100, 200] as readonly number[],

  skillBaseValue: 5,
  skillCostBase: 50,
  skillCostGrowth: 1.3,
  skillMilestones: [10, 25, 50, 100, 150, 200] as readonly number[],
  /** 单次点击额外获得每秒收益的这个比例 */
  tapIncomeShare: 0.05,

  comboTapsPerSec: 5,
  comboDurationSec: 3,
  comboMultiplier: 2,

  offlineRate: 0.5,
  offlineCapSecBase: 2 * 3600,
  /** 每推进一章，离线上限 +45 分钟，封顶 8 小时 */
  offlineCapSecPerChapter: 45 * 60,
  offlineCapSecMax: 8 * 3600,

  rushOrderIncomeSec: 300,
  rushOrderMin: 1000,
  rushOrderCooldownSec: 180,
  rushOrderDailyCap: 20,

  liveBoostSec: 600,
  liveBoostMaxSec: 3600,
  liveBoostMultiplier: 2,

  renovateBonusLevels: 10,
} as const;

/** 店员（策划案 §4.7）：价格、收益都按所属门店的基础价 / 基础收益算 */
export const STAFF_BALANCE = {
  hireCost: { A: 3, B: 8 },
  upgradeCost: { A: 0.5, B: 0.8 },
  costGrowth: 1.12,
  income: { A: 1.0, B: 1.2 },
  /** 达到这些等级各升一星，每星收益 ×2 */
  starLevels: [10, 25, 50, 100] as readonly number[],
  /** 录满一个城区：该城区门店 ×2；全员 ★5 再 ×2 */
  areaHiredMult: 2,
  areaMaxStarMult: 2,
  /** 20 人全部录用：点击 ×2 */
  allHiredTapMult: 2,
} as const;

export const MAX_STAR = 5;

/** 男主羁绊：每级花费 = 关联门店基础价 × costFactor，关联门店收益 × incomeMult */
export const BOND_LEVELS = [
  { level: 1, stage: '初遇', costFactor: 0, incomeMult: 1 },
  { level: 2, stage: '心动', costFactor: 20, incomeMult: 1.5 },
  { level: 3, stage: '暧昧', costFactor: 200, incomeMult: 2 },
  { level: 4, stage: '告白', costFactor: 2000, incomeMult: 3 },
  { level: 5, stage: '专属约会', costFactor: 20000, incomeMult: 5 },
] as const;

export const MAX_BOND = BOND_LEVELS.length;
