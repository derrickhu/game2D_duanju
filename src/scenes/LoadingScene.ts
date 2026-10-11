import * as PIXI from 'pixi.js';
import type { Scene } from '@/core/SceneManager';
import { Game } from '@/core/Game';
import { ProgressBar } from '@/ui/ProgressBar';
import { COLORS, makeText } from '@/ui/theme';

/** Loading 图（boot/loading.jpg）到位前先用纯色 + 标题。 */
export class LoadingScene implements Scene {
  readonly name = 'loading';
  readonly container = new PIXI.Container();
  private readonly _bg = new PIXI.Graphics();
  private readonly _title = makeText('被退婚那天\n我开始身价暴涨', 64, COLORS.roseDeep, true);
  private readonly _tip = makeText('正在加载…', 26, COLORS.inkSoft);
  private readonly _bar = new ProgressBar(460, 18, COLORS.gold);

  constructor() {
    this._title.anchor.set(0.5);
    this._title.style.align = 'center';
    this._title.style.lineHeight = 92;
    this._tip.anchor.set(0.5);
    this.container.addChild(this._bg, this._title, this._bar, this._tip);
  }

  onEnter(): void {
    this.relayout();
  }

  relayout(): void {
    const W = Game.logicWidth;
    const H = Game.logicHeight;
    this._bg.clear().beginFill(COLORS.bg).drawRect(0, 0, W, H).endFill();
    this._title.position.set(W / 2, H * 0.38);
    this._bar.position.set((W - 460) / 2, H * 0.72);
    this._tip.position.set(W / 2, H * 0.72 + 52);
  }

  setProgress(p: number): void {
    this._bar.progress = p;
    this._tip.text = `正在加载… ${Math.round(p * 100)}%`;
  }
}
