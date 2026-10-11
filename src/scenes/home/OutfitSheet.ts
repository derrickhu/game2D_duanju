import * as PIXI from 'pixi.js';
import { OUTFITS } from '@/data/world';
import { GameState } from '@/managers/GameState';
import { formatMoney } from '@/sim/format';
import { Button } from '@/ui/Button';
import { Sheet } from '@/ui/Sheet';
import { COLORS, makeText, roundRect } from '@/ui/theme';

const ROW_H = 120;

export class OutfitSheet extends Sheet {
  constructor() {
    super('衣橱', 0.6);
  }

  protected build(content: PIXI.Container, width: number): void {
    const save = GameState.save;
    OUTFITS.forEach((o, i) => {
      const open = save.netWorth >= o.unlockNetWorth;
      const row = new PIXI.Container();
      row.addChild(roundRect(width, ROW_H, 24, open ? COLORS.card : COLORS.cardMuted));
      const name = makeText(o.name, 28, open ? COLORS.ink : COLORS.inkSoft, true);
      name.position.set(28, 20);
      const sub = makeText(open ? o.scene : `身价 ${formatMoney(o.unlockNetWorth)} 解锁`, 22, COLORS.inkSoft);
      sub.position.set(28, 70);
      row.addChild(name, sub);
      if (open) {
        const wearing = save.outfit === o.id;
        const btn = new Button({
          width: 140, height: 64, label: wearing ? '穿着中' : '换上', fontSize: 26,
          color: wearing ? COLORS.inkSoft : COLORS.rose,
          onTap: () => {
            if (this.dragging || wearing) return;
            GameState.setOutfit(o.id);
            this.rebuild();
          },
        });
        btn.position.set(width - 98, ROW_H / 2);
        row.addChild(btn);
      }
      row.y = i * (ROW_H + 16);
      content.addChild(row);
    });
  }
}
