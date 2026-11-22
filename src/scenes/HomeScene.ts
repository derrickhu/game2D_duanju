/**
 * 主界面（v8 A+B 融合全量重构版 —— 三段式一体化珠光舱 + 阳光动态经营舞台）：
 * 1. 顶部一体化珠光象牙金状态舱 (`v8_top_header_dock`)：左侧苏晚阳光微笑圆章头像 + 26px 粗体女王头衔 + 珊瑚金身价进度舱 + 右侧双层玫瑰/现金槽 + 底部垂挂鎏金章节牌 (`v8_top_chapter_tab`)；
 * 2. 中央 62% 纯净阳光精品经营舞台 (`LivingStage`)：100% 还原原设苏晚动态 3/4 营业姿态 + SimplePlane 呼吸/发丝微风 + 自然眨眼与点触笑眼 + 漫画点单气泡签 (`v8_bubble_speech`) + 飞向钱包的抛物线金币；
 * 3. 底部双层一体化经营操控台 (`v8_bottom_console_tray`)：上层左侧 426×92 宽幅主线目标卡 + 右侧 266×92 饱满果冻珊瑚金『手艺升级』大按钮（右上角内嵌 ×1/×10/质变 档位签，缺钱时保持暖杏珠光且点击直接手工制作产金，绝不死灰）；下层 5 枚大号糖果珐琅导航栏（产业 / 伙伴 / 店员 / 剧场 / 衣橱）。
 */
import * as PIXI from 'pixi.js';
import {
  ICONS,
  ORDER_BUBBLE_ICONS,
  UI_SLICES,
  outfitFigurePath,
} from '@/data/art';
import { BALANCE } from '@/data/balance';
import { CHAPTERS, HEROES, heroById, type ChapterDef, type HeroId } from '@/data/story';
import { STREET_EVENTS, type StreetEventDef } from '@/data/streetEvents';
import { OUTFITS, queenTitleFor, type AreaDef, type OutfitDef } from '@/data/world';
import { EV } from '@/config/events';
import { AudioManager } from '@/core/AudioManager';
import { EventBus } from '@/core/EventBus';
import { Game } from '@/core/Game';
import { Platform } from '@/core/PlatformService';
import type { Scene } from '@/core/SceneManager';
import { ToastManager } from '@/core/ToastManager';
import { Ease, TweenManager } from '@/core/TweenManager';
import { GameState } from '@/managers/GameState';
import { TUTORIAL_DONE } from '@/managers/SaveManager';
import { playChapterFlow, playStory, playStorySequence } from '@/services/StoryService';
import { computeOffline, rushOrderCooldownLeft, rushOrdersLeftToday } from '@/sim/actions';
import { resolveSkillBuyCount, skillUpgradeCostN } from '@/sim/economy';
import { formatDuration, formatMoney } from '@/sim/format';
import type { BuyMode } from '@/sim/save';
import { currentChapter, nextGoal, pendingBattleChapter, unlikedMomentCount, unreadChatCount } from '@/sim/unlocks';
import { Button } from '@/ui/Button';
import { showDialog } from '@/ui/Dialog';
import { ProgressBar } from '@/ui/ProgressBar';
import {
  COLORS,
  createNineSlice2x,
  drawCreamCard,
  makeDisplayText,
  makeNumText,
  makeStickerSprite,
  makeText,
} from '@/ui/theme';
import { gameTexture, isTextureReady, whenTextureReady } from '@/utils/assets';
import { HeroPage } from './home/HeroPage';
import { heroHasNews } from './home/heroInfo';
import { LivingStage } from './home/LivingStage';
import { OutfitSheet } from './home/OutfitSheet';
import { PhoneSheet } from './home/PhoneSheet';
import { ShopMap } from './home/ShopMap';
import { StaffSheet, staffHasAffordable } from './home/StaffSheet';
import { StorySheet } from './home/StorySheet';

const OFFLINE_MIN_SEC = 60;
const CONSOLE_H = 246;
const MAX_VISIBLE_ORDERS = 2;
const BUY_MODE_CYCLE: readonly [BuyMode, string][] = [
  ['1', '×1'],
  ['10', '×10'],
  ['next', '质变'],
];

interface OrderBubble {
  node: PIXI.Container;
  slot: number;
  baseY: number;
  phase: number;
}

interface NavTabEntry {
  wrap: PIXI.Container;
  activeBg: PIXI.Sprite;
  iconOn: PIXI.Sprite;
  iconOff: PIXI.Sprite;
  label: PIXI.Text;
  dot: PIXI.Graphics;
  key: string;
}

export class HomeScene implements Scene {
  readonly name = 'home';
  readonly container = new PIXI.Container();

  private readonly _bgFill = new PIXI.Graphics();
  private readonly _stageMask = new PIXI.Graphics();
  private readonly _livingStage: LivingStage;
  private readonly _feverAura = new PIXI.Graphics();
  private readonly _ordersLayer = new PIXI.Container();
  private readonly _eventPinLayer = new PIXI.Container();
  private readonly _floatLayer = new PIXI.Container();

  // 1. 顶部一体化珠光象牙金状态舱
  private readonly _topDock = new PIXI.Container();
  private readonly _topDockSkin: PIXI.Sprite;
  private readonly _avatarMask = new PIXI.Graphics();
  private readonly _avatarSprite = new PIXI.Sprite(PIXI.Texture.EMPTY);
  private readonly _avatarHit = new PIXI.Graphics();
  private readonly _titleTxt = makeText('', 25, COLORS.ink, true);

  private readonly _wealthBarBg = new PIXI.Graphics();
  private readonly _wealthBarFill = new PIXI.Graphics();
  private readonly _wealthBarMask = new PIXI.Graphics();
  private readonly _wealthTxt = makeDisplayText('', 19, 0xFFFFFF, 0x8F3A22, 3.6);

  private readonly _roseSlot = new PIXI.Container();
  private readonly _cashSlot = new PIXI.Container();
  private readonly _rosesTxt = makeNumText('0', 21, COLORS.ink);
  private readonly _moneyTxt = makeNumText('0', 21, COLORS.ink);

  // 顶栏下方垂挂章节铭牌 + 轻量折叠快捷胶囊（零遮挡主舞台）
  private readonly _chapterTab = new PIXI.Container();
  private readonly _chapterSkin: PIXI.Sprite;
  private readonly _chapterTxt = makeText('', 19, 0x5B3B1D, true);
  private _battleBtn: Button | null = null;

  private readonly _quickLeftPill = new PIXI.Container();
  private readonly _quickDrawer = new PIXI.Container();
  private readonly _quickPhonePill = new PIXI.Container();
  private readonly _phoneBadge = new PIXI.Container();
  private readonly _rushDrawerLabel = makeText('接急单', 18, COLORS.ink, true);
  private readonly _boostDrawerLabel = makeText('直播×2', 18, COLORS.ink, true);
  private readonly _quickDot = new PIXI.Graphics();
  private _drawerOpen = false;

  // 3. 底部双层一体化操控台
  private readonly _bottomConsole = new PIXI.Container();
  private readonly _safeBottomFill = new PIXI.Graphics();
  private readonly _consoleTraySprite: PIXI.Sprite;
  private readonly _feverBadge = new PIXI.Container();
  private readonly _feverBadgeBg = new PIXI.Graphics();
  private readonly _feverLabel = makeText('', 17, COLORS.roseDeep, true);

  // 上层左：宽幅主线目标卡 (426×92)
  private readonly _questCard = new PIXI.Container();
  private readonly _questSkin: PIXI.Sprite;
  private readonly _questIconWrap = new PIXI.Container();
  private readonly _questTitle = makeText('', 21, COLORS.ink, true);
  private readonly _questBar = new ProgressBar(312, 24, 0xF07B62, 0xEADBC5, 0.98);
  private readonly _questProgTxt = makeDisplayText('', 15, 0xFFFFFF, 0x7A3A24, 3.2);
  private _questDoneState: boolean | null = null;

  // 上层右：饱满果冻珊瑚金『手艺升级』大按钮 (266×92) + 内嵌倍率角标
  private readonly _ctaWrap = new PIXI.Container();
  private readonly _ctaCoralSprite: PIXI.Sprite;
  private readonly _ctaPeachSprite: PIXI.Sprite;
  private readonly _ctaMainTxt = makeDisplayText('手艺升级', 27, 0xFFFFFF, 0x8F2E26, 4.4);
  private readonly _ctaSubTxt = makeDisplayText('Lv.1 · ¥50', 17, 0xFFF9EE, 0x8F2E26, 3.2);
  private readonly _buyModePill = new PIXI.Container();
  private readonly _buyModePillBg = new PIXI.Graphics();
  private readonly _buyModeTxt = makeText('×1', 16, 0x613F1E, true);
  private _ctaAffordable = true;

  // 下层：5 栏大图标精品导航
  private readonly _navLayer = new PIXI.Container();
  private readonly _navTabs: NavTabEntry[] = [];

  // 二级页面面板
  private readonly _shopSheet = new ShopMap();
  private readonly _phoneSheet = new PhoneSheet();
  private readonly _heroPage = new HeroPage((heroId) => this._phoneSheet.openForHero(heroId));
  private readonly _storySheet = new StorySheet();
  private readonly _outfitSheet = new OutfitSheet();
  private readonly _staffSheet = new StaffSheet();

  private _orders: OrderBubble[] = [];
  private _orderTimer = 1.1;
  private _eventTimer = 26;
  private _pendingEvent: StreetEventDef | null = null;
  private _animTime = 0;
  private _consoleTopY = 1088;
  private _topDockY = 24;
  private _tickerBound = false;
  private _hudTimer = 0;
  private _busy = false;

  constructor() {
    this._livingStage = new LivingStage((e) => this._onTap(e));

    this._topDockSkin = makeStickerSprite(UI_SLICES.v8TopHeaderDock, 746, 138, false);
    this._chapterSkin = makeStickerSprite(UI_SLICES.v8TopChapterTab, 380, 60, true);
    this._consoleTraySprite = makeStickerSprite(UI_SLICES.v8BottomConsoleTray, 750, 258, false);
    this._questSkin = makeStickerSprite(UI_SLICES.v8QuestWellCard, 442, 108, false);
    this._ctaCoralSprite = makeStickerSprite(UI_SLICES.v8BtnCtaCoral, 286, 112, true);
    this._ctaPeachSprite = makeStickerSprite(UI_SLICES.v8BtnCtaPeach, 286, 112, true);

    this._buildTopHeader();
    this._buildQuickPills();
    this._buildBottomConsole();

    this._livingStage.mask = this._stageMask;

    this.container.addChild(
      this._bgFill,
      this._livingStage,
      this._stageMask,
      this._feverAura,
      this._ordersLayer,
      this._eventPinLayer,
      this._floatLayer,
      this._topDock,
      this._chapterTab,
      this._quickLeftPill,
      this._quickPhonePill,
      this._quickDrawer,
      this._bottomConsole,
    );
  }

  onEnter(): void {
    this._applyOutfit();
    this._refreshHud();
    if (!this._tickerBound) {
      this._tickerBound = true;
      Game.ticker.add(() => this._update(Game.ticker.deltaMS / 1000));
      const refreshPanels = (): void => {
        this._shopSheet.refreshAffordable();
        this._staffSheet.refreshAffordable();
        this._heroPage.refreshAffordable();
      };
      EventBus.on(EV.moneyChanged, refreshPanels);
      EventBus.on(EV.rosesChanged, () => {
        refreshPanels();
        if (this._phoneSheet.isOpen) this._phoneSheet.rebuild();
      });
      EventBus.on(EV.saveChanged, () => {
        this._applyOutfit();
        this._refreshBuyModeBadge();
      });
      EventBus.on(EV.feverChanged, () => {
        AudioManager.play('level_up');
        Platform.vibrateShort('medium');
        ToastManager.show('✦ 全城疯抢爆单时刻 · 收益狂飙！', 'success');
      });
      EventBus.on(EV.chapterUnlocked, (ch: ChapterDef) => this._onChapter(ch));
      EventBus.on(EV.areaUnlocked, (a: AreaDef) => {
        AudioManager.play('level_up');
        ToastManager.show(`✦ 新商圈开放：${a.name}`, 'success');
      });
      EventBus.on(EV.outfitUnlocked, (o: OutfitDef) => {
        AudioManager.play('item_reveal');
        GameState.setOutfit(o.id);
        ToastManager.show(`✦ 解锁高定造型：${o.name}（帝国收益+8%）`, 'success');
      });
      EventBus.on(EV.shopChanged, () => {
        this._shopSheet.rebuild();
        this._staffSheet.rebuild();
      });
      EventBus.on(EV.staffChanged, () => this._shopSheet.rebuild());
      EventBus.on(EV.heroChanged, (id: HeroId, met: boolean) => { if (met) this._onMeetHero(id); });
    }
    void this._enterFlow();
  }

  private _buildTopHeader(): void {
    this._titleTxt.style.dropShadow = true;
    this._titleTxt.style.dropShadowColor = 0xFFFFFF;
    this._titleTxt.style.dropShadowAlpha = 0.95;
    this._titleTxt.style.dropShadowBlur = 0;
    this._titleTxt.style.dropShadowDistance = 1.5;
    this._titleTxt.style.dropShadowAngle = Math.PI / 2;

    this._avatarSprite.anchor.set(0.5, 0.068);
    this._avatarSprite.mask = this._avatarMask;

    this._avatarHit.eventMode = 'static';
    this._avatarHit.cursor = 'pointer';
    this._avatarHit.on('pointertap', (e: PIXI.FederatedPointerEvent) => {
      e.stopPropagation();
      AudioManager.play('ui_click');
      this._showEmpireBuffs();
    });

    this._wealthBarFill.mask = this._wealthBarMask;
    this._wealthTxt.anchor.set(0, 0.5);

    this._setupCurrencySlot(this._roseSlot, ICONS.currencyRose, this._rosesTxt, () => this._phoneSheet.open());
    this._setupCurrencySlot(this._cashSlot, ICONS.coins, this._moneyTxt, () => this._shopSheet.open());

    this._topDock.addChild(
      this._topDockSkin,
      this._avatarMask,
      this._avatarSprite,
      this._avatarHit,
      this._titleTxt,
      this._wealthBarBg,
      this._wealthBarFill,
      this._wealthBarMask,
      this._wealthTxt,
      this._roseSlot,
      this._cashSlot,
    );

    // 底部垂挂鎏金章节牌
    this._chapterTxt.anchor.set(0.5);
    this._chapterTab.addChild(this._chapterSkin, this._chapterTxt);
    this._chapterTab.eventMode = 'static';
    this._chapterTab.cursor = 'pointer';
    this._chapterTab.hitArea = new PIXI.Rectangle(-185, -24, 370, 48);
    this._chapterTab.on('pointertap', (e: PIXI.FederatedPointerEvent) => {
      e.stopPropagation();
      const p = pendingBattleChapter(GameState.save);
      if (p) {
        void playChapterFlow(p).then(() => this._refreshHud());
      } else {
        AudioManager.play('ui_click');
        this._setActiveNav(3);
        this._storySheet.open();
      }
    });
  }

  private _setupCurrencySlot(
    slot: PIXI.Container,
    iconPath: string,
    valTxt: PIXI.Text,
    onTap: () => void,
  ): void {
    const w = 196;
    const h = 40;
    const bg = new PIXI.Graphics()
      .lineStyle(1.4, 0xE2C493, 0.95)
      .beginFill(0xF6EAD3, 0.92)
      .drawRoundedRect(0, 0, w, h, h / 2)
      .endFill();
    const ic = makeStickerSprite(iconPath, 38, 38, true);
    ic.position.set(22, h / 2);

    valTxt.anchor.set(0.5);
    valTxt.position.set(104, h / 2 - 0.5);

    const plusBg = new PIXI.Graphics()
      .beginFill(0xE8B866, 0.95)
      .drawCircle(w - 20, h / 2, 13)
      .endFill();
    const plus = makeText('+', 19, 0x5C3B1A, true);
    plus.anchor.set(0.5);
    plus.position.set(w - 20, h / 2 - 1);

    slot.addChild(bg, ic, valTxt, plusBg, plus);
    slot.eventMode = 'static';
    slot.cursor = 'pointer';
    slot.hitArea = new PIXI.Rectangle(-4, -4, w + 8, h + 8);
    slot.on('pointertap', (e: PIXI.FederatedPointerEvent) => {
      e.stopPropagation();
      AudioManager.play('ui_click');
      onTap();
    });
  }

  /** 顶栏下方左右各一枚轻巧珠光胶囊：平时完全让出中央阳光舞台，展开即用直播/急单/光环/GM */
  private _buildQuickPills(): void {
    // 左侧：经营助手折叠签
    const lw = 148;
    const lh = 42;
    const lBg = new PIXI.Graphics();
    drawCreamCard(lBg, 0, 0, lw, lh, lh / 2, { fill: 0xFFFDF8, alpha: 0.94, borderColor: 0xDFB870 });
    const lIco = makeStickerSprite(ICONS.live, 34, 34, true);
    lIco.position.set(24, lh / 2);
    const lTxt = makeText('福利助手 ▾', 17, COLORS.ink, true);
    lTxt.anchor.set(0, 0.5);
    lTxt.position.set(45, lh / 2);
    this._quickDot.lineStyle(2, 0xFFFFFF).beginFill(0xF0554D).drawCircle(lw - 10, 8, 6.5).endFill();
    this._quickLeftPill.addChild(lBg, lIco, lTxt, this._quickDot);
    this._quickLeftPill.eventMode = 'static';
    this._quickLeftPill.cursor = 'pointer';
    this._quickLeftPill.on('pointertap', (e: PIXI.FederatedPointerEvent) => {
      e.stopPropagation();
      AudioManager.play('ui_click');
      this._drawerOpen = !this._drawerOpen;
      this._quickDrawer.visible = this._drawerOpen;
    });

    // 展开抽屉（直播×2 / 接急单 / 帝国光环 / 开发态 GM）
    this._quickDrawer.visible = false;
    const isDev = Platform.isDevtools || !Platform.isMinigame;
    const rows = isDev ? 5 : 3;
    const dw = 248;
    const dh = 18 + rows * 50;
    const dBg = new PIXI.Graphics();
    drawCreamCard(dBg, 0, 0, dw, dh, 22, { fill: 0xFFFDF9, alpha: 0.98, borderColor: 0xDFB870 });
    this._quickDrawer.addChild(dBg);

    const addDrawerRow = (idx: number, icon: string, labelNode: PIXI.Text, onTap: () => void): void => {
      const row = new PIXI.Container();
      row.position.set(10, 10 + idx * 50);
      const rBg = new PIXI.Graphics()
        .beginFill(0xFBF1DF, 0.92)
        .drawRoundedRect(0, 0, dw - 20, 42, 14)
        .endFill();
      const ic = makeStickerSprite(icon, 34, 34, true);
      ic.position.set(24, 21);
      labelNode.anchor.set(0, 0.5);
      labelNode.position.set(48, 21);
      row.addChild(rBg, ic, labelNode);
      row.eventMode = 'static';
      row.cursor = 'pointer';
      row.on('pointertap', (e: PIXI.FederatedPointerEvent) => {
        e.stopPropagation();
        AudioManager.play('ui_click');
        this._drawerOpen = false;
        this._quickDrawer.visible = false;
        onTap();
      });
      this._quickDrawer.addChild(row);
    };

    addDrawerRow(0, ICONS.live, this._boostDrawerLabel, () => this._liveBoost());
    addDrawerRow(1, ICONS.gift, this._rushDrawerLabel, () => this._rushOrder());
    addDrawerRow(2, ICONS.crown, makeText('帝国增益总览', 18, COLORS.ink, true), () => this._showEmpireBuffs());
    if (isDev) {
      addDrawerRow(3, ICONS.coins, makeText('GM +10倍身价', 17, COLORS.goldDeep, true), () => {
        const amount = GameState.gmAddMoney();
        this._refreshHud();
        ToastManager.show(`GM：+¥${formatMoney(amount)} · 玫瑰+10`, 'success');
      });
      addDrawerRow(4, ICONS.trophy, makeText('GM 全剧情解锁', 17, COLORS.roseDeep, true), () => {
        GameState.gmUnlockAllVideos();
        this._storySheet.rebuild();
        this._heroPage.rebuild();
        this._shopSheet.rebuild();
        this._outfitSheet.rebuild();
        this._refreshHud();
        ToastManager.show('GM：全剧情与羁绊已解锁', 'success');
      });
    }

    // 右侧：微聊直达珠光签（带实时消息红点）
    const rw = 118;
    const rh = 42;
    const rBg = new PIXI.Graphics();
    drawCreamCard(rBg, 0, 0, rw, rh, rh / 2, { fill: 0xFFFDF8, alpha: 0.94, borderColor: 0xDFB870 });
    const rIco = makeStickerSprite(ICONS.phone, 34, 34, true);
    rIco.position.set(24, rh / 2);
    const rTxt = makeText('微聊', 18, COLORS.ink, true);
    rTxt.anchor.set(0, 0.5);
    rTxt.position.set(48, rh / 2);
    this._quickPhonePill.addChild(rBg, rIco, rTxt, this._phoneBadge);
    this._quickPhonePill.eventMode = 'static';
    this._quickPhonePill.cursor = 'pointer';
    this._quickPhonePill.on('pointertap', (e: PIXI.FederatedPointerEvent) => {
      e.stopPropagation();
      AudioManager.play('ui_click');
      this._phoneSheet.open();
    });
  }

  private _buildBottomConsole(): void {
    this._consoleTraySprite.eventMode = 'static';
    this._feverLabel.anchor.set(0.5);
    this._feverBadge.addChild(this._feverBadgeBg, this._feverLabel);

    // 1. 左上：宽幅主线任务槽 (426×92)
    this._questSkin.position.set(-8, -8);
    this._questTitle.position.set(92, 16);
    this._questBar.position.set(92, 52);
    this._questProgTxt.anchor.set(0.5);
    this._questProgTxt.position.set(92 + 156, 64);
    this._questCard.addChild(
      this._questSkin,
      this._questBar,
      this._questProgTxt,
      this._questTitle,
      this._questIconWrap,
    );
    this._questCard.eventMode = 'static';
    this._questCard.cursor = 'pointer';
    this._questCard.hitArea = new PIXI.Rectangle(0, 0, 426, 92);
    this._questCard.on('pointertap', (e: PIXI.FederatedPointerEvent) => {
      e.stopPropagation();
      const q = GameState.quest;
      if (q?.done) {
        this._claimQuest();
      } else if (q) {
        AudioManager.play('ui_click');
        ToastManager.show(`完成「${q.quest.title}」可领 ¥${formatMoney(q.reward)} · 心动玫瑰+${q.roses}`);
      }
    });
    this._setQuestIcon(false);

    // 2. 右上：饱满珊瑚金主升级大按钮 (266×92) + 右上角内嵌倍率胶囊
    this._ctaPeachSprite.visible = false;
    this._ctaMainTxt.anchor.set(0.5);
    this._ctaMainTxt.position.set(0, -14);
    this._ctaSubTxt.anchor.set(0.5);
    this._ctaSubTxt.position.set(0, 21);

    this._buyModeTxt.anchor.set(0.5);
    this._buyModePill.addChild(this._buyModePillBg, this._buyModeTxt);
    this._buyModePill.position.set(98, -42);
    this._buyModePill.eventMode = 'static';
    this._buyModePill.cursor = 'pointer';
    this._buyModePill.hitArea = new PIXI.Rectangle(-44, -20, 88, 40);
    this._buyModePill.on('pointertap', (e: PIXI.FederatedPointerEvent) => {
      e.stopPropagation();
      AudioManager.play('ui_click');
      const curIdx = BUY_MODE_CYCLE.findIndex(([m]) => m === GameState.save.buyMode);
      const nextMode = BUY_MODE_CYCLE[(curIdx + 1) % BUY_MODE_CYCLE.length][0];
      GameState.setBuyMode(nextMode);
      this._refreshBuyModeBadge();
      this._refreshHud();
    });
    this._refreshBuyModeBadge();

    this._ctaWrap.addChild(
      this._ctaCoralSprite,
      this._ctaPeachSprite,
      this._ctaMainTxt,
      this._ctaSubTxt,
      this._buyModePill,
    );
    this._ctaWrap.eventMode = 'static';
    this._ctaWrap.cursor = 'pointer';
    this._ctaWrap.hitArea = new PIXI.Rectangle(-133, -46, 266, 92);
    this._ctaWrap.on('pointerdown', () => {
      TweenManager.cancelTarget(this._ctaWrap.scale);
      this._ctaWrap.scale.set(0.95);
    });
    const releaseCta = (): void => {
      TweenManager.to({ target: this._ctaWrap.scale, props: { x: 1, y: 1 }, duration: 0.16, ease: Ease.easeOutBack });
    };
    this._ctaWrap.on('pointerup', releaseCta);
    this._ctaWrap.on('pointerupoutside', releaseCta);
    this._ctaWrap.on('pointertap', (e: PIXI.FederatedPointerEvent) => {
      e.stopPropagation();
      this._upgradeSkill(e.global);
    });

    // 3. 下层：5 大精品店导航栏（750px 均分 5 栏，大号珐琅图标 + 21px 高对比深可可字）
    const W = Game.logicWidth;
    const navDefs: [string, string, string, string, () => void][] = [
      ['产业', ICONS.shop, ICONS.shopOff, '产业', () => { this._setActiveNav(0); this._shopSheet.open(); }],
      ['伙伴', ICONS.rose, ICONS.roseOff, '伙伴', () => { this._setActiveNav(1); this._heroPage.open(); }],
      ['店员', ICONS.staff, ICONS.staffOff, '店员', () => { this._setActiveNav(2); this._staffSheet.open(); }],
      ['剧场', ICONS.story, ICONS.storyOff, '剧场', () => { this._setActiveNav(3); this._storySheet.open(); }],
      ['衣橱', ICONS.wardrobe, ICONS.wardrobeOff, '衣橱', () => { this._setActiveNav(4); this._outfitSheet.open(); }],
    ];
    const colW = W / navDefs.length;
    navDefs.forEach(([key, onIco, offIco, title, onOpen], idx) => {
      const wrap = new PIXI.Container();
      wrap.position.set(colW * idx + colW / 2, 184);

      const activeBg = makeStickerSprite(UI_SLICES.v8NavTabActive, 146, 122, true);
      activeBg.position.set(0, 0);

      const iconOn = makeStickerSprite(onIco, 78, 78, true);
      iconOn.position.set(0, -18);
      const iconOff = makeStickerSprite(offIco, 70, 70, true);
      iconOff.position.set(0, -15);

      const label = makeText(title, 21, COLORS.ink, true);
      label.anchor.set(0.5);
      label.position.set(0, 36);

      const dot = new PIXI.Graphics()
        .lineStyle(2.2, 0xFFFFFF, 1)
        .beginFill(0xF0554D, 1)
        .drawCircle(0, 0, 7.5)
        .endFill();
      dot.position.set(30, -44);
      dot.visible = false;

      wrap.addChild(activeBg, iconOn, iconOff, label, dot);
      wrap.eventMode = 'static';
      wrap.cursor = 'pointer';
      wrap.hitArea = new PIXI.Rectangle(-colW / 2, -62, colW, 124);
      wrap.on('pointerdown', () => {
        TweenManager.cancelTarget(wrap.scale);
        wrap.scale.set(0.93);
      });
      const releaseNav = (): void => {
        TweenManager.to({ target: wrap.scale, props: { x: 1, y: 1 }, duration: 0.16, ease: Ease.easeOutBack });
      };
      wrap.on('pointerup', releaseNav);
      wrap.on('pointerupoutside', releaseNav);
      wrap.on('pointertap', (e: PIXI.FederatedPointerEvent) => {
        e.stopPropagation();
        AudioManager.play('ui_click');
        onOpen();
      });

      this._navLayer.addChild(wrap);
      this._navTabs.push({ wrap, activeBg, iconOn, iconOff, label, dot, key });
    });
    this._setActiveNav(0);

    this._bottomConsole.addChild(
      this._safeBottomFill,
      this._consoleTraySprite,
      this._feverBadge,
      this._questCard,
      this._ctaWrap,
      this._navLayer,
    );
  }

  private _refreshBuyModeBadge(): void {
    const cur = GameState.save.buyMode;
    const label = BUY_MODE_CYCLE.find(([m]) => m === cur)?.[1] ?? '×1';
    this._buyModeTxt.text = label;
    const pw = Math.max(66, this._buyModeTxt.width + 26);
    const ph = 30;
    this._buyModePillBg.clear()
      .lineStyle(2, 0xD9A44E, 1)
      .beginFill(0xFFF9E8, 0.98)
      .drawRoundedRect(-pw / 2, -ph / 2, pw, ph, ph / 2)
      .endFill();
  }

  private _setActiveNav(index: number): void {
    this._navTabs.forEach((t, idx) => {
      const on = idx === index;
      t.activeBg.visible = on;
      t.iconOn.visible = on;
      t.iconOff.visible = !on;
      t.label.style.fill = on ? 0x4A2E14 : 0x6B523C;
    });
  }

  private _setQuestIcon(done: boolean): void {
    if (this._questDoneState === done) return;
    this._questDoneState = done;
    for (const c of this._questIconWrap.removeChildren()) c.destroy();
    const ic = makeStickerSprite(done ? ICONS.trophy : ICONS.questStar, 64, 64, true);
    ic.position.set(46, 46);
    this._questIconWrap.addChild(ic);
  }

  relayout(): void {
    const W = Game.logicWidth;
    const H = Game.logicHeight;
    const top = Game.safeTop;
    const bottom = H - Game.safeBottom;

    this._bgFill.clear().beginFill(COLORS.bg).drawRect(0, 0, W, H).endFill();
    this._livingStage.relayout();

    // 1. 顶部一体化状态舱布局（若在微信真机胶囊区下则自动下移避让）
    const topDockY = top > 24 ? top + 40 : Math.max(18, top + 8);
    this._topDockY = topDockY;
    this._topDock.position.set(12, topDockY);
    this._topDockSkin.position.set(-10, -10);

    const avCx = 53;
    const avCy = 59;
    this._avatarMask.clear().beginFill(0xFFFFFF).drawCircle(avCx, avCy, 39.5).endFill();
    this._avatarSprite.position.set(avCx, avCy);
    this._avatarHit.clear().beginFill(0x000000, 0.001).drawCircle(avCx, avCy, 46).endFill();

    this._titleTxt.position.set(114, 15);
    this._wealthBarBg.clear()
      .lineStyle(1.4, 0xDFBF92, 0.95)
      .beginFill(0xE8D4B7, 0.92)
      .drawRoundedRect(114, 58, 356, 38, 19)
      .endFill();
    this._wealthBarMask.clear().beginFill(0xFFFFFF).drawRoundedRect(114, 58, 356, 38, 19).endFill();
    this._wealthTxt.position.set(130, 77);

    this._roseSlot.position.set(508, 14);
    this._cashSlot.position.set(508, 62);

    // 垂挂鎏金章节牌 + 左右轻量胶囊
    this._chapterTab.position.set(W / 2, topDockY + 132);
    this._quickLeftPill.position.set(16, topDockY + 162);
    this._quickDrawer.position.set(16, topDockY + 210);
    this._quickPhonePill.position.set(W - 16 - 118, topDockY + 162);

    // 3. 底部双层一体化操控台
    const consoleTop = bottom - CONSOLE_H;
    this._consoleTopY = consoleTop;
    this._stageMask.clear().beginFill(0xFFFFFF).drawRect(0, 0, W, consoleTop + 26).endFill();
    this._livingStage.setStageBounds(topDockY + 156, consoleTop + 22);

    this._bottomConsole.position.set(0, consoleTop);
    this._consoleTraySprite.position.set(0, -12);
    this._safeBottomFill.clear();
    if (H - bottom > 0) {
      this._safeBottomFill.beginFill(0xF1DCB6, 1).drawRect(0, CONSOLE_H - 2, W, H - bottom + 6).endFill();
    }

    this._questCard.position.set(18, 16);
    this._ctaWrap.position.set(W - 18 - 133, 62);
    this._feverBadge.position.set(W / 2, -24);

    this._relayoutOrders(consoleTop);
    this._relayoutEventPin(topDockY + 254);
    this._drawFeverBadge();
  }

  private _outfitInStage = '';

  private _applyOutfit(): void {
    const id = GameState.save.outfit;
    if (this._outfitInStage && this._outfitInStage !== id) {
      for (const o of this._orders) o.node.destroy({ children: true });
      this._orders = [];
      this._orderTimer = 0.4;
    }
    this._outfitInStage = id;

    const figPath = outfitFigurePath(id);
    const syncAvatar = (tex: PIXI.Texture): void => {
      if (this._avatarSprite.destroyed || GameState.save.outfit !== id) return;
      this._avatarSprite.texture = tex;
      this._avatarSprite.scale.set(460 / Math.max(1, tex.height));
    };
    this._livingStage.setOutfit(id, syncAvatar);
    const curTex = gameTexture(figPath);
    if (isTextureReady(curTex)) syncAvatar(curTex);

    this.relayout();
  }

  private _walletGlobalPos(): PIXI.Point {
    return this._cashSlot.toGlobal(new PIXI.Point(24, 20));
  }

  /** 漫画奶油点单对话气泡签（`v8_bubble_speech` + 52px 糖果珐琅贴纸 + 20px 清晰粗体） */
  private _spawnCustomerOrder(): void {
    if (this._orders.length >= MAX_VISIBLE_ORDERS) return;
    const usedSlots = new Set(this._orders.map((o) => o.slot));
    const freeSlot = [0, 1].find((s) => !usedSlots.has(s));
    if (freeSlot === undefined) return;

    const outfitId = GameState.save.outfit;
    const outfit = OUTFITS.find((o) => o.id === outfitId) ?? OUTFITS[0];
    const pickIdx = Math.floor(Math.random() * 3) as 0 | 1 | 2;
    const cleanName = outfit.orderItems[pickIdx].replace(/^[^\s]+\s*/, '');
    const iconPath = ORDER_BUBBLE_ICONS[outfit.id][pickIdx];

    const node = new PIXI.Container();
    const skin = makeStickerSprite(UI_SLICES.v8BubbleSpeech, 204, 86, true);
    const ico = makeStickerSprite(iconPath, 50, 50, true);
    ico.position.set(-56, -7);

    const txt = makeText(cleanName, 20, COLORS.ink, true);
    txt.anchor.set(0.5);
    txt.position.set(22, -7);
    if (txt.width > 112) txt.scale.set(112 / txt.width);

    node.addChild(skin, ico, txt);
    node.hitArea = new PIXI.Rectangle(-100, -44, 200, 88);

    const entry: OrderBubble = {
      node,
      slot: freeSlot,
      baseY: 0,
      phase: Math.random() * Math.PI * 2,
    };
    this._orders.push(entry);
    this._ordersLayer.addChild(node);

    this._placeOrder(entry, this._consoleTopY);
    node.scale.set(0.55);
    node.alpha = 0;
    TweenManager.to({ target: node, props: { alpha: 1 }, duration: 0.2, ease: Ease.easeOutQuad });
    TweenManager.to({ target: node.scale, props: { x: 1, y: 1 }, duration: 0.26, ease: Ease.easeOutBack });

    node.eventMode = 'static';
    node.cursor = 'pointer';
    node.on('pointerdown', (e: PIXI.FederatedPointerEvent) => {
      e.stopPropagation();
      this._collectOrder(entry, e.global);
    });
  }

  private _placeOrder(entry: OrderBubble, consoleTop: number): void {
    // 分列原设站立女主左右两侧，绝不遮挡面部与衣裙主体
    const W = Game.logicWidth;
    const xs = [138, W - 138];
    const ys = [consoleTop - 420, consoleTop - 348];
    entry.baseY = ys[entry.slot] ?? consoleTop - 384;
    entry.node.position.set(xs[entry.slot] ?? 138, entry.baseY);
  }

  private _relayoutOrders(consoleTop: number): void {
    for (const o of this._orders) this._placeOrder(o, consoleTop);
  }

  private _collectOrder(entry: OrderBubble, globalPos: PIXI.Point): void {
    const idx = this._orders.indexOf(entry);
    if (idx >= 0) this._orders.splice(idx, 1);
    const { amount } = GameState.serveOrder();
    AudioManager.play('coin_gain');
    Platform.vibrateShort('light');
    this._livingStage.triggerJoyReaction(globalPos, this._walletGlobalPos(), 6);
    this._spawnFloatText(globalPos, `出单 +¥${formatMoney(amount)}`, 0xFFF2B2, 30);
    TweenManager.to({
      target: entry.node,
      props: { alpha: 0, y: entry.node.y - 28 },
      duration: 0.16,
      onComplete: () => entry.node.destroy({ children: true }),
    });
    this._refreshHud();
  }

  private _spawnStreetEvent(): void {
    if (this._pendingEvent) return;
    const ch = currentChapter(GameState.save.netWorth);
    const pool = STREET_EVENTS.filter((ev) => ch >= ev.minChapter);
    if (!pool.length) return;
    const picked = pool[Math.floor(Math.random() * pool.length)];
    this._pendingEvent = picked;

    for (const c of this._eventPinLayer.removeChildren()) c.destroy({ children: true });
    const pin = new PIXI.Container();
    const skin = makeStickerSprite(UI_SLICES.v8BubbleSpeech, 166, 74, true);
    const ico = makeStickerSprite(ICONS.event, 46, 46, true);
    ico.position.set(-40, -6);
    const txt = makeText('奇遇!', 20, COLORS.roseDeep, true);
    txt.anchor.set(0.5);
    txt.position.set(20, -6);
    pin.addChild(skin, ico, txt);
    pin.hitArea = new PIXI.Rectangle(-84, -38, 168, 76);
    pin.eventMode = 'static';
    pin.cursor = 'pointer';
    pin.on('pointertap', (e: PIXI.FederatedPointerEvent) => {
      e.stopPropagation();
      void this._openStreetEventModal();
    });
    this._eventPinLayer.addChild(pin);
    this._relayoutEventPin(this._topDockY + 254);
  }

  private _relayoutEventPin(y: number): void {
    const child = this._eventPinLayer.children[0];
    if (child) child.position.set(Game.logicWidth - 94, y);
  }

  private async _openStreetEventModal(): Promise<void> {
    const ev = this._pendingEvent;
    if (!ev) return;
    this._pendingEvent = null;
    for (const c of this._eventPinLayer.removeChildren()) c.destroy({ children: true });

    const pickFirst = await showDialog({
      title: ev.title,
      content: `${ev.desc}\n\n✦ 方案一：${ev.options[0].label}\n✦ 方案二：${ev.options[1].label}`,
      confirmText: '选方案一',
      cancelText: '选方案二',
    });
    const idx: 0 | 1 = pickFirst ? 0 : 1;
    const res = GameState.resolveStreetEvent(ev, idx);
    AudioManager.play('bond_up');
    ToastManager.show(`${ev.options[idx].outcome}（+¥${formatMoney(res.cash)} · 玫瑰+${res.roses}）`, 'success');
    this._refreshHud();
  }

  private _showEmpireBuffs(): void {
    const syn = GameState.synergies;
    const save = GameState.save;
    const lines = [
      `• 当前赛季：第 ${save.season} 季（永久倍率 ×${syn.seasonMult.toFixed(2)}）`,
      `• 全门店光环加成：+${Math.round((syn.allShopMult - 1) * 100)}%`,
      `• 全员店员干劲加成：+${Math.round((syn.staffMult - 1) * 100)}%`,
      `• 门店开店/升级减免：-${Math.round(syn.costDiscount * 100)}%`,
      `• 陆屿手艺暴击率：${Math.round(syn.critChance * 100)}%（触发×3）`,
      `• 江叙白自动接单：${syn.autoTapPerSec.toFixed(1)} 次/秒`,
      `• 高定衣橱与知名度：+${Math.round((syn.outfitBonus + syn.fameBonus) * 100)}%`,
      `• 商业帝国总乘区：×${syn.empireMult.toFixed(2)}`,
    ];
    void showDialog({
      title: '商业帝国增益总览',
      content: lines.join('\n'),
      confirmText: '继续扩张',
    });
  }

  private _onTap(e: PIXI.FederatedPointerEvent): void {
    if (this._drawerOpen) {
      this._drawerOpen = false;
      this._quickDrawer.visible = false;
    }
    const res = GameState.tap();
    AudioManager.play(res.crit ? 'coin_gain' : 'coin_tap');
    Platform.vibrateShort('light');
    this._livingStage.triggerJoyReaction(e.global, this._walletGlobalPos(), res.crit ? 6 : 3);

    const text = res.crit ? `✦ 暴击 +¥${formatMoney(res.amount)}` : `+¥${formatMoney(res.amount)}`;
    const col = res.crit ? 0xFFE896 : 0xFFFFFF;
    this._spawnFloatText(e.global, text, col, res.crit ? 34 : 28);
    this._refreshHud();
  }

  private _spawnFloatText(globalPos: PIXI.Point, str: string, color: number, size: number): void {
    const p = this._floatLayer.toLocal(globalPos);
    const box = new PIXI.Container();
    const label = makeDisplayText(str, size, color, 0x5C391E, 4.6);
    label.anchor.set(0.5);
    box.addChild(label);
    box.position.set(p.x + (Math.random() - 0.5) * 24, p.y - 22);
    this._floatLayer.addChild(box);
    TweenManager.to({
      target: box,
      props: { y: box.y - 96, alpha: 0 },
      duration: 0.72,
      ease: Ease.easeOutQuad,
      onComplete: () => box.destroy({ children: true }),
    });
  }

  private _upgradeSkill(globalPos?: PIXI.Point): void {
    if (GameState.upgradeSkill(GameState.save.buyMode)) {
      AudioManager.play('upgrade');
      Platform.vibrateShort('medium');
      this._livingStage.triggerJoyReaction(globalPos, undefined, 0);
    } else {
      // 缺钱点击时不再弹冷冰冰的灰色禁用，而是直接触发一次手工制作产金并轻提示进度
      const res = GameState.tap();
      AudioManager.play('coin_tap');
      if (globalPos) {
        this._livingStage.triggerJoyReaction(globalPos, this._walletGlobalPos(), 3);
        this._spawnFloatText(globalPos, `+¥${formatMoney(res.amount)}`, 0xFFF4C2, 26);
      }
    }
    this._refreshHud();
  }

  private _claimQuest(): void {
    const got = GameState.claimQuest();
    if (got.cash <= 0) return;
    AudioManager.play('coin_gain');
    ToastManager.show(`✦ 目标达成 +¥${formatMoney(got.cash)} · 玫瑰+${got.roses}`, 'success');
    this._refreshHud();
  }

  private _liveBoost(): void {
    Platform.showRewardedVideo('liveBoost', () => {
      GameState.startLiveBoost();
      ToastManager.show('✦ 直播开启 · 全场收益翻倍！', 'success');
    });
  }

  private _rushOrder(): void {
    const now = Date.now();
    if (rushOrdersLeftToday(GameState.save, now) <= 0) {
      ToastManager.show('今日急单已满额完成');
      return;
    }
    if (rushOrderCooldownLeft(GameState.save, now) > 0) {
      ToastManager.show('豪门急单派送中，请稍候');
      return;
    }
    Platform.showRewardedVideo('rushOrder', () => {
      const amount = GameState.claimRushOrder();
      AudioManager.play('coin_gain');
      ToastManager.show(`✦ 急单送达 +¥${formatMoney(amount)}`, 'success');
    });
  }

  private _update(dt: number): void {
    if (!this.container.visible || !this.container.parent) return;
    this._animTime += dt;

    this._livingStage.update(dt);
    for (const o of this._orders) {
      o.node.y = o.baseY + Math.sin(this._animTime * 2.5 + o.phase) * 4.2;
    }

    if (
      !this._shopSheet.isOpen
      && !this._heroPage.isOpen
      && !this._staffSheet.isOpen
      && !this._storySheet.isOpen
      && !this._outfitSheet.isOpen
    ) {
      this._setActiveNav(0);
    }

    this._orderTimer -= dt;
    if (this._orderTimer <= 0) {
      this._orderTimer = BALANCE.orderSpawnIntervalSec;
      this._spawnCustomerOrder();
    }
    this._eventTimer -= dt;
    if (this._eventTimer <= 0) {
      this._eventTimer = BALANCE.streetEventMinSec + Math.random() * (BALANCE.streetEventMaxSec - BALANCE.streetEventMinSec);
      this._spawnStreetEvent();
    }

    if (GameState.feverActive) {
      const W = Game.logicWidth;
      const H = Game.logicHeight;
      const pulse = 0.14 + Math.sin(this._animTime * 6) * 0.05;
      this._feverAura.clear().beginFill(0xFFE394, pulse).drawCircle(W / 2, H * 0.44, W * 0.48).endFill();
    } else if (this._feverAura.geometry.graphicsData.length > 0) {
      this._feverAura.clear();
    }

    this._hudTimer += dt;
    if (this._hudTimer >= 0.2) {
      this._hudTimer = 0;
      this._refreshHud();
    }
  }

  private _drawFeverBadge(): void {
    const save = GameState.save;
    if (GameState.feverActive) {
      this._feverLabel.text = `✦ 全城爆单 · 收益飙升 ${Math.ceil(GameState.feverLeftSec)}s`;
      this._feverBadge.visible = true;
    } else if (save.feverHeat >= 0.06) {
      this._feverLabel.text = `✦ 爆单热度 ${Math.round(save.feverHeat * 100)}%`;
      this._feverBadge.visible = true;
    } else {
      this._feverBadge.visible = false;
      return;
    }

    const pw = this._feverLabel.width + 38;
    this._feverBadgeBg.clear()
      .lineStyle(1.8, 0xDFB870, 0.98)
      .beginFill(0xFFFDF8, 0.98)
      .drawRoundedRect(-pw / 2, -17, pw, 34, 17)
      .endFill();
  }

  private _refreshPhoneBadge(count: number): void {
    for (const c of this._phoneBadge.removeChildren()) c.destroy({ children: true });
    if (count <= 0) return;
    const str = count > 99 ? '99+' : String(count);
    const txt = makeText(str, 13, 0xFFFFFF, true);
    txt.anchor.set(0.5);
    const bw = Math.max(24, txt.width + 12);
    const g = new PIXI.Graphics()
      .lineStyle(2, 0xFFFFFF, 1)
      .beginFill(0xF0554D, 1)
      .drawRoundedRect(108 - bw / 2, -8, bw, 22, 11)
      .endFill();
    txt.position.set(108, 3);
    this._phoneBadge.addChild(g, txt);
  }

  private _refreshHud(): void {
    const save = GameState.save;
    const now = Date.now();

    const seasonPrefix = save.season > 1 ? `S${save.season}·` : '';
    this._titleTxt.text = `${save.skillLevel}级  ${seasonPrefix}${queenTitleFor(save.netWorth)}`;
    this._titleTxt.scale.set(1);
    if (this._titleTxt.width > 356) this._titleTxt.scale.set(356 / this._titleTxt.width);

    const incVal = GameState.incomePerSec;
    this._wealthTxt.text = incVal > 0
      ? `身价 ¥${formatMoney(save.netWorth)} · +${formatMoney(incVal)}/秒`
      : `身价 ¥${formatMoney(save.netWorth)}`;
    this._wealthTxt.scale.set(1);
    if (this._wealthTxt.width > 328) this._wealthTxt.scale.set(328 / this._wealthTxt.width);

    const pendingBattle = pendingBattleChapter(save);
    const goal = nextGoal(save);
    const goalRatio = pendingBattle ? 1 : (goal ? Math.max(0.18, Math.min(1, goal.progress)) : 1);
    const fillW = Math.round(356 * goalRatio);
    this._wealthBarFill.clear()
      .beginFill(0xF0745A, 1)
      .drawRoundedRect(114, 58, fillW, 38, 19)
      .endFill();

    this._rosesTxt.text = String(save.roses);
    this._moneyTxt.text = formatMoney(save.money);
    this._moneyTxt.scale.set(1);
    if (this._moneyTxt.width > 94) this._moneyTxt.scale.set(94 / this._moneyTxt.width);

    if (pendingBattle) {
      this._chapterTxt.text = `第${pendingBattle.id}章 · ${pendingBattle.title}`;
      this._chapterTxt.position.set(-44, -2);
      if (!this._battleBtn) {
        this._battleBtn = new Button({
          width: 92,
          height: 32,
          variant: 'rose',
          fontSize: 16,
          label: '迎战',
          onTap: () => {
            const p = pendingBattleChapter(GameState.save);
            if (p) void playChapterFlow(p).then(() => this._refreshHud());
          },
        });
        this._chapterTab.addChild(this._battleBtn);
      }
      this._battleBtn.visible = true;
      this._battleBtn.position.set(112, -2);
    } else {
      if (this._battleBtn) this._battleBtn.visible = false;
      this._chapterTxt.position.set(0, -2);
      this._chapterTxt.text = goal
        ? `${goal.label} · 目标 ¥${formatMoney(goal.target)}`
        : '已登顶云城首富 · 点击前往扩城';
      this._chapterTxt.scale.set(1);
      if (this._chapterTxt.width > 304) this._chapterTxt.scale.set(304 / this._chapterTxt.width);
    }

    this._drawFeverBadge();

    // 手艺升级大按钮：有钱时果冻珊瑚金，攒钱时暖杏珠光（永不置灰！）
    const skillCount = resolveSkillBuyCount(save, save.buyMode);
    const cost = skillUpgradeCostN(save.skillLevel, skillCount);
    const affordable = save.money >= cost;
    const countSuffix = skillCount > 1 ? ` +${skillCount}` : '';
    this._ctaMainTxt.text = `手艺升级${countSuffix}`;
    this._ctaSubTxt.text = `Lv.${save.skillLevel} · ¥${formatMoney(cost)}`;
    if (this._ctaAffordable !== affordable) {
      this._ctaAffordable = affordable;
      this._ctaCoralSprite.visible = affordable;
      this._ctaPeachSprite.visible = !affordable;
      this._ctaMainTxt.style.fill = affordable ? 0xFFFFFF : 0x5B3A1E;
      this._ctaMainTxt.style.stroke = affordable ? 0x8F2E26 : 0xFFFDF8;
      this._ctaSubTxt.style.fill = affordable ? 0xFFF9EE : 0x7D5632;
      this._ctaSubTxt.style.stroke = affordable ? 0x8F2E26 : 0xFFFDF8;
    }

    const boostLeft = (save.boostUntil - now) / 1000;
    const cd = rushOrderCooldownLeft(save, now);
    const rushReady = cd <= 0 && rushOrdersLeftToday(save, now) > 0;
    this._rushDrawerLabel.text = cd > 0 ? `急单冷却 ${formatDuration(cd)}` : '豪门急单（秒到账）';
    this._boostDrawerLabel.text = boostLeft > 0 ? `直播中 ${formatDuration(boostLeft)}` : '开启直播（收益×2）';
    this._quickDot.visible = rushReady;

    const phoneNews = unreadChatCount(save) + unlikedMomentCount(save);
    this._refreshPhoneBadge(phoneNews);

    this._refreshQuest();
    this._setNavDot('店员', staffHasAffordable());
    this._setNavDot('伙伴', HEROES.some(heroHasNews));
    this._setNavDot('剧场', !!pendingBattle || CHAPTERS.some((ch) => save.netWorth >= ch.unlockNetWorth && ch.videos.some((v) => !save.watched.includes(v))));
  }

  private _refreshQuest(): void {
    const q = GameState.quest;
    this._questCard.visible = !!q;
    if (!q) return;

    const cleanTitle = q.quest.title.replace(/^亲手/, '');
    this._setQuestIcon(q.done);
    this._questTitle.text = q.done ? `✦ ${cleanTitle}（可领奖）` : cleanTitle;
    this._questTitle.style.fill = q.done ? COLORS.roseDeep : COLORS.ink;
    this._questTitle.scale.set(1);
    if (this._questTitle.width > 312) this._questTitle.scale.set(312 / this._questTitle.width);

    this._questBar.progress = q.done ? 1 : q.current / Math.max(1, q.target);
    this._questProgTxt.text = q.done
      ? `点击领取 ¥${formatMoney(q.reward)} · 玫瑰+${q.roses}`
      : `${formatMoney(q.current)} / ${formatMoney(q.target)}`;
  }

  private _setNavDot(key: string, on: boolean): void {
    const tab = this._navTabs.find((t) => t.key === key);
    if (tab) tab.dot.visible = on;
  }

  private async _enterFlow(): Promise<void> {
    if (this._busy) return;
    this._busy = true;
    try {
      const save = GameState.save;
      if (save.tutorialStep === 0) {
        await playStorySequence(CHAPTERS[0].videos);
        GameState.setTutorialStep(1);
        this._spawnCustomerOrder();
        ToastManager.show('轻触柜台或点单气泡，卖出第一份招牌甜品！', 'success');
        return;
      }
      await this._offlinePopup();
    } finally {
      this._busy = false;
    }
  }

  private async _offlinePopup(): Promise<void> {
    const off = computeOffline(GameState.save, Date.now());
    if (off.seconds < OFFLINE_MIN_SEC || off.amount <= 0) {
      GameState.flush();
      return;
    }
    const double = await showDialog({
      title: '离线营收报告',
      content: `你离开的 ${formatDuration(off.seconds)} 里，旗下产业共入账 ¥${formatMoney(off.amount)}！`,
      confirmText: '看广告双倍入账',
      cancelText: '直接收下',
    });
    if (!double) {
      GameState.claimOffline(1);
      AudioManager.play('coin_gain');
      return;
    }
    let rewarded = false;
    await new Promise<void>((resolve) => {
      Platform.showRewardedVideo('offlineDouble', () => { rewarded = true; }, resolve);
    });
    const got = GameState.claimOffline(rewarded ? 2 : 1);
    AudioManager.play('coin_gain');
    ToastManager.show(`入账 ¥${formatMoney(got)}`, 'success');
  }

  private _onChapter(ch: ChapterDef): void {
    if (GameState.save.tutorialStep < TUTORIAL_DONE && ch.id >= 1) GameState.setTutorialStep(TUTORIAL_DONE);
    AudioManager.play('chapter_unlock');
    void showDialog({
      title: `第 ${ch.id} 章解锁`,
      content: `身价已碾压门槛，「${ch.title}」商战与新剧集已就绪，现在前往打脸吗？`,
      confirmText: '立即迎战',
      cancelText: '稍后',
    }).then((ok) => { if (ok) void playChapterFlow(ch).then(() => this._refreshHud()); });
  }

  private _onMeetHero(id: HeroId): void {
    const hero = heroById(id);
    AudioManager.play('meet_hero');
    ToastManager.show(`✦ 邂逅了「${hero.name} · ${hero.title}」！`, 'success');
    void playStory(hero.bondVideos[0]);
  }
}
