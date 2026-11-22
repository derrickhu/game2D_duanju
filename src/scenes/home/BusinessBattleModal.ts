/**
 * 章节「商战身价碾压对决」+ 看完章节后的「二选一高潮爽点抉择」弹窗。
 * 让“身价每涨一个数量级打脸一次恶人”变成可交互的高爽感仪式！
 */
import * as PIXI from 'pixi.js';
import { ICONS, outfitFigurePath } from '@/data/art';
import type { ChapterDef } from '@/data/story';
import { CHAPTER_CLIMAXES } from '@/data/streetEvents';
import { AudioManager } from '@/core/AudioManager';
import { Game } from '@/core/Game';
import { OverlayManager } from '@/core/OverlayManager';
import { Platform } from '@/core/PlatformService';
import { ToastManager } from '@/core/ToastManager';
import { Ease, TweenManager } from '@/core/TweenManager';
import { GameState } from '@/managers/GameState';
import { formatMoney } from '@/sim/format';
import { Button } from '@/ui/Button';
import { ProgressBar } from '@/ui/ProgressBar';
import {
  COLORS,
  makeCouturePlaque,
  makeNumText,
  makeOrnatePanel,
  makeRibbonBanner,
  makeRibbonHeader,
  makeStickerSprite,
  makeText,
} from '@/ui/theme';
import { showFigure } from '@/utils/assets';

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

  /** 播放章节商战碾压对决（已通关过则直接返回 true） */
  showBattle(ch: ChapterDef): Promise<boolean> {
    if (!ch.rival || GameState.save.clearedBattles.includes(ch.id)) return Promise.resolve(true);
    this._closeCurrent(false);
    this.visible = true;
    OverlayManager.bringToFront();
    AudioManager.play('ui_open');

    const W = Game.logicWidth;
    const H = Game.logicHeight;
    this._dim.clear().beginFill(0x33271D, 0.50).drawRect(0, 0, W, H).endFill();
    for (const c of this._card.removeChildren()) c.destroy({ children: true });

    const cw = 656;
    const chH = 770;
    this._card.position.set(W / 2, H / 2 + 16);

    const panel = makeOrnatePanel(cw, chH);
    panel.position.set(-cw / 2, -chH / 2);
    const ribbon = makeRibbonHeader(`第 ${ch.id} 章 · 身价交锋`, 548);
    ribbon.position.set(0, -chH / 2 + 14);
    this._card.addChild(panel, ribbon);

    // 对决双方信息区
    const rival = ch.rival;
    const conflict = makeText(`「${rival.rivalName}（${rival.rivalTitle}）」\n${rival.conflict}`, 22, COLORS.inkSoft);
    conflict.style.align = 'center';
    conflict.style.wordWrap = true;
    conflict.style.wordWrapWidth = cw - 80;
    conflict.style.breakWords = true;
    conflict.style.lineHeight = 34;
    conflict.anchor.set(0.5, 0);
    conflict.position.set(0, -chH / 2 + 118);
    this._card.addChild(conflict);

    // 苏晚立绘头像框 vs 对手气焰框
    const vsY = -chH / 2 + 286;
    const leftBox = makeCouturePlaque(254, 154, true, false);
    leftBox.position.set(-cw / 2 + 34, vsY - 77);
    const rightBox = makeCouturePlaque(254, 154, false, false);
    rightBox.position.set(cw / 2 - 288, vsY - 77);
    this._card.addChild(leftBox, rightBox);

    const suwanFig = new PIXI.Sprite();
    suwanFig.anchor.set(0.5, 1);
    suwanFig.position.set(-cw / 2 + 96, vsY + 72);
    const figMask = new PIXI.Graphics().beginFill(0xffffff).drawRoundedRect(-cw / 2 + 38, vsY - 74, 118, 148, 22).endFill();
    suwanFig.mask = figMask;
    showFigure(suwanFig, outfitFigurePath(GameState.save.outfit), 120, 220, undefined, 'height');
    this._card.addChild(figMask, suwanFig);

    const myTag = makeText('苏晚\n当前身价', 20, COLORS.ink, true);
    myTag.position.set(-cw / 2 + 160, vsY - 46);
    const myVal = makeNumText(`¥${formatMoney(GameState.save.netWorth)}`, 25, COLORS.roseDeep);
    myVal.position.set(-cw / 2 + 160, vsY + 14);
    this._card.addChild(myTag, myVal);

    const vsBadge = makeText('VS', 36, COLORS.goldDeep, true);
    vsBadge.anchor.set(0.5);
    vsBadge.position.set(0, vsY);
    this._card.addChild(vsBadge);

    const rivalTag = makeText(`${rival.rivalName}\n嚣张门槛`, 20, COLORS.inkSoft, true);
    rivalTag.anchor.set(0.5, 0);
    rivalTag.position.set(cw / 2 - 161, vsY - 46);
    const rivalVal = makeNumText(`¥${formatMoney(ch.unlockNetWorth * 0.8)}`, 25, COLORS.inkSoft);
    rivalVal.anchor.set(0.5, 0);
    rivalVal.position.set(cw / 2 - 161, vsY + 14);
    this._card.addChild(rivalTag, rivalVal);

    // 身价碾压进度条
    const barW = cw - 96;
    const myBar = new ProgressBar(barW, 22, COLORS.rose, COLORS.roseSoft, 0.7);
    myBar.position.set(-barW / 2, vsY + 104);
    myBar.progress = 0.15;
    this._card.addChild(myBar);

    const quote = makeText(`“${rival.slapQuote}”`, 24, COLORS.ink, true);
    quote.style.align = 'center';
    quote.style.wordWrap = true;
    quote.style.wordWrapWidth = cw - 96;
    quote.style.breakWords = true;
    quote.style.lineHeight = 36;
    quote.anchor.set(0.5, 0);
    quote.position.set(0, vsY + 150);
    quote.alpha = 0;
    this._card.addChild(quote);

    const stamp = new PIXI.Container();
    stamp.addChild(makeRibbonBanner(340, 62, true));
    const roseIco = makeStickerSprite(ICONS.currencyRose, 32, 32, true);
    const stampTxt = makeText(`身价碾压 · 获赠 +${rival.roseReward}`, 22, COLORS.roseDeep, true);
    stampTxt.anchor.set(0.5);
    roseIco.position.set(-stampTxt.width / 2 - 14, 0);
    stampTxt.position.set(16, 0);
    stamp.addChild(roseIco, stampTxt);
    stamp.position.set(0, vsY + 258);
    stamp.rotation = -0.05;
    stamp.visible = false;
    this._card.addChild(stamp);

    let launched = false;
    const actionBtn = new Button({
      width: 420,
      height: 82,
      variant: 'rose',
      fontSize: 27,
      label: '✦ 亮出底牌 · 当场打脸！',
      onTap: () => {
        if (launched) {
          this._closeCurrent(true);
          return;
        }
        launched = true;
        Platform.vibrateShort('medium');
        AudioManager.play('level_up');
        const roses = GameState.clearChapterBattle(ch.id);
        const progObj = { v: 0.15 };
        TweenManager.to({
          target: progObj,
          props: { v: 1 },
          duration: 0.45,
          ease: Ease.easeOutQuad,
          onUpdate: () => { myBar.progress = progObj.v; },
          onComplete: () => {
            stamp.visible = true;
            stamp.scale.set(1.6);
            TweenManager.to({ target: stamp.scale, props: { x: 1, y: 1 }, duration: 0.24, ease: Ease.easeOutBack });
            TweenManager.to({ target: quote, props: { alpha: 1 }, duration: 0.25 });
            if (roses > 0) ToastManager.show(`✦ 打脸大捷！心动玫瑰 +${roses}`, 'success');
            actionBtn.setLabel('▶ 进入本章逆袭剧情');
          },
        });
      },
    });
    actionBtn.position.set(0, chH / 2 - 68);
    this._card.addChild(actionBtn);

    this.alpha = 0;
    this._card.scale.set(0.9);
    TweenManager.to({ target: this, props: { alpha: 1 }, duration: 0.18 });
    TweenManager.to({ target: this._card.scale, props: { x: 1, y: 1 }, duration: 0.26, ease: Ease.easeOutBack });

    return new Promise((resolve) => { this._resolve = resolve; });
  }

  /** 播放章节结尾的高潮二选一爽点抉择 */
  showClimax(chapterId: number): Promise<boolean> {
    const def = CHAPTER_CLIMAXES.get(chapterId);
    if (!def || GameState.save.claimedClimaxes.includes(chapterId)) return Promise.resolve(false);
    this._closeCurrent(false);
    this.visible = true;
    OverlayManager.bringToFront();
    AudioManager.play('item_reveal');

    const W = Game.logicWidth;
    const H = Game.logicHeight;
    this._dim.clear().beginFill(0x33271D, 0.50).drawRect(0, 0, W, H).endFill();
    for (const c of this._card.removeChildren()) c.destroy({ children: true });

    const cw = 640;
    const chH = 560;
    this._card.position.set(W / 2, H / 2 + 16);

    const panel = makeOrnatePanel(cw, chH);
    panel.position.set(-cw / 2, -chH / 2);
    const ribbon = makeRibbonHeader('女主高光抉择', 520);
    ribbon.position.set(0, -chH / 2 + 12);

    const prompt = makeText(def.prompt, 24, COLORS.ink);
    prompt.style.wordWrap = true;
    prompt.style.wordWrapWidth = cw - 88;
    prompt.style.breakWords = true;
    prompt.style.lineHeight = 38;
    prompt.style.align = 'center';
    prompt.anchor.set(0.5, 0);
    prompt.position.set(0, -chH / 2 + 96);
    this._card.addChild(panel, ribbon, prompt);

    const pick = (which: 'A' | 'B'): void => {
      const chosen = which === 'A' ? def.choiceA : def.choiceB;
      const roses = GameState.claimChapterClimax(chapterId, which);
      AudioManager.play('bond_up');
      ToastManager.show(`${chosen.reply}（心动玫瑰+${roses}）`, 'success');
      this._closeCurrent(true);
    };

    const btnA = new Button({
      width: cw - 80,
      height: 84,
      variant: 'rose',
      fontSize: 23,
      label: def.choiceA.label,
      sub: `奖励 心动玫瑰+${def.choiceA.roses}`,
      onTap: () => pick('A'),
    });
    btnA.position.set(0, chH / 2 - 178);

    const btnB = new Button({
      width: cw - 80,
      height: 84,
      variant: 'gold',
      fontSize: 23,
      label: def.choiceB.label,
      sub: `奖励 心动玫瑰+${def.choiceB.roses}`,
      onTap: () => pick('B'),
    });
    btnB.position.set(0, chH / 2 - 76);

    this._card.addChild(btnA, btnB);
    this.alpha = 0;
    this._card.scale.set(0.92);
    TweenManager.to({ target: this, props: { alpha: 1 }, duration: 0.18 });
    TweenManager.to({ target: this._card.scale, props: { x: 1, y: 1 }, duration: 0.24, ease: Ease.easeOutBack });

    return new Promise((resolve) => { this._resolve = resolve; });
  }

  private _closeCurrent(ok: boolean): void {
    const resolve = this._resolve;
    if (!resolve) return;
    this._resolve = null;
    this.visible = false;
    resolve(ok);
  }
}

export const BusinessBattleModal = new BusinessBattleModalClass();
