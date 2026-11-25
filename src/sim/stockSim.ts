/**
 * 晚星风投 · 股市做空操盘纯逻辑：
 * - 每 20 秒自动推进一轮行情（或消耗内幕研报券立即推进）；
 * - 做多 (long)：现价高于均价赚钱；借券做空 (short)：现价低于均价赚钱（专打苏氏暴跌！）；
 * - 严格遵守「盈利同时涨现金与历史身价，亏损只扣本金绝不倒扣历史身价」。
 */
import { STOCKS, STOCK_BY_ID, STOCK_RUMORS, type StockDef, type StockId, type StockRumorDef } from '../data/stocks.ts';
import { specialtyTotalStars } from './dispatchSim.ts';
import { effectiveBond } from './unlocks.ts';
import type { GameSave, StockPosition } from './save.ts';

export const STOCK_TICK_MS = 20_000;
export const MAX_PRICE_HISTORY = 16;

export function currentStockPrice(save: GameSave, id: StockId): number {
  const hist = save.stockPrices?.[id];
  if (!hist || !hist.length) return STOCK_BY_ID.get(id)?.basePrice ?? 50;
  return hist[hist.length - 1];
}

export function prevStockPrice(save: GameSave, id: StockId): number {
  const hist = save.stockPrices?.[id];
  if (!hist || hist.length < 2) return currentStockPrice(save, id);
  return hist[hist.length - 2];
}

export function stockLastChangePct(save: GameSave, id: StockId): number {
  const cur = currentStockPrice(save, id);
  const prev = prevStockPrice(save, id);
  if (prev <= 0) return 0;
  return (cur - prev) / prev;
}

export function currentRumor(save: GameSave): StockRumorDef {
  return STOCK_RUMORS.find((r) => r.id === save.stockRumorId) ?? STOCK_RUMORS[0];
}

/** 玩家是否已结识对应男主（或风控店员总星级 ≥ 3★），以解锁红字精准内幕批注 */
export function isInsiderUnlocked(save: GameSave, rumor: StockRumorDef): boolean {
  if (effectiveBond(save, rumor.insiderHero) >= 1) return true;
  if (specialtyTotalStars(save, 'fin') >= 3) return true;
  return false;
}

/** 计算持仓当前结算市值与浮动盈亏比例 */
export function calcPositionValuation(pos: StockPosition, curPrice: number): {
  payout: number;
  pnl: number;
  pnlPct: number;
} {
  if (pos.invested <= 0 || pos.avgPrice <= 0) return { payout: 0, pnl: 0, pnlPct: 0 };
  const ratio = pos.direction === 'long'
    ? (curPrice - pos.avgPrice) / pos.avgPrice
    : (pos.avgPrice - curPrice) / pos.avgPrice;
  // 做空最低保底保留 10% 保证金不穿仓倒欠，最高单笔可翻数倍
  const clampedRatio = Math.max(-0.90, Math.min(3.5, ratio));
  const pnl = pos.invested * clampedRatio;
  const payout = Math.max(0, pos.invested + pnl);
  return { payout, pnl, pnlPct: clampedRatio };
}

function stepSingleStock(def: StockDef, curPrice: number, rumor: StockRumorDef, rand: number): number {
  // 均值回归微弱拉力 + 随机正态近似波动 + 风声内幕偏移
  const revert = ((def.basePrice - curPrice) / def.basePrice) * 0.14;
  const noise = (rand - 0.5) * 2 * def.volatility;
  const rumorBias = rumor.stockId === def.id ? rumor.drift * 0.72 : 0;
  const pct = Math.max(-0.32, Math.min(0.36, revert + noise + rumorBias));
  const next = Math.max(def.minPrice, Math.min(def.maxPrice, curPrice * (1 + pct)));
  return Number(next.toFixed(2));
}

/** 推进一轮 5 支股票价格并刷新下一条商海风声 */
export function advanceStockMarket(save: GameSave, now: number, rng = Math.random): void {
  const activeRumor = currentRumor(save);
  for (const def of STOCKS) {
    const cur = currentStockPrice(save, def.id);
    const next = stepSingleStock(def, cur, activeRumor, rng());
    const arr = [...(save.stockPrices[def.id] ?? [def.basePrice])];
    arr.push(next);
    while (arr.length > MAX_PRICE_HISTORY) arr.shift();
    save.stockPrices[def.id] = arr;
  }

  // 轮换下一条不重复的商海风声（40% 概率聚焦宿敌苏氏食品，保证做空爽点高频出现）
  const others = STOCK_RUMORS.filter((r) => r.id !== activeRumor.id);
  const sushiPool = others.filter((r) => r.stockId === 'sushi');
  const pool = rng() < 0.42 && sushiPool.length > 0 ? sushiPool : others;
  const picked = pool[Math.floor(rng() * pool.length)] ?? STOCK_RUMORS[0];
  save.stockRumorId = picked.id;
  save.stockNextTickAt = now + STOCK_TICK_MS;
}

/** 建仓或同向加仓（做多 / 借券做空） */
export function openOrAddPosition(
  save: GameSave,
  stockId: StockId,
  direction: 'long' | 'short',
  budgetRatio: number,
): { ok: boolean; reason?: string; invested: number } {
  const clampedRatio = Math.max(0.05, Math.min(1, budgetRatio));
  const spend = Math.floor(save.money * clampedRatio);
  if (spend < 100) return { ok: false, reason: '至少需要 ¥100 流动现金建仓', invested: 0 };

  const existing = save.stockPositions[stockId];
  if (existing && existing.direction !== direction) {
    return { ok: false, reason: '请先平掉反向仓位再反手操作', invested: 0 };
  }

  const price = currentStockPrice(save, stockId);
  const addShares = spend / price;
  save.money -= spend;

  if (existing) {
    const totalInvested = existing.invested + spend;
    const totalShares = existing.shares + addShares;
    save.stockPositions[stockId] = {
      direction,
      shares: totalShares,
      invested: totalInvested,
      avgPrice: totalInvested / totalShares,
    };
  } else {
    save.stockPositions[stockId] = {
      direction,
      shares: addShares,
      invested: spend,
      avgPrice: price,
    };
  }
  return { ok: true, invested: spend };
}

/** 平仓结算：净赚金额同步计入身价 netWorth；若亏损则不倒扣历史身价 */
export function closeStockPosition(
  save: GameSave,
  stockId: StockId,
): { ok: boolean; payout: number; pnl: number; pnlPct: number; wasShortSushi: boolean } {
  const pos = save.stockPositions[stockId];
  if (!pos) return { ok: false, payout: 0, pnl: 0, pnlPct: 0, wasShortSushi: false };

  const cur = currentStockPrice(save, stockId);
  const { payout, pnl, pnlPct } = calcPositionValuation(pos, cur);
  const wasShortSushi = stockId === 'sushi' && pos.direction === 'short';

  delete save.stockPositions[stockId];
  save.money += payout;
  if (pnl > 0) {
    save.netWorth += pnl;
  }
  return { ok: true, payout, pnl, pnlPct, wasShortSushi };
}

/** 是否存在浮盈超过 +12% 的持仓（供主界面侧边操盘红点提示） */
export function hasProfitablePosition(save: GameSave): boolean {
  for (const [id, pos] of Object.entries(save.stockPositions ?? {}) as [StockId, StockPosition | undefined][]) {
    if (!pos) continue;
    const { pnlPct } = calcPositionValuation(pos, currentStockPrice(save, id));
    if (pnlPct >= 0.12) return true;
  }
  return false;
}
