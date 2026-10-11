/**
 * 录用 / 升星弹窗：压暗背景 + 旋转光芒，店员全身立绘居中，下面名牌、台词气泡、收益和“开心收下”。
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
import { staffIncome, staffStar } from '@/sim/economy';
import { formatMoney } from '@/sim/format';
import { Button } from '@/ui/Button';
import { COLORS, drawGlass, drawStars, makeText } from '@/ui/theme';
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
    this.zIndex = 50;
    this._dim.eventMode = 'static';
    this._figure.anchor.set(0.5, 1);
    this.addChild(this._dim, this._rays, this._glow, this._figure, this._body);
    OverlayManager.container.addChild(this);
  }

  get isOpen(): boolean {
    return this._isOpen;
  }

  /** 录用传 star = 0；升星传新的星级 */
  show(id: StaffId, star: number, onDone?: () => void): void {
    this._id = id;
    this._isOpen = true;
    this._onDone = onDone ?? null;
    this.visible = true;
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
    TweenManager.to({ target: this, props: { alpha: 1 }, duration: 0.25, ease: Ease.easeOutQuad });

    if (!this._spin) {
      this._spin = () => { this._rays.rotation += Game.ticker.deltaMS * 0.00012; };
      Game.ticker.add(this._spin);
    }
  }

  private _pop(): void {
    const s = this._figure.scale.x;
    this._figure.scale.set(s * 0.82);
    TweenManager.to({ target: this._figure.scale, props: { x: s, y: s }, duration: 0.45, ease: Ease.easeOutBack });
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
      duration: 0.18,
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

    this._dim.clear().beginFill(0x0c0809, 0.93).drawRect(0, 0, W, H).endFill();

    const title = makeText(this._star === 0 ? '恭喜录用' : `升至 ★${this._star}`, 56, COLORS.champagne, true);
    title.style.letterSpacing = 8;
    title.style.dropShadow = true;
    title.style.dropShadowColor = COLORS.champagneDeep;
    title.style.dropShadowBlur = 16;
    title.style.dropShadowDistance = 0;
    title.anchor.set(0.5, 0);
    title.position.set(W / 2, top + 24);

    const btnY = bottom - 70;
    const bubbleH = 112;
    const bubbleY = btnY - 72 - 30 - bubbleH;
    const tagY = bubbleY - 84;
    const figBottom = tagY - 8;
    const figTop = top + 150;
    const cx = W / 2;
    const cy = figTop + (figBottom - figTop) * 0.42;

    const R = Math.min(W * 0.62, (figBottom - figTop) * 0.62);
    this._rays.clear().position.set(cx, cy);
    for (let i = 0; i < RAYS; i++) {
      const a = (i / RAYS) * Math.PI * 2;
      const da = Math.PI / RAYS / 2.2;
      this._rays.beginFill(COLORS.champagne, 0.045)
        .drawPolygon([0, 0, Math.cos(a - da) * R * 1.6, Math.sin(a - da) * R * 1.6, Math.cos(a + da) * R * 1.6, Math.sin(a + da) * R * 1.6])
        .endFill();
    }
    this._glow.clear();
    for (let i = 10; i > 0; i--) this._glow.beginFill(COLORS.champagne, 0.018).drawCircle(cx, cy, (R * i) / 10).endFill();
    this._glow.lineStyle(2, COLORS.champagne, 0.5).drawEllipse(cx, figBottom - 6, 170, 30);
    this._glow.lineStyle(1, COLORS.champagne, 0.25).drawEllipse(cx, figBottom - 6, 220, 40);

    const tex = this._figure.texture;
    this._figure.visible = isTextureReady(tex);
    if (this._figure.visible) {
      TweenManager.cancelTarget(this._figure.scale);
      this._figure.scale.set(Math.min((figBottom - figTop) / tex.height, (W * 0.7) / tex.width));
    }
    this._figure.position.set(cx, figBottom);

    for (const c of this._body.removeChildren()) c.destroy({ children: true });
    this._body.addChild(title);

    const stars = drawStars(new PIXI.Graphics(), star, MAX_STAR, 15, 8);
    stars.position.set(cx - (MAX_STAR * 30 + (MAX_STAR - 1) * 8) / 2 + 15, top + 116);
    this._body.addChild(stars);

    const name = makeText(staff.name, 34, COLORS.textOnGlass, true);
    const sub = makeText(`${staff.title} · ${shopById(staff.shop).name}`, 20, COLORS.textOnGlassSoft);
    const tagW = Math.max(name.width, sub.width) + 64;
    this._body.addChild(drawGlass(new PIXI.Graphics(), cx - tagW / 2, tagY, tagW, 76, 38, 0.72));
    name.anchor.set(0.5, 0);
    name.position.set(cx, tagY + 6);
    sub.anchor.set(0.5, 0);
    sub.position.set(cx, tagY + 46);
    this._body.addChild(name, sub);

    const bubble = new PIXI.Graphics();
    drawGlass(bubble, 48, bubbleY, W - 96, bubbleH, 28, 0.78);
    bubble.beginFill(COLORS.glass, 0.78).drawPolygon([cx - 14, bubbleY, cx + 14, bubbleY, cx, bubbleY - 14]).endFill();
    const line = makeText(`“${staff.lines[this._star === 0 ? 0 : 1]}”`, 26, COLORS.textOnGlass);
    line.style.wordWrap = true;
    line.style.wordWrapWidth = W - 160;
    line.style.breakWords = true;
    line.style.align = 'center';
    line.style.lineHeight = 38;
    line.anchor.set(0.5);
    line.position.set(cx, bubbleY + bubbleH / 2);
    this._body.addChild(bubble, line);

    const income = makeText(`店员收益  每秒 +${formatMoney(staffIncome(staff.id, level))}`, 26, COLORS.champagne, true);
    income.anchor.set(0.5);
    income.position.set(cx, btnY - 72);
    this._body.addChild(income);

    const btn = new Button({ width: 360, height: 84, variant: 'gold', label: '开心收下', fontSize: 32, onTap: () => this.close() });
    btn.position.set(cx, btnY);
    this._body.addChild(btn);
  }
}
