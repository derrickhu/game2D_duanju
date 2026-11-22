/**
 * 心动伙伴页（恢复原版高级纯色柔光背景 + 完整全身男主立绘 + 右侧双金线雕花档案卡 + 2×3 记忆典藏印章卡）：
 * - 背景采用干净纯粹的暖奶油香槟渐变（暗面模式切换为丝绒酒红暗夜纯色），零杂乱街景干扰，凸显男主修长全身比例与高级感；
 * - 左侧完整呈现从头顶到皮鞋的全身立绘与双金椭圆舞台光圈，右侧为高定双金线档案卡与 2×3 记忆邮票矩阵，底部为 9 男主肖像轮播台。
 */
import * as PIXI from 'pixi.js';
import { ICONS, UI_SLICES, heroFigurePath, heroPortraitPath } from '@/data/art';
import { BOND_LEVELS, MAX_BOND } from '@/data/balance';
import { HEROES, bondTitle, heroById, type HeroDef, type HeroId } from '@/data/story';
import { shopById } from '@/data/world';
import { AudioManager } from '@/core/AudioManager';
import { Game } from '@/core/Game';
import { ToastManager } from '@/core/ToastManager';
import { Ease, TweenManager } from '@/core/TweenManager';
import { GameState } from '@/managers/GameState';
import { playStory } from '@/services/StoryService';
import { bondRoseCost, bondUpgradeCost, canAffordBond } from '@/sim/economy';
import { formatMoney } from '@/sim/format';
import { bondBlockReason, effectiveBond, isVideoAdPending, isVideoUnlocked } from '@/sim/unlocks';
import { Button } from '@/ui/Button';
import { drawDiamondStar } from '@/ui/EditorialIcons';
import { PAGE_PAD, Page } from '@/ui/Page';
import {
  COLORS,
  createNineSlice2x,
  drawHearts,
  drawNoirCard,
  makeCouturePlaque,
  makeMemoryStamp,
  makeRibbonBanner,
  makeStickerSprite,
  makeText,
} from '@/ui/theme';
import { gameTexture, showFigure } from '@/utils/assets';
import {
  bondVideoCondition,
  endingCondition,
  extraCondition,
  heroHasNews,
  hiddenVideoCondition,
  metCondition,
} from './heroInfo';

const FIG_COL = 334;
const SWIPE = 64;
const STRIP_H = 106;
const AVATAR = 62;
const TAB_H = 46;

type HeroTab = 'seen' | 'hidden';

function shortUnlockTag(fullHint: string): string {
  const chMatch = fullHint.match(/第\s*(\d+)\s*章/);
  if (fullHint.includes('羁绊满级') && chMatch) return `满好感·第${chMatch[1]}章`;
  if (chMatch) return `第 ${chMatch[1]} 章解锁`;
  if (fullHint.includes('序章')) return '序章解锁';
  const stageMatch = fullHint.match(/「([^」]+)」/);
  if (stageMatch) return `升至${stageMatch[1]}`;
  return fullHint.replace(/^开/, '').replace(/后相遇$/, '解锁');
}

export class HeroPage extends Page {
  private readonly _figure = new PIXI.Sprite();
  private readonly _stage = new PIXI.Graphics();
  private readonly _swipeZone = new PIXI.Graphics();
  private readonly _info = new PIXI.Container();
  private readonly _avatars = new PIXI.Container();
  private readonly _dots = new Map<HeroId, PIXI.Graphics>();
  private readonly _stamps: PIXI.Container[] = [];
  private _investBtn: Button | null = null;
  private _id: HeroId = HEROES[0].id;
  private _tab: HeroTab = 'seen';
  private _pressX: number | null = null;
  private _pressY = 0;
  private _onOpenChat?: (heroId: HeroId) => void;

  constructor(onOpenChat?: (heroId: HeroId) => void) {
    super('心动伙伴');
    this._onOpenChat = onOpenChat;
    this._figure.anchor.set(0.5, 1);
    this._swipeZone.eventMode = 'static';
    this._swipeZone.on('pointerdown', (e: PIXI.FederatedPointerEvent) => {
      this._pressX = e.global.x / Game.scale;
      this._pressY = e.global.y / Game.scale;
    });
    const end = (e: PIXI.FederatedPointerEvent): void => {
      if (this._pressX === null) return;
      const dx = e.global.x / Game.scale - this._pressX;
      const dy = e.global.y / Game.scale - this._pressY;
      this._pressX = null;
      if (Math.abs(dx) > SWIPE && Math.abs(dx) > Math.abs(dy)) this._step(dx < 0 ? 1 : -1);
    };
    this._swipeZone.on('pointerup', end);
    this._swipeZone.on('pointerupoutside', end);
    this.body.addChild(this._stage, this._figure, this._swipeZone, this._info, this._avatars);
  }

  show(id: HeroId): void {
    if (this.isOpen && this._id !== id) {
      this._switchTo(id, 0);
      return;
    }
    this._id = id;
    this.open();
  }

  protected override onOpen(): void {
    AudioManager.playBgm('romance');
    this.setDarkTheme(this._tab === 'hidden');
    for (const hero of HEROES) {
      gameTexture(heroFigurePath(hero.id));
      gameTexture(heroPortraitPath(hero.id));
    }
  }

  protected override onClose(): void {
    AudioManager.playBgm('home');
  }

  protected override onMoneyChanged(): void {
    for (const hero of HEROES) {
      const dot = this._dots.get(hero.id);
      if (dot) dot.visible = heroHasNews(hero);
    }
    const hero = heroById(this._id);
    if (!this._investBtn || !hero.shop) return;
    this._investBtn.setEnabled(canAffordBond(GameState.save, hero.id));
  }

  protected layoutBody(top: number, bottom: number): void {
    const hero = heroById(this._id);
    const met = effectiveBond(GameState.save, hero.id) > 0;
    const mainBottom = bottom - STRIP_H;
    this._layoutFigure(hero, top, mainBottom);
    this._layoutInfo(hero, met, top, mainBottom);
    this._layoutAvatars(bottom);
  }

  private _step(dir: 1 | -1): void {
    const i = HEROES.findIndex((h) => h.id === this._id);
    const next = HEROES[(i + dir + HEROES.length) % HEROES.length];
    AudioManager.play('ui_click');
    this._switchTo(next.id, dir);
  }

  private _switchTo(id: HeroId, dir: number): void {
    this._id = id;
    this.rebuild();
    const fx = this._figure.x;
    TweenManager.cancelTarget(this._figure);
    TweenManager.cancelTarget(this._info);
    const figAlpha = this._figure.alpha;
    this._figure.x = fx + dir * 72;
    this._figure.alpha = 0;
    TweenManager.to({ target: this._figure, props: { x: fx, alpha: figAlpha }, duration: 0.26, ease: Ease.easeOutQuad });
    this._info.alpha = 0;
    this._info.x = dir * 18;
    TweenManager.to({ target: this._info, props: { alpha: 1, x: 0 }, duration: 0.24, ease: Ease.easeOutQuad });
  }

  private _layoutFigure(hero: HeroDef, top: number, bottom: number): void {
    const cx = FIG_COL / 2 + 6;
    const figBottom = bottom - 6;
    const figH = bottom - top - 14;
    const dark = this.isDarkTheme;
    const g = this._stage.clear();
    const cy = top + figH * 0.44;
    for (let i = 8; i > 0; i--) {
      g.beginFill(hero.accentColor, dark ? 0.04 : 0.028)
        .drawEllipse(cx, cy, (FIG_COL * 0.58 * i) / 8, (figH * 0.48 * i) / 8)
        .endFill();
    }
    g.lineStyle(2.2, dark ? COLORS.champagne : COLORS.borderGold, 0.78).drawEllipse(cx, figBottom - 4, 124, 22);
    g.lineStyle(1.2, dark ? COLORS.champagne : COLORS.rose, 0.34).drawEllipse(cx, figBottom - 4, 158, 30);

    TweenManager.cancelTarget(this._figure);
    this._figure.position.set(cx, figBottom);
    this._figure.tint = 0xffffff;
    this._figure.alpha = 1;
    const infoLeft = FIG_COL + 6;
    showFigure(this._figure, heroFigurePath(hero.id), Game.logicWidth - 8, figH, () => {
      const half = this._figure.width / 2;
      let x = cx;
      if (x - half < 4) x = 4 + half;
      if (x + half > infoLeft + 24) x = infoLeft + 24 - half;
      this._figure.position.set(x, figBottom);
    }, 'height');

    this._swipeZone.clear().beginFill(0x000000, 0.001).drawRect(0, top, FIG_COL + 8, bottom - top).endFill();
  }

  private _layoutAvatars(bottom: number): void {
    for (const c of this._avatars.removeChildren()) c.destroy({ children: true });
    this._dots.clear();
    const W = Game.logicWidth;
    const n = HEROES.length;
    const barW = W - 28;
    const barH = STRIP_H - 12;
    const barY = bottom - STRIP_H + 8;

    if (this.isDarkTheme) {
      const barBg = new PIXI.Graphics();
      drawNoirCard(barBg, 14, barY, barW, barH, 32, 0.92);
      this._avatars.addChild(barBg);
    } else {
      const plaque = makeCouturePlaque(barW, barH, false, false);
      plaque.position.set(14, barY);
      this._avatars.addChild(plaque);
    }

    const gap = Math.floor((barW - 36 - n * AVATAR) / Math.max(1, n - 1));
    const total = n * AVATAR + (n - 1) * gap;
    let x = (W - total) / 2 + AVATAR / 2;
    const y = barY + barH / 2;
    const current = HEROES.findIndex((h) => h.id === this._id);

    HEROES.forEach((hero, i) => {
      const selected = hero.id === this._id;
      const slot = new PIXI.Container();
      slot.position.set(x, y);

      if (selected) {
        const halo = makeStickerSprite(UI_SLICES.navActiveHalo, AVATAR + 24, AVATAR + 24, true);
        slot.addChild(halo);
      }

      const r = AVATAR / 2;
      const ring = new PIXI.Graphics();
      ring.lineStyle(selected ? 3.4 : 2, selected ? COLORS.rose : COLORS.borderGold, selected ? 1 : 0.8);
      ring.beginFill(COLORS.cardWarm).drawCircle(0, 0, r).endFill();

      const face = new PIXI.Sprite();
      face.anchor.set(0.5);
      const mask = new PIXI.Graphics().beginFill(0xffffff).drawCircle(0, 0, r - 2.5).endFill();
      face.mask = mask;
      showFigure(face, heroPortraitPath(hero.id), AVATAR - 5, AVATAR - 5);
      slot.addChild(ring, face, mask);

      if (selected) slot.scale.set(1.07);

      const dot = new PIXI.Graphics()
        .lineStyle(2, 0xFFFFFF, 1)
        .beginFill(0xF0554D, 1)
        .drawCircle(0, 0, 6.5)
        .endFill();
      dot.position.set(r - 4, -r + 5);
      dot.visible = heroHasNews(hero);
      slot.addChild(dot);
      this._dots.set(hero.id, dot);

      slot.eventMode = 'static';
      slot.cursor = 'pointer';
      slot.hitArea = new PIXI.Circle(0, 0, r + 5);
      slot.on('pointertap', (e: PIXI.FederatedPointerEvent) => {
        e.stopPropagation();
        if (hero.id === this._id) return;
        AudioManager.play('ui_click');
        this._switchTo(hero.id, i > current ? 1 : -1);
      });
      this._avatars.addChild(slot);
      x += AVATAR + gap;
    });
  }

  private _layoutInfo(hero: HeroDef, met: boolean, top: number, bottom: number): void {
    for (const c of this._info.removeChildren()) c.destroy({ children: true });
    this._stamps.length = 0;
    this._investBtn = null;

    const save = GameState.save;
    const dark = this.isDarkTheme;
    const bond = effectiveBond(save, hero.id);
    const x0 = FIG_COL + 6;
    const w = Game.logicWidth - PAGE_PAD + 4 - x0;

    const investReserve = 90;
    const dossierH = Math.max(520, bottom - top - investReserve);
    if (dark) {
      const darkPanel = new PIXI.Graphics();
      drawNoirCard(darkPanel, x0, top, w, dossierH, 26, 0.9);
      this._info.addChild(darkPanel);
    } else {
      const plaque = makeCouturePlaque(w, dossierH, false, false);
      plaque.position.set(x0, top);
      this._info.addChild(plaque);
    }

    const padX = 18;
    const ix = x0 + padX;
    const iw = w - padX * 2;
    let y = top + 16;

    // 1. 姓名 + 贴纸微聊胶囊
    const name = makeText(hero.name, 40, dark ? COLORS.champagne : COLORS.ink, true);
    name.style.letterSpacing = 4;
    name.position.set(ix, y - 2);
    this._info.addChild(name);

    if (met && hero.shop && this._onOpenChat) {
      const chatWrap = new PIXI.Container();
      const chatBtn = new Button({
        width: 110,
        height: 40,
        variant: dark ? 'noir' : 'cream',
        fontSize: 18,
        label: '   微聊',
        onTap: () => {
          this.close(true);
          this._onOpenChat?.(hero.id);
        },
      });
      const phoneIco = makeStickerSprite(ICONS.phone, 28, 28, true);
      phoneIco.position.set(-28, 0);
      chatWrap.addChild(chatBtn, phoneIco);
      chatWrap.position.set(ix + iw - 55, y + 22);
      this._info.addChild(chatWrap);
    }
    y += 50;

    // 2. 身份头衔
    const where = hero.shop ? shopById(hero.shop).name : '主线宿命';
    const sub = makeText(
      met ? `${hero.title}  ·  ${where}` : `${hero.title}  ·  ${metCondition(hero)}`,
      18,
      dark ? COLORS.textOnGlassSoft : COLORS.inkSoft,
      true,
    );
    sub.position.set(ix, y);
    if (sub.width > iw) sub.scale.set(iw / sub.width);
    this._info.addChild(sub);
    y += 30;

    // 3. 心动红心 + 当前关系与门店倍率
    const hearts = drawHearts(new PIXI.Graphics(), bond, MAX_BOND, 12.5, 7.5, dark);
    hearts.position.set(ix + 12, y + 13);
    this._info.addChild(hearts);

    const stageName = bond > 0
      ? `${BOND_LEVELS[bond - 1].stage}${hero.shop ? ` · ×${BOND_LEVELS[bond - 1].incomeMult}` : ''}`
      : '尚未邂逅';
    const stage = makeText(stageName, 18, dark ? COLORS.champagne : COLORS.roseDeep, true);
    stage.anchor.set(0, 0.5);
    stage.position.set(ix + hearts.width + 12, y + 13);
    if (stage.width > iw - hearts.width - 12) stage.scale.set((iw - hearts.width - 12) / stage.width);
    this._info.addChild(stage);
    y += 34;

    // 4. 鎏金丝缎特权铭牌
    const skillBox = new PIXI.Container();
    skillBox.position.set(ix, y);
    if (dark) {
      const sb = new PIXI.Graphics();
      drawNoirCard(sb, 0, 0, iw, 44, 22, 0.85);
      skillBox.addChild(sb);
    } else {
      skillBox.addChild(makeRibbonBanner(iw, 44, false));
    }
    const starG = new PIXI.Graphics();
    drawDiamondStar(starG, 22, 22, 5.5, dark ? COLORS.champagne : 0xC88A32, 0.95);
    const skillTxt = makeText(`特权「${hero.skill.name}」`, 18, dark ? COLORS.champagne : COLORS.goldDeep, true);
    skillTxt.anchor.set(0, 0.5);
    skillTxt.position.set(36, 22);
    const moreTxt = makeText('详情 ▸', 15, dark ? COLORS.textOnGlassSoft : COLORS.inkSoft, true);
    moreTxt.anchor.set(1, 0.5);
    moreTxt.position.set(iw - 18, 22);
    skillBox.addChild(starG, skillTxt, moreTxt);
    skillBox.eventMode = 'static';
    skillBox.cursor = 'pointer';
    skillBox.on('pointertap', () => {
      AudioManager.play('ui_click');
      ToastManager.show(`${hero.skill.name}：${hero.skill.desc}`);
    });
    this._info.addChild(skillBox);
    y += 54;

    // 5. 丝缎切换双栏标签
    this._layoutTabs(hero, ix, y, iw);
    y += TAB_H + 14;

    // 6. 记忆典藏卡片区（2×3 精致邮票矩阵 / 宽幅暗夜卷宗卡）
    const gridBottom = top + dossierH - 16;
    const availH = Math.max(240, gridBottom - y);

    if (this._tab === 'seen') {
      const gapX = 12;
      const footerH = 42;
      const gridAvailH = Math.max(240, availH - footerH);
      const gapY = 14;
      const cw = Math.floor((iw - gapX) / 2);
      const ch = Math.min(168, Math.floor((gridAvailH - gapY * 2) / 3));

      const items: { vid: string; epTag: string; title: string; hint: string; gold?: boolean; isExtra?: boolean }[] = hero.bondVideos.map((vid, idx) => ({
        vid,
        epTag: `EP.0${idx + 1}`,
        title: bondTitle(hero, idx),
        hint: bondVideoCondition(hero, idx),
      }));

      if (hero.endingVideo) {
        items.push({
          vid: hero.endingVideo,
          epTag: 'FINALE',
          title: '专属结局',
          hint: endingCondition(),
          gold: true,
        });
      } else {
        items.push({
          vid: hero.extraVideo,
          epTag: 'SPECIAL',
          title: hero.extraTitle,
          hint: extraCondition(hero),
          gold: true,
          isExtra: true,
        });
      }

      items.forEach((it, idx) => {
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        const stamp = this._buildMemoryStamp(it.vid, it.epTag, it.title, it.hint, cw, ch, !!it.gold, !!it.isExtra);
        stamp.position.set(ix + col * (cw + gapX) + cw / 2, y + row * (ch + gapY) + ch / 2);
        this._stamps.push(stamp);
        this._info.addChild(stamp);
      });

      const unlockedCount = items.filter((it) => isVideoUnlocked(save, it.vid)).length;
      const footY = y + ch * 3 + gapY * 2 + (gridBottom - (y + ch * 3 + gapY * 2)) / 2;
      const footTxt = makeText(`✦ 心动典藏进度  ${unlockedCount}/${items.length}  ·  轻触卡片欣赏剧情`, 15, COLORS.inkSoft, true);
      footTxt.anchor.set(0.5);
      footTxt.position.set(ix + iw / 2, footY);
      this._info.addChild(footTxt);
    } else {
      const darkQuote = makeText(`— ${hero.darkSide} —`, 17, COLORS.champagne, true);
      darkQuote.anchor.set(0.5, 0);
      darkQuote.position.set(ix + iw / 2, y - 4);
      if (darkQuote.width > iw) darkQuote.scale.set(iw / darkQuote.width);
      this._info.addChild(darkQuote);

      let hy = y + 26;
      const hiddenCount = hero.hiddenVideos.length + (hero.endingVideo ? 1 : 0);
      const cardH = Math.min(104, Math.floor((gridBottom - hy - (hiddenCount - 1) * 12) / Math.max(2, hiddenCount)));

      hero.hiddenVideos.forEach((vid, idx) => {
        const card = this._buildDarkCard(vid, `暗面 · ${hero.hiddenTitles[idx]}`, hiddenVideoCondition(hero, idx), iw, cardH, false);
        card.position.set(ix + iw / 2, hy + cardH / 2);
        this._info.addChild(card);
        hy += cardH + 12;
      });
      if (hero.endingVideo) {
        const extra = this._buildDarkCard(hero.extraVideo, `私藏番外 · ${hero.extraTitle}`, extraCondition(hero), iw, cardH, true);
        extra.position.set(ix + iw / 2, hy + cardH / 2);
        this._info.addChild(extra);
      }
    }

    this._layoutInvest(hero, met, x0, w, bottom);
  }

  private _layoutTabs(hero: HeroDef, ix: number, y: number, iw: number): void {
    const save = GameState.save;
    const hiddenNews = hero.hiddenVideos.some((v) => isVideoUnlocked(save, v) && !save.watched.includes(v))
      || (!!hero.endingVideo && isVideoAdPending(save, hero.extraVideo));
    const tabs: [HeroTab, string, boolean][] = [
      ['seen', '她看见的', false],
      ['hidden', '她看不见的', hiddenNews],
    ];
    const tw = Math.floor((iw - 10) / 2);
    tabs.forEach(([id, label, news], i) => {
      const active = this._tab === id;
      const tab = new PIXI.Container();
      tab.position.set(ix + i * (tw + 10), y);

      if (this.isDarkTheme) {
        const bg = new PIXI.Graphics();
        if (active) {
          bg.lineStyle(1.4, COLORS.champagne, 0.9).beginFill(COLORS.noirBorder, 0.95).drawRoundedRect(0, 0, tw, TAB_H, TAB_H / 2).endFill();
        } else {
          drawNoirCard(bg, 0, 0, tw, TAB_H, TAB_H / 2, 0.65);
        }
        tab.addChild(bg);
      } else {
        const spec = active
          ? { path: UI_SLICES.btnSmCoral, pad2x: 24, left2x: 88, top2x: 68, right2x: 88, bottom2x: 68 }
          : { path: UI_SLICES.btnMdCream, pad2x: 14, left2x: 102, top2x: 70, right2x: 102, bottom2x: 70 };
        tab.addChild(createNineSlice2x(spec, tw, TAB_H, false));
      }

      const color = active ? 0xFFFFFF : (this.isDarkTheme ? COLORS.textOnGlassSoft : COLORS.inkSoft);
      const text = makeText(label, 19, color, true);
      if (active && !this.isDarkTheme) {
        text.style.stroke = 0x8C322B;
        text.style.strokeThickness = 3.4;
        text.style.lineJoin = 'round';
      }
      text.anchor.set(0.5);
      text.position.set(tw / 2, TAB_H / 2 - 0.5);
      tab.addChild(text);

      if (news && !active) {
        tab.addChild(new PIXI.Graphics().lineStyle(2, 0xFFFFFF).beginFill(0xF0554D).drawCircle(tw - 14, 10, 6).endFill());
      }
      tab.eventMode = 'static';
      tab.cursor = 'pointer';
      tab.on('pointertap', () => {
        if (this._tab === id) return;
        AudioManager.play('ui_click');
        this._tab = id;
        this.setDarkTheme(id === 'hidden');
        this.rebuild();
      });
      this._info.addChild(tab);
    });
  }

  private _buildMemoryStamp(
    vid: string,
    epTag: string,
    titleStr: string,
    lockedHint: string,
    cw: number,
    ch: number,
    gold: boolean,
    isExtra: boolean,
  ): PIXI.Container {
    const save = GameState.save;
    const open = isVideoUnlocked(save, vid);
    const pendingAd = isExtra && isVideoAdPending(save, vid);
    const seen = save.watched.includes(vid);
    const fresh = (open && !seen) || pendingAd;

    const mode = !open && !pendingAd
      ? 'locked'
      : gold
        ? 'gold'
        : fresh
          ? 'fresh'
          : 'open';

    const card = new PIXI.Container();
    card.addChild(makeMemoryStamp(cw, ch, mode, true));

    const tagCol = mode === 'locked' ? COLORS.inkMuted : mode === 'fresh' ? COLORS.roseDeep : COLORS.goldDeep;
    const epNode = makeText(epTag, 13, tagCol, true);
    epNode.style.letterSpacing = 1;
    epNode.anchor.set(0, 0.5);
    epNode.position.set(-cw / 2 + 14, -ch / 2 + 17);
    card.addChild(epNode);

    if (fresh) {
      const dot = new PIXI.Graphics().lineStyle(1.5, 0xFFFFFF).beginFill(0xF0554D).drawCircle(cw / 2 - 15, -ch / 2 + 17, 5.5).endFill();
      card.addChild(dot);
    } else if (open && seen) {
      const chk = makeText('✓', 15, COLORS.goldDeep, true);
      chk.anchor.set(1, 0.5);
      chk.position.set(cw / 2 - 14, -ch / 2 + 17);
      card.addChild(chk);
    }

    const titleNode = makeText(titleStr, 22, open || pendingAd ? COLORS.ink : COLORS.inkSoft, true);
    titleNode.anchor.set(0.5);
    titleNode.position.set(0, 4);
    if (titleNode.width > cw - 24) titleNode.scale.set((cw - 24) / titleNode.width);
    card.addChild(titleNode);

    const botY = ch / 2 - 19;
    if (!open && !pendingAd) {
      const shortHint = shortUnlockTag(lockedHint);
      const hintTxt = makeText(shortHint, 14, COLORS.inkMuted, true);
      hintTxt.anchor.set(0.5);
      const lockIco = makeStickerSprite(ICONS.lock, 22, 22, true);
      const totalW = 22 + 4 + hintTxt.width;
      lockIco.position.set(-totalW / 2 + 11, botY);
      hintTxt.position.set(-totalW / 2 + 26 + hintTxt.width / 2, botY);
      card.addChild(lockIco, hintTxt);
    } else {
      const statusStr = pendingAd ? '▶ 免单解锁' : fresh ? '▶ 点击欣赏' : '✦ 点击重温';
      const statusCol = fresh ? COLORS.roseDeep : COLORS.goldDeep;
      const statusTxt = makeText(statusStr, 15, statusCol, true);
      statusTxt.anchor.set(0.5);
      statusTxt.position.set(0, botY);
      card.addChild(statusTxt);
    }

    this._makeTappable(card, cw, ch, () => {
      if (!open && !pendingAd) {
        AudioManager.play('ui_deny');
        ToastManager.show(lockedHint);
        return;
      }
      void playStory(vid).then(() => this.rebuild());
    });
    return card;
  }

  private _buildDarkCard(
    vid: string,
    titleStr: string,
    lockedHint: string,
    cw: number,
    ch: number,
    isExtra: boolean,
  ): PIXI.Container {
    const save = GameState.save;
    const open = isVideoUnlocked(save, vid);
    const pendingAd = isExtra && isVideoAdPending(save, vid);
    const seen = save.watched.includes(vid);
    const fresh = (open && !seen) || pendingAd;

    const card = new PIXI.Container();
    const bg = new PIXI.Graphics();
    drawNoirCard(bg, -cw / 2, -ch / 2, cw, ch, 20, open || pendingAd ? 0.94 : 0.56);
    card.addChild(bg);

    const title = makeText(titleStr, 22, open || pendingAd ? COLORS.champagne : COLORS.textOnGlassSoft, true);
    title.position.set(-cw / 2 + 22, -ch / 2 + 18);
    if (title.width > cw - 92) title.scale.set((cw - 92) / title.width);
    card.addChild(title);

    const hintStr = !open && !pendingAd
      ? lockedHint
      : pendingAd
        ? '▶ 免单解锁暗面番外'
        : fresh
          ? '▶ 秘密已揭晓 · 点击窥探'
          : '✦ 已阅卷宗 · 点击重温';
    const hint = makeText(hintStr, 16, fresh ? COLORS.rose : COLORS.textOnGlassSoft, fresh);
    hint.position.set(-cw / 2 + 22, ch / 2 - 34);
    if (hint.width > cw - 92) hint.scale.set((cw - 92) / hint.width);
    card.addChild(hint);

    if (!open && !pendingAd) {
      const lock = makeStickerSprite(ICONS.lock, 34, 34, true);
      lock.position.set(cw / 2 - 32, 0);
      card.addChild(lock);
    } else {
      const badge = new PIXI.Graphics()
        .lineStyle(1.6, COLORS.champagne, 0.85)
        .beginFill(fresh ? COLORS.rose : 0x3D1C2B, 0.95)
        .drawCircle(cw / 2 - 32, 0, 18)
        .endFill();
      const sym = makeText(fresh ? '▶' : '✓', 16, COLORS.champagne, true);
      sym.anchor.set(0.5);
      sym.position.set(cw / 2 - 31, 0);
      card.addChild(badge, sym);
    }

    this._makeTappable(card, cw, ch, () => {
      if (!open && !pendingAd) {
        AudioManager.play('ui_deny');
        ToastManager.show(lockedHint);
        return;
      }
      void playStory(vid).then(() => this.rebuild());
    });
    return card;
  }

  private _layoutInvest(hero: HeroDef, met: boolean, x0: number, w: number, bottom: number): void {
    const save = GameState.save;
    const bond = effectiveBond(save, hero.id);
    const block = met ? bondBlockReason(save, hero.id) : metCondition(hero);
    const y = bottom - 42;

    if (hero.shop && !block) {
      const rosesNeed = bondRoseCost(hero.id, bond);
      const cashFallback = bondUpgradeCost(hero.id, bond);
      const next = BOND_LEVELS[bond];
      const hasRoses = save.roses >= rosesNeed;
      const costStr = hasRoses
        ? `   送出 ${rosesNeed} 朵心动玫瑰`
        : `   玫瑰 ${save.roses}/${rosesNeed}（或 ¥${formatMoney(cashFallback)}）`;

      const wrap = new PIXI.Container();
      const btn = new Button({
        width: w,
        height: 76,
        variant: this.isDarkTheme ? 'noir' : 'rose',
        fontSize: 22,
        label: costStr,
        sub: `升至「${next.stage}」 · 门店×${next.incomeMult}`,
        onTap: () => this._invest(hero),
      });
      btn.setEnabled(canAffordBond(save, hero.id));
      const roseIco = makeStickerSprite(ICONS.currencyRose, 36, 36, true);
      roseIco.position.set(-w / 2 + 44, -10);
      wrap.addChild(btn, roseIco);
      wrap.position.set(x0 + w / 2, y);
      this._info.addChild(wrap);
      this._investBtn = btn;
      return;
    }

    const isMaxed = bond >= MAX_BOND;
    if (this.isDarkTheme) {
      const pill = new PIXI.Graphics();
      drawNoirCard(pill, x0, y - 32, w, 64, 32, 0.82);
      this._info.addChild(pill);
    } else {
      const banner = makeRibbonBanner(w, 64, false);
      banner.position.set(x0, y - 32);
      this._info.addChild(banner);
    }
    const labelStr = isMaxed ? '✦ 心动羁绊已满级 · 专属特权全开' : (block ?? '');
    const text = makeText(
      labelStr,
      20,
      this.isDarkTheme ? COLORS.champagne : (isMaxed ? COLORS.goldDeep : COLORS.inkSoft),
      true,
    );
    text.anchor.set(0.5);
    text.position.set(x0 + w / 2, y);
    if (text.width > w - 40) text.scale.set((w - 40) / text.width);
    this._info.addChild(text);
  }

  private _invest(hero: HeroDef): void {
    if (!GameState.investBond(hero.id)) {
      ToastManager.show('玫瑰与现金暂不足，做主线任务或回复微聊可领玫瑰！');
      return;
    }
    const bond = effectiveBond(GameState.save, hero.id);
    AudioManager.play('bond_up');
    ToastManager.show(`✦ 与${hero.name}升至「${BOND_LEVELS[bond - 1].stage}」！新剧情已解锁`, 'success');
    this._tab = 'seen';
    this.setDarkTheme(false);
    this.rebuild();
    const stamp = this._stamps[bond - 1];
    if (!stamp) return;
    stamp.scale.set(1.08);
    TweenManager.to({ target: stamp.scale, props: { x: 1, y: 1 }, duration: 0.32, ease: Ease.easeOutBack });
  }

  private _makeTappable(target: PIXI.Container, cw: number, ch: number, onTap: () => void): void {
    target.hitArea = new PIXI.Rectangle(-cw / 2, -ch / 2, cw, ch);
    target.eventMode = 'static';
    target.cursor = 'pointer';
    target.on('pointerdown', () => {
      TweenManager.cancelTarget(target.scale);
      target.scale.set(0.95);
    });
    const release = (): void => {
      TweenManager.to({ target: target.scale, props: { x: 1, y: 1 }, duration: 0.16, ease: Ease.easeOutBack });
    };
    target.on('pointerup', release);
    target.on('pointerupoutside', release);
    target.on('pointertap', () => {
      AudioManager.play('ui_click');
      onTap();
    });
  }
}
