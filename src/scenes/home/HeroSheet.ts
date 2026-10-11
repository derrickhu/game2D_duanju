import * as PIXI from 'pixi.js';
import { heroPortraitPath } from '@/data/art';
import { BOND_LEVELS, MAX_BOND } from '@/data/balance';
import { HEROES, type HeroDef } from '@/data/story';
import { shopById } from '@/data/world';
import { ToastManager } from '@/core/ToastManager';
import { GameState } from '@/managers/GameState';
import { playStory } from '@/services/StoryService';
import { bondUpgradeCost } from '@/sim/economy';
import { formatMoney } from '@/sim/format';
import { bondBlockReason, effectiveBond, isVideoAdPending, isVideoUnlocked } from '@/sim/unlocks';
import { Button } from '@/ui/Button';
import { Sheet } from '@/ui/Sheet';
import { COLORS, makeText, roundRect } from '@/ui/theme';
import { applyGray, gameTexture, isTextureReady, whenTextureReady } from '@/utils/assets';

const ROW_H = 236;

export class HeroSheet extends Sheet {
  constructor() {
    super('男主');
  }

  protected build(content: PIXI.Container, width: number): void {
    let y = 0;
    for (const hero of HEROES) {
      const row = this._row(hero, width);
      row.y = y;
      content.addChild(row);
      y += ROW_H + 16;
    }
  }

  private _row(hero: HeroDef, width: number): PIXI.Container {
    const save = GameState.save;
    const bond = effectiveBond(save, hero.id);
    const met = bond > 0;
    const row = new PIXI.Container();
    row.addChild(roundRect(width, ROW_H, 24, met ? COLORS.card : COLORS.cardMuted));

    const frame = roundRect(120, 160, 18, met ? COLORS.goldLight : COLORS.disabled);
    frame.position.set(24, 24);
    row.addChild(frame);
    const path = heroPortraitPath(hero.id);
    const tex = gameTexture(path);
    if (isTextureReady(tex)) {
      const avatar = new PIXI.Sprite(tex);
      avatar.anchor.set(0.5);
      avatar.scale.set(Math.max(120 / tex.width, 160 / tex.height));
      avatar.position.set(84, 104);
      const mask = roundRect(120, 160, 18, COLORS.white);
      mask.position.set(24, 24);
      avatar.mask = mask;
      if (!met) {
        applyGray(avatar);
        avatar.alpha = 0.45;
      }
      row.addChild(mask, avatar);
    } else {
      whenTextureReady(path, () => { if (this.isOpen) this.rebuild(); });
    }

    const name = makeText(met ? `${hero.name} · ${hero.title}` : '？？？', 30, COLORS.ink, true);
    name.position.set(168, 24);
    row.addChild(name);

    const where = hero.shop ? `开${shopById(hero.shop).name}后相遇` : '主线剧情中登场';
    const stage = met ? `羁绊 ${BOND_LEVELS[bond - 1].stage}（${bond}/${MAX_BOND}）` : where;
    const stageText = makeText(stage, 22, COLORS.inkSoft);
    stageText.position.set(168, 70);
    row.addChild(stageText);

    hero.bondVideos.forEach((vid, i) => {
      const open = isVideoUnlocked(save, vid);
      const seen = save.watched.includes(vid);
      const chip = new Button({
        width: 64, height: 52, label: open ? (seen ? '✓' : '▶') : '锁',
        color: open ? (seen ? COLORS.inkSoft : COLORS.rose) : COLORS.disabled, fontSize: 24,
        onTap: () => { if (!this.dragging && open) void playStory(vid); },
      });
      chip.position.set(168 + 32 + i * 76, 132);
      row.addChild(chip);
    });

    const extraOpen = isVideoUnlocked(save, hero.extraVideo);
    const extraPending = isVideoAdPending(save, hero.extraVideo);
    const extra = new Button({
      width: 96, height: 52, label: '番外', fontSize: 24,
      color: extraOpen ? COLORS.roseDeep : extraPending ? COLORS.gold : COLORS.disabled,
      onTap: () => { if (!this.dragging) void playStory(hero.extraVideo).then(() => this.rebuild()); },
    });
    extra.position.set(168 + 48 + 5 * 76, 132);
    row.addChild(extra);

    const block = bondBlockReason(save, hero.id);
    if (hero.shop && met && !block) {
      const cost = bondUpgradeCost(hero.id, bond);
      const btn = new Button({
        width: width - 192, height: 40, label: `投资 ${formatMoney(cost)} → 收益 ×${BOND_LEVELS[bond].incomeMult}`, fontSize: 22,
        color: COLORS.gold,
        onTap: () => {
          if (this.dragging) return;
          if (!GameState.investBond(hero.id)) {
            ToastManager.show('钱还不够');
            return;
          }
          ToastManager.show(`与${hero.name}的关系更近了`, 'success');
          this.rebuild();
        },
      });
      btn.position.set(168 + (width - 192) / 2, 200);
      row.addChild(btn);
    } else if (met && block) {
      const tip = makeText(block, 22, COLORS.inkSoft);
      tip.position.set(168, 186);
      row.addChild(tip);
    }
    return row;
  }
}
