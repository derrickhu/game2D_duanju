/**
 * 招牌爆品研发室（`RecipeLabSheet` · v13 全图化高定工坊版）：
 * 1. 「研发调配台」：阳光大理石研发工坊舞台 + 三大瓷盘食材槽实时可视化预览 + 鎏金神秘餐盖/成品盘 + 3×2 大尺寸食材插画卡；
 * 2. 「镇店图鉴」：全插画爆品典藏墙（含已研单品大图、三食材图标链、门店挂载与未破译传世秘方线索卡）。
 */
import * as PIXI from 'pixi.js';
import {
  ALL_RECIPE_LAB_TEXTURES,
  ICONS,
  RECIPE_LAB_ASSETS,
  SHOP_ICONS,
  UI_SLICES,
  ingredientIconPath,
  recipeIconPath,
} from '@/data/art';
import {
  RECIPE_BASES,
  RECIPE_HYPES,
  RECIPE_SOULS,
  SIGNATURE_RECIPES,
  type IngredientDef,
  type RecipeBuffKind,
  type RecipeGrade,
  type SignatureRecipeDef,
} from '@/data/recipes';
import { SHOPS, shopById, type ShopId } from '@/data/world';
import { EV } from '@/config/events';
import { AudioManager } from '@/core/AudioManager';
import { EventBus } from '@/core/EventBus';
import { Game } from '@/core/Game';
import { Platform } from '@/core/PlatformService';
import { ToastManager } from '@/core/ToastManager';
import { Ease, TweenManager } from '@/core/TweenManager';
import { GameState } from '@/managers/GameState';
import { baseIncomePerSec } from '@/sim/economy';
import { formatMoney } from '@/sim/format';
import {
  computeRecipeBuffs,
  findIngredients,
  formatRecipeBuff,
  inspirationBuyCost,
  makeComboKey,
  resolveRecipe,
  type ResolvedRecipe,
} from '@/sim/recipeSim';
import { Button } from '@/ui/Button';
import { drawDiamondStar } from '@/ui/EditorialIcons';
import { PAGE_PAD, Page } from '@/ui/Page';
import { ScrollView } from '@/ui/ScrollView';
import {
  COLORS,
  createNineSlice2x,
  drawCreamCard,
  makeCouturePlaque,
  makeDisplayText,
  makeNumText,
  makeStickerSprite,
  makeText,
} from '@/ui/theme';
import {
  applyFit,
  applyGray,
  fitCover,
  gameTexture,
  isTextureReady,
  watchTextures,
  whenTextureReady,
} from '@/utils/assets';
import { showRecipeRevealModal } from './RecipeRevealModal';

type LabTab = 'craft' | 'codex';
type SlotKind = 'base' | 'soul' | 'hype';
type CodexFilter = 'all' | 'unlocked' | 'locked';

const GRADE_COLORS: Readonly<Record<RecipeGrade, { bg: number; text: number }>> = {
  SS: { bg: 0xC64435, text: 0xFFFFFF },
  S: { bg: 0xD88F24, text: 0xFFFFFF },
  A: { bg: 0xDC6E4D, text: 0xFFFFFF },
  B: { bg: 0x3A9660, text: 0xFFFFFF },
};

const SHORT_BUFF_TAG: Readonly<Record<RecipeBuffKind, string>> = {
  shopIncome: '秒伤增益',
  tapCrit: '暴击专精',
  battleRep: '口碑牌力',
  battleCap: '资本牌力',
  battleLeg: '法务牌力',
  costCut: '升级减免',
};

export class RecipeLabSheet extends Page {
  private readonly _subBar = new PIXI.Container();
  private readonly _craftWrap = new PIXI.Container();
  private readonly _codexWrap = new PIXI.Container();
  private readonly _codexFilterBar = new PIXI.Container();
  private readonly _codexScroll = new ScrollView();

  private _tab: LabTab = 'craft';
  private _activeSlot: SlotKind = 'base';
  private _codexFilter: CodexFilter = 'all';
  private _selBase = RECIPE_BASES[0].id;
  private _selSoul = RECIPE_SOULS[0].id;
  private _selHype = RECIPE_HYPES[0].id;
  private _targetShopForEquip: ShopId | null = null;

  private _clocheNode: PIXI.Container | null = null;
  private _clocheBaseY = 0;
  private _animTime = 0;
  private _bounceSlot: SlotKind | null = null;

  private readonly _tickFn = (dt: number): void => {
    this._animTime += Math.min(0.05, dt / 60);
    if (this._clocheNode && !this._clocheNode.destroyed) {
      this._clocheNode.y = this._clocheBaseY + Math.sin(this._animTime * 2.6) * 3.5;
    }
  };

  constructor() {
    super('爆品研发');
    this._codexWrap.addChild(this._codexFilterBar, this._codexScroll);
    this.body.addChild(this._subBar, this._craftWrap, this._codexWrap);
    EventBus.on(EV.recipeChanged, () => { if (this.isOpen) this.rebuild(); });
    EventBus.on(EV.inspirationChanged, () => { if (this.isOpen) this.rebuild(); });
  }

  /** 从产业页点击某家门店的镇店槽直达图鉴挂载 */
  openForShop(shopId: ShopId): void {
    this._targetShopForEquip = shopId;
    const discoveredCount = Object.keys(GameState.save.discoveredRecipes ?? {}).filter(
      (k) => (GameState.save.discoveredRecipes[k] ?? 0) > 0,
    ).length;
    this._tab = discoveredCount > 0 ? 'codex' : 'craft';
    this.open();
  }

  protected override onOpen(): void {
    watchTextures([...ALL_RECIPE_LAB_TEXTURES], () => {
      if (this.isOpen) this.rebuild();
    });
    Game.ticker.remove(this._tickFn);
    Game.ticker.add(this._tickFn);
  }

  protected override onClose(): void {
    this._targetShopForEquip = null;
    this._clocheNode = null;
    Game.ticker.remove(this._tickFn);
  }

  protected layoutBody(top: number, bottom: number): void {
    this._clocheNode = null;
    this._buildSubBar(top);
    const bodyTop = top + 58;
    this._craftWrap.visible = this._tab === 'craft';
    this._codexWrap.visible = this._tab === 'codex';

    if (this._tab === 'craft') {
      this._buildCraftBench(bodyTop, bottom);
    } else {
      this._buildCodexList(bodyTop, bottom);
    }
  }

  private _buildSubBar(top: number): void {
    for (const c of this._subBar.removeChildren()) c.destroy({ children: true });
    const W = Game.logicWidth;
    const save = GameState.save;
    const totalDiscovered = Object.values(save.discoveredRecipes ?? {}).filter((v) => v > 0).length;

    const tabs: [LabTab, string][] = [
      ['craft', '研发调配台'],
      ['codex', `镇店图鉴 (${totalDiscovered})`],
    ];

    tabs.forEach(([key, label], i) => {
      const on = this._tab === key;
      const w = 178;
      const h = 46;
      const node = new PIXI.Container();
      node.position.set(PAGE_PAD + i * (w + 10), top);
      const spec = on
        ? { path: UI_SLICES.btnSmCoral, pad2x: 16, left2x: 88, top2x: 68, right2x: 88, bottom2x: 68 }
        : { path: UI_SLICES.btnMdCream, pad2x: 12, left2x: 102, top2x: 70, right2x: 102, bottom2x: 70 };
      node.addChild(createNineSlice2x(spec, w, h, false));
      const txt = on
        ? makeDisplayText(label, 18, 0xFFFFFF, 0x8C322B, 3.0)
        : makeText(label, 18, COLORS.ink, true);
      txt.anchor.set(0.5);
      txt.position.set(w / 2, h / 2 - 0.5);
      node.addChild(txt);
      node.eventMode = 'static';
      node.cursor = 'pointer';
      node.on('pointertap', () => {
        if (this._tab === key) return;
        AudioManager.play('ui_click');
        this._tab = key;
        this.rebuild();
      });
      this._subBar.addChild(node);
    });

    // 右侧研发灵感胶囊 + 现金采购快捷按钮
    const buyCost = inspirationBuyCost(baseIncomePerSec(save));
    const inspW = 314;
    const inspPill = new PIXI.Container();
    inspPill.position.set(W - PAGE_PAD - inspW, top);
    inspPill.addChild(drawCreamCard(new PIXI.Graphics(), 0, 0, inspW, 46, 23, {
      fill: 0xFFF9EC, borderColor: 0xDFB870,
    }));
    const starIco = makeStickerSprite(ICONS.questStar, 34, 34, true);
    starIco.position.set(24, 23);
    const inspTxt = makeText(`灵感 ${save.inspiration ?? 0}`, 18, COLORS.roseDeep, true);
    inspTxt.anchor.set(0, 0.5);
    inspTxt.position.set(44, 23);

    const addBg = new PIXI.Graphics()
      .beginFill(save.money >= buyCost ? 0xE8B866 : 0xE3DACD, 1)
      .drawRoundedRect(inspW - 150, 7, 142, 32, 16)
      .endFill();
    const addTxt = makeText(`+采购 ¥${formatMoney(buyCost)}`, 15, COLORS.ink, true);
    addTxt.anchor.set(0.5);
    addTxt.position.set(inspW - 79, 23);

    inspPill.addChild(starIco, inspTxt, addBg, addTxt);
    inspPill.eventMode = 'static';
    inspPill.cursor = 'pointer';
    inspPill.on('pointertap', () => {
      if (GameState.buyInspiration()) {
        AudioManager.play('coin_spend');
        ToastManager.show('采购高定原料成功 · 研发灵感 +1', 'success');
      } else {
        ToastManager.show('流动现金不足，主舞台出单也能免费得灵感！');
      }
    });
    this._subBar.addChild(inspPill);
  }

  private _buildCraftBench(top: number, bottom: number): void {
    for (const c of this._craftWrap.removeChildren()) c.destroy({ children: true });
    const W = Game.logicWidth;
    const save = GameState.save;
    const fullW = W - PAGE_PAD * 2;
    const availH = bottom - top;

    const dockH = 132;
    const dockY = bottom - dockH;
    const catBarH = 56;
    const stageH = Math.max(292, Math.min(378, Math.round(availH * 0.285)));

    // 1. 高定阳光大理石研发工坊舞台（背景插画 + 手札线索条 + 三食材瓷盘 + 成品揭晓圆台）
    this._buildAtelierStage(PAGE_PAD, top, fullW, stageH);

    // 2. 三步骤图文切换栏（带当前已选小图）
    const catY = top + stageH + 12;
    this._buildCategoryBar(PAGE_PAD, catY, fullW, catBarH);

    // 3. 3×2 大尺寸食材插画展示柜（自适应铺满中间区域，告别大块留白）
    const gridTop = catY + catBarH + 12;
    const gridBottom = dockY - 12;
    this._buildIngredientShowcase(PAGE_PAD, gridTop, fullW, Math.max(280, gridBottom - gridTop));

    // 4. 底部开炉操作舱
    this._buildCraftDock(PAGE_PAD, dockY, fullW, dockH);
  }

  private _buildAtelierStage(x: number, y: number, w: number, h: number): void {
    const save = GameState.save;
    const stage = new PIXI.Container();
    stage.position.set(x, y);

    // 底色兜底 + 遮罩圆角背景插画
    const bgFallback = new PIXI.Graphics()
      .beginFill(0xF8EBD4, 1)
      .drawRoundedRect(0, 0, w, h, 24)
      .endFill();
    const mask = new PIXI.Graphics()
      .beginFill(0xFFFFFF, 1)
      .drawRoundedRect(0, 0, w, h, 24)
      .endFill();
    const bgSprite = new PIXI.Sprite(PIXI.Texture.EMPTY);
    bgSprite.mask = mask;

    const fitBg = (): void => {
      if (bgSprite.destroyed) return;
      const tex = gameTexture(RECIPE_LAB_ASSETS.stageBg);
      if (!isTextureReady(tex)) return;
      bgSprite.texture = tex;
      applyFit(bgSprite, fitCover(tex.width, tex.height, w, h));
    };
    if (isTextureReady(gameTexture(RECIPE_LAB_ASSETS.stageBg))) fitBg();
    else whenTextureReady(RECIPE_LAB_ASSETS.stageBg, fitBg);

    // 柔和奶油光晕层，确保前景瓷盘和菜品图 100% 清晰通透
    const glaze = new PIXI.Graphics()
      .beginFill(0xFFF9EE, 0.24)
      .drawRoundedRect(0, 0, w, h, 24)
      .endFill()
      .beginFill(0xFFFDF8, 0.42)
      .drawRoundedRect(8, h * 0.44, w - 16, h * 0.54, 20)
      .endFill();

    const rim = new PIXI.Graphics()
      .lineStyle(2.6, 0xDFB870, 0.96)
      .drawRoundedRect(0, 0, w, h, 24)
      .lineStyle(1.2, 0xFFFFFF, 0.85)
      .drawRoundedRect(4, 4, w - 8, h - 8, 21);

    stage.addChild(bgFallback, mask, bgSprite, glaze, rim);

    // 顶部悬浮「外婆秘方手札」图文线索条
    const sigSolved = SIGNATURE_RECIPES.filter((r) => (save.discoveredRecipes[r.comboKey] ?? 0) > 0).length;
    const nextUndiscovered = SIGNATURE_RECIPES.find((r) => !(save.discoveredRecipes[r.comboKey] > 0));
    const clueH = 54;
    const clueW = w - 24;
    const clueBar = new PIXI.Container();
    clueBar.position.set(12, 11);
    clueBar.addChild(drawCreamCard(new PIXI.Graphics(), 0, 0, clueW, clueH, 20, {
      fill: 0xFFFDF7, alpha: 0.95, borderColor: 0xE2B467, borderWidth: 1.8,
    }));

    const bookIco = makeStickerSprite(RECIPE_LAB_ASSETS.notebook, 44, 44, true);
    bookIco.position.set(30, clueH / 2);

    const hintStr = nextUndiscovered
      ? nextUndiscovered.hint
      : '14款传世秘方已全数破译！重复调配可精进至满阶 Lv.5';
    const hintTxt = makeText(hintStr, 15, COLORS.ink, true);
    hintTxt.style.wordWrap = true;
    hintTxt.style.wordWrapWidth = clueW - 168;
    hintTxt.style.breakWords = true;
    hintTxt.style.lineHeight = 20;
    hintTxt.anchor.set(0, 0.5);
    hintTxt.position.set(58, clueH / 2);

    const progPill = new PIXI.Graphics()
      .beginFill(0xFCEBD2, 1)
      .lineStyle(1.4, 0xDFB870, 1)
      .drawRoundedRect(clueW - 104, 10, 94, 34, 17)
      .endFill();
    const progTxt = makeText(`秘方 ${sigSolved}/14`, 14, COLORS.roseDeep, true);
    progTxt.anchor.set(0.5);
    progTxt.position.set(clueW - 57, 27);

    clueBar.addChild(bookIco, hintTxt, progPill, progTxt);
    clueBar.eventMode = 'static';
    clueBar.cursor = 'pointer';
    clueBar.on('pointertap', () => {
      AudioManager.play('ui_click');
      this._tab = 'codex';
      this._codexFilter = nextUndiscovered ? 'locked' : 'all';
      this.rebuild();
    });
    stage.addChild(clueBar);

    // 桌面中央：三座雕金白瓷食材托盘 + 黄金加号 + 右侧成品揭晓圆台
    const tableCenterY = 66 + (h - 66) * 0.52;
    const baseDef = RECIPE_BASES.find((b) => b.id === this._selBase) ?? RECIPE_BASES[0];
    const soulDef = RECIPE_SOULS.find((s) => s.id === this._selSoul) ?? RECIPE_SOULS[0];
    const hypeDef = RECIPE_HYPES.find((p) => p.id === this._selHype) ?? RECIPE_HYPES[0];

    const slots: { kind: SlotKind; stepTag: string; def: IngredientDef; cx: number }[] = [
      { kind: 'base', stepTag: '① 基底', def: baseDef, cx: 82 },
      { kind: 'soul', stepTag: '② 风味', def: soulDef, cx: 230 },
      { kind: 'hype', stepTag: '③ 造势', def: hypeDef, cx: 378 },
    ];

    slots.forEach(({ kind, stepTag, def, cx }, idx) => {
      const on = this._activeSlot === kind;
      const ped = new PIXI.Container();
      ped.position.set(cx, tableCenterY);

      // 瓷盘与选中光环
      const plate = new PIXI.Graphics();
      if (on) {
        plate.beginFill(0xFFE3D8, 0.72).drawCircle(0, -6, 56).endFill();
      }
      plate.lineStyle(on ? 3.2 : 2.2, on ? COLORS.rose : 0xDFB870, 1)
        .beginFill(0xFFFDF8, 0.97)
        .drawCircle(0, -6, 49)
        .endFill()
        .lineStyle(1.2, 0xF1DEC0, 0.9)
        .drawCircle(0, -6, 41);

      const stepPill = new PIXI.Graphics()
        .beginFill(on ? COLORS.rose : 0xEFE1CA, 1)
        .drawRoundedRect(-36, -68, 72, 22, 11)
        .endFill();
      const stepTxt = makeText(stepTag, 13, on ? 0xFFFFFF : COLORS.inkSoft, true);
      stepTxt.anchor.set(0.5);
      stepTxt.position.set(0, -57);

      const ico = makeStickerSprite(ingredientIconPath(def.id), 82, 82, true);
      ico.position.set(0, -8);

      const nameBg = drawCreamCard(new PIXI.Graphics(), -60, 42, 120, 30, 15, {
        fill: on ? 0xFFF2EA : 0xFFFDF9,
        borderColor: on ? COLORS.rose : 0xDFB870,
        borderWidth: on ? 2.0 : 1.4,
      });
      const nameTxt = makeText(def.name, 14, on ? COLORS.roseDeep : COLORS.ink, true);
      nameTxt.anchor.set(0.5);
      nameTxt.position.set(0, 57);
      if (nameTxt.width > 106) nameTxt.scale.set(106 / nameTxt.width);

      ped.addChild(plate, ico, stepPill, stepTxt, nameBg, nameTxt);
      ped.hitArea = new PIXI.Rectangle(-64, -72, 128, 148);
      ped.eventMode = 'static';
      ped.cursor = 'pointer';
      ped.on('pointertap', () => {
        AudioManager.play('ui_click');
        this._activeSlot = kind;
        this.rebuild();
      });

      if (this._bounceSlot === kind) {
        ped.scale.set(0.84);
        TweenManager.to({ target: ped.scale, props: { x: 1, y: 1 }, duration: 0.24, ease: Ease.easeOutBack });
      }

      stage.addChild(ped);

      if (idx < 2) {
        const plusX = cx + 74;
        const plusBg = new PIXI.Graphics()
          .beginFill(0xFFF6E2, 0.95)
          .lineStyle(1.6, 0xDFB870, 1)
          .drawCircle(plusX, tableCenterY - 6, 13)
          .endFill();
        const plusTxt = makeText('+', 19, COLORS.goldDeep, true);
        plusTxt.anchor.set(0.5);
        plusTxt.position.set(plusX, tableCenterY - 7);
        stage.addChild(plusBg, plusTxt);
      }
    });
    this._bounceSlot = null;

    // 合成导向金箭
    const arrowX = 464;
    const arrowBg = new PIXI.Graphics()
      .beginFill(0xFFF2DA, 0.96)
      .lineStyle(1.8, 0xDFB870, 1)
      .drawCircle(arrowX, tableCenterY - 6, 16)
      .endFill();
    const arrowTxt = makeText('▸', 20, COLORS.roseDeep, true);
    arrowTxt.anchor.set(0.5);
    arrowTxt.position.set(arrowX + 1, tableCenterY - 6.5);
    stage.addChild(arrowBg, arrowTxt);

    // 右侧大号成品 / 鎏金神秘餐盖展示台
    const comboKey = makeComboKey(this._selBase, this._selSoul, this._selHype);
    const knownLv = save.discoveredRecipes[comboKey] ?? 0;
    const knownRecipe = knownLv > 0 ? resolveRecipe(comboKey, knownLv) : null;

    const resX = 590;
    const resWrap = new PIXI.Container();
    resWrap.position.set(resX, tableCenterY);

    const resHalo = new PIXI.Graphics()
      .beginFill(knownRecipe ? 0xFFF4D6 : 0xFFE9DF, 0.72)
      .drawCircle(0, -8, 70)
      .endFill()
      .lineStyle(3.0, knownRecipe ? 0xDF9E38 : COLORS.rose, 1)
      .beginFill(0xFFFDF8, 0.98)
      .drawCircle(0, -8, 62)
      .endFill()
      .lineStyle(1.4, 0xF3DFB8, 1)
      .drawCircle(0, -8, 53);
    drawDiamondStar(resHalo, -58, -54, 6.5, 0xEBB958, 0.95);
    drawDiamondStar(resHalo, 60, -48, 5.5, 0xE46C5E, 0.9);
    resWrap.addChild(resHalo);

    const floatDish = new PIXI.Container();
    floatDish.position.set(0, -10);
    const dishPath = knownRecipe ? recipeIconPath(comboKey) : RECIPE_LAB_ASSETS.mysteryCloche;
    floatDish.addChild(makeStickerSprite(dishPath, 118, 118, true));
    resWrap.addChild(floatDish);
    this._clocheNode = floatDish;
    this._clocheBaseY = -10;

    // 成品顶部角标（品阶 或 待揭晓）
    if (knownRecipe) {
      const gc = GRADE_COLORS[knownRecipe.grade];
      const badge = new PIXI.Graphics()
        .lineStyle(1.6, 0xFFF7E0, 1)
        .beginFill(gc.bg, 1)
        .drawRoundedRect(-56, -76, 112, 26, 13)
        .endFill();
      const bTxt = makeText(`${knownRecipe.grade}级 · Lv.${knownLv}`, 14, gc.text, true);
      bTxt.anchor.set(0.5);
      bTxt.position.set(0, -63);
      resWrap.addChild(badge, bTxt);
    } else {
      const badge = new PIXI.Graphics()
        .lineStyle(1.6, 0xFFF7E0, 1)
        .beginFill(COLORS.rose, 1)
        .drawRoundedRect(-56, -76, 112, 26, 13)
        .endFill();
      const bTxt = makeText('未知新配方', 14, 0xFFFFFF, true);
      bTxt.anchor.set(0.5);
      bTxt.position.set(0, -63);
      resWrap.addChild(badge, bTxt);
    }

    const resNameBg = drawCreamCard(new PIXI.Graphics(), -88, 42, 176, 32, 16, {
      fill: knownRecipe ? 0xFFF9EC : 0xFFF1EA,
      borderColor: knownRecipe ? 0xDFB870 : COLORS.rose,
      borderWidth: 1.8,
    });
    const resLabel = knownRecipe ? knownRecipe.name : '首创出炉送玫瑰';
    const resNameTxt = makeText(resLabel, 15, knownRecipe ? COLORS.ink : COLORS.roseDeep, true);
    resNameTxt.anchor.set(0.5);
    resNameTxt.position.set(0, 58);
    if (resNameTxt.width > 160) resNameTxt.scale.set(160 / resNameTxt.width);
    resWrap.addChild(resNameBg, resNameTxt);

    resWrap.eventMode = 'static';
    resWrap.cursor = 'pointer';
    resWrap.on('pointertap', () => {
      if (knownRecipe) {
        AudioManager.play('ui_click');
        void showRecipeRevealModal({
          recipe: knownRecipe,
          isNew: false,
          rosesGained: 0,
          autoShopId: this._findEquippedShop(comboKey),
        }).then((goCodex) => {
          if (goCodex) {
            this._tab = 'codex';
            this.rebuild();
          }
        });
      } else {
        ToastManager.show('点击底部「开炉调配爆品」即可揭晓神秘餐盖下的新品！');
      }
    });

    stage.addChild(resWrap);
    this._craftWrap.addChild(stage);
  }

  private _buildCategoryBar(x: number, y: number, w: number, h: number): void {
    const gap = 12;
    const tabW = Math.floor((w - gap * 2) / 3);
    const cats: { kind: SlotKind; title: string; selId: string }[] = [
      { kind: 'base', title: '1. 核心基底', selId: this._selBase },
      { kind: 'soul', title: '2. 灵魂风味', selId: this._selSoul },
      { kind: 'hype', title: '3. 破圈造势', selId: this._selHype },
    ];

    cats.forEach((cat, idx) => {
      const on = this._activeSlot === cat.kind;
      const node = new PIXI.Container();
      node.position.set(x + idx * (tabW + gap), y);

      const spec = on
        ? { path: UI_SLICES.btnSmCoral, pad2x: 14, left2x: 88, top2x: 68, right2x: 88, bottom2x: 68 }
        : { path: UI_SLICES.btnMdCream, pad2x: 12, left2x: 102, top2x: 70, right2x: 102, bottom2x: 70 };
      node.addChild(createNineSlice2x(spec, tabW, h, false));

      const icoRing = new PIXI.Graphics()
        .beginFill(0xFFFDF8, on ? 0.95 : 0.85)
        .drawCircle(32, h / 2, 19)
        .endFill();
      const ico = makeStickerSprite(ingredientIconPath(cat.selId), 34, 34, true);
      ico.position.set(32, h / 2);

      const txt = on
        ? makeDisplayText(cat.title, 18, 0xFFFFFF, 0x8C322B, 2.8)
        : makeText(cat.title, 18, COLORS.ink, true);
      txt.anchor.set(0.5);
      txt.position.set(38 + (tabW - 44) / 2, h / 2 - 0.5);

      node.addChild(icoRing, ico, txt);
      node.eventMode = 'static';
      node.cursor = 'pointer';
      node.on('pointertap', () => {
        if (this._activeSlot === cat.kind) return;
        AudioManager.play('ui_click');
        this._activeSlot = cat.kind;
        this.rebuild();
      });
      this._craftWrap.addChild(node);
    });
  }

  private _buildIngredientShowcase(x: number, y: number, w: number, availH: number): void {
    const save = GameState.save;
    const pool = this._activeSlot === 'base'
      ? RECIPE_BASES
      : this._activeSlot === 'soul'
        ? RECIPE_SOULS
        : RECIPE_HYPES;
    const selectedId = this._activeSlot === 'base'
      ? this._selBase
      : this._activeSlot === 'soul'
        ? this._selSoul
        : this._selHype;

    const gapX = 14;
    const gapY = 14;
    const cardW = Math.floor((w - gapX * 2) / 3);
    const cardH = Math.max(156, Math.min(288, Math.floor((availH - gapY) / 2)));
    const totalGridH = cardH * 2 + gapY;
    const startY = y + Math.max(0, Math.floor((availH - totalGridH) / 2));

    pool.forEach((item, idx) => {
      const col = idx % 3;
      const row = Math.floor(idx / 3);
      const unlocked = save.netWorth >= item.unlockNetWorth;
      const active = item.id === selectedId;

      const card = new PIXI.Container();
      card.position.set(x + col * (cardW + gapX), startY + row * (cardH + gapY));

      const slicePath = !unlocked
        ? UI_SLICES.cardGridLocked
        : active
          ? UI_SLICES.cardGridReady
          : UI_SLICES.cardGridUnlocked;
      card.addChild(
        createNineSlice2x(
          { path: slicePath, pad2x: 12, left2x: 76, top2x: 76, right2x: 76, bottom2x: 76 },
          cardW,
          cardH,
          false,
        ),
      );

      // 插画圆形柔光底盘 + 大尺寸精致食材小图
      const artCenterY = Math.round(cardH * 0.39);
      const haloR = Math.min(64, Math.round(cardH * 0.25));
      const halo = new PIXI.Graphics()
        .beginFill(active ? 0xFFE8DC : 0xFFF7E8, unlocked ? 0.92 : 0.55)
        .lineStyle(1.6, active ? COLORS.rose : 0xECD3A2, unlocked ? 0.95 : 0.45)
        .drawCircle(cardW / 2, artCenterY, haloR)
        .endFill();
      card.addChild(halo);

      const iconSize = Math.min(132, Math.round(cardH * 0.50));
      const ico = makeStickerSprite(ingredientIconPath(item.id), iconSize, iconSize, true);
      ico.position.set(cardW / 2, artCenterY);
      if (!unlocked) {
        applyGray(ico);
        ico.alpha = 0.50;
      }
      card.addChild(ico);

      // 左上角品质星级
      const starsStr = '★'.repeat(Math.max(1, item.affinity - 1));
      const starBadge = makeText(starsStr, 14, unlocked ? 0xD8962E : COLORS.inkMuted, true);
      starBadge.position.set(14, 11);
      card.addChild(starBadge);

      // 右上角状态章（已选 或 锁头）
      if (active && unlocked) {
        const onPill = new PIXI.Graphics()
          .beginFill(COLORS.rose, 1)
          .drawRoundedRect(cardW - 76, 10, 64, 24, 12)
          .endFill();
        const onTxt = makeText('已入盘', 13, 0xFFFFFF, true);
        onTxt.anchor.set(0.5);
        onTxt.position.set(cardW - 44, 22);
        card.addChild(onPill, onTxt);
      } else if (!unlocked) {
        const lockIco = makeStickerSprite(ICONS.lock, 34, 34, true);
        lockIco.position.set(cardW - 28, 26);
        card.addChild(lockIco);
      }

      // 名称 + 底部词条胶囊
      const nameY = cardH - 54;
      const nameTxt = makeText(
        item.name,
        19,
        unlocked ? (active ? COLORS.roseDeep : COLORS.ink) : COLORS.inkMuted,
        true,
      );
      nameTxt.anchor.set(0.5);
      nameTxt.position.set(cardW / 2, nameY);
      if (nameTxt.width > cardW - 22) nameTxt.scale.set((cardW - 22) / nameTxt.width);
      card.addChild(nameTxt);

      const pillW = cardW - 24;
      const pillH = 28;
      const pillY = cardH - 34;
      const pillBg = new PIXI.Graphics()
        .beginFill(active ? 0xFDE5DC : unlocked ? 0xF9EFE0 : 0xE5DDD0, 0.95)
        .drawRoundedRect(12, pillY, pillW, pillH, 14)
        .endFill();
      const subStr = unlocked
        ? `${item.tag} · ${SHORT_BUFF_TAG[item.buffBias]}`
        : `身价 ¥${formatMoney(item.unlockNetWorth)} 解锁`;
      const subTxt = makeText(subStr, 14, active ? COLORS.roseDeep : COLORS.inkSoft, active);
      subTxt.anchor.set(0.5);
      subTxt.position.set(cardW / 2, pillY + pillH / 2);
      if (subTxt.width > pillW - 14) subTxt.scale.set((pillW - 14) / subTxt.width);
      card.addChild(pillBg, subTxt);

      card.hitArea = new PIXI.Rectangle(0, 0, cardW, cardH);
      card.eventMode = 'static';
      card.cursor = 'pointer';
      card.on('pointertap', () => {
        if (!unlocked) {
          ToastManager.show(`身价达到 ¥${formatMoney(item.unlockNetWorth)} 解锁「${item.name}」`);
          return;
        }
        AudioManager.play('ui_click');
        this._bounceSlot = this._activeSlot;
        if (this._activeSlot === 'base') {
          this._selBase = item.id;
        } else if (this._activeSlot === 'soul') {
          this._selSoul = item.id;
        } else {
          this._selHype = item.id;
        }
        this.rebuild();
      });

      this._craftWrap.addChild(card);
    });
  }

  private _buildCraftDock(x: number, y: number, w: number, h: number): void {
    const save = GameState.save;
    const dock = makeCouturePlaque(w, h, true, false);
    dock.position.set(x, y);
    this._craftWrap.addChild(dock);

    const comboKey = makeComboKey(this._selBase, this._selSoul, this._selHype);
    const knownLv = save.discoveredRecipes[comboKey] ?? 0;
    const knownRecipe = knownLv > 0 ? resolveRecipe(comboKey, knownLv) : null;

    const statusStr = knownRecipe
      ? `已掌握：【${knownRecipe.grade}级】${knownRecipe.name} Lv.${knownLv}（${formatRecipeBuff(knownRecipe)}）`
      : '✦ 全新未知配方组合！首次开炉必赠心动玫瑰与镇店加成';
    const statusTxt = makeText(statusStr, 17, knownRecipe ? COLORS.ink : COLORS.roseDeep, true);
    statusTxt.anchor.set(0.5);
    statusTxt.position.set(x + w / 2, y + 26);
    if (statusTxt.width > w - 40) statusTxt.scale.set((w - 40) / statusTxt.width);
    this._craftWrap.addChild(statusTxt);

    const canCraft = (save.inspiration ?? 0) >= 1 && knownLv < 5;
    const craftBtn = new Button({
      width: 500,
      height: 68,
      variant: 'rose',
      fontSize: 23,
      label: knownLv >= 5
        ? '该配方已臻满阶 Lv.5'
        : (save.inspiration ?? 0) >= 1
          ? (knownLv > 0 ? '✦ 精进配方品质（消耗 1 灵感）' : '✦ 开炉调配爆品（消耗 1 灵感）')
          : '灵感不足 · 点击右上采购或回主舞台出单',
      onTap: () => this._doCraft(),
    });
    craftBtn.setEnabled(canCraft);
    craftBtn.position.set(x + w / 2, y + 84);
    this._craftWrap.addChild(craftBtn);
  }

  private _findEquippedShop(comboKey: string): ShopId | null {
    const save = GameState.save;
    return (Object.entries(save.equippedRecipes ?? {}) as [ShopId, string | undefined][])
      .find(([, key]) => key === comboKey)?.[0] ?? null;
  }

  private _doCraft(): void {
    const res = GameState.craftRecipe(this._selBase, this._selSoul, this._selHype);
    if (!res) {
      ToastManager.show('研发灵感不足');
      return;
    }
    Platform.vibrateShort('medium');
    AudioManager.play(res.recipe.isSignature ? 'level_up' : 'item_reveal');

    // 若存在还没挂镇店爆品的已开业门店，自动挂载上去让玩家立刻享受秒伤飙升
    const save = GameState.save;
    let autoShopId: ShopId | null = this._findEquippedShop(res.recipe.comboKey);
    if (!autoShopId) {
      const emptyOpenShop = SHOPS.find((s) => (save.shops[s.id] ?? 0) > 0 && !save.equippedRecipes[s.id]);
      if (emptyOpenShop) {
        GameState.equipShopRecipe(emptyOpenShop.id, res.recipe.comboKey);
        autoShopId = emptyOpenShop.id;
      }
    }

    void showRecipeRevealModal({
      recipe: res.recipe,
      isNew: res.isNew,
      rosesGained: res.rosesGained,
      autoShopId,
    }).then((goCodex) => {
      if (goCodex) {
        this._tab = 'codex';
        this._codexFilter = 'all';
        this.rebuild();
      }
    });
  }

  private _buildCodexList(top: number, bottom: number): void {
    for (const c of this._codexFilterBar.removeChildren()) c.destroy({ children: true });
    for (const c of this._codexScroll.content.removeChildren()) c.destroy({ children: true });

    const W = Game.logicWidth;
    const fullW = W - PAGE_PAD * 2;
    const save = GameState.save;
    const buffs = computeRecipeBuffs(save);

    const discoveredList: ResolvedRecipe[] = Object.entries(save.discoveredRecipes ?? {})
      .filter(([, lv]) => lv > 0)
      .map(([k, lv]) => resolveRecipe(k, lv));

    const gradeRank: Record<RecipeGrade, number> = { SS: 4, S: 3, A: 2, B: 1 };
    discoveredList.sort((a, b) => gradeRank[b.grade] - gradeRank[a.grade] || b.level - a.level);

    const undiscoveredSigs: SignatureRecipeDef[] = SIGNATURE_RECIPES.filter(
      (r) => !(save.discoveredRecipes[r.comboKey] > 0),
    );
    const sigSolved = SIGNATURE_RECIPES.length - undiscoveredSigs.length;

    // 1. 顶部典藏进度总览卡
    const headerH = 78;
    const headerCard = drawCreamCard(new PIXI.Graphics(), PAGE_PAD, top, fullW, headerH, 20, {
      fill: 0xFFF7EA, borderColor: 0xDFB870, borderWidth: 2,
    });
    const bookIco = makeStickerSprite(RECIPE_LAB_ASSETS.notebook, 56, 56, true);
    bookIco.position.set(PAGE_PAD + 42, top + headerH / 2);

    const headLine1 = this._targetShopForEquip
      ? `正在为「${shopById(this._targetShopForEquip).name}」挑选镇店之宝`
      : `传世名品破译 ${sigSolved}/${SIGNATURE_RECIPES.length}  ·  已研配方共 ${discoveredList.length} 款`;
    const hTxt1 = makeText(headLine1, 19, COLORS.ink, true);
    hTxt1.position.set(PAGE_PAD + 82, top + 14);

    const hTxt2 = makeText(
      `✦ 图鉴收集永久帝国总收益 +${Math.round(buffs.collectionEmpireBonus * 100)}%（每款镇店再享客单 +15%）`,
      15,
      COLORS.roseDeep,
      true,
    );
    hTxt2.position.set(PAGE_PAD + 82, top + 45);
    if (hTxt2.width > fullW - 96) hTxt2.scale.set((fullW - 96) / hTxt2.width);
    this._codexFilterBar.addChild(headerCard, bookIco, hTxt1, hTxt2);

    // 2. 筛选标签行
    const filterY = top + headerH + 10;
    const filterH = 42;
    const filters: [CodexFilter, string][] = [
      ['all', `全部典藏 (${discoveredList.length + undiscoveredSigs.length})`],
      ['unlocked', `已掌握 (${discoveredList.length})`],
      ['locked', `待破译秘方 (${undiscoveredSigs.length})`],
    ];
    const fw = Math.floor((fullW - 20) / 3);
    filters.forEach(([fKey, label], idx) => {
      const on = this._codexFilter === fKey;
      const chip = new PIXI.Container();
      chip.position.set(PAGE_PAD + idx * (fw + 10), filterY);
      chip.addChild(drawCreamCard(new PIXI.Graphics(), 0, 0, fw, filterH, 21, {
        fill: on ? 0xFDE6DE : 0xFFFDF8,
        borderColor: on ? COLORS.rose : 0xDFB870,
        borderWidth: on ? 2.2 : 1.5,
      }));
      const ft = makeText(label, 16, on ? COLORS.roseDeep : COLORS.inkSoft, true);
      ft.anchor.set(0.5);
      ft.position.set(fw / 2, filterH / 2);
      chip.addChild(ft);
      chip.eventMode = 'static';
      chip.cursor = 'pointer';
      chip.on('pointertap', () => {
        if (this._codexFilter === fKey) return;
        AudioManager.play('ui_click');
        this._codexFilter = fKey;
        this.rebuild();
      });
      this._codexFilterBar.addChild(chip);
    });

    // 3. 图文卡片滚动墙
    const listTop = filterY + filterH + 12;
    this._codexScroll.position.set(PAGE_PAD, listTop);
    this._codexScroll.setViewport(fullW, Math.max(200, bottom - listTop));

    let y = 2;
    const cardH = 158;

    if (this._codexFilter !== 'locked') {
      discoveredList.forEach((rec) => {
        const row = this._buildDiscoveredCodexCard(rec, fullW, cardH);
        row.position.set(0, y);
        this._codexScroll.content.addChild(row);
        y += cardH + 14;
      });
    }

    if (this._codexFilter !== 'unlocked') {
      undiscoveredSigs.forEach((sig) => {
        const row = this._buildLockedSignatureCard(sig, fullW, cardH);
        row.position.set(0, y);
        this._codexScroll.content.addChild(row);
        y += cardH + 14;
      });
    }

    if (y <= 4) {
      const emptyTxt = makeText(
        this._codexFilter === 'unlocked'
          ? '尚未研发出爆品，快切回「研发调配台」看图选材试制第一款吧！'
          : '恭喜！全部 14 款传世秘方均已破译收录！',
        19,
        COLORS.inkSoft,
        true,
      );
      emptyTxt.style.wordWrap = true;
      emptyTxt.style.wordWrapWidth = fullW - 80;
      emptyTxt.style.align = 'center';
      emptyTxt.anchor.set(0.5, 0);
      emptyTxt.position.set(fullW / 2, 110);
      this._codexScroll.content.addChild(emptyTxt);
      y = 260;
    }

    this._codexScroll.setContentHeight(y + 18);
  }

  private _buildDiscoveredCodexCard(rec: ResolvedRecipe, fullW: number, cardH: number): PIXI.Container {
    const save = GameState.save;
    const row = new PIXI.Container();
    const equippedShopId = this._findEquippedShop(rec.comboKey);

    row.addChild(makeCouturePlaque(fullW, cardH, Boolean(equippedShopId), false));

    // 左侧 122×122 白瓷描金成品大图展示框
    const boxX = 16;
    const boxY = 18;
    const boxSz = 122;
    const dishFrame = drawCreamCard(new PIXI.Graphics(), boxX, boxY, boxSz, boxSz, 22, {
      fill: 0xFFF8EB,
      borderColor: equippedShopId ? COLORS.rose : 0xDFB870,
      borderWidth: 2.0,
    });
    const dishIco = makeStickerSprite(recipeIconPath(rec.comboKey), 106, 106, true);
    dishIco.position.set(boxX + boxSz / 2, boxY + boxSz / 2);
    row.addChild(dishFrame, dishIco);

    // 品阶角标 + 等级胶囊
    const gc = GRADE_COLORS[rec.grade];
    const gBadge = new PIXI.Graphics()
      .lineStyle(1.5, 0xFFF9EC, 1)
      .beginFill(gc.bg, 1)
      .drawRoundedRect(boxX - 4, boxY - 6, 56, 26, 13)
      .endFill();
    const gTxt = makeText(`${rec.grade}级`, 14, gc.text, true);
    gTxt.anchor.set(0.5);
    gTxt.position.set(boxX + 24, boxY + 7);

    const lvPill = new PIXI.Graphics()
      .lineStyle(1.4, 0xDFB870, 1)
      .beginFill(0xFFFDF9, 0.96)
      .drawRoundedRect(boxX + boxSz - 56, boxY + boxSz - 24, 58, 24, 12)
      .endFill();
    const lvTxt = makeNumText(`Lv.${rec.level}`, 14, COLORS.roseDeep);
    lvTxt.anchor.set(0.5);
    lvTxt.position.set(boxX + boxSz - 27, boxY + boxSz - 12);
    row.addChild(gBadge, gTxt, lvPill, lvTxt);

    // 中部：菜名 + 三食材小图标配方条 + 镇店加成 + 当前挂载门店
    const midX = 152;
    const midMaxW = fullW - midX - 186;

    const nameTxt = makeText(rec.name, 22, COLORS.ink, true);
    nameTxt.position.set(midX, 16);
    if (nameTxt.width > midMaxW) nameTxt.scale.set(midMaxW / nameTxt.width);
    row.addChild(nameTxt);

    const triple = findIngredients(rec.comboKey);
    if (triple) {
      triple.forEach((ing, idx) => {
        const ix = midX + idx * 116;
        const iy = 62;
        const chipBg = new PIXI.Graphics()
          .beginFill(0xFAF0DF, 0.95)
          .lineStyle(1.2, 0xE5C78E, 0.9)
          .drawRoundedRect(ix, iy - 15, 110, 30, 15)
          .endFill();
        const ic = makeStickerSprite(ingredientIconPath(ing.id), 24, 24, true);
        ic.position.set(ix + 16, iy);
        const shortName = ing.name.slice(0, 4);
        const it = makeText(shortName, 13, COLORS.inkSoft, true);
        it.anchor.set(0, 0.5);
        it.position.set(ix + 30, iy);
        row.addChild(chipBg, ic, it);
      });
    }

    const buffTxt = makeNumText(`✦ ${formatRecipeBuff(rec)} · 客单 +15%`, 17, COLORS.goldDeep);
    buffTxt.position.set(midX, 86);
    if (buffTxt.width > midMaxW) buffTxt.scale.set(midMaxW / buffTxt.width);
    row.addChild(buffTxt);

    if (equippedShopId) {
      const shopIco = makeStickerSprite(SHOP_ICONS[equippedShopId], 28, 28, true);
      shopIco.position.set(midX + 14, 126);
      const eqTxt = makeText(`镇守中：${shopById(equippedShopId).name}`, 16, COLORS.mint, true);
      eqTxt.anchor.set(0, 0.5);
      eqTxt.position.set(midX + 32, 126);
      row.addChild(shopIco, eqTxt);
    } else {
      const eqTxt = makeText('状态：待挂载至开业门店', 15, COLORS.inkSoft, true);
      eqTxt.anchor.set(0, 0.5);
      eqTxt.position.set(midX, 126);
      row.addChild(eqTxt);
    }

    // 点击卡片左侧大图也可再次打开精美成品揭晓卡细看
    dishFrame.eventMode = 'static';
    dishFrame.cursor = 'pointer';
    dishFrame.on('pointertap', () => {
      if (this._codexScroll.dragging) return;
      AudioManager.play('ui_click');
      void showRecipeRevealModal({
        recipe: rec,
        isNew: false,
        rosesGained: 0,
        autoShopId: equippedShopId,
      });
    });

    const btn = new Button({
      width: 162,
      height: 54,
      variant: equippedShopId ? 'gold' : 'rose',
      fontSize: 18,
      label: this._targetShopForEquip
        ? `挂至${shopById(this._targetShopForEquip).name}`
        : equippedShopId
          ? '更换门店'
          : '镇店挂载',
      onTap: () => {
        if (this._codexScroll.dragging) return;
        this._pickShopToEquip(rec);
      },
    });
    btn.position.set(fullW - 96, cardH / 2);
    row.addChild(btn);

    return row;
  }

  private _buildLockedSignatureCard(sig: SignatureRecipeDef, fullW: number, cardH: number): PIXI.Container {
    const row = new PIXI.Container();
    row.addChild(makeCouturePlaque(fullW, cardH, false, false));

    const boxX = 16;
    const boxY = 18;
    const boxSz = 122;
    const frame = drawCreamCard(new PIXI.Graphics(), boxX, boxY, boxSz, boxSz, 22, {
      fill: 0xF3E9D8, borderColor: 0xD6C3A5, borderWidth: 1.8,
    });
    const cloche = makeStickerSprite(RECIPE_LAB_ASSETS.mysteryCloche, 98, 98, true);
    cloche.position.set(boxX + boxSz / 2, boxY + boxSz / 2);
    row.addChild(frame, cloche);

    const gc = GRADE_COLORS[sig.grade];
    const gBadge = new PIXI.Graphics()
      .lineStyle(1.4, 0xFFF9EC, 1)
      .beginFill(gc.bg, 0.88)
      .drawRoundedRect(boxX - 4, boxY - 6, 56, 26, 13)
      .endFill();
    const gTxt = makeText(`${sig.grade}级`, 14, gc.text, true);
    gTxt.anchor.set(0.5);
    gTxt.position.set(boxX + 24, boxY + 7);
    row.addChild(gBadge, gTxt);

    const midX = 152;
    const midMaxW = fullW - midX - 178;

    const title = makeText('？？？ · 传世秘方待破译', 20, COLORS.ink, true);
    title.position.set(midX, 18);
    row.addChild(title);

    const hint = makeText(sig.hint, 15, COLORS.inkSoft, true);
    hint.style.wordWrap = true;
    hint.style.wordWrapWidth = midMaxW;
    hint.style.breakWords = true;
    hint.style.lineHeight = 22;
    hint.position.set(midX, 52);
    row.addChild(hint);

    const roseIco = makeStickerSprite(ICONS.currencyRose, 26, 26, true);
    roseIco.position.set(midX + 13, 124);
    const rTxt = makeText(`首创破译赠 +${sig.roseReward} 玫瑰`, 15, COLORS.roseDeep, true);
    rTxt.anchor.set(0, 0.5);
    rTxt.position.set(midX + 30, 124);
    row.addChild(roseIco, rTxt);

    const btn = new Button({
      width: 152,
      height: 52,
      variant: 'cream',
      fontSize: 18,
      label: '去调配',
      onTap: () => {
        if (this._codexScroll.dragging) return;
        AudioManager.play('ui_click');
        this._tab = 'craft';
        this.rebuild();
      },
    });
    btn.position.set(fullW - 92, cardH / 2);
    row.addChild(btn);

    return row;
  }

  private _pickShopToEquip(rec: ResolvedRecipe): void {
    const save = GameState.save;
    if (this._targetShopForEquip && (save.shops[this._targetShopForEquip] ?? 0) > 0) {
      GameState.equipShopRecipe(this._targetShopForEquip, rec.comboKey);
      AudioManager.play('upgrade');
      ToastManager.show(`✦ 已将「${rec.name}」设为${shopById(this._targetShopForEquip).name}镇店之宝！`, 'success');
      this._targetShopForEquip = null;
      this.rebuild();
      return;
    }

    const openShops = SHOPS.filter((s) => (save.shops[s.id] ?? 0) > 0);
    if (!openShops.length) {
      ToastManager.show('请先在「产业」开启第一家门店后再挂载镇店爆品！');
      return;
    }

    const curShopId = this._findEquippedShop(rec.comboKey);
    const unequipped = [...openShops].reverse().find((s) => !save.equippedRecipes[s.id]);
    let target = unequipped;
    if (!target) {
      const curIdx = curShopId ? openShops.findIndex((s) => s.id === curShopId) : -1;
      target = openShops[(curIdx + 1) % openShops.length];
    }

    GameState.equipShopRecipe(target.id, rec.comboKey);
    AudioManager.play('upgrade');
    ToastManager.show(`✦ 「${rec.name}」已镇守「${target.name}」（再次点击可切换门店）`, 'success');
  }
}
