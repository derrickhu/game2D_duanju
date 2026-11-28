/**
 * 3 回合「商战底牌克制对决」+ 章节结尾「女主高光抉择」弹窗：
 * - 对手每回合亮出【口碑 / 资本 / 法务】盘外招意图与挑衅台词；
 * - 玩家根据养成动态构筑的三系王牌看破克制（口碑克资本、资本克法务、法务克口碑），触发 2.0x 破防打脸暴击！
 * - 累积 2 次克制即可解锁无视防御的「✦ 女王掀桌绝杀」直接清空残余气焰；
 * - 同时支持主线第 1~8 章恶人战与产业大地图 6 大城区「商圈冠名竞标战」。
 */
import * as PIXI from 'pixi.js';
import { ICONS, SHOP_ICONS, outfitFigurePath } from '@/data/art';
import {
  CHAPTER_BATTLES,
  SUIT_META,
  getAreaCrownEncounter,
  type BattleEncounterDef,
  type BattleSuit,
} from '@/data/battleCards';
import type { ChapterDef } from '@/data/story';
import { CHAPTER_CLIMAXES } from '@/data/streetEvents';
import { AREAS, type AreaId } from '@/data/world';
import { AudioManager } from '@/core/AudioManager';
import { Game } from '@/core/Game';
import { OverlayManager } from '@/core/OverlayManager';
import { Platform } from '@/core/PlatformService';
import { ToastManager } from '@/core/ToastManager';
import { Ease, TweenManager } from '@/core/TweenManager';
import { GameState } from '@/managers/GameState';
import { buildBattleHand, evaluateSuitRelation, resolveCardClash, type PlayerBattleCard } from '@/sim/battle';
import { formatMoney } from '@/sim/format';
import { Button } from '@/ui/Button';
import { ProgressBar } from '@/ui/ProgressBar';
import {
  COLORS,
  drawCreamCard,
  makeCouturePlaque,
  makeDisplayText,
  makeNumText,
  makeOrnatePanel,
  makeRibbonBanner,
  makeRibbonHeader,
  makeStickerSprite,
  makeText,
} from '@/ui/theme';
import { showFigure } from '@/utils/assets';

function counterSuitFor(enemySuit: BattleSuit): BattleSuit {
  if (enemySuit === 'cap') return 'rep';
  if (enemySuit === 'leg') return 'cap';
  return 'leg';
}

class BusinessBattleModalClass extends PIXI.Container {
  private readonly _dim = new PIXI.Graphics();
  private readonly _card = new PIXI.Container();
  private _resolve: ((ok: boolean) => void) | null = null;

  constructor() {
    super();
    this.visible = false;
    this.zIndex = 160;
    this._dim.eventMode = 'static';
    this._card.eventMode = 'static';
    this.addChild(this._dim, this._card);
    OverlayManager.container.addChild(this);
  }

  /** 主线章节恶人商战对决（已通关则直接放行） */
  showBattle(ch: ChapterDef): Promise<boolean> {
    if (!ch.rival || GameState.save.clearedBattles.includes(ch.id)) return Promise.resolve(true);
    const enc = CHAPTER_BATTLES.get(ch.id);
    if (!enc) {
      GameState.clearChapterBattle(ch.id);
      return Promise.resolve(true);
    }
    return this._runEncounter(enc, '▶ 进入本章逆袭剧情', () => {
      const roses = GameState.clearChapterBattle(ch.id);
      return `✦ 打脸大捷！获赠心动玫瑰 +${roses}${enc.insiderReward > 0 ? ` · 内幕券 +${enc.insiderReward}` : ''}`;
    });
  }

  /** 产业大地图 6 大城区「商圈冠名竞标战」 */
  showAreaCrown(areaId: AreaId): Promise<boolean> {
    const save = GameState.save;
    const curTier = save.areaCrownLevels?.[areaId] ?? 0;
    if (curTier >= 3) {
      ToastManager.show('本商圈三阶女皇冠名权已全部拿下！');
      return Promise.resolve(false);
    }
    const area = AREAS.find((a) => a.id === areaId);
    if (!area || save.netWorth < area.unlockNetWorth) return Promise.resolve(false);

    const enc = getAreaCrownEncounter(areaId, area.name, (curTier + 1) as 1 | 2 | 3);
    return this._runEncounter(enc, '✦ 收下商圈冠名权', () => {
      const res = GameState.winAreaCrown(areaId);
      if (!res) return '✦ 商战大捷！';
      return `✦ 夺得「${area.name}」${res.newTier}阶冠名！+¥${formatMoney(res.cash)} · 玫瑰+${res.roses}`;
    });
  }

  private _runEncounter(
    enc: BattleEncounterDef,
    finishBtnLabel: string,
    onWinGrant: () => string,
  ): Promise<boolean> {
    this._closeCurrent(false);
    this.visible = true;
    OverlayManager.bringToFront();
    AudioManager.play('ui_open');

    const W = Game.logicWidth;
    const H = Game.logicHeight;
    this._dim.clear().beginFill(0x33271D, 0.56).drawRect(0, 0, W, H).endFill();

    let roundIdx = 0;
    let rivalHp = 100;
    let auraCount = 0;
    let moraleBoost = false;
    let animating = false;
    let battleWon = false;
    let rewardBannerStr = '';
    let lastClashMsg = '看破对手盘外招属性，打出【克制底牌】触发双倍破防！';
    let lastClashHighlight = false;

    const render = (): void => {
      for (const c of this._card.removeChildren()) c.destroy({ children: true });

      const cw = 692;
      const chH = 958;
      this._card.position.set(W / 2, H / 2 + 10);

      const panel = makeOrnatePanel(cw, chH);
      panel.position.set(-cw / 2, -chH / 2);
      const ribbon = makeRibbonHeader(enc.title, 540);
      ribbon.position.set(0, -chH / 2 + 12);
      this._card.addChild(panel, ribbon);

      // 右上角暂退关闭圆钮
      const closeBtn = new PIXI.Container();
      closeBtn.position.set(cw / 2 - 42, -chH / 2 + 40);
      const closeBg = drawCreamCard(new PIXI.Graphics(), -22, -22, 44, 44, 22, {
        fill: 0xFFFDF8, borderColor: 0xDFB870,
      });
      const closeTxt = makeText('×', 28, COLORS.inkSoft, true);
      closeTxt.anchor.set(0.5);
      closeTxt.position.set(0, -2);
      closeBtn.addChild(closeBg, closeTxt);
      closeBtn.eventMode = 'static';
      closeBtn.cursor = 'pointer';
      closeBtn.on('pointertap', () => {
        AudioManager.play('ui_close');
        this._closeCurrent(battleWon);
      });
      this._card.addChild(closeBtn);

      // 1. 对手信息与「嚣张气焰条」
      const topY = -chH / 2 + 92;
      const rivalBox = makeCouturePlaque(cw - 64, 152, false, false);
      rivalBox.position.set(-cw / 2 + 32, topY);
      this._card.addChild(rivalBox);

      const suwanAvatarBg = new PIXI.Graphics()
        .lineStyle(2, COLORS.borderGold)
        .beginFill(0xFFF6E8)
        .drawRoundedRect(-cw / 2 + 50, topY + 16, 92, 120, 16)
        .endFill();
      const suwanFig = new PIXI.Sprite();
      suwanFig.anchor.set(0.5, 0.05);
      suwanFig.position.set(-cw / 2 + 96, topY + 18);
      const figMask = new PIXI.Graphics().beginFill(0xFFFFFF).drawRoundedRect(-cw / 2 + 50, topY + 16, 92, 120, 16).endFill();
      suwanFig.mask = figMask;
      showFigure(suwanFig, outfitFigurePath(GameState.save.outfit), 180, 340, undefined, 'height');
      this._card.addChild(suwanAvatarBg, figMask, suwanFig);

      const rTitle = makeText(`${enc.rivalName} · ${enc.rivalTitle}`, 23, COLORS.ink, true);
      rTitle.position.set(-cw / 2 + 158, topY + 16);
      if (rTitle.width > cw - 230) rTitle.scale.set((cw - 230) / rTitle.width);
      this._card.addChild(rTitle);

      const rConflict = makeText(enc.conflict, 17, COLORS.inkSoft);
      rConflict.style.wordWrap = true;
      rConflict.style.wordWrapWidth = cw - 232;
      rConflict.style.breakWords = true;
      rConflict.style.lineHeight = 24;
      rConflict.position.set(-cw / 2 + 158, topY + 48);
      this._card.addChild(rConflict);

      const hpBarW = cw - 236;
      const hpBar = new ProgressBar(hpBarW, 24, 0xE05A4E, 0xEAD9C3, 0.95);
      hpBar.progress = Math.max(0, rivalHp / 100);
      hpBar.position.set(-cw / 2 + 158, topY + 106);
      const hpLabel = makeDisplayText(`对手嚣张气焰 ${rivalHp}%`, 15, 0xFFFFFF, 0x7A2B22, 3.2);
      hpLabel.anchor.set(0.5);
      hpLabel.position.set(-cw / 2 + 158 + hpBarW / 2, topY + 118);
      this._card.addChild(hpBar, hpLabel);

      // 2. 战局胜利结算态 / 惜败加码态 / 回合交锋态
      if (battleWon) {
        this._renderVictoryView(cw, chH, topY + 174, enc, rewardBannerStr, finishBtnLabel);
        return;
      }

      if (roundIdx >= 3 && rivalHp > 0) {
        this._renderRetryView(cw, chH, topY + 174, rivalHp, () => {
          roundIdx = 0;
          rivalHp = 100;
          auraCount = 0;
          lastClashMsg = '已重整谈判节奏，认准绿色【克制】标签出牌必破防！';
          render();
        }, () => {
          const boostCost = Math.max(200, Math.floor(GameState.save.money * 0.08));
          if (GameState.save.money >= boostCost) {
            GameState.save.money -= boostCost;
          }
          moraleBoost = true;
          roundIdx = 0;
          rivalHp = 100;
          auraCount = 1;
          AudioManager.play('upgrade');
          lastClashMsg = '✦ 公关经费加码就位！全系底牌威力 +55%！';
          lastClashHighlight = true;
          render();
        });
        return;
      }

      // 3. 当前回合对手盘外招意图卡
      const curMove = enc.moves[Math.min(2, roundIdx)];
      const suitInfo = SUIT_META[curMove.suit];
      const counterSuit = counterSuitFor(curMove.suit);
      const counterMeta = SUIT_META[counterSuit];

      const intentY = topY + 168;
      const intentH = 152;
      const intentBg = drawCreamCard(new PIXI.Graphics(), -cw / 2 + 32, intentY, cw - 64, intentH, 22, {
        fill: suitInfo.softBg,
        borderColor: suitInfo.color,
        borderWidth: 2.2,
      });
      this._card.addChild(intentBg);

      const roundPill = new PIXI.Graphics()
        .beginFill(suitInfo.color, 1)
        .drawRoundedRect(-cw / 2 + 50, intentY + 14, 232, 34, 17)
        .endFill();
      const roundTxt = makeText(`第 ${roundIdx + 1}/3 回合 · 【${suitInfo.short}招】${curMove.title}`, 17, 0xFFFFFF, true);
      roundTxt.anchor.set(0, 0.5);
      roundTxt.position.set(-cw / 2 + 64, intentY + 31);
      const actualPillW = Math.min(cw - 104, roundTxt.width + 32);
      roundPill.clear().beginFill(suitInfo.color, 1).drawRoundedRect(-cw / 2 + 50, intentY + 14, actualPillW, 34, 17).endFill();
      this._card.addChild(roundPill, roundTxt);

      const tauntTxt = makeText(curMove.taunt, 20, COLORS.ink, true);
      tauntTxt.style.wordWrap = true;
      tauntTxt.style.wordWrapWidth = cw - 104;
      tauntTxt.style.breakWords = true;
      tauntTxt.position.set(-cw / 2 + 52, intentY + 58);
      this._card.addChild(tauntTxt);

      const tipTxt = makeText(`✦ 破招克制：打出【${counterMeta.name}】底牌可造成双倍破防打脸！`, 17, counterMeta.color, true);
      tipTxt.position.set(-cw / 2 + 52, intentY + 114);
      this._card.addChild(tipTxt);

      // 4. 战况播报条 & 女王掀桌绝杀槽
      const midY = intentY + intentH + 14;
      const msgBanner = drawCreamCard(new PIXI.Graphics(), -cw / 2 + 32, midY, cw - 64, 54, 16, {
        fill: lastClashHighlight ? 0xFFF2DC : 0xFFFDF8,
        borderColor: lastClashHighlight ? COLORS.gold : COLORS.borderSoft,
      });
      const msgTxt = makeText(lastClashMsg, 18, lastClashHighlight ? COLORS.roseDeep : COLORS.ink, true);
      msgTxt.anchor.set(0.5);
      msgTxt.position.set(0, midY + 27);
      if (msgTxt.width > cw - 92) msgTxt.scale.set((cw - 92) / msgTxt.width);
      this._card.addChild(msgBanner, msgTxt);

      // 若已攒够 2 点女王气场，点亮一键掀桌绝杀按钮
      let cardsTopY = midY + 72;
      if (auraCount >= 2) {
        const ultBtn = new Button({
          width: cw - 120,
          height: 56,
          variant: 'gold',
          fontSize: 22,
          label: '✦ 女王气场已满 · 一键掀桌绝杀清场！',
          onTap: () => {
            if (animating) return;
            animating = true;
            Platform.vibrateShort('medium');
            AudioManager.play('level_up');
            rivalHp = 0;
            battleWon = true;
            rewardBannerStr = onWinGrant();
            ToastManager.show(rewardBannerStr, 'success');
            animating = false;
            render();
          },
        });
        ultBtn.position.set(0, midY + 94);
        this._card.addChild(ultBtn);
        cardsTopY = midY + 134;
      } else {
        const auraHint = makeText(
          `女王气场：${'★'.repeat(auraCount)}${'☆'.repeat(2 - auraCount)}（克制破防满 2 次可提前掀桌绝杀）`,
          16,
          COLORS.goldDeep,
          true,
        );
        auraHint.anchor.set(0.5, 0);
        auraHint.position.set(0, midY + 62);
        this._card.addChild(auraHint);
        cardsTopY = midY + 94;
      }

      // 5. 底部横排 3 张玩家商战王牌
      const hand = buildBattleHand(GameState.save, enc, moraleBoost);
      const cardGap = 14;
      const cardW = Math.floor((cw - 64 - cardGap * 2) / 3);
      const cardH = Math.min(318, chH / 2 - cardsTopY - 26);

      hand.forEach((card, idx) => {
        const node = this._buildHandCard(card, curMove.suit, enc.recommendedPower, cardW, cardH, () => {
          if (animating) return;
          animating = true;
          const res = resolveCardClash(card, curMove, enc.recommendedPower);
          rivalHp = Math.max(0, rivalHp - res.damagePct);
          lastClashMsg = res.label;
          lastClashHighlight = res.relation === 'counter';
          if (res.relation === 'counter') {
            auraCount = Math.min(2, auraCount + 1);
            Platform.vibrateShort('medium');
            AudioManager.play('level_up');
          } else {
            Platform.vibrateShort('light');
            AudioManager.play('coin_tap');
          }

          roundIdx += 1;
          if (rivalHp <= 0) {
            battleWon = true;
            rewardBannerStr = onWinGrant();
            AudioManager.play('chapter_unlock');
            ToastManager.show(rewardBannerStr, 'success');
          }
          animating = false;
          render();
        });
        const cx = -cw / 2 + 32 + idx * (cardW + cardGap) + cardW / 2;
        node.position.set(cx, cardsTopY + cardH / 2);
        this._card.addChild(node);
      });
    };

    render();
    this.alpha = 0;
    this._card.scale.set(0.92);
    TweenManager.to({ target: this, props: { alpha: 1 }, duration: 0.18 });
    TweenManager.to({ target: this._card.scale, props: { x: 1, y: 1 }, duration: 0.24, ease: Ease.easeOutBack });

    return new Promise((resolve) => { this._resolve = resolve; });
  }

  private _buildHandCard(
    card: PlayerBattleCard,
    enemySuit: BattleSuit,
    recPower: number,
    w: number,
    h: number,
    onPlay: () => void,
  ): PIXI.Container {
    const wrap = new PIXI.Container();
    const meta = SUIT_META[card.suit];
    const rel = evaluateSuitRelation(card.suit, enemySuit);
    const isCounter = rel === 'counter';
    const preview = resolveCardClash(card, { suit: enemySuit, title: '', taunt: '' }, recPower);

    const bg = drawCreamCard(new PIXI.Graphics(), -w / 2, -h / 2, w, h, 22, {
      fill: isCounter ? 0xFFF7EA : 0xFFFDF9,
      borderColor: isCounter ? COLORS.rose : meta.color,
      borderWidth: isCounter ? 3.0 : 1.8,
    });
    wrap.addChild(bg);

    // 顶部属性条
    const suitPill = new PIXI.Graphics()
      .beginFill(meta.color, 1)
      .drawRoundedRect(-w / 2 + 12, -h / 2 + 12, w - 24, 32, 16)
      .endFill();
    const suitTxt = makeText(meta.name, 16, 0xFFFFFF, true);
    suitTxt.anchor.set(0.5);
    suitTxt.position.set(0, -h / 2 + 28);
    wrap.addChild(suitPill, suitTxt);

    // 克制高亮角标
    if (isCounter) {
      const badge = new PIXI.Graphics()
        .lineStyle(2, 0xFFFFFF)
        .beginFill(COLORS.mint, 1)
        .drawRoundedRect(w / 2 - 74, -h / 2 - 10, 68, 26, 13)
        .endFill();
      const bTxt = makeText('✦ 克制', 15, 0xFFFFFF, true);
      bTxt.anchor.set(0.5);
      bTxt.position.set(w / 2 - 40, -h / 2 + 3);
      wrap.addChild(badge, bTxt);
    }

    const ico = makeStickerSprite(SHOP_ICONS[card.shopIconId], 64, 64, true);
    ico.position.set(0, -h / 2 + 86);
    wrap.addChild(ico);

    const title = makeText(card.title, 19, COLORS.ink, true);
    title.style.align = 'center';
    title.style.wordWrap = true;
    title.style.wordWrapWidth = w - 20;
    title.style.breakWords = true;
    title.style.lineHeight = 25;
    title.anchor.set(0.5, 0);
    title.position.set(0, -h / 2 + 124);
    wrap.addChild(title);

    const dmgCol = isCounter ? COLORS.mint : rel === 'weak' ? COLORS.inkMuted : COLORS.goldDeep;
    const dmgTxt = makeNumText(`气焰 -${preview.damagePct}%`, 20, dmgCol);
    dmgTxt.anchor.set(0.5);
    dmgTxt.position.set(0, h / 2 - 66);
    wrap.addChild(dmgTxt);

    const playPill = new PIXI.Graphics()
      .beginFill(isCounter ? COLORS.rose : 0xE8B866, 1)
      .drawRoundedRect(-w / 2 + 14, h / 2 - 44, w - 28, 34, 17)
      .endFill();
    const playTxt = makeText(isCounter ? '亮牌破防!' : '出牌交锋', 17, isCounter ? 0xFFFFFF : COLORS.ink, true);
    playTxt.anchor.set(0.5);
    playTxt.position.set(0, h / 2 - 27);
    wrap.addChild(playPill, playTxt);

    wrap.hitArea = new PIXI.Rectangle(-w / 2, -h / 2, w, h);
    wrap.eventMode = 'static';
    wrap.cursor = 'pointer';
    wrap.on('pointerdown', () => wrap.scale.set(0.95));
    const restore = (): void => { wrap.scale.set(1); };
    wrap.on('pointerup', restore);
    wrap.on('pointerupoutside', restore);
    wrap.on('pointertap', onPlay);
    return wrap;
  }

  private _renderVictoryView(
    cw: number,
    chH: number,
    startY: number,
    enc: BattleEncounterDef,
    rewardStr: string,
    finishBtnLabel: string,
  ): void {
    const box = makeCouturePlaque(cw - 64, 360, true, false);
    box.position.set(-cw / 2 + 32, startY + 12);
    this._card.addChild(box);

    const stamp = new PIXI.Container();
    stamp.addChild(makeRibbonBanner(440, 64, true));
    const roseIco = makeStickerSprite(ICONS.trophy, 38, 38, true);
    roseIco.position.set(-184, 0);
    const stampTxt = makeText('商战完胜 · 气焰彻底击碎！', 23, COLORS.roseDeep, true);
    stampTxt.anchor.set(0.5);
    stampTxt.position.set(14, 0);
    stamp.addChild(roseIco, stampTxt);
    stamp.position.set(0, startY + 74);
    stamp.rotation = -0.03;
    this._card.addChild(stamp);

    const quote = makeText(`“${enc.slapQuote}”`, 25, COLORS.ink, true);
    quote.style.align = 'center';
    quote.style.wordWrap = true;
    quote.style.wordWrapWidth = cw - 120;
    quote.style.breakWords = true;
    quote.style.lineHeight = 38;
    quote.anchor.set(0.5, 0);
    quote.position.set(0, startY + 138);
    this._card.addChild(quote);

    const rewTxt = makeText(rewardStr, 20, COLORS.goldDeep, true);
    rewTxt.anchor.set(0.5);
    rewTxt.position.set(0, startY + 296);
    if (rewTxt.width > cw - 96) rewTxt.scale.set((cw - 96) / rewTxt.width);
    this._card.addChild(rewTxt);

    const nextBtn = new Button({
      width: 440,
      height: 82,
      variant: 'rose',
      fontSize: 26,
      label: finishBtnLabel,
      onTap: () => this._closeCurrent(true),
    });
    nextBtn.position.set(0, chH / 2 - 74);
    this._card.addChild(nextBtn);
  }

  private _renderRetryView(
    cw: number,
    chH: number,
    startY: number,
    leftHp: number,
    onFreeRetry: () => void,
    onBoostRetry: () => void,
  ): void {
    const box = makeCouturePlaque(cw - 64, 300, false, false);
    box.position.set(-cw / 2 + 32, startY + 24);
    this._card.addChild(box);

    const head = makeText(`对手尚余 ${leftHp}% 残余气焰！`, 26, COLORS.roseDeep, true);
    head.anchor.set(0.5);
    head.position.set(0, startY + 88);
    this._card.addChild(head);

    const tip = makeText(
      '小贴士：每回合认准对手招式，挑选带绿色【✦ 克制】角标的手牌出击，两回合即可双倍破防拿下！也可投入少量公关预算直接强化全系手牌。',
      20,
      COLORS.inkSoft,
    );
    tip.style.align = 'center';
    tip.style.wordWrap = true;
    tip.style.wordWrapWidth = cw - 120;
    tip.style.breakWords = true;
    tip.style.lineHeight = 32;
    tip.anchor.set(0.5, 0);
    tip.position.set(0, startY + 134);
    this._card.addChild(tip);

    const boostCost = Math.max(200, Math.floor(GameState.save.money * 0.08));
    const boostBtn = new Button({
      width: cw - 110,
      height: 78,
      variant: 'rose',
      fontSize: 23,
      label: '✦ 公关加码再战（全手牌威力 +55%）',
      sub: GameState.save.money >= boostCost ? `消耗公关预算 ¥${formatMoney(boostCost)}` : '免费激励助威开启',
      onTap: onBoostRetry,
    });
    boostBtn.position.set(0, chH / 2 - 172);

    const freeBtn = new Button({
      width: cw - 110,
      height: 74,
      variant: 'gold',
      fontSize: 23,
      label: '免费调整出牌顺序再战',
      onTap: onFreeRetry,
    });
    freeBtn.position.set(0, chH / 2 - 76);

    this._card.addChild(boostBtn, freeBtn);
  }

  /** 播放章节结尾的高潮二选一爽点抉择（展示玫瑰 + 灵感 + 内幕券战略收益） */
  showClimax(chapterId: number): Promise<boolean> {
    const def = CHAPTER_CLIMAXES.get(chapterId);
    if (!def || GameState.save.claimedClimaxes.includes(chapterId)) return Promise.resolve(false);
    this._closeCurrent(false);
    this.visible = true;
    OverlayManager.bringToFront();
    AudioManager.play('item_reveal');

    const W = Game.logicWidth;
    const H = Game.logicHeight;
    this._dim.clear().beginFill(0x33271D, 0.52).drawRect(0, 0, W, H).endFill();
    for (const c of this._card.removeChildren()) c.destroy({ children: true });

    const cw = 656;
    const chH = 590;
    this._card.position.set(W / 2, H / 2 + 16);

    const panel = makeOrnatePanel(cw, chH);
    panel.position.set(-cw / 2, -chH / 2);
    const ribbon = makeRibbonHeader('女主高光战略抉择', 520);
    ribbon.position.set(0, -chH / 2 + 12);

    const prompt = makeText(def.prompt, 23, COLORS.ink);
    prompt.style.wordWrap = true;
    prompt.style.wordWrapWidth = cw - 88;
    prompt.style.breakWords = true;
    prompt.style.lineHeight = 36;
    prompt.style.align = 'center';
    prompt.anchor.set(0.5, 0);
    prompt.position.set(0, -chH / 2 + 96);
    this._card.addChild(panel, ribbon, prompt);

    const formatSub = (c: { roses: number; inspiration: number; insiderTokens: number }): string => {
      const parts = [`心动玫瑰+${c.roses}`, `研发灵感+${c.inspiration}`];
      if (c.insiderTokens > 0) parts.push(`内幕券+${c.insiderTokens}`);
      return `战略红利：${parts.join(' · ')}`;
    };

    const pick = (which: 'A' | 'B'): void => {
      const chosen = which === 'A' ? def.choiceA : def.choiceB;
      GameState.claimChapterClimax(chapterId, which);
      AudioManager.play('bond_up');
      ToastManager.show(`${chosen.reply}（玫瑰+${chosen.roses} · 灵感+${chosen.inspiration}）`, 'success');
      this._closeCurrent(true);
    };

    const btnA = new Button({
      width: cw - 80,
      height: 88,
      variant: 'rose',
      fontSize: 22,
      label: def.choiceA.label,
      sub: formatSub(def.choiceA),
      onTap: () => pick('A'),
    });
    btnA.position.set(0, chH / 2 - 186);

    const btnB = new Button({
      width: cw - 80,
      height: 88,
      variant: 'gold',
      fontSize: 22,
      label: def.choiceB.label,
      sub: formatSub(def.choiceB),
      onTap: () => pick('B'),
    });
    btnB.position.set(0, chH / 2 - 80);

    this._card.addChild(btnA, btnB);
    this.alpha = 0;
    this._card.scale.set(0.92);
    TweenManager.to({ target: this, props: { alpha: 1 }, duration: 0.18 });
    TweenManager.to({ target: this._card.scale, props: { x: 1, y: 1 }, duration: 0.24, ease: Ease.easeOutBack });

    return new Promise((resolve) => { this._resolve = resolve; });
  }

  private _closeCurrent(ok: boolean): void {
    const resolve = this._resolve;
    this._resolve = null;
    this.visible = false;
    if (resolve) resolve(ok);
  }
}

export const BusinessBattleModal = new BusinessBattleModalClass();
