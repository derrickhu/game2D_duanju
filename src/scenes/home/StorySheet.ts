import * as PIXI from 'pixi.js';
import { CHAPTERS } from '@/data/story';
import { GameState } from '@/managers/GameState';
import { playStory, playStorySequence } from '@/services/StoryService';
import { formatMoney } from '@/sim/format';
import { isVideoUnlocked } from '@/sim/unlocks';
import { Button } from '@/ui/Button';
import { Sheet } from '@/ui/Sheet';
import { COLORS, makeText, roundRect } from '@/ui/theme';

const ROW_H = 168;

export class StorySheet extends Sheet {
  constructor() {
    super('剧情');
  }

  protected build(content: PIXI.Container, width: number): void {
    const save = GameState.save;
    let y = 0;
    for (const ch of CHAPTERS) {
      const open = save.netWorth >= ch.unlockNetWorth;
      const row = new PIXI.Container();
      row.addChild(roundRect(width, ROW_H, 24, open ? COLORS.card : COLORS.cardMuted));
      const title = makeText(ch.id === 0 ? ch.title : `第 ${ch.id} 章 · ${ch.title}`, 30, open ? COLORS.ink : COLORS.inkSoft, true);
      title.position.set(28, 22);
      row.addChild(title);

      if (!open) {
        const tip = makeText(`身价达到 ${formatMoney(ch.unlockNetWorth)} 解锁`, 22, COLORS.inkSoft);
        tip.position.set(28, 76);
        row.addChild(tip);
      } else {
        ch.videos.forEach((vid, i) => {
          const seen = save.watched.includes(vid);
          const chip = new Button({
            width: 88, height: 60, label: `${i + 1}`, fontSize: 26,
            color: seen ? COLORS.inkSoft : COLORS.rose,
            onTap: () => { if (!this.dragging && isVideoUnlocked(save, vid)) void playStory(vid).then(() => this.rebuild()); },
          });
          chip.position.set(28 + 44 + i * 104, 110);
          row.addChild(chip);
        });
        const all = new Button({
          width: 150, height: 60, label: '连续观看', fontSize: 24, color: COLORS.gold,
          onTap: () => { if (!this.dragging) void playStorySequence(ch.videos).then(() => this.rebuild()); },
        });
        all.position.set(width - 103, 110);
        row.addChild(all);
      }
      row.y = y;
      content.addChild(row);
      y += ROW_H + 16;
    }
  }
}
