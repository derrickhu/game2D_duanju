/**
 * 招牌爆品研发室（`RecipeLabSheet`）：
 * 1. 「研发调配台」：自由选择「核心基底 × 灵魂风味 × 破圈造势」三词条，结合外婆秘方手札线索破译 14 款 S/SS 传世名品；
 * 2. 「镇店爆品图鉴」：一览所有已研发单品、永久收集帝国加成，并一键挂载至名下已开业门店当镇店之宝。
 */
import * as PIXI from 'pixi.js';
import { ICONS, SHOP_ICONS, UI_SLICES } from '@/data/art';
import {
  RECIPE_BASES,
  RECIPE_HYPES,
  RECIPE_SOULS,
  SIGNATURE_RECIPES,
  type IngredientDef,
  type RecipeGrade,
} from '@/data/recipes';
import { SHOPS, shopById, type ShopId } from '@/data/world';
import { EV } from '@/config/events';
import { AudioManager } from '@/core/AudioManager';
import { EventBus } from '@/core/EventBus';
import { Game } from '@/core/Game';
import { Platform } from '@/core/PlatformService';
import { ToastManager } from '@/core/ToastManager';
import { GameState } from '@/managers/GameState';
import { baseIncomePerSec } from '@/sim/economy';
import { formatMoney } from '@/sim/format';
import {
  computeRecipeBuffs,
  formatRecipeBuff,
  inspirationBuyCost,
  makeComboKey,
  resolveRecipe,
  type ResolvedRecipe,
} from '@/sim/recipeSim';
import { Button } from '@/ui/Button';
import { PAGE_PAD, Page } from '@/ui/Page';
import { ScrollView } from '@/ui/ScrollView';
import { showDialog } from '@/ui/Dialog';
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

type LabTab = 'craft' | 'codex';

const GRADE_COLORS: Readonly<Record<RecipeGrade, { bg: number; text: number }>> = {
  SS: { bg: 0xC64F3D, text: 0xFFFFFF },
  S: { bg: 0xD99B32, text: 0xFFFFFF },
  A: { bg: 0xE27B58, text: 0xFFFFFF },
  B: { bg: 0x3F9B66, text: 0xFFFFFF },
};

export class RecipeLabSheet extends Page {
  private readonly _subBar = new PIXI.Container();
  private readonly _craftWrap = new PIXI.Container();
  private readonly _codexScroll = new ScrollView();

  private _tab: LabTab = 'craft';
  private _selBase = RECIPE_BASES[0].id;
  private _selSoul = RECIPE_SOULS[0].id;
  private _selHype = RECIPE_HYPES[0].id;
  private _targetShopForEquip: ShopId | null = null;

  constructor() {
    super('爆品研发');
    this.body.addChild(this._subBar, this._craftWrap, this._codexScroll);
    EventBus.on(EV.recipeChanged, () => { if (this.isOpen) this.rebuild(); });
    EventBus.on(EV.inspirationChanged, () => { if (this.isOpen) this.rebuild(); });
  }

  /** 从产业页点击某家门店的镇店槽直达图鉴挂载 */
  openForShop(shopId: ShopId): void {
    this._targetShopForEquip = shopId;
    const discoveredCount = Object.keys(GameState.save.discoveredRecipes ?? {}).length;
    this._tab = discoveredCount > 0 ? 'codex' : 'craft';
    this.open();
  }

  protected override onClose(): void {
    this._targetShopForEquip = null;
  }

  protected layoutBody(top: number, bottom: number): void {
    this._buildSubBar(top);
    const bodyTop = top + 58;
    this._craftWrap.visible = this._tab === 'craft';
    this._codexScroll.visible = this._tab === 'codex';

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

    const tabs: [LabTab, string][] = [
      ['craft', '研发调配台'],
      ['codex', `镇店图鉴 (${Object.keys(save.discoveredRecipes ?? {}).length})`],
    ];

    tabs.forEach(([key, label], i) => {
      const on = this._tab === key;
      const w = 176;
      const h = 44;
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

    // 右侧研发灵感胶囊 + 现金补给快捷按钮
    const buyCost = inspirationBuyCost(baseIncomePerSec(save));
    const inspW = 312;
    const inspPill = new PIXI.Container();
    inspPill.position.set(W - PAGE_PAD - inspW, top);
    inspPill.addChild(drawCreamCard(new PIXI.Graphics(), 0, 0, inspW, 44, 22, {
      fill: 0xFFF9EC, borderColor: 0xDFB870,
    }));
    const starIco = makeStickerSprite(ICONS.questStar, 34, 34, true);
    starIco.position.set(24, 22);
    const inspTxt = makeText(`灵感 ${save.inspiration ?? 0}`, 18, COLORS.roseDeep, true);
    inspTxt.anchor.set(0, 0.5);
    inspTxt.position.set(44, 22);

    const addBg = new PIXI.Graphics()
      .beginFill(save.money >= buyCost ? 0xE8B866 : 0xE3DACD, 1)
      .drawRoundedRect(inspW - 148, 6, 140, 32, 16)
      .endFill();
    const addTxt = makeText(`+采购 ¥${formatMoney(buyCost)}`, 15, COLORS.ink, true);
    addTxt.anchor.set(0.5);
    addTxt.position.set(inspW - 78, 22);

    inspPill.addChild(starIco, inspTxt, addBg, addTxt);
    inspPill.eventMode = 'static';
    inspPill.cursor = 'pointer';
    inspPill.on('pointertap', () => {
      if (GameState.buyInspiration()) {
        AudioManager.play('coin_spend');
        ToastManager.show('采购高定食材成功 · 研发灵感 +1', 'success');
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

    // 1. 外婆手札/爆款推理线索横幅
    const nextUndiscovered = SIGNATURE_RECIPES.find((r) => !(save.discoveredRecipes[r.comboKey] > 0));
    const hintBox = drawCreamCard(new PIXI.Graphics(), PAGE_PAD, top, fullW, 68, 20, {
      fill: 0xFFF5E6, borderColor: 0xE2B467, borderWidth: 2,
    });
    const hintStr = nextUndiscovered
      ? `✦ ${nextUndiscovered.hint}`
      : '✦ 14款传世秘方已全数破译！重复研发可提升单品熟练阶数（最高 Lv.5）！';
    const hintTxt = makeText(hintStr, 17, COLORS.ink, true);
    hintTxt.style.wordWrap = true;
    hintTxt.style.wordWrapWidth = fullW - 36;
    hintTxt.style.breakWords = true;
    hintTxt.anchor.set(0, 0.5);
    hintTxt.position.set(PAGE_PAD + 18, top + 34);
    this._craftWrap.addChild(hintBox, hintTxt);

    // 2. 三大维度词条网格（每组 3 列 × 2 行）
    let curY = top + 80;
    const availH = bottom - 156 - curY;
    const secH = Math.floor((availH - 20) / 3);

    curY = this._renderIngredientSection('1. 选择核心基底', RECIPE_BASES, this._selBase, (id) => {
      this._selBase = id;
      this.rebuild();
    }, curY, secH);

    curY = this._renderIngredientSection('2. 注入灵魂风味', RECIPE_SOULS, this._selSoul, (id) => {
      this._selSoul = id;
      this.rebuild();
    }, curY + 8, secH);

    this._renderIngredientSection('3. 策划破圈造势', RECIPE_HYPES, this._selHype, (id) => {
      this._selHype = id;
      this.rebuild();
    }, curY + 8, secH);

    // 3. 底部合成预览舱 + 大号开炉按钮
    const dockH = 142;
    const dockY = bottom - dockH;
    const dock = makeCouturePlaque(fullW, dockH, true, false);
    dock.position.set(PAGE_PAD, dockY);
    this._craftWrap.addChild(dock);

    const comboKey = makeComboKey(this._selBase, this._selSoul, this._selHype);
    const knownLv = save.discoveredRecipes[comboKey] ?? 0;
    const knownRecipe = knownLv > 0 ? resolveRecipe(comboKey, knownLv) : null;

    const statusStr = knownRecipe
      ? `已掌握：【${knownRecipe.grade}级】${knownRecipe.name} Lv.${knownLv}（${formatRecipeBuff(knownRecipe)}）`
      : '✦ 全新未知配方组合！首次研发必得心动玫瑰奖励';
    const statusTxt = makeText(statusStr, 18, knownRecipe ? COLORS.ink : COLORS.roseDeep, true);
    statusTxt.anchor.set(0.5);
    statusTxt.position.set(W / 2, dockY + 28);
    if (statusTxt.width > fullW - 40) statusTxt.scale.set((fullW - 40) / statusTxt.width);
    this._craftWrap.addChild(statusTxt);

    const canCraft = (save.inspiration ?? 0) >= 1 && knownLv < 5;
    const craftBtn = new Button({
      width: 460,
      height: 72,
      variant: 'rose',
      fontSize: 24,
      label: knownLv >= 5
        ? '该配方已达满阶 Lv.5'
        : (save.inspiration ?? 0) >= 1
          ? '✦ 开炉调配爆品（消耗 1 灵感）'
          : '灵感不足 · 点击上方采购或去主舞台出单',
      onTap: () => this._doCraft(),
    });
    craftBtn.setEnabled(canCraft);
    craftBtn.position.set(W / 2, dockY + 92);
    this._craftWrap.addChild(craftBtn);
  }

  private _renderIngredientSection(
    heading: string,
    items: readonly IngredientDef[],
    selectedId: string,
    onPick: (id: string) => void,
    y: number,
    secH: number,
  ): number {
    const W = Game.logicWidth;
    const save = GameState.save;
    const fullW = W - PAGE_PAD * 2;

    const head = makeText(heading, 19, COLORS.ink, true);
    head.position.set(PAGE_PAD + 4, y);
    this._craftWrap.addChild(head);

    const gridTop = y + 28;
    const gapX = 10;
    const gapY = 8;
    const chipW = Math.floor((fullW - gapX * 2) / 3);
    const chipH = Math.max(54, Math.min(72, Math.floor((secH - 30 - gapY) / 2)));

    items.forEach((item, idx) => {
      const col = idx % 3;
      const row = Math.floor(idx / 3);
      const unlocked = save.netWorth >= item.unlockNetWorth;
      const active = item.id === selectedId;

      const chip = new PIXI.Container();
      chip.position.set(PAGE_PAD + col * (chipW + gapX), gridTop + row * (chipH + gapY));

      chip.addChild(drawCreamCard(new PIXI.Graphics(), 0, 0, chipW, chipH, 16, {
        fill: !unlocked ? 0xEDE4D6 : active ? 0xFFF1E6 : 0xFFFDF9,
        borderColor: active ? COLORS.rose : unlocked ? 0xDFB870 : 0xCFC2B0,
        borderWidth: active ? 2.8 : 1.6,
      }));

      const nameTxt = makeText(item.name, 18, unlocked ? (active ? COLORS.roseDeep : COLORS.ink) : COLORS.inkMuted, true);
      nameTxt.anchor.set(0.5);
      nameTxt.position.set(chipW / 2, chipH * 0.36);
      if (nameTxt.width > chipW - 18) nameTxt.scale.set((chipW - 18) / nameTxt.width);

      const subStr = unlocked ? item.tag : `身价 ¥${formatMoney(item.unlockNetWorth)} 解锁`;
      const subTxt = makeText(subStr, 15, active ? COLORS.goldDeep : COLORS.inkSoft);
      subTxt.anchor.set(0.5);
      subTxt.position.set(chipW / 2, chipH * 0.73);
      if (subTxt.width > chipW - 16) subTxt.scale.set((chipW - 16) / subTxt.width);

      chip.addChild(nameTxt, subTxt);
      chip.eventMode = 'static';
      chip.cursor = 'pointer';
      chip.on('pointertap', () => {
        if (!unlocked) {
          ToastManager.show(`身价达到 ¥${formatMoney(item.unlockNetWorth)} 解锁「${item.name}」`);
          return;
        }
        AudioManager.play('ui_click');
        onPick(item.id);
      });
      this._craftWrap.addChild(chip);
    });

    return gridTop + chipH * 2 + gapY;
  }

  private _doCraft(): void {
    const res = GameState.craftRecipe(this._selBase, this._selSoul, this._selHype);
    if (!res) {
      ToastManager.show('研发灵感不足');
      return;
    }
    Platform.vibrateShort('medium');
    AudioManager.play(res.recipe.isSignature ? 'level_up' : 'item_reveal');

    // 若存在还没挂镇店爆品的已开业门店，自动挂载上去让玩家立刻享受秒伤飙升！
    const save = GameState.save;
    let autoShopName = '';
    const emptyOpenShop = SHOPS.find((s) => (save.shops[s.id] ?? 0) > 0 && !save.equippedRecipes[s.id]);
    if (emptyOpenShop) {
      GameState.equipShopRecipe(emptyOpenShop.id, res.recipe.comboKey);
      autoShopName = emptyOpenShop.name;
    }

    const r = res.recipe;
    const title = res.isNew ? `✦ 研发出炉：【${r.grade}级】${r.name}` : `✦ 配方精进：【${r.grade}级】${r.name} Lv.${r.level}`;
    const extra = [
      r.desc,
      `\n✦ 镇店效果：${formatRecipeBuff(r)}（另附门店客单价 +15%）`,
      res.rosesGained > 0 ? `✦ 首创奖励：心动玫瑰 +${res.rosesGained}` : '',
      autoShopName ? `✦ 已自动为您挂载至「${autoShopName}」镇店！` : '✦ 可前往「镇店图鉴」挂载至任意已开业产业！',
    ].filter(Boolean).join('\n');

    void showDialog({
      title,
      content: extra,
      confirmText: '前往镇店图鉴',
      cancelText: '继续调配',
    }).then((goCodex) => {
      if (goCodex) {
        this._tab = 'codex';
        this.rebuild();
      }
    });
  }

  private _buildCodexList(top: number, bottom: number): void {
    for (const c of this._codexScroll.content.removeChildren()) c.destroy({ children: true });
    const W = Game.logicWidth;
    const fullW = W - PAGE_PAD * 2;
    const save = GameState.save;
    const buffs = computeRecipeBuffs(save);

    this._codexScroll.position.set(PAGE_PAD, top);
    this._codexScroll.setViewport(fullW, bottom - top);

    const bannerH = 62;
    const banner = drawCreamCard(new PIXI.Graphics(), 0, 0, fullW, bannerH, 18, {
      fill: 0xFFF5E6, borderColor: 0xDFB870,
    });
    const targetShopHint = this._targetShopForEquip
      ? `正在为「${shopById(this._targetShopForEquip).name}」挑选镇店招牌 · `
      : '';
    const sumTxt = makeText(
      `${targetShopHint}图鉴永久帝国加成 +${Math.round(buffs.collectionEmpireBonus * 100)}%`,
      18,
      COLORS.roseDeep,
      true,
    );
    sumTxt.anchor.set(0.5);
    sumTxt.position.set(fullW / 2, bannerH / 2);
    if (sumTxt.width > fullW - 32) sumTxt.scale.set((fullW - 32) / sumTxt.width);
    this._codexScroll.content.addChild(banner, sumTxt);

    const entries: ResolvedRecipe[] = Object.entries(save.discoveredRecipes ?? {})
      .filter(([, lv]) => lv > 0)
      .map(([k, lv]) => resolveRecipe(k, lv));

    const gradeRank: Record<RecipeGrade, number> = { SS: 4, S: 3, A: 2, B: 1 };
    entries.sort((a, b) => gradeRank[b.grade] - gradeRank[a.grade] || b.level - a.level);

    if (entries.length === 0) {
      const emptyTxt = makeText('尚未研发出招牌爆品，快切回「研发调配台」免费开炉试制第一款吧！', 20, COLORS.inkSoft, true);
      emptyTxt.style.wordWrap = true;
      emptyTxt.style.wordWrapWidth = fullW - 80;
      emptyTxt.style.align = 'center';
      emptyTxt.anchor.set(0.5, 0);
      emptyTxt.position.set(fullW / 2, 140);
      this._codexScroll.content.addChild(emptyTxt);
      this._codexScroll.setContentHeight(280);
      return;
    }

    let y = bannerH + 14;
    const cardH = 138;
    entries.forEach((rec) => {
      const row = new PIXI.Container();
      row.position.set(0, y);

      const equippedShopId = (Object.entries(save.equippedRecipes ?? {}) as [ShopId, string | undefined][])
        .find(([, key]) => key === rec.comboKey)?.[0] ?? null;

      row.addChild(makeCouturePlaque(fullW, cardH, Boolean(equippedShopId), false));

      const gc = GRADE_COLORS[rec.grade];
      const gBadge = new PIXI.Graphics()
        .beginFill(gc.bg, 1)
        .drawRoundedRect(18, 18, 62, 34, 14)
        .endFill();
      const gTxt = makeText(`${rec.grade}级`, 18, gc.text, true);
      gTxt.anchor.set(0.5);
      gTxt.position.set(49, 35);
      row.addChild(gBadge, gTxt);

      const nameTxt = makeText(`${rec.name}  Lv.${rec.level}`, 22, COLORS.ink, true);
      nameTxt.position.set(92, 18);
      row.addChild(nameTxt);

      const buffTxt = makeNumText(`✦ ${formatRecipeBuff(rec)} · 门店客单 +15%`, 18, COLORS.goldDeep);
      buffTxt.position.set(20, 62);
      row.addChild(buffTxt);

      const eqStr = equippedShopId
        ? `当前镇守：${shopById(equippedShopId).name}`
        : '状态：待挂载至开业门店';
      const eqTxt = makeText(eqStr, 16, equippedShopId ? COLORS.mint : COLORS.inkSoft, true);
      eqTxt.position.set(20, 96);
      row.addChild(eqTxt);

      if (equippedShopId) {
        const ico = makeStickerSprite(SHOP_ICONS[equippedShopId], 44, 44, true);
        ico.position.set(fullW - 224, cardH / 2);
        row.addChild(ico);
      }

      const btn = new Button({
        width: 176,
        height: 54,
        variant: equippedShopId ? 'gold' : 'rose',
        fontSize: 19,
        label: this._targetShopForEquip
          ? `挂载至${shopById(this._targetShopForEquip).name}`
          : equippedShopId
            ? '更换门店'
            : '镇店挂载',
        onTap: () => {
          if (this._codexScroll.dragging) return;
          this._pickShopToEquip(rec);
        },
      });
      btn.position.set(fullW - 106, cardH / 2);
      row.addChild(btn);

      this._codexScroll.content.addChild(row);
      y += cardH + 14;
    });

    this._codexScroll.setContentHeight(y + 16);
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

    // 优先挂到尚未配置爆品的最高收益门店，若都挂满则轮换挂载至下一家已开门店
    const curShopId = (Object.entries(save.equippedRecipes ?? {}) as [ShopId, string | undefined][])
      .find(([, k]) => k === rec.comboKey)?.[0];
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
