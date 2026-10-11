import * as PIXI from 'pixi.js';
import { heroForShop } from '@/data/story';
import { AREAS, SHOPS, type ShopDef } from '@/data/world';
import { AudioManager } from '@/core/AudioManager';
import { ToastManager } from '@/core/ToastManager';
import { GameState } from '@/managers/GameState';
import { shopIncome, shopUpgradeCost } from '@/sim/economy';
import { formatMoney } from '@/sim/format';
import { isShopUnlocked } from '@/sim/unlocks';
import { Button } from '@/ui/Button';
import { Sheet } from '@/ui/Sheet';
import { COLORS, makeText, roundRect } from '@/ui/theme';

const ROW_H = 132;

export class ShopSheet extends Sheet {
  private _buttons: { shop: ShopDef; btn: Button }[] = [];

  constructor() {
    super('产业');
  }

  /** 钱变化时只刷新按钮可用状态，不重建列表 */
  refreshAffordable(): void {
    if (!this.isOpen) return;
    const money = GameState.save.money;
    for (const { shop, btn } of this._buttons) {
      btn.setEnabled(money >= shopUpgradeCost(shop.id, GameState.save.shops[shop.id] ?? 0));
    }
  }

  protected build(content: PIXI.Container, width: number): void {
    this._buttons = [];
    const save = GameState.save;
    let y = 0;
    for (const area of AREAS) {
      const shops = SHOPS.filter((s) => s.area === area.id);
      const areaOpen = save.netWorth >= area.unlockNetWorth;
      const header = makeText(areaOpen ? area.name : `${area.name}（身价 ${formatMoney(area.unlockNetWorth)} 解锁）`, 28, areaOpen ? COLORS.roseDeep : COLORS.inkSoft, true);
      header.y = y;
      content.addChild(header);
      y += 52;
      for (const shop of shops) {
        const row = this._row(shop, width);
        row.y = y;
        content.addChild(row);
        y += ROW_H + 16;
      }
      y += 12;
    }
    this.refreshAffordable();
  }

  private _row(shop: ShopDef, width: number): PIXI.Container {
    const save = GameState.save;
    const row = new PIXI.Container();
    const unlocked = isShopUnlocked(save, shop.id);
    row.addChild(roundRect(width, ROW_H, 24, unlocked ? COLORS.card : COLORS.cardMuted));

    const level = save.shops[shop.id] ?? 0;
    const hero = heroForShop(shop.id);
    const bond = hero ? save.bonds[hero.id] ?? 0 : 0;
    const name = makeText(level > 0 ? `${shop.name}  Lv.${level}` : shop.name, 30, COLORS.ink, true);
    name.position.set(28, 22);
    row.addChild(name);

    let detail: string;
    if (!unlocked) detail = `身价 ${formatMoney(shop.unlockNetWorth)} 解锁`;
    else if (level === 0) detail = `每秒 +${formatMoney(shopIncome(shop.id, 1, bond))}${hero ? `  ·  在这里会遇见${hero.name}` : ''}`;
    else detail = `每秒 ${formatMoney(shopIncome(shop.id, level, bond))}  →  ${formatMoney(shopIncome(shop.id, level + 1, bond))}`;
    const sub = makeText(detail, 22, COLORS.inkSoft);
    sub.position.set(28, 74);
    row.addChild(sub);

    if (unlocked) {
      const cost = shopUpgradeCost(shop.id, level);
      const btn = new Button({
        width: 176, height: 88, label: level === 0 ? '开店' : '升级', sub: formatMoney(cost),
        color: level === 0 ? COLORS.gold : COLORS.rose, fontSize: 28,
        onTap: () => {
          if (this.dragging) return;
          const r = GameState.buyShop(shop.id, 1);
          if (!r) {
            ToastManager.show('钱还不够');
            return;
          }
          AudioManager.play('coin_spend');
          this.rebuild();
        },
      });
      btn.position.set(width - 112, ROW_H / 2);
      row.addChild(btn);
      this._buttons.push({ shop, btn });
    }
    return row;
  }
}
