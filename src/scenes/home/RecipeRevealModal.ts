/**
 * 爆品研发出炉 / 精进专属视觉揭晓弹窗（`RecipeRevealModal`）：
 * 彻底替代纯文字弹窗，以高定丝缎雕花盘 + 旋转金芒光晕 + 超大成品插画 + 食材配方链 + 镇店徽章呈现仪式感。
 */
import * as PIXI from 'pixi.js';
import {
  ICONS,
  SHOP_ICONS,
  ingredientIconPath,
  recipeIconPath,
} from '@/data/art';
import type { RecipeGrade } from '@/data/recipes';
import { shopById, type ShopId } from '@/data/world';
import { AudioManager } from '@/core/AudioManager';
import { Game } from '@/core/Game';
import { OverlayManager } from '@/core/OverlayManager';
import { Ease, TweenManager } from '@/core/TweenManager';
import { findIngredients, formatRecipeBuff, type ResolvedRecipe } from '@/sim/recipeSim';
import { Button } from '@/ui/Button';
import { drawDiamondStar } from '@/ui/EditorialIcons';
import {
  COLORS,
  drawCreamCard,
  makeDisplayText,
  makeNumText,
  makeOrnatePanel,
  makeRibbonHeader,
  makeStickerSprite,
  makeText,
} from '@/ui/theme';

export interface RecipeRevealOptions {
  recipe: ResolvedRecipe;
  isNew: boolean;
  rosesGained: number;
  autoShopId: ShopId | null;
}

const GRADE_BADGE: Readonly<Record<RecipeGrade, { label: string; bg: number; border: number }>> = {
  SS: { label: 'SS · 传世秘方', bg: 0xC64435, border: 0xF7D78A },
  S: { label: 'S · 招牌爆品', bg: 0xD88F24, border: 0xFFF0BE },
  A: { label: 'A · 匠心单品', bg: 0xDC6E4D, border: 0xFFE3D3 },
  B: { label: 'B · 试制甜点', bg: 0x3A9660, border: 0xCFF2DC },
};

const CARD_W = 648;
const CARD_H = 796;

class RecipeRevealModalView extends PIXI.Container {
  private readonly _dim = new PIXI.Graphics();
  private readonly _card = new PIXI.Container();
  private readonly _rays = new PIXI.Graphics();
  private readonly _dishWrap = new PIXI.Container();
  private _resolve: ((goCodex: boolean) => void) | null = null;
  private _opts: RecipeRevealOptions | null = null;
  private readonly _tickFn = (dt: number): void => {
    this._rays.rotation += 0.25 * (dt / 60);
  };

  constructor() {
    super();
    this.visible = false;
    this.zIndex = 88;
    this._dim.eventMode = 'static';
    this._dim.on('pointertap', () => this._finish(false));
    this._card.eventMode = 'static';
    this.addChild(this._dim, this._card);
    OverlayManager.container.addChild(this);
  }

  show(opts: RecipeRevealOptions): Promise<boolean> {
    this._finish(false, true);
    this._opts = opts;
    this.visible = true;
    OverlayManager.bringToFront();
    this.relayout();

    Game.ticker.remove(this._tickFn);
    Game.ticker.add(this._tickFn);

    TweenManager.cancelTarget(this);
    TweenManager.cancelTarget(this._card.scale);
    TweenManager.cancelTarget(this._dishWrap.scale);
    this.alpha = 0;
    this._card.scale.set(0.9);
    this._dishWrap.scale.set(0.55);

    TweenManager.to({ target: this, props: { alpha: 1 }, duration: 0.18, ease: Ease.easeOutQuad });
    TweenManager.to({ target: this._card.scale, props: { x: 1, y: 1 }, duration: 0.28, ease: Ease.easeOutBack });
    TweenManager.to({ target: this._dishWrap.scale, props: { x: 1, y: 1 }, duration: 0.42, ease: Ease.easeOutBack });

    return new Promise((resolve) => {
      this._resolve = resolve;
    });
  }

  relayout(): void {
    const opts = this._opts;
    if (!opts) return;
    const W = Game.logicWidth;
    const H = Game.logicHeight;

    this._dim.clear()
      .beginFill(COLORS.mask, 0.56)
      .drawRect(0, 0, W, H)
      .endFill();
    this._dim.beginFill(0xFFE9A8, 0.24).drawCircle(92, H * 0.24, 28).endFill();
    this._dim.beginFill(0xFFE9A8, 0.16).drawCircle(W - 84, H * 0.76, 34).endFill();

    for (const c of this._card.removeChildren()) {
      if (c !== this._rays && c !== this._dishWrap) c.destroy({ children: true });
    }
    for (const c of this._dishWrap.removeChildren()) c.destroy({ children: true });

    this._card.position.set(W / 2, H / 2);

    const panel = makeOrnatePanel(CARD_W, CARD_H);
    panel.position.set(-CARD_W / 2, -CARD_H / 2);
    this._card.addChild(panel);

    const r = opts.recipe;
    const headerTitle = opts.isNew ? '研发出炉 · 镇店新品' : `配方精进 · 跃升 Lv.${r.level}`;
    const ribbon = makeRibbonHeader(headerTitle, CARD_W - 60);
    ribbon.position.set(0, -CARD_H / 2 + 12);
    this._card.addChild(ribbon);

    // 1. 中心发光旋转金芒 + 白瓷雕金展示圆盘 + 超大成品插画
    const stageCenterY = -CARD_H / 2 + 216;
    this._drawSunburst(this._rays, 152, r.grade === 'SS' ? 0xFFCF70 : 0xFFE29E);
    this._rays.position.set(0, stageCenterY);
    this._card.addChild(this._rays);

    this._dishWrap.position.set(0, stageCenterY);
    const plateGlow = new PIXI.Graphics()
      .beginFill(0xFFF6DF, 0.96)
      .lineStyle(3.2, 0xDFB468, 1)
      .drawCircle(0, 0, 108)
      .endFill()
      .lineStyle(1.5, 0xFFFFFF, 0.9)
      .drawCircle(0, 0, 99);
    drawDiamondStar(plateGlow, -96, -68, 8, 0xEBB958, 0.95);
    drawDiamondStar(plateGlow, 98, -56, 6.5, 0xE46C5E, 0.9);
    drawDiamondStar(plateGlow, 88, 74, 7, 0xEBB958, 0.9);

    const dishSp = makeStickerSprite(recipeIconPath(r.comboKey), 196, 196, true);
    this._dishWrap.addChild(plateGlow, dishSp);

    // 品阶丝带角标 + 熟练度章
    const gb = GRADE_BADGE[r.grade];
    const gradePill = new PIXI.Graphics()
      .lineStyle(2, gb.border, 1)
      .beginFill(gb.bg, 1)
      .drawRoundedRect(-128, -116, 146, 36, 18)
      .endFill();
    const gradeTxt = makeDisplayText(gb.label, 17, 0xFFFFFF, 0x6A2218, 2.5);
    gradeTxt.anchor.set(0.5);
    gradeTxt.position.set(-55, -98);

    const lvPill = new PIXI.Graphics()
      .lineStyle(2, 0xDFB870, 1)
      .beginFill(0xFFFDF8, 0.98)
      .drawRoundedRect(46, 78, 78, 32, 16)
      .endFill();
    const lvTxt = makeNumText(`Lv.${r.level}`, 17, COLORS.roseDeep);
    lvTxt.anchor.set(0.5);
    lvTxt.position.set(85, 94);

    this._dishWrap.addChild(gradePill, gradeTxt, lvPill, lvTxt);
    this._card.addChild(this._dishWrap);

    // 2. 爆品大字名称
    const nameY = -CARD_H / 2 + 356;
    const nameTxt = makeText(r.name, 30, COLORS.ink, true);
    nameTxt.anchor.set(0.5);
    nameTxt.position.set(0, nameY);
    this._card.addChild(nameTxt);

    // 3. 可视化三词条配方小图标链
    const triple = findIngredients(r.comboKey);
    const formulaY = nameY + 56;
    if (triple) {
      const formulaWrap = new PIXI.Container();
      formulaWrap.position.set(0, formulaY);
      const pillW = 166;
      const gap = 22;
      const startX = -((pillW * 3 + gap * 2) / 2);

      triple.forEach((ing, idx) => {
        const px = startX + idx * (pillW + gap);
        const bg = drawCreamCard(new PIXI.Graphics(), px, -24, pillW, 48, 24, {
          fill: 0xFFFBF2, borderColor: 0xE5C68B, borderWidth: 1.5,
        });
        const ic = makeStickerSprite(ingredientIconPath(ing.id), 38, 38, true);
        ic.position.set(px + 25, 0);
        const it = makeText(ing.name, 15, COLORS.ink, true);
        it.anchor.set(0, 0.5);
        it.position.set(px + 47, 0);
        if (it.width > pillW - 55) it.scale.set((pillW - 55) / it.width);
        formulaWrap.addChild(bg, ic, it);

        if (idx < 2) {
          const plus = makeText('+', 20, COLORS.goldDeep, true);
          plus.anchor.set(0.5);
          plus.position.set(px + pillW + gap / 2, -1);
          formulaWrap.addChild(plus);
        }
      });
      this._card.addChild(formulaWrap);
    }

    // 4. 暖蜜桃风味评语与镇店增益底舱
    const wellW = CARD_W - 64;
    const wellH = 198;
    const wellY = -CARD_H / 2 + 452;
    const well = new PIXI.Graphics()
      .lineStyle(1.8, 0xEACBA1, 0.95)
      .beginFill(0xFDF1DF, 0.97)
      .drawRoundedRect(-wellW / 2, wellY, wellW, wellH, 24)
      .endFill();
    this._card.addChild(well);

    const descTxt = makeText(r.desc, 17, COLORS.inkSoft);
    descTxt.style.wordWrap = true;
    descTxt.style.wordWrapWidth = wellW - 32;
    descTxt.style.breakWords = true;
    descTxt.style.align = 'center';
    descTxt.style.lineHeight = 26;
    descTxt.anchor.set(0.5, 0);
    descTxt.position.set(0, wellY + 20);
    this._card.addChild(descTxt);

    // 增益金条
    const buffBarY = wellY + 86;
    const buffBg = new PIXI.Graphics()
      .beginFill(0xFFF9EC, 1)
      .lineStyle(1.6, 0xDFB870, 1)
      .drawRoundedRect(-(wellW - 44) / 2, buffBarY, wellW - 44, 44, 22)
      .endFill();
    const buffTxt = makeText(
      `✦ 镇店效果：${formatRecipeBuff(r)}（另附门店客单价 +15%）`,
      18,
      COLORS.roseDeep,
      true,
    );
    buffTxt.anchor.set(0.5);
    buffTxt.position.set(0, buffBarY + 22);
    if (buffTxt.width > wellW - 68) buffTxt.scale.set((wellW - 68) / buffTxt.width);
    this._card.addChild(buffBg, buffTxt);

    // 底部双徽章：玫瑰奖励 + 自动挂载门店图标
    const tagsY = wellY + 158;
    const badges: PIXI.Container[] = [];

    if (opts.rosesGained > 0) {
      const b = new PIXI.Container();
      const bg = drawCreamCard(new PIXI.Graphics(), -112, -20, 224, 40, 20, {
        fill: 0xFFF2EC, borderColor: COLORS.rose, borderWidth: 1.5,
      });
      const ic = makeStickerSprite(ICONS.currencyRose, 32, 32, true);
      ic.position.set(-84, 0);
      const t = makeText(`首创奖励 +${opts.rosesGained} 玫瑰`, 16, COLORS.roseDeep, true);
      t.anchor.set(0, 0.5);
      t.position.set(-64, 0);
      b.addChild(bg, ic, t);
      badges.push(b);
    }

    if (opts.autoShopId) {
      const sName = shopById(opts.autoShopId).name;
      const b = new PIXI.Container();
      const bw = 276;
      const bg = drawCreamCard(new PIXI.Graphics(), -bw / 2, -20, bw, 40, 20, {
        fill: 0xEFFAF2, borderColor: COLORS.mint, borderWidth: 1.5,
      });
      const ic = makeStickerSprite(SHOP_ICONS[opts.autoShopId], 34, 34, true);
      ic.position.set(-bw / 2 + 24, 0);
      const t = makeText(`已镇守「${sName}」`, 16, COLORS.mint, true);
      t.anchor.set(0, 0.5);
      t.position.set(-bw / 2 + 46, 0);
      if (t.width > bw - 58) t.scale.set((bw - 58) / t.width);
      b.addChild(bg, ic, t);
      badges.push(b);
    } else {
      const b = new PIXI.Container();
      const bw = 282;
      const bg = drawCreamCard(new PIXI.Graphics(), -bw / 2, -20, bw, 40, 20, {
        fill: 0xFFFDF8, borderColor: 0xDFB870, borderWidth: 1.4,
      });
      const ic = makeStickerSprite(ICONS.shop, 30, 30, true);
      ic.position.set(-bw / 2 + 22, 0);
      const t = makeText('可前往图鉴挂载至开业门店', 15, COLORS.goldDeep, true);
      t.anchor.set(0, 0.5);
      t.position.set(-bw / 2 + 42, 0);
      b.addChild(bg, ic, t);
      badges.push(b);
    }

    if (badges.length === 2) {
      badges[0].position.set(-148, tagsY);
      badges[1].position.set(124, tagsY);
      this._card.addChild(badges[0], badges[1]);
    } else if (badges.length === 1) {
      badges[0].position.set(0, tagsY);
      this._card.addChild(badges[0]);
    }

    // 5. 底部双按钮
    const btnY = CARD_H / 2 - 64;
    const keepBtn = new Button({
      width: 248,
      height: 70,
      variant: 'cream',
      fontSize: 23,
      label: '继续调配',
      onTap: () => {
        AudioManager.play('ui_click');
        this._finish(false);
      },
    });
    keepBtn.position.set(-138, btnY);

    const codexBtn = new Button({
      width: 248,
      height: 70,
      variant: 'mint',
      fontSize: 23,
      label: '前往镇店图鉴',
      onTap: () => {
        AudioManager.play('ui_click');
        this._finish(true);
      },
    });
    codexBtn.position.set(138, btnY);

    this._card.addChild(keepBtn, codexBtn);
  }

  private _drawSunburst(g: PIXI.Graphics, radius: number, color: number): void {
    g.clear();
    const rays = 14;
    for (let i = 0; i < rays; i++) {
      const a0 = (i / rays) * Math.PI * 2;
      const a1 = a0 + (Math.PI / rays) * 0.52;
      g.beginFill(color, 0.24)
        .moveTo(0, 0)
        .lineTo(Math.cos(a0) * radius, Math.sin(a0) * radius)
        .lineTo(Math.cos(a1) * radius, Math.sin(a1) * radius)
        .closePath()
        .endFill();
    }
  }

  private _finish(goCodex: boolean, silent = false): void {
    const r = this._resolve;
    if (!r) return;
    this._resolve = null;
    this._opts = null;
    Game.ticker.remove(this._tickFn);

    if (silent) {
      this.visible = false;
      this.alpha = 1;
      r(goCodex);
      return;
    }

    TweenManager.to({
      target: this,
      props: { alpha: 0 },
      duration: 0.15,
      ease: Ease.easeInQuad,
      onComplete: () => {
        this.visible = false;
        this.alpha = 1;
      },
    });
    r(goCodex);
  }
}

let _modal: RecipeRevealModalView | null = null;

export function showRecipeRevealModal(opts: RecipeRevealOptions): Promise<boolean> {
  if (!_modal) _modal = new RecipeRevealModalView();
  return _modal.show(opts);
}
