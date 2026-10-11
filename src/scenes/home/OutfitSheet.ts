import * as PIXI from 'pixi.js';
import { outfitFigurePath } from '@/data/art';
import { OUTFITS } from '@/data/world';
import { GameState } from '@/managers/GameState';
import { formatMoney } from '@/sim/format';
import { Button } from '@/ui/Button';
import { Sheet } from '@/ui/Sheet';
import { COLORS, makeText, roundRect } from '@/ui/theme';
import { applyGray, gameTexture, isTextureReady, whenTextureReady } from '@/utils/assets';

const ROW_H = 180;
const THUMB_W = 110;

export class OutfitSheet extends Sheet {
  constructor() {
    super('衣橱', 0.72);
  }

  protected build(content: PIXI.Container, width: number): void {
    const save = GameState.save;
    OUTFITS.forEach((o, i) => {
      const open = save.netWorth >= o.unlockNetWorth;
      const row = new PIXI.Container();
      row.addChild(roundRect(width, ROW_H, 24, open ? COLORS.card : COLORS.cardMuted));

      const path = outfitFigurePath(o.id);
      const tex = gameTexture(path);
      if (isTextureReady(tex)) {
        const thumb = new PIXI.Sprite(tex);
        thumb.anchor.set(0.5, 1);
        thumb.scale.set(Math.min((ROW_H - 20) / tex.height, THUMB_W / tex.width));
        thumb.position.set(16 + THUMB_W / 2, ROW_H - 10);
        if (!open) {
          applyGray(thumb);
          thumb.alpha = 0.4;
        }
        row.addChild(thumb);
      } else {
        whenTextureReady(path, () => { if (this.isOpen) this.rebuild(); });
      }

      const textX = 32 + THUMB_W;
      const name = makeText(o.name, 28, open ? COLORS.ink : COLORS.inkSoft, true);
      name.position.set(textX, 44);
      const sub = makeText(open ? o.scene : `身价 ${formatMoney(o.unlockNetWorth)} 解锁`, 22, COLORS.inkSoft);
      sub.position.set(textX, 94);
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
