/**
 * 晚星风投 · 商海做空操盘页（`StockMarketSheet`）：
 * - 实时滚动 5 支商界标的（含宿敌妖股「苏氏食品」专供借券做空痛打落水狗！）；
 * - 顶部内幕风声情报台：结识对应男主或拥有 3★ 风控店员即可破译高胜率红字密报；
 * - 原生高清抗锯齿分时涨跌曲线 + 建仓成本均线 + 一键做多/借券做空结算闭环。
 */
import * as PIXI from 'pixi.js';
import { ICONS } from '@/data/art';
import { STOCKS, type StockDef, type StockId } from '@/data/stocks';
import { EV } from '@/config/events';
import { AudioManager } from '@/core/AudioManager';
import { EventBus } from '@/core/EventBus';
import { Game } from '@/core/Game';
import { Platform } from '@/core/PlatformService';
import { ToastManager } from '@/core/ToastManager';
import { GameState } from '@/managers/GameState';
import { formatMoney } from '@/sim/format';
import {
  calcPositionValuation,
  currentRumor,
  currentStockPrice,
  isInsiderUnlocked,
  stockLastChangePct,
} from '@/sim/stockSim';
import { Button } from '@/ui/Button';
import { PAGE_PAD, Page } from '@/ui/Page';
import {
  COLORS,
  drawCreamCard,
  makeCouturePlaque,
  makeNumText,
  makeStickerSprite,
  makeText,
} from '@/ui/theme';

const BUDGET_RATIOS: readonly [number, string][] = [
  [0.25, '25%仓'],
  [0.50, '半仓50%'],
  [1.00, '满仓梭哈'],
];

export class StockMarketSheet extends Page {
  private readonly _rumorWrap = new PIXI.Container();
  private readonly _tabsWrap = new PIXI.Container();
  private readonly _chartWrap = new PIXI.Container();
  private readonly _tradeWrap = new PIXI.Container();
  private readonly _countdownTxt = makeText('', 16, COLORS.inkSoft, true);

  private _selected: StockId = 'sushi';
  private _ratio = 0.50;
  private _acc = 0;

  private readonly _tickFn = (): void => {
    if (!this.isOpen) return;
    this._acc += Game.ticker.deltaMS / 1000;
    if (this._acc >= 0.4) {
      this._acc = 0;
      const left = Math.max(0, Math.ceil((GameState.save.stockNextTickAt - Date.now()) / 1000));
      this._countdownTxt.text = `下轮跳动 ${left}s`;
    }
  };

  constructor() {
    super('晚星风投');
    this.body.addChild(this._rumorWrap, this._tabsWrap, this._chartWrap, this._tradeWrap);
    EventBus.on(EV.stockChanged, () => { if (this.isOpen) this.rebuild(); });
  }

  protected override onOpen(): void {
    Game.ticker.remove(this._tickFn);
    Game.ticker.add(this._tickFn);
  }

  protected override onClose(): void {
    Game.ticker.remove(this._tickFn);
  }

  protected layoutBody(top: number, bottom: number): void {
    const W = Game.logicWidth;
    const fullW = W - PAGE_PAD * 2;

    const rumorH = 122;
    this._buildRumorBar(top, fullW, rumorH);

    const tabsTop = top + rumorH + 12;
    const tabsH = 104;
    this._buildStockTabs(tabsTop, fullW, tabsH);

    const tradeH = 276;
    const tradeTop = bottom - tradeH;
    const chartTop = tabsTop + tabsH + 12;
    const chartH = Math.max(210, tradeTop - 12 - chartTop);

    this._buildChartPanel(chartTop, fullW, chartH);
    this._buildTradeConsole(tradeTop, fullW, tradeH);
  }

  private _buildRumorBar(y: number, fullW: number, h: number): void {
    this._countdownTxt.parent?.removeChild(this._countdownTxt);
    for (const c of this._rumorWrap.removeChildren()) c.destroy({ children: true });
    this._rumorWrap.position.set(PAGE_PAD, y);

    const save = GameState.save;
    const rumor = currentRumor(save);
    const unlocked = isInsiderUnlocked(save, rumor);

    this._rumorWrap.addChild(drawCreamCard(new PIXI.Graphics(), 0, 0, fullW, h, 22, {
      fill: 0xFFF7EA, borderColor: 0xDFB870, borderWidth: 2,
    }));

    const tagBg = new PIXI.Graphics().beginFill(0xC64F3D, 1).drawRoundedRect(16, 12, 134, 28, 14).endFill();
    const tagTxt = makeText('商海实时风声', 15, 0xFFFFFF, true);
    tagTxt.anchor.set(0.5);
    tagTxt.position.set(83, 26);
    this._rumorWrap.addChild(tagBg, tagTxt);

    const leftSec = Math.max(0, Math.ceil((save.stockNextTickAt - Date.now()) / 1000));
    this._countdownTxt.text = `下轮跳动 ${leftSec}s`;
    this._countdownTxt.anchor.set(1, 0.5);
    this._countdownTxt.position.set(fullW - 184, 26);
    this._rumorWrap.addChild(this._countdownTxt);

    const tokenCount = save.insiderTokens ?? 0;
    const stepBtn = new Button({
      width: 156,
      height: 34,
      variant: 'gold',
      fontSize: 15,
      label: `研报推进 (${tokenCount})`,
      onTap: () => {
        if (GameState.spendInsiderToken()) {
          AudioManager.play('coin_tap');
          ToastManager.show('已消耗 1 张内幕研报，全市场行情立即结算一轮！', 'success');
        } else {
          ToastManager.show('内幕研报券不足，可通过「商业外勤」或「商战大捷」获取！');
        }
      },
    });
    stepBtn.setEnabled(tokenCount > 0);
    stepBtn.position.set(fullW - 92, 26);
    this._rumorWrap.addChild(stepBtn);

    const headTxt = makeText(rumor.headline, 18, COLORS.ink, true);
    headTxt.position.set(18, 48);
    if (headTxt.width > fullW - 36) headTxt.scale.set((fullW - 36) / headTxt.width);
    this._rumorWrap.addChild(headTxt);

    const insiderStr = unlocked
      ? `✦ ${rumor.insiderNote}`
      : '✦ 密报加密中：结识对应合伙人或培养 3★ 铁腕风控店员即可破译多空方向！';
    const insiderTxt = makeText(insiderStr, 16, unlocked ? COLORS.roseDeep : COLORS.inkMuted, true);
    insiderTxt.position.set(18, 82);
    if (insiderTxt.width > fullW - 36) insiderTxt.scale.set((fullW - 36) / insiderTxt.width);
    this._rumorWrap.addChild(insiderTxt);
  }

  private _buildStockTabs(y: number, fullW: number, h: number): void {
    for (const c of this._tabsWrap.removeChildren()) c.destroy({ children: true });
    this._tabsWrap.position.set(PAGE_PAD, y);

    const save = GameState.save;
    const gap = 8;
    const itemW = Math.floor((fullW - gap * (STOCKS.length - 1)) / STOCKS.length);

    STOCKS.forEach((st, idx) => {
      const selected = st.id === this._selected;
      const cur = currentStockPrice(save, st.id);
      const chg = stockLastChangePct(save, st.id);
      const holding = Boolean(save.stockPositions[st.id]);

      const cell = new PIXI.Container();
      cell.position.set(idx * (itemW + gap), 0);
      cell.addChild(drawCreamCard(new PIXI.Graphics(), 0, 0, itemW, h, 18, {
        fill: selected ? 0xFFF1E6 : 0xFFFDF9,
        borderColor: selected ? COLORS.rose : (st.rivalTag ? 0xD98B6C : 0xDFB870),
        borderWidth: selected ? 2.8 : 1.6,
      }));

      const name = makeText(st.name, 17, selected ? COLORS.roseDeep : COLORS.ink, true);
      name.anchor.set(0.5);
      name.position.set(itemW / 2, 22);
      if (name.width > itemW - 12) name.scale.set((itemW - 12) / name.width);
      cell.addChild(name);

      const price = makeNumText(`¥${cur.toFixed(1)}`, 19, COLORS.ink);
      price.anchor.set(0.5);
      price.position.set(itemW / 2, 52);
      cell.addChild(price);

      const up = chg >= 0;
      const sign = up ? '▲+' : '▼';
      const pctStr = `${sign}${(chg * 100).toFixed(1)}%`;
      const pct = makeNumText(pctStr, 15, up ? 0xD85040 : COLORS.mint);
      pct.anchor.set(0.5);
      pct.position.set(itemW / 2, 82);
      cell.addChild(pct);

      if (holding) {
        const dot = new PIXI.Graphics().lineStyle(2, 0xFFFFFF).beginFill(COLORS.gold, 1).drawCircle(itemW - 12, 12, 6).endFill();
        cell.addChild(dot);
      }

      cell.eventMode = 'static';
      cell.cursor = 'pointer';
      cell.on('pointertap', () => {
        if (this._selected === st.id) return;
        AudioManager.play('ui_click');
        this._selected = st.id;
        this.rebuild();
      });
      this._tabsWrap.addChild(cell);
    });
  }

  private _buildChartPanel(y: number, fullW: number, h: number): void {
    for (const c of this._chartWrap.removeChildren()) c.destroy({ children: true });
    this._chartWrap.position.set(PAGE_PAD, y);

    const save = GameState.save;
    const def: StockDef = STOCKS.find((s) => s.id === this._selected) ?? STOCKS[0];
    const prices = save.stockPrices[def.id] ?? [def.basePrice, def.basePrice];
    const cur = prices[prices.length - 1];
    const chg = stockLastChangePct(save, def.id);
    const pos = save.stockPositions[def.id];

    this._chartWrap.addChild(makeCouturePlaque(fullW, h, false, false));

    const header = makeText(`${def.name} (${def.code})  ·  ${def.sector}`, 19, COLORS.ink, true);
    header.position.set(22, 16);
    if (header.width > fullW - 220) header.scale.set((fullW - 220) / header.width);
    this._chartWrap.addChild(header);

    const curBadge = makeNumText(
      `现价 ¥${cur.toFixed(2)} (${chg >= 0 ? '+' : ''}${(chg * 100).toFixed(1)}%)`,
      19,
      chg >= 0 ? 0xD85040 : COLORS.mint,
    );
    curBadge.anchor.set(1, 0);
    curBadge.position.set(fullW - 22, 16);
    this._chartWrap.addChild(curBadge);

    // 绘图坐标系
    const plotX = 28;
    const plotY = 56;
    const plotW = fullW - 56;
    const plotH = h - 78;

    const allVals = pos ? [...prices, pos.avgPrice] : prices;
    const minP = Math.min(...allVals) * 0.94;
    const maxP = Math.max(...allVals) * 1.06;
    const span = Math.max(1, maxP - minP);

    const toY = (v: number): number => plotY + plotH - ((v - minP) / span) * plotH;
    const toX = (i: number): number => plotX + (i / Math.max(1, prices.length - 1)) * plotW;

    const grid = new PIXI.Graphics();
    grid.lineStyle(1, 0xE7D7BE, 0.8);
    for (let r = 0; r <= 3; r++) {
      const gy = plotY + (plotH * r) / 3;
      grid.moveTo(plotX, gy).lineTo(plotX + plotW, gy);
    }

    // 柔和面积底色填充 + 折线
    const lineCol = chg >= 0 ? 0xE05A4E : 0x349E5A;
    const polyPts: number[] = [toX(0), plotY + plotH];
    prices.forEach((p, idx) => {
      polyPts.push(toX(idx), toY(p));
    });
    polyPts.push(toX(prices.length - 1), plotY + plotH);
    grid.lineStyle(0).beginFill(lineCol, 0.12).drawPolygon(polyPts).endFill();

    grid.lineStyle(3.6, lineCol, 0.98);
    prices.forEach((p, idx) => {
      const px = toX(idx);
      const py = toY(p);
      if (idx === 0) grid.moveTo(px, py);
      else grid.lineTo(px, py);
    });

    // 若持有仓位，画出醒目的金色建仓成本参考线
    if (pos) {
      const ay = toY(pos.avgPrice);
      grid.lineStyle(2.2, 0xD99B26, 0.92);
      for (let sx = plotX; sx < plotX + plotW; sx += 16) {
        grid.moveTo(sx, ay).lineTo(Math.min(plotX + plotW, sx + 9), ay);
      }
      const avgLbl = makeText(
        `${pos.direction === 'short' ? '做空均价' : '做多均价'} ¥${pos.avgPrice.toFixed(1)}`,
        15,
        COLORS.goldDeep,
        true,
      );
      avgLbl.position.set(plotX + 8, Math.max(plotY + 2, ay - 22));
      this._chartWrap.addChild(grid, avgLbl);
    } else {
      this._chartWrap.addChild(grid);
    }

    const lastDot = new PIXI.Graphics()
      .lineStyle(2.5, 0xFFFFFF)
      .beginFill(lineCol, 1)
      .drawCircle(toX(prices.length - 1), toY(cur), 6.5)
      .endFill();
    this._chartWrap.addChild(lastDot);
  }

  private _buildTradeConsole(y: number, fullW: number, h: number): void {
    for (const c of this._tradeWrap.removeChildren()) c.destroy({ children: true });
    this._tradeWrap.position.set(PAGE_PAD, y);

    const save = GameState.save;
    const def = STOCKS.find((s) => s.id === this._selected) ?? STOCKS[0];
    const pos = save.stockPositions[def.id];
    const cur = currentStockPrice(save, def.id);

    this._tradeWrap.addChild(makeCouturePlaque(fullW, h, Boolean(pos), false));

    // 1. 当前持仓盈亏条
    const posBoxH = 88;
    const posBg = drawCreamCard(new PIXI.Graphics(), 18, 16, fullW - 36, posBoxH, 18, {
      fill: pos ? 0xFFF7EA : 0xFAF2E4,
      borderColor: pos ? COLORS.gold : COLORS.borderSoft,
    });
    this._tradeWrap.addChild(posBg);

    if (pos) {
      const val = calcPositionValuation(pos, cur);
      const dirTag = pos.direction === 'short' ? '【借券做空】' : '【买入做多】';
      const pnlSign = val.pnl >= 0 ? '+' : '-';
      const pnlCol = val.pnl >= 0 ? COLORS.roseDeep : COLORS.mint;

      const line1 = makeText(`${dirTag} 本金 ¥${formatMoney(pos.invested)} · 建仓 ¥${pos.avgPrice.toFixed(1)}`, 18, COLORS.ink, true);
      line1.position.set(34, 28);
      if (line1.width > fullW - 246) line1.scale.set((fullW - 246) / line1.width);

      const line2 = makeNumText(
        `浮动盈亏：${pnlSign}¥${formatMoney(Math.abs(val.pnl))} (${pnlSign}${(Math.abs(val.pnlPct) * 100).toFixed(1)}%)`,
        20,
        pnlCol,
      );
      line2.position.set(34, 60);
      if (line2.width > fullW - 246) line2.scale.set((fullW - 246) / line2.width);

      const closeBtn = new Button({
        width: 178,
        height: 58,
        variant: val.pnl >= 0 ? 'rose' : 'gold',
        fontSize: 20,
        label: val.pnl >= 0 ? '✦ 止盈平仓' : '平仓交割',
        onTap: () => this._doSettle(def),
      });
      closeBtn.position.set(fullW - 114, 16 + posBoxH / 2);
      this._tradeWrap.addChild(line1, line2, closeBtn);
    } else {
      const emptyIco = makeStickerSprite(ICONS.coins, 40, 40, true);
      emptyIco.position.set(48, 16 + posBoxH / 2);
      const emptyTxt = makeText(
        def.id === 'sushi'
          ? '当前空仓 · 抓准苏氏负面密报「借券做空」，暴跌越狠赚得越多！'
          : `当前未持有「${def.name}」仓位 · 看涨选做多，看跌选借券做空`,
        17,
        COLORS.inkSoft,
        true,
      );
      emptyTxt.anchor.set(0, 0.5);
      emptyTxt.position.set(76, 16 + posBoxH / 2);
      if (emptyTxt.width > fullW - 102) emptyTxt.scale.set((fullW - 102) / emptyTxt.width);
      this._tradeWrap.addChild(emptyIco, emptyTxt);
    }

    // 2. 仓位比例选择行
    const ratioY = 118;
    const ratioLbl = makeText('单笔投入比例：', 17, COLORS.inkSoft, true);
    ratioLbl.position.set(24, ratioY + 8);
    this._tradeWrap.addChild(ratioLbl);

    BUDGET_RATIOS.forEach(([r, label], idx) => {
      const active = Math.abs(this._ratio - r) < 0.01;
      const pw = 152;
      const ph = 38;
      const pill = new PIXI.Container();
      pill.position.set(164 + idx * (pw + 12), ratioY);
      pill.addChild(drawCreamCard(new PIXI.Graphics(), 0, 0, pw, ph, 19, {
        fill: active ? 0xFDE8E2 : 0xFFFDF9,
        borderColor: active ? COLORS.rose : 0xDFB870,
        borderWidth: active ? 2.4 : 1.5,
      }));
      const t = makeText(label, 17, active ? COLORS.roseDeep : COLORS.ink, true);
      t.anchor.set(0.5);
      t.position.set(pw / 2, ph / 2);
      pill.addChild(t);
      pill.eventMode = 'static';
      pill.cursor = 'pointer';
      pill.on('pointertap', () => {
        AudioManager.play('ui_click');
        this._ratio = r;
        this.rebuild();
      });
      this._tradeWrap.addChild(pill);
    });

    // 3. 底部做多 / 借券做空双按钮
    const estSpend = Math.floor(save.money * this._ratio);
    const btnW = Math.floor((fullW - 52) / 2);
    const btnY = h - 54;

    const longBtn = new Button({
      width: btnW,
      height: 74,
      variant: 'mint',
      fontSize: 22,
      label: '▲ 买入做多（看涨）',
      sub: estSpend >= 100 ? `投入 ¥${formatMoney(estSpend)}` : '需 ¥100 起投',
      onTap: () => this._doTrade(def, 'long'),
    });
    longBtn.setEnabled(estSpend >= 100 && (!pos || pos.direction === 'long'));
    longBtn.position.set(18 + btnW / 2, btnY);

    const shortBtn = new Button({
      width: btnW,
      height: 74,
      variant: 'rose',
      fontSize: 22,
      label: '▼ 借券做空（看跌）',
      sub: estSpend >= 100 ? `押注下跌 ¥${formatMoney(estSpend)}` : '需 ¥100 起投',
      onTap: () => this._doTrade(def, 'short'),
    });
    shortBtn.setEnabled(estSpend >= 100 && (!pos || pos.direction === 'short'));
    shortBtn.position.set(fullW - 18 - btnW / 2, btnY);

    this._tradeWrap.addChild(longBtn, shortBtn);
  }

  private _doTrade(def: StockDef, dir: 'long' | 'short'): void {
    const res = GameState.tradeStock(def.id, dir, this._ratio);
    if (!res.ok) {
      ToastManager.show(res.reason ?? '建仓失败');
      return;
    }
    Platform.vibrateShort('light');
    AudioManager.play('coin_spend');
    const actionName = dir === 'short' ? '借券做空' : '买入做多';
    ToastManager.show(`已${actionName}「${def.name}」¥${formatMoney(res.invested)}！`, 'success');
  }

  private _doSettle(def: StockDef): void {
    const res = GameState.settleStock(def.id);
    if (!res.ok) return;
    Platform.vibrateShort(res.pnl >= 0 ? 'medium' : 'light');
    AudioManager.play(res.pnl >= 0 ? 'level_up' : 'coin_tap');

    if (res.pnl > 0 && res.wasShortSushi) {
      ToastManager.show(
        `✦ 痛宰苏氏！精准做空净赚 +¥${formatMoney(res.pnl)}（苏卫国在办公室气摔茶杯！）`,
        'success',
      );
    } else if (res.pnl >= 0) {
      ToastManager.show(
        `✦ 操盘止盈落袋！收回 ¥${formatMoney(res.payout)}（净赚 +¥${formatMoney(res.pnl)}）`,
        'success',
      );
    } else {
      ToastManager.show(
        `已平仓收回 ¥${formatMoney(res.payout)}（历史最高身价不受任何影响）`,
      );
    }
  }
}
