/**
 * 总裁案头决策卡（取代单调的纯文字二选一弹窗）：
 * 每次突发商海/打脸奇遇提供 3 条截然不同的策略路线：
 * 1. 【稳健公关 · 100% 稳拿】保底现金 + 玫瑰 + 灵感；
 * 2. 【专长反击 · 实力检定】实时联动店员专长星级 / 门店等级 / 爆品研发数计算成功率，赢取近 3 倍赔偿！
 * 3. 【资本豪赌 · 风险博弈】押注流动现金掀桌反杀，赢则 4 倍暴利 + 立即引爆全城爆单 Fever！
 */
import * as PIXI from 'pixi.js';
import { ICONS } from '@/data/art';
import type { StreetEventDef } from '@/data/streetEvents';
import { AudioManager } from '@/core/AudioManager';
import { Game } from '@/core/Game';
import { OverlayManager } from '@/core/OverlayManager';
import { Platform } from '@/core/PlatformService';
import { ToastManager } from '@/core/ToastManager';
import { Ease, TweenManager } from '@/core/TweenManager';
import { GameState } from '@/managers/GameState';
import { evalStreetCheckChance, evalStreetGambleChance } from '@/sim/actions';
import { baseIncomePerSec, computeSynergies } from '@/sim/economy';
import { formatMoney } from '@/sim/format';
import { Button } from '@/ui/Button';
import {
  COLORS,
  drawCreamCard,
  makeOrnatePanel,
  makeRibbonHeader,
  makeStickerSprite,
  makeText,
} from '@/ui/theme';

class DecisionModalClass extends PIXI.Container {
  private readonly _dim = new PIXI.Graphics();
  private readonly _card = new PIXI.Container();
  private _resolve: (() => void) | null = null;

  constructor() {
    super();
    this.visible = false;
    this.zIndex = 158;
    this._dim.eventMode = 'static';
    this._card.eventMode = 'static';
    this.addChild(this._dim, this._card);
    OverlayManager.container.addChild(this);
  }

  open(event: StreetEventDef): Promise<void> {
    this._close();
    this.visible = true;
    OverlayManager.bringToFront();
    AudioManager.play('ui_open');

    const W = Game.logicWidth;
    const H = Game.logicHeight;
    this._dim.clear().beginFill(0x33271D, 0.54).drawRect(0, 0, W, H).endFill();
    for (const c of this._card.removeChildren()) c.destroy({ children: true });

    const cw = 684;
    const chH = 886;
    this._card.position.set(W / 2, H / 2 + 12);

    const panel = makeOrnatePanel(cw, chH);
    panel.position.set(-cw / 2, -chH / 2);
    const ribbon = makeRibbonHeader('总裁紧急决策案', 520);
    ribbon.position.set(0, -chH / 2 + 12);
    this._card.addChild(panel, ribbon);

    const closeBtn = new PIXI.Container();
    closeBtn.position.set(cw / 2 - 42, -chH / 2 + 40);
    closeBtn.addChild(drawCreamCard(new PIXI.Graphics(), -22, -22, 44, 44, 22, { fill: 0xFFFDF8, borderColor: 0xDFB870 }));
    const xTxt = makeText('×', 28, COLORS.inkSoft, true);
    xTxt.anchor.set(0.5);
    xTxt.position.set(0, -2);
    closeBtn.addChild(xTxt);
    closeBtn.eventMode = 'static';
    closeBtn.cursor = 'pointer';
    closeBtn.on('pointertap', () => {
      AudioManager.play('ui_close');
      this._close();
    });
    this._card.addChild(closeBtn);

    // 事件案情头卡
    const headY = -chH / 2 + 88;
    const evIco = makeStickerSprite(ICONS.event, 54, 54, true);
    evIco.position.set(-cw / 2 + 70, headY + 34);
    const title = makeText(event.title, 26, COLORS.ink, true);
    title.position.set(-cw / 2 + 108, headY + 4);
    if (title.width > cw - 156) title.scale.set((cw - 156) / title.width);

    const desc = makeText(event.desc, 19, COLORS.inkSoft);
    desc.style.wordWrap = true;
    desc.style.wordWrapWidth = cw - 108;
    desc.style.breakWords = true;
    desc.style.lineHeight = 29;
    desc.position.set(-cw / 2 + 54, headY + 56);
    this._card.addChild(evIco, title, desc);

    const save = GameState.save;
    const syn = computeSynergies(save);
    const baseSec = baseIncomePerSec(save);

    // 选项 1：稳健公关
    const opt0 = event.options[0];
    const cash0 = Math.max(opt0.minCash, baseSec * opt0.cashSec) * syn.rushMult;

    // 选项 2：实力检定反击
    const opt1 = event.options[1];
    const checkInfo = evalStreetCheckChance(save, opt1);
    const cash1 = Math.max(opt1.minCash, baseSec * opt1.cashSec) * syn.rushMult;
    const pct1 = Math.round(checkInfo.chance * 100);

    // 选项 3：资本豪赌掀桌
    const opt2 = event.options[2];
    const gambleInfo = evalStreetGambleChance(save, opt2);
    const cash2 = gambleInfo.stake * (opt2.winMult - 1) + Math.max(opt2.minCash, baseSec * opt2.cashSec) * syn.rushMult;
    const pct2 = Math.round(gambleInfo.chance * 100);

    const cardsStartY = headY + 144;
    const rowH = 192;
    const rowGap = 16;

    const handleChoose = (idx: 0 | 1 | 2): void => {
      const res = GameState.resolveStreetEvent(event, idx);
      Platform.vibrateShort(res.won ? 'medium' : 'light');
      AudioManager.play(res.won ? 'bond_up' : 'ui_click');
      this._renderResultStamp(cw, chH, event.title, res.won, res.outcomeText, res.cash, res.stakeLost, res.roses, res.inspiration, res.feverTriggered);
    };

    this._card.addChild(
      this._buildOptionCard({
        y: cardsStartY,
        w: cw - 68,
        h: rowH,
        tag: '方案一 · 稳健公关',
        rateText: '成功率 100%',
        rateColor: COLORS.mint,
        bgFill: 0xFFFDF9,
        borderColor: 0xDFB870,
        label: opt0.label,
        reqLine: '零风险稳妥处置，保住品牌口碑与基础进账',
        rewardLine: `稳拿 +¥${formatMoney(cash0)} · 玫瑰+${opt0.roses} · 灵感+${opt0.inspiration ?? 1}`,
        btnVariant: 'mint',
        btnText: '稳妥执行',
        onTap: () => handleChoose(0),
      }),
      this._buildOptionCard({
        y: cardsStartY + rowH + rowGap,
        w: cw - 68,
        h: rowH,
        tag: '方案二 · 实力检定反击',
        rateText: `当前胜率 ${pct1}%`,
        rateColor: pct1 >= 80 ? COLORS.mint : COLORS.goldDeep,
        bgFill: 0xFFF9EC,
        borderColor: 0xE2A94B,
        label: opt1.label,
        reqLine: `${opt1.reqDesc}（当前已达 ${checkInfo.currentVal}/${opt1.targetVal}）`,
        rewardLine: `大成赢取 +¥${formatMoney(cash1)} · 玫瑰+${opt1.roses} · 灵感+${opt1.inspiration}`,
        btnVariant: 'gold',
        btnText: '亮实力反击',
        onTap: () => handleChoose(1),
      }),
      this._buildOptionCard({
        y: cardsStartY + (rowH + rowGap) * 2,
        w: cw - 68,
        h: rowH,
        tag: '方案三 · 资本豪赌掀桌',
        rateText: `博弈胜率 ${pct2}%`,
        rateColor: COLORS.roseDeep,
        bgFill: 0xFFF3EE,
        borderColor: COLORS.rose,
        label: opt2.label,
        reqLine: gambleInfo.stake > 0
          ? `需押注流动资金 ¥${formatMoney(gambleInfo.stake)}（败则损本金，绝不扣身价）`
          : '零本金破釜沉舟豪赌，风控与公关店员可提升胜率',
        rewardLine: `博赢狂赚 +¥${formatMoney(cash2)} · 玫瑰+${opt2.roses} · 直开全城爆单!`,
        btnVariant: 'rose',
        btnText: '押注掀桌!',
        onTap: () => handleChoose(2),
      }),
    );

    this.alpha = 0;
    this._card.scale.set(0.92);
    TweenManager.to({ target: this, props: { alpha: 1 }, duration: 0.18 });
    TweenManager.to({ target: this._card.scale, props: { x: 1, y: 1 }, duration: 0.24, ease: Ease.easeOutBack });

    return new Promise((resolve) => { this._resolve = resolve; });
  }

  private _buildOptionCard(cfg: {
    y: number;
    w: number;
    h: number;
    tag: string;
    rateText: string;
    rateColor: number;
    bgFill: number;
    borderColor: number;
    label: string;
    reqLine: string;
    rewardLine: string;
    btnVariant: 'mint' | 'gold' | 'rose';
    btnText: string;
    onTap: () => void;
  }): PIXI.Container {
    const wrap = new PIXI.Container();
    wrap.position.set(-cfg.w / 2, cfg.y);

    wrap.addChild(drawCreamCard(new PIXI.Graphics(), 0, 0, cfg.w, cfg.h, 22, {
      fill: cfg.bgFill,
      borderColor: cfg.borderColor,
      borderWidth: 2.2,
    }));

    const tagBg = new PIXI.Graphics()
      .beginFill(cfg.borderColor, 0.18)
      .drawRoundedRect(18, 14, 212, 30, 15)
      .endFill();
    const tagTxt = makeText(cfg.tag, 16, COLORS.ink, true);
    tagTxt.position.set(30, 17);
    wrap.addChild(tagBg, tagTxt);

    const rateTxt = makeText(cfg.rateText, 18, cfg.rateColor, true);
    rateTxt.anchor.set(1, 0);
    rateTxt.position.set(cfg.w - 22, 16);
    wrap.addChild(rateTxt);

    const mainTxt = makeText(cfg.label, 22, COLORS.ink, true);
    mainTxt.position.set(20, 52);
    if (mainTxt.width > cfg.w - 196) mainTxt.scale.set((cfg.w - 196) / mainTxt.width);
    wrap.addChild(mainTxt);

    const reqTxt = makeText(cfg.reqLine, 16, COLORS.inkSoft);
    reqTxt.position.set(20, 88);
    if (reqTxt.width > cfg.w - 196) reqTxt.scale.set((cfg.w - 196) / reqTxt.width);
    wrap.addChild(reqTxt);

    const rewTxt = makeText(cfg.rewardLine, 17, COLORS.roseDeep, true);
    rewTxt.position.set(20, 122);
    if (rewTxt.width > cfg.w - 40) rewTxt.scale.set((cfg.w - 40) / rewTxt.width);
    wrap.addChild(rewTxt);

    const btn = new Button({
      width: 156,
      height: 54,
      variant: cfg.btnVariant,
      fontSize: 19,
      label: cfg.btnText,
      onTap: cfg.onTap,
    });
    btn.position.set(cfg.w - 96, 80);
    wrap.addChild(btn);

    return wrap;
  }

  private _renderResultStamp(
    cw: number,
    chH: number,
    title: string,
    won: boolean,
    outcomeText: string,
    cash: number,
    stakeLost: number,
    roses: number,
    inspiration: number,
    feverTriggered: boolean,
  ): void {
    for (const c of this._card.removeChildren()) c.destroy({ children: true });
    const resH = 560;
    const panel = makeOrnatePanel(cw, resH);
    panel.position.set(-cw / 2, -resH / 2);
    const ribbon = makeRibbonHeader(won ? '✦ 决策大捷 · 漂亮反击' : '商海波折 · 稳住阵脚', 520);
    ribbon.position.set(0, -resH / 2 + 12);
    this._card.addChild(panel, ribbon);

    const subHead = makeText(title, 22, COLORS.inkSoft, true);
    subHead.anchor.set(0.5);
    subHead.position.set(0, -resH / 2 + 104);
    this._card.addChild(subHead);

    const outNode = makeText(outcomeText, 24, COLORS.ink, true);
    outNode.style.align = 'center';
    outNode.style.wordWrap = true;
    outNode.style.wordWrapWidth = cw - 100;
    outNode.style.breakWords = true;
    outNode.style.lineHeight = 38;
    outNode.anchor.set(0.5, 0);
    outNode.position.set(0, -resH / 2 + 148);
    this._card.addChild(outNode);

    const gains: string[] = [];
    if (cash > 0) gains.push(`入账 +¥${formatMoney(cash)}`);
    if (stakeLost > 0) gains.push(`押注损耗 -¥${formatMoney(stakeLost)}`);
    if (roses > 0) gains.push(`心动玫瑰 +${roses}`);
    if (inspiration > 0) gains.push(`研发灵感 +${inspiration}`);
    if (feverTriggered) gains.push('✦ 引爆全城爆单时刻!');

    const gainBanner = drawCreamCard(new PIXI.Graphics(), -cw / 2 + 48, resH / 2 - 196, cw - 96, 68, 20, {
      fill: won ? 0xFFF4E4 : 0xF7EFE2,
      borderColor: won ? COLORS.rose : COLORS.borderGold,
    });
    const gainTxt = makeText(gains.join('  ·  '), 20, won ? COLORS.roseDeep : COLORS.ink, true);
    gainTxt.anchor.set(0.5);
    gainTxt.position.set(0, resH / 2 - 162);
    if (gainTxt.width > cw - 124) gainTxt.scale.set((cw - 124) / gainTxt.width);
    this._card.addChild(gainBanner, gainTxt);

    const okBtn = new Button({
      width: 380,
      height: 78,
      variant: won ? 'rose' : 'gold',
      fontSize: 25,
      label: '✦ 收下战果',
      onTap: () => {
        ToastManager.show(gains.join(' · '), won ? 'success' : undefined);
        this._close();
      },
    });
    okBtn.position.set(0, resH / 2 - 68);
    this._card.addChild(okBtn);
  }

  private _close(): void {
    const r = this._resolve;
    this._resolve = null;
    this.visible = false;
    if (r) r();
  }
}

export const DecisionModal = new DecisionModalClass();
