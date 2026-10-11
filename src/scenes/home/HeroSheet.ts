/**
 * 男主列表：三列全身像卡片，未相遇的是剪影。点卡片进个人页。
 */
import * as PIXI from 'pixi.js';
import { heroFigurePath } from '@/data/art';
import { BOND_LEVELS, MAX_BOND } from '@/data/balance';
import { HEROES, type HeroDef, type HeroId } from '@/data/story';
import { AudioManager } from '@/core/AudioManager';
import { Game } from '@/core/Game';
import { Ease, TweenManager } from '@/core/TweenManager';
import { GameState } from '@/managers/GameState';
import { effectiveBond } from '@/sim/unlocks';
import { PAGE_PAD, Page } from '@/ui/Page';
import { ScrollView } from '@/ui/ScrollView';
import { COLORS, drawGlass, drawHearts, makeText } from '@/ui/theme';
import { gameTexture, showFigure } from '@/utils/assets';
import { HeroPage } from './HeroPage';
import { heroHasNews, metCondition } from './heroInfo';

const COLS = 3;
const GAP = 16;
const INFO_H = 104;

export class HeroSheet extends Page {
  private readonly _scroll = new ScrollView();
  private readonly _detail: HeroPage;
  private readonly _dots = new Map<HeroId, PIXI.Graphics>();

  constructor() {
    super('男主');
    this.body.addChild(this._scroll);
    this._detail = new HeroPage(() => this.rebuild());
  }

  /** 直接打开某位男主的个人页（相遇时用） */
  openHero(id: HeroId): void {
    if (!this.isOpen) this.open();
    this._detail.show(id);
  }

  override close(silent = false): void {
    this._detail.close(true);
    super.close(silent);
  }

  protected override onOpen(): void {
    AudioManager.playBgm('romance');
    for (const h of HEROES) gameTexture(heroFigurePath(h.id));
  }

  protected override onClose(): void {
    AudioManager.playBgm('home');
  }

  protected override onMoneyChanged(): void {
    for (const hero of HEROES) {
      const dot = this._dots.get(hero.id);
      if (dot) dot.visible = heroHasNews(hero);
    }
    this._detail.refreshAffordable();
  }

  protected layoutBody(top: number, bottom: number): void {
    const W = Game.logicWidth;
    for (const c of this._scroll.content.removeChildren()) c.destroy({ children: true });
    this._dots.clear();
    this._scroll.position.set(0, top);
    this._scroll.setViewport(W, bottom - top);

    const cw = (W - PAGE_PAD * 2 - GAP * (COLS - 1)) / COLS;
    const rows = Math.ceil(HEROES.length / COLS);
    const ch = Math.max(330, Math.min(420, (bottom - top - GAP * (rows - 1)) / rows));
    HEROES.forEach((hero, i) => {
      const card = this._card(hero, cw, ch);
      card.position.set(PAGE_PAD + (i % COLS) * (cw + GAP) + cw / 2, Math.floor(i / COLS) * (ch + GAP) + ch / 2);
      this._scroll.content.addChild(card);
    });
    this._scroll.setContentHeight(rows * ch + (rows - 1) * GAP + 8);
  }

  private _card(hero: HeroDef, w: number, h: number): PIXI.Container {
    const save = GameState.save;
    const bond = effectiveBond(save, hero.id);
    const met = bond > 0;
    const card = new PIXI.Container();
    const figH = h - INFO_H;

    const bg = drawGlass(new PIXI.Graphics(), 0, 0, w, h, 24, met ? 0.62 : 0.45);
    for (let i = 8; i > 0; i--) {
      bg.beginFill(COLORS.champagne, met ? 0.035 : 0.015).drawEllipse(w / 2, figH * 0.6, (w * 0.55 * i) / 8, (figH * 0.5 * i) / 8).endFill();
    }
    card.addChild(bg);

    const fig = new PIXI.Sprite();
    fig.anchor.set(0.5, 1);
    fig.position.set(w / 2, figH + 4);
    if (!met) {
      fig.tint = 0x000000;
      fig.alpha = 0.6;
    }
    const mask = new PIXI.Graphics().beginFill(0xffffff).drawRoundedRect(2, 2, w - 4, figH + 2, 22).endFill();
    fig.mask = mask;
    card.addChild(mask, fig);
    showFigure(fig, heroFigurePath(hero.id), w * 0.9, figH - 14, () => {
      const target = met ? 1 : 0.6;
      fig.alpha = 0;
      TweenManager.to({ target: fig, props: { alpha: target }, duration: 0.25, ease: Ease.easeOutQuad });
    });

    card.addChild(new PIXI.Graphics().beginFill(COLORS.champagne, 0.25).drawRect(14, figH + 4, w - 28, 1).endFill());
    const name = makeText(met ? hero.name : '？？？', 28, met ? COLORS.textOnGlass : COLORS.textOnGlassSoft, true);
    name.anchor.set(0.5, 0);
    name.position.set(w / 2, figH + 14);
    card.addChild(name);

    if (met) {
      const hearts = drawHearts(new PIXI.Graphics(), bond, MAX_BOND, 9, 5);
      hearts.position.set(w / 2 - (MAX_BOND * 18 + (MAX_BOND - 1) * 5) / 2 + 9, figH + 64);
      card.addChild(hearts);
      const stage = makeText(BOND_LEVELS[bond - 1].stage, 18, COLORS.champagne);
      stage.anchor.set(0.5, 0);
      stage.position.set(w / 2, figH + 76);
      card.addChild(stage);
    } else {
      const tip = makeText(metCondition(hero), 18, COLORS.textOnGlassSoft);
      tip.anchor.set(0.5, 0);
      tip.position.set(w / 2, figH + 58);
      if (tip.width > w - 16) tip.scale.set((w - 16) / tip.width);
      card.addChild(tip);
    }

    const title = makeText(met ? hero.title : '', 18, COLORS.glass, true);
    if (met) {
      const tw = title.width + 20;
      const tag = new PIXI.Graphics().beginFill(COLORS.champagne, 0.92).drawRoundedRect(12, 12, tw, 30, 15).endFill();
      title.position.set(22, 16);
      card.addChild(tag, title);
    }

    const dot = new PIXI.Graphics().beginFill(COLORS.rose).drawCircle(w - 16, 16, 9).endFill();
    dot.visible = heroHasNews(hero);
    this._dots.set(hero.id, dot);
    card.addChild(dot);

    card.eventMode = 'static';
    card.cursor = 'pointer';
    card.pivot.set(w / 2, h / 2);
    card.on('pointerdown', () => {
      TweenManager.cancelTarget(card.scale);
      card.scale.set(0.97);
    });
    const release = (): void => {
      TweenManager.to({ target: card.scale, props: { x: 1, y: 1 }, duration: 0.16, ease: Ease.easeOutBack });
    };
    card.on('pointerup', release);
    card.on('pointerupoutside', release);
    card.on('pointertap', () => {
      if (this._scroll.dragging) return;
      AudioManager.play('ui_click');
      this._detail.show(hero.id);
    });
    return card;
  }
}
