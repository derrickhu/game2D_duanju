/**
 * 剧情页：每章一张玻璃卡片，左边大号章节序号，右边分集按钮和“连续观看”。
 * 未解锁的章节显示身价进度；打开时自动滚到最新一章。
 */
import * as PIXI from 'pixi.js';
import { ICONS } from '@/data/art';
import { CHAPTERS, type ChapterDef } from '@/data/story';
import { AudioManager } from '@/core/AudioManager';
import { Game } from '@/core/Game';
import { ToastManager } from '@/core/ToastManager';
import { Ease, TweenManager } from '@/core/TweenManager';
import { GameState } from '@/managers/GameState';
import { playStory, playStorySequence } from '@/services/StoryService';
import { formatMoney } from '@/sim/format';
import { Button } from '@/ui/Button';
import { PAGE_PAD, Page } from '@/ui/Page';
import { ProgressBar } from '@/ui/ProgressBar';
import { ScrollView } from '@/ui/ScrollView';
import { COLORS, drawGlass, makeNumText, makeText } from '@/ui/theme';
import { gameTexture, showFigure } from '@/utils/assets';

const CARD_H = 196;
const GAP = 16;
const NUM_W = 132;
const CHIP = 64;

export class StorySheet extends Page {
  private readonly _scroll = new ScrollView();
  private _jumpOnLayout = false;

  constructor() {
    super('剧情');
    this.body.addChild(this._scroll);
  }

  protected override onOpen(): void {
    this._jumpOnLayout = true;
  }

  protected layoutBody(top: number, bottom: number): void {
    const W = Game.logicWidth;
    for (const c of this._scroll.content.removeChildren()) c.destroy({ children: true });
    this._scroll.position.set(0, top);
    this._scroll.setViewport(W, bottom - top);
    const save = GameState.save;
    const w = W - PAGE_PAD * 2;
    let latest = 0;
    let nextLockedShown = false;
    CHAPTERS.forEach((ch, i) => {
      const open = save.netWorth >= ch.unlockNetWorth;
      if (open) latest = i;
      const showProgress = !open && !nextLockedShown;
      if (!open) nextLockedShown = true;
      const card = this._card(ch, w, open, showProgress);
      card.position.set(PAGE_PAD, i * (CARD_H + GAP));
      this._scroll.content.addChild(card);
    });
    this._scroll.setContentHeight(CHAPTERS.length * (CARD_H + GAP) + 8);
    if (this._jumpOnLayout) {
      this._jumpOnLayout = false;
      this._scroll.scrollTo(Math.max(0, latest * (CARD_H + GAP) - (CARD_H + GAP)));
    }
  }

  private _card(ch: ChapterDef, w: number, open: boolean, showProgress: boolean): PIXI.Container {
    const save = GameState.save;
    const card = new PIXI.Container();
    const seenCount = ch.videos.filter((v) => save.watched.includes(v)).length;
    const fresh = open && seenCount < ch.videos.length;
    card.addChild(drawGlass(new PIXI.Graphics(), 0, 0, w, CARD_H, 28, open ? 0.62 : 0.38));

    const numLabel = ch.id === 0 ? '序' : String(ch.id).padStart(2, '0');
    const num = ch.id === 0
      ? makeText(numLabel, 64, open ? COLORS.champagne : COLORS.textOnGlassSoft, true)
      : makeNumText(numLabel, 76, open ? COLORS.champagne : COLORS.textOnGlassSoft);
    num.anchor.set(0.5);
    num.position.set(NUM_W / 2 + 8, CARD_H / 2 - 14);
    if (!open) num.alpha = 0.5;
    card.addChild(num);
    const chap = makeText(ch.id === 0 ? 'PROLOGUE' : 'CHAPTER', 16, COLORS.textOnGlassSoft, true);
    chap.style.letterSpacing = 3;
    chap.anchor.set(0.5, 0);
    chap.position.set(NUM_W / 2 + 8, CARD_H / 2 + 32);
    card.addChild(chap);
    card.addChild(new PIXI.Graphics().beginFill(COLORS.champagne, open ? 0.35 : 0.15).drawRect(NUM_W + 16, 26, 1, CARD_H - 52).endFill());

    const x0 = NUM_W + 40;
    const right = w - 24;
    const title = makeText(ch.title, 32, open ? COLORS.textOnGlass : COLORS.textOnGlassSoft, true);
    title.position.set(x0, 24);
    card.addChild(title);

    if (fresh) {
      const tag = makeText(seenCount === 0 ? '新章节' : '有新剧情', 18, COLORS.glass, true);
      const tw = tag.width + 20;
      card.addChild(new PIXI.Graphics().beginFill(COLORS.rose).drawRoundedRect(right - tw, 26, tw, 30, 15).endFill());
      tag.anchor.set(0.5);
      tag.position.set(right - tw / 2, 41);
      card.addChild(tag);
    } else if (open) {
      const done = makeText('已看完', 18, COLORS.champagne, true);
      done.anchor.set(1, 0);
      done.position.set(right, 32);
      card.addChild(done);
    }

    if (!open) {
      const lock = new PIXI.Sprite();
      showFigure(lock, ICONS.lock, 26, 26);
      lock.position.set(x0, 82);
      lock.alpha = 0.6;
      const tip = makeText(`身价达到 ${formatMoney(ch.unlockNetWorth)} 解锁`, 22, COLORS.textOnGlassSoft);
      tip.position.set(x0 + 36, 82);
      card.addChild(lock, tip);
      if (showProgress) {
        const barW = right - x0;
        const bar = new ProgressBar(barW, 10, COLORS.champagne, COLORS.white, 0.15);
        bar.progress = save.netWorth / ch.unlockNetWorth;
        bar.position.set(x0, 130);
        const pct = makeText(`${formatMoney(save.netWorth)} / ${formatMoney(ch.unlockNetWorth)}`, 18, COLORS.champagne);
        pct.position.set(x0, 148);
        card.addChild(bar, pct);
      }
      card.eventMode = 'static';
      card.on('pointertap', () => {
        if (this._scroll.dragging) return;
        AudioManager.play('ui_deny');
        ToastManager.show(`身价达到 ${formatMoney(ch.unlockNetWorth)} 解锁本章`);
      });
      return card;
    }

    const chipY = CARD_H - 24 - CHIP / 2;
    ch.videos.forEach((vid, i) => {
      const seen = save.watched.includes(vid);
      const chip = this._chip(ch.videos.length === 1 ? (seen ? '重温' : '观看') : String(i + 1), seen, ch.videos.length === 1 ? 140 : CHIP);
      chip.position.set(x0 + (ch.videos.length === 1 ? 70 : CHIP / 2) + i * (CHIP + 14), chipY);
      chip.on('pointertap', () => {
        if (this._scroll.dragging) return;
        AudioManager.play('ui_click');
        void playStory(vid).then(() => this.rebuild());
      });
      card.addChild(chip);
    });

    if (ch.videos.length > 1) {
      const all = new Button({
        width: 156, height: 64, variant: 'gold', fontSize: 24,
        label: seenCount === 0 ? '从头看' : '连续观看',
        onTap: () => {
          if (this._scroll.dragging) return;
          const from = ch.videos.findIndex((v) => !save.watched.includes(v));
          void playStorySequence(from > 0 ? ch.videos.slice(from) : ch.videos).then(() => this.rebuild());
        },
      });
      all.position.set(right - 78, chipY);
      card.addChild(all);
    }
    return card;
  }

  /** 分集按钮：没看过是实心金色，看过是描边 */
  private _chip(label: string, seen: boolean, w: number): PIXI.Container {
    const chip = new PIXI.Container();
    const g = new PIXI.Graphics();
    if (seen) drawGlass(g, -w / 2, -CHIP / 2, w, CHIP, CHIP / 2, 0.5);
    else g.beginFill(COLORS.champagne).drawRoundedRect(-w / 2, -CHIP / 2, w, CHIP, CHIP / 2).endFill();
    const text = makeText(label, 26, seen ? COLORS.champagne : COLORS.glass, true);
    text.anchor.set(0.5);
    chip.addChild(g, text);
    if (!seen && w === CHIP) chip.addChild(new PIXI.Graphics().beginFill(COLORS.rose).drawCircle(w / 2 - 6, -CHIP / 2 + 6, 7).endFill());
    chip.eventMode = 'static';
    chip.cursor = 'pointer';
    chip.on('pointerdown', () => {
      TweenManager.cancelTarget(chip.scale);
      chip.scale.set(0.92);
    });
    const release = (): void => {
      TweenManager.to({ target: chip.scale, props: { x: 1, y: 1 }, duration: 0.16, ease: Ease.easeOutBack });
    };
    chip.on('pointerup', release);
    chip.on('pointerupoutside', release);
    return chip;
  }
}
