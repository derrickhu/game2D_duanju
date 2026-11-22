/**
 * 剧情页（v7 鎏金齿孔电影票根卡片 + 丝缎分集胶囊重构版）：
 * - 每章采用 @2x 电影票根式卡片 (`v7_card_chapter_ticket`)：左侧 124px 菱格鎏金/樱粉副券 + 半圆齿孔虚线 + 右侧白瓷双金线舞台；
 * - 告别扁平红圆圈 `1 2 3 4` 与廉价系统 Emoji (`⚔️🌹🌏`)，升级为高光丝缎分集胶囊 (`第1集`..`第4集`) + 糖果珐琅玫瑰贴纸徽章！
 */
import * as PIXI from 'pixi.js';
import { ICONS, UI_SLICES } from '@/data/art';
import { BALANCE } from '@/data/balance';
import { CHAPTERS, type ChapterDef } from '@/data/story';
import { AudioManager } from '@/core/AudioManager';
import { Game } from '@/core/Game';
import { ToastManager } from '@/core/ToastManager';
import { Ease, TweenManager } from '@/core/TweenManager';
import { GameState } from '@/managers/GameState';
import { playChapterFlow, playStory } from '@/services/StoryService';
import { formatMoney } from '@/sim/format';
import { canPrestigeSeason } from '@/sim/unlocks';
import { Button } from '@/ui/Button';
import { showDialog } from '@/ui/Dialog';
import { PAGE_PAD, Page } from '@/ui/Page';
import { ProgressBar } from '@/ui/ProgressBar';
import { ScrollView } from '@/ui/ScrollView';
import {
  COLORS,
  createNineSlice2x,
  makeChapterTicket,
  makeCouturePlaque,
  makeNumText,
  makeStickerSprite,
  makeText,
} from '@/ui/theme';

const CARD_H = 198;
const GAP = 16;
const STUB_W = 124;
const EP_W = 78;
const EP_H = 44;

export class StorySheet extends Page {
  private readonly _scroll = new ScrollView();
  private _jumpOnLayout = false;

  constructor() {
    super('逆袭剧场');
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
    let firstFresh = -1;
    let nextLockedShown = false;

    CHAPTERS.forEach((ch, i) => {
      const open = save.netWorth >= ch.unlockNetWorth;
      if (open) latest = i;
      if (firstFresh < 0 && open && ch.videos.some((v) => !save.watched.includes(v))) firstFresh = i;
      const showProgress = !open && !nextLockedShown;
      if (!open) nextLockedShown = true;
      const card = this._card(ch, w, open, showProgress);
      card.position.set(PAGE_PAD, i * (CARD_H + GAP));
      this._scroll.content.addChild(card);
    });

    const prestigeY = CHAPTERS.length * (CARD_H + GAP) + 6;
    const prestigeCard = this._buildPrestigeCard(w);
    prestigeCard.position.set(PAGE_PAD, prestigeY);
    this._scroll.content.addChild(prestigeCard);

    this._scroll.setContentHeight(prestigeY + 206);
    if (this._jumpOnLayout) {
      this._jumpOnLayout = false;
      const focus = firstFresh >= 0 ? firstFresh : latest;
      this._scroll.scrollTo(Math.max(0, focus * (CARD_H + GAP) - 12));
    }
  }

  private _card(ch: ChapterDef, w: number, open: boolean, showProgress: boolean): PIXI.Container {
    const save = GameState.save;
    const card = new PIXI.Container();
    const seenCount = ch.videos.filter((v) => save.watched.includes(v)).length;
    const fresh = open && seenCount < ch.videos.length;
    const battleDone = !ch.rival || save.clearedBattles.includes(ch.id);

    const ticketMode = !open ? 'locked' : fresh || !battleDone ? 'fresh' : 'open';
    card.addChild(makeChapterTicket(w, CARD_H, ticketMode));

    // 左侧菱格鎏金票根编号
    const stubCx = STUB_W / 2 + 2;
    const numColor = !open ? COLORS.inkMuted : (fresh || !battleDone ? COLORS.roseDeep : COLORS.goldDeep);
    const numLabel = ch.id === 0 ? '序' : String(ch.id).padStart(2, '0');
    const num = ch.id === 0
      ? makeText(numLabel, 56, numColor, true)
      : makeNumText(numLabel, 64, numColor);
    num.anchor.set(0.5);
    num.position.set(stubCx, CARD_H / 2 - 14);
    card.addChild(num);

    const chap = makeText(ch.id === 0 ? 'PROLOGUE' : 'CHAPTER', 14, !open ? COLORS.inkMuted : COLORS.inkSoft, true);
    chap.style.letterSpacing = 1.8;
    chap.anchor.set(0.5, 0);
    chap.position.set(stubCx, CARD_H / 2 + 28);
    card.addChild(chap);

    // 右侧主票面内容区
    const x0 = STUB_W + 26;
    const right = w - 24;
    const title = makeText(ch.title, 29, open ? COLORS.ink : COLORS.inkSoft, true);
    title.position.set(x0, 20);
    card.addChild(title);

    // 右上角丝缎章节状态签
    if (open) {
      const isNew = fresh || !battleDone;
      const badgeW = 94;
      const badgeH = 32;
      const bx = right - badgeW;
      const by = 22;
      const badgeSpec = isNew
        ? { path: UI_SLICES.btnSmCoral, pad2x: 16, left2x: 88, top2x: 68, right2x: 88, bottom2x: 68 }
        : { path: UI_SLICES.btnSmGold, pad2x: 16, left2x: 92, top2x: 70, right2x: 92, bottom2x: 70 };
      const badgeSkin = createNineSlice2x(badgeSpec, badgeW, badgeH, false);
      badgeSkin.position.set(bx, by);
      const statusStr = !battleDone ? '待迎战' : fresh ? (seenCount === 0 ? '新章节' : '待看完') : '已通关';
      const tag = makeText(statusStr, 16, isNew ? 0xFFFFFF : COLORS.ink, true);
      if (isNew) {
        tag.style.stroke = 0x8C322B;
        tag.style.strokeThickness = 3.0;
        tag.style.lineJoin = 'round';
      }
      tag.anchor.set(0.5);
      tag.position.set(bx + badgeW / 2, by + badgeH / 2 - 0.5);
      card.addChild(badgeSkin, tag);
    }

    // 宿敌商战徽章（零 Emoji！使用糖果珐琅玫瑰贴纸）
    if (ch.rival) {
      const ry = 66;
      const rivalStr = battleDone
        ? `已打脸 · ${ch.rival.rivalName}`
        : `宿敌 · ${ch.rival.rivalName}`;
      const rivalTxt = makeText(rivalStr, 18, battleDone ? COLORS.goldDeep : COLORS.roseDeep, true);
      rivalTxt.position.set(x0, ry);
      card.addChild(rivalTxt);

      if (!battleDone) {
        const roseIco = makeStickerSprite(ICONS.currencyRose, 26, 26, true);
        roseIco.position.set(x0 + rivalTxt.width + 20, ry + 12);
        const bonusTxt = makeText(`+${ch.rival.roseReward}`, 18, COLORS.roseDeep, true);
        bonusTxt.position.set(x0 + rivalTxt.width + 35, ry);
        card.addChild(roseIco, bonusTxt);
      }
    }

    // 未解锁态：锁章贴纸 + 鲜明进度条
    if (!open) {
      const lock = makeStickerSprite(ICONS.lock, 34, 34, true);
      lock.position.set(x0 + 16, 114);
      const tip = makeText(`身价达到 ¥${formatMoney(ch.unlockNetWorth)} 解锁`, 20, COLORS.inkSoft, true);
      tip.position.set(x0 + 40, 101);
      card.addChild(lock, tip);

      if (showProgress) {
        const barW = right - x0;
        const bar = new ProgressBar(barW, 14, COLORS.rose, COLORS.roseSoft, 0.9);
        bar.progress = save.netWorth / ch.unlockNetWorth;
        bar.position.set(x0, 142);
        const pct = makeText(`¥${formatMoney(save.netWorth)} / ¥${formatMoney(ch.unlockNetWorth)}`, 16, COLORS.roseDeep, true);
        pct.position.set(x0, 160);
        card.addChild(bar, pct);
      }
      card.eventMode = 'static';
      card.on('pointertap', () => {
        if (this._scroll.dragging) return;
        AudioManager.play('ui_deny');
        ToastManager.show(`身价达到 ¥${formatMoney(ch.unlockNetWorth)} 解锁本章`);
      });
      return card;
    }

    // 已解锁态：@2x 丝缎分篇胶囊 (`第1篇`..`第4篇`) + 右侧阅读/迎战主按钮
    const chipY = CARD_H - 24 - EP_H / 2;
    const isSingle = ch.videos.length === 1;
    ch.videos.forEach((vid, i) => {
      const seen = save.watched.includes(vid);
      const cw = isSingle ? 138 : EP_W;
      const label = isSingle ? (seen ? '重温序章' : '阅读序章') : `第${i + 1}篇`;
      const chip = this._episodeCapsule(label, seen, cw);
      chip.position.set(x0 + cw / 2 + i * (EP_W + 10), chipY);
      chip.on('pointertap', () => {
        if (this._scroll.dragging) return;
        AudioManager.play('ui_click');
        void playStory(vid).then(() => this.rebuild());
      });
      card.addChild(chip);
    });

    if (!isSingle) {
      const ctaW = 152;
      const all = new Button({
        width: ctaW,
        height: 52,
        variant: !battleDone || fresh ? 'rose' : 'gold',
        fontSize: 20,
        label: !battleDone ? '迎战开启' : seenCount === 0 ? '从头阅读' : '阅读本章',
        onTap: () => {
          if (this._scroll.dragging) return;
          const from = ch.videos.findIndex((v) => !save.watched.includes(v));
          void playChapterFlow(ch, Math.max(0, from)).then(() => this.rebuild());
        },
      });
      all.position.set(right - ctaW / 2, chipY);
      card.addChild(all);
    }
    return card;
  }

  private _episodeCapsule(label: string, seen: boolean, w: number): PIXI.Container {
    const chip = new PIXI.Container();
    const spec = seen
      ? { path: UI_SLICES.pillEpDone, pad2x: 12, left2x: 48, top2x: 44, right2x: 48, bottom2x: 46 }
      : { path: UI_SLICES.pillEpNew, pad2x: 12, left2x: 48, top2x: 44, right2x: 48, bottom2x: 46 };
    chip.addChild(createNineSlice2x(spec, w, EP_H, true));

    const text = makeText(label, 18, seen ? COLORS.ink : 0xFFFFFF, true);
    if (!seen) {
      text.style.stroke = 0x8C322B;
      text.style.strokeThickness = 3.2;
      text.style.lineJoin = 'round';
    }
    text.anchor.set(0.5);
    text.position.set(0, -0.5);
    chip.addChild(text);

    chip.hitArea = new PIXI.Rectangle(-w / 2, -EP_H / 2, w, EP_H);
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

  /** 增量转生卡：第 8 章解锁后可开启新商业赛季 */
  private _buildPrestigeCard(w: number): PIXI.Container {
    const save = GameState.save;
    const ready = canPrestigeSeason(save);
    const nextSeason = (save.season ?? 1) + 1;
    const nextMult = (BALANCE.seasonBaseMult ** (nextSeason - 1)).toFixed(1);
    const c = new PIXI.Container();
    c.addChild(makeCouturePlaque(w, 184, ready, false));

    const crown = makeStickerSprite(ICONS.crown, 56, 56, true);
    crown.position.set(48, 50);

    const head = makeText(`跨城商业扩张 · 第 ${nextSeason} 季（海城篇）`, 25, COLORS.ink, true);
    head.position.set(84, 24);

    const desc = makeText(
      `全保留男主羁绊、玫瑰与剧情图鉴，重开产业享永久全局收益 ×${nextMult} 并获赠 15 朵心动玫瑰！`,
      19,
      COLORS.inkSoft,
      false,
    );
    desc.style.wordWrap = true;
    desc.style.wordWrapWidth = w - 236;
    desc.style.breakWords = true;
    desc.style.lineHeight = 29;
    desc.position.set(28, 76);
    c.addChild(crown, head, desc);

    const btn = new Button({
      width: 172,
      height: 68,
      variant: ready ? 'rose' : 'cream',
      fontSize: 21,
      label: ready ? '上市扩城' : '千亿开启',
      sub: ready ? `永久 ×${nextMult}` : '需第8章',
      onTap: () => {
        if (!ready) {
          ToastManager.show('身价达到 1000 亿成为云城首富后即可开启跨城新赛季！');
          return;
        }
        void showDialog({
          title: `开启第 ${nextSeason} 季 · 跨城扩张`,
          content: `确认带领晚星集团上市扩城吗？\n\n✦ 保留：所有男主羁绊、玫瑰、微聊与剧情图鉴\n✦ 重置：当前城市现金、门店与店员等级\n✦ 永久奖励：全商业帝国总收益 ×${nextMult}，并获赠心动玫瑰 +15！`,
          confirmText: '立即启程',
          cancelText: '再逛逛',
        }).then((ok) => {
          if (!ok) return;
          if (GameState.prestigeSeason()) {
            AudioManager.play('chapter_unlock');
            ToastManager.show(`✦ 步入第 ${nextSeason} 季！全帝国永久 ×${nextMult}`, 'success');
            this.close();
          }
        });
      },
    });
    btn.setEnabled(ready);
    btn.position.set(w - 108, 102);
    c.addChild(btn);
    return c;
  }
}
