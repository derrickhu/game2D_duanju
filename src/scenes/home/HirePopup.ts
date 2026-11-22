/**
 * 店员录用 / 升星庆典弹窗（暖金樱花绽放样式）。
 */
import * as PIXI from 'pixi.js';
import { staffFigurePath } from '@/data/art';
import { MAX_STAR } from '@/data/balance';
import { staffById, type StaffId } from '@/data/staff';
import { shopById } from '@/data/world';
import { AudioManager } from '@/core/AudioManager';
import { Game } from '@/core/Game';
import { OverlayManager } from '@/core/OverlayManager';
import { Ease, TweenManager } from '@/core/TweenManager';
import { GameState } from '@/managers/GameState';
import { staffIncomeIn, staffStar } from '@/sim/economy';
import { formatMoney } from '@/sim/format';
import { Button } from '@/ui/Button';
import { COLORS, drawStars, makeCouturePlaque, makeStageNameplate, makeText } from '@/ui/theme';
import { gameTexture, isTextureReady, whenTextureReady } from '@/utils/assets';

const RAYS = 14;

export class HirePopup extends PIXI.Container {
  private readonly _dim = new PIXI.Graphics();
  private readonly _rays = new PIXI.Graphics();
  private readonly _glow = new PIXI.Graphics();
  private readonly _figure = new PIXI.Sprite(PIXI.Texture.EMPTY);
  private readonly _body = new PIXI.Container();
  private _id: StaffId | null = null;
  private _star = 0;
  private _isOpen = false;
  private _spin: (() => void) | null = null;
  private _onDone: (() => void) | null = null;

  constructor() {
    super();
    this.visible = false;
    this.zIndex = 110;
    this._dim.eventMode = 'static';
    this._figure.anchor.set(0.5, 1);
    this.addChild(this._dim, this._rays, this._glow, this._figure, this._body);
    OverlayManager.container.addChild(this);
  }

  get isOpen(): boolean {
    return this._isOpen;
  }

  show(id: StaffId, star: number, onDone?: () => void): void {
    this._id = id;
    this._isOpen = true;
    this._onDone = onDone ?? null;
    this.visible = true;
    OverlayManager.bringToFront();
    AudioManager.play(star === 0 ? 'meet_hero' : 'level_up');
    const path = staffFigurePath(id);
    this._figure.texture = gameTexture(path);
    this._star = star;
    this.relayout();
    if (isTextureReady(this._figure.texture)) this._pop();
    else whenTextureReady(path, () => {
      if (!this._isOpen || this._id !== id) return;
      this.relayout();
      this._pop();
    });

    TweenManager.cancelTarget(this);
    this.alpha = 0;
    TweenManager.to({ target: this, props: { alpha: 1 }, duration: 0.22, ease: Ease.easeOutQuad });

    if (!this._spin) {
      this._spin = () => { this._rays.rotation += Game.ticker.deltaMS * 0.00014; };
      Game.ticker.add(this._spin);
    }
  }

  private _pop(): void {
    const s = this._figure.scale.x;
    this._figure.scale.set(s * 0.84);
    TweenManager.to({ target: this._figure.scale, props: { x: s, y: s }, duration: 0.42, ease: Ease.easeOutBack });
  }

  close(silent = false): void {
    if (!this._isOpen) return;
    this._isOpen = false;
    if (this._spin) {
      Game.ticker.remove(this._spin);
      this._spin = null;
    }
    const done = this._onDone;
    this._onDone = null;
    if (silent) {
      this.visible = false;
      return;
    }
    TweenManager.to({
      target: this,
      props: { alpha: 0 },
      duration: 0.16,
      ease: Ease.easeInQuad,
      onComplete: () => { this.visible = false; this.alpha = 1; done?.(); },
    });
  }

  relayout(): void {
    if (!this._id) return;
    const W = Game.logicWidth;
    const H = Game.logicHeight;
    const top = Game.safeTop;
    const bottom = H - Game.safeBottom;
    const staff = staffById(this._id);
    const level = GameState.save.staff[this._id] ?? 1;
    const star = staffStar(level);

    this._dim.clear().beginFill(0x33271D, 0.62).drawRect(0, 0, W, H).endFill();

    const headStr = this._star === 0 ? '恭喜录用新成员' : `晋升 ★${this._star} 星级`;
    const title = makeText(headStr, 40, 0xFFEAA6, true);
    title.style.stroke = 0x5A412E;
    title.style.strokeThickness = 5;
    title.style.letterSpacing = 4;
    title.anchor.set(0.5, 0);
    title.position.set(W / 2, top + 26);

    const btnY = bottom - 68;
    const bubbleH = 116;
    const bubbleY = btnY - 70 - 28 - bubbleH;
    const tagY = bubbleY - 82;
    const figBottom = tagY - 8;
    const figTop = top + 146;
    const cx = W / 2;
    const cy = figTop + (figBottom - figTop) * 0.45;

    const R = Math.min(W * 0.62, (figBottom - figTop) * 0.62);
    this._rays.clear().position.set(cx, cy);
    for (let i = 0; i < RAYS; i++) {
      const a = (i / RAYS) * Math.PI * 2;
      const da = Math.PI / RAYS / 2.1;
      this._rays.beginFill(COLORS.goldLight, 0.08)
        .drawPolygon([0, 0, Math.cos(a - da) * R * 1.6, Math.sin(a - da) * R * 1.6, Math.cos(a + da) * R * 1.6, Math.sin(a + da) * R * 1.6])
        .endFill();
    }
    this._glow.clear();
    for (let i = 8; i > 0; i--) this._glow.beginFill(COLORS.roseSoft, 0.035).drawCircle(cx, cy, (R * i) / 8).endFill();
    this._glow.lineStyle(2, COLORS.borderGold, 0.7).drawEllipse(cx, figBottom - 6, 168, 28);

    const tex = this._figure.texture;
    this._figure.visible = isTextureReady(tex);
    if (this._figure.visible) {
      TweenManager.cancelTarget(this._figure.scale);
      this._figure.scale.set(Math.min((figBottom - figTop) / tex.height, (W * 0.68) / tex.width));
    }
    this._figure.position.set(cx, figBottom);

    for (const c of this._body.removeChildren()) c.destroy({ children: true });
    this._body.addChild(title);

    const stars = drawStars(new PIXI.Graphics(), star, MAX_STAR, 14, 8);
    stars.position.set(cx - (MAX_STAR * 28 + (MAX_STAR - 1) * 8) / 2 + 14, top + 108);
    this._body.addChild(stars);

    const name = makeText(staff.name, 32, COLORS.ink, true);
    const sub = makeText(`${staff.title} · ${shopById(staff.shop).name}`, 19, COLORS.roseDeep, true);
    const tagW = Math.max(name.width, sub.width) + 80;
    const plate = makeStageNameplate(tagW, 78, false);
    plate.position.set(cx - tagW / 2, tagY);
    this._body.addChild(plate);
    name.anchor.set(0.5, 0);
    name.position.set(cx, tagY + 8);
    sub.anchor.set(0.5, 0);
    sub.position.set(cx, tagY + 46);
    this._body.addChild(name, sub);

    const bubble = makeCouturePlaque(W - 96, bubbleH, false, false);
    bubble.position.set(48, bubbleY);
    const line = makeText(`“${staff.lines[this._star === 0 ? 0 : 1]}”`, 24, COLORS.ink);
    line.style.wordWrap = true;
    line.style.wordWrapWidth = W - 160;
    line.style.breakWords = true;
    line.style.align = 'center';
    line.style.lineHeight = 36;
    line.anchor.set(0.5);
    line.position.set(cx, bubbleY + bubbleH / 2);
    this._body.addChild(bubble, line);

    const extraTip = this._star === 3 || this._star === 5 ? '  ·  ✦ 新拍立得卡面已解锁' : '';
    const income = makeText(`店员产出 +¥${formatMoney(staffIncomeIn(GameState.save, staff.id, level))}/秒${extraTip}`, 22, COLORS.champagne, true);
    income.anchor.set(0.5);
    income.position.set(cx, btnY - 66);
    this._body.addChild(income);

    const btn = new Button({ width: 340, height: 80, variant: 'rose', label: '✦ 开心收下', fontSize: 28, onTap: () => this.close() });
    btn.position.set(cx, btnY);
    this._body.addChild(btn);
  }
}
