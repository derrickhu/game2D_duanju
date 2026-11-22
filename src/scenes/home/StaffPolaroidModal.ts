/**
 * 店员 ★3「工作瞬间」与 ★5「专属私藏」高定拍立得典藏卡弹窗。
 * 在星夜黑金遮罩上悬浮象牙白实体相纸拍立得，形成强烈画廊级反差质感。
 */
import * as PIXI from 'pixi.js';
import { staffFigurePath } from '@/data/art';
import { MAX_STAR } from '@/data/balance';
import { staffById, staffPolaroidPath, type StaffId } from '@/data/staff';
import { shopById } from '@/data/world';
import { AudioManager } from '@/core/AudioManager';
import { Game } from '@/core/Game';
import { OverlayManager } from '@/core/OverlayManager';
import { Ease, TweenManager } from '@/core/TweenManager';
import { GameState } from '@/managers/GameState';
import { Button } from '@/ui/Button';
import { COLORS, drawStars, makeText, verticalGradientTexture } from '@/ui/theme';
import { gameTexture, isTextureFailed, isTextureReady, showFigure, whenTextureReady } from '@/utils/assets';

const PAPER_BG = 0xFAF6F0;
const PAPER_INK = 0x2B2027;
const PAPER_SOFT = 0x6E5B64;
const PAPER_ROSE = 0x9E3955;

class StaffPolaroidModalClass extends PIXI.Container {
  private readonly _dim = new PIXI.Graphics();
  private readonly _frame = new PIXI.Container();
  private _isOpen = false;

  constructor() {
    super();
    this.visible = false;
    this.zIndex = 120;
    this._dim.eventMode = 'static';
    this._dim.on('pointertap', () => this.close());
    this._frame.eventMode = 'static';
    this.addChild(this._dim, this._frame);
    OverlayManager.container.addChild(this);
  }

  show(id: StaffId, slot: 1 | 2): void {
    this._isOpen = true;
    this.visible = true;
    OverlayManager.bringToFront();
    AudioManager.play('item_reveal');
    GameState.markWatched(`staff_${id}_${slot}`);
    this._build(id, slot);

    this.alpha = 0;
    this._frame.scale.set(0.86);
    this._frame.rotation = slot === 1 ? -0.045 : 0.045;
    TweenManager.cancelTarget(this);
    TweenManager.cancelTarget(this._frame.scale);
    TweenManager.cancelTarget(this._frame);
    TweenManager.to({ target: this, props: { alpha: 1 }, duration: 0.18, ease: Ease.easeOutQuad });
    TweenManager.to({ target: this._frame.scale, props: { x: 1, y: 1 }, duration: 0.30, ease: Ease.easeOutBack });
    TweenManager.to({ target: this._frame, props: { rotation: slot === 1 ? -0.014 : 0.014 }, duration: 0.32, ease: Ease.easeOutQuad });
  }

  close(): void {
    if (!this._isOpen) return;
    this._isOpen = false;
    AudioManager.play('ui_close');
    TweenManager.to({
      target: this,
      props: { alpha: 0 },
      duration: 0.15,
      ease: Ease.easeInQuad,
      onComplete: () => { if (!this._isOpen) this.visible = false; },
    });
  }

  private _build(id: StaffId, slot: 1 | 2): void {
    for (const c of this._frame.removeChildren()) c.destroy({ children: true });
    const W = Game.logicWidth;
    const H = Game.logicHeight;
    this._dim.clear().beginFill(0x33271D, 0.56).drawRect(0, 0, W, H).endFill();

    const staff = staffById(id);
    const shop = shopById(staff.shop);
    const p = staff.polaroids[slot - 1];
    const fw = 612;
    const fh = 932;
    this._frame.position.set(W / 2, H / 2 - 10);

    // 拍立得实体特种纹相纸外框 + 香槟金细镶边
    const paper = new PIXI.Graphics();
    paper.beginFill(0x000000, 0.45).drawRoundedRect(-fw / 2 + 6, -fh / 2 + 16, fw, fh, 20).endFill();
    paper.lineStyle(2, COLORS.borderGold, 0.88)
      .beginFill(PAPER_BG, 0.99)
      .drawRoundedRect(-fw / 2, -fh / 2, fw, fh, 18)
      .endFill();
    this._frame.addChild(paper);

    // 相片内窗
    const pw = fw - 52;
    const ph = 528;
    const px = -pw / 2;
    const py = -fh / 2 + 26;
    const photoBg = new PIXI.Sprite(
      slot === 1
        ? verticalGradientTexture(0xF8ECE2, 0xF3DCE5, 0xE8CCD8, 64)
        : verticalGradientTexture(0x1E162B, 0x452A44, 0xD89DB0, 64),
    );
    photoBg.position.set(px, py);
    photoBg.width = pw;
    photoBg.height = ph;
    const photoMask = new PIXI.Graphics().beginFill(0xffffff).drawRoundedRect(px, py, pw, ph, 12).endFill();
    photoBg.mask = photoMask;
    this._frame.addChild(photoBg, photoMask);

    const customPath = staffPolaroidPath(id, slot);
    const fig = new PIXI.Sprite();
    const figMask = new PIXI.Graphics().beginFill(0xffffff).drawRoundedRect(px, py, pw, ph, 12).endFill();
    fig.mask = figMask;
    this._frame.addChild(figMask, fig);

    const renderFallbackFigure = (): void => {
      fig.anchor.set(0.5, 1);
      fig.position.set(0, py + ph + 185);
      showFigure(fig, staffFigurePath(id), pw * 0.95, ph + 175, undefined, 'height');
    };
    if (!isTextureFailed(customPath)) {
      const tex = gameTexture(customPath);
      if (isTextureReady(tex)) {
        fig.texture = tex;
        fig.anchor.set(0.5);
        fig.position.set(0, py + ph / 2);
        fig.scale.set(Math.max(pw / tex.width, ph / tex.height));
      } else {
        renderFallbackFigure();
        whenTextureReady(customPath, () => {
          if (this._isOpen && isTextureReady(gameTexture(customPath))) this._build(id, slot);
        });
      }
    } else {
      renderFallbackFigure();
    }

    // 相片细金内框 + 左上星级角标
    const innerRim = new PIXI.Graphics()
      .lineStyle(1.2, COLORS.borderGold, 0.55)
      .drawRoundedRect(px, py, pw, ph, 12);
    const tagBg = new PIXI.Graphics()
      .lineStyle(1.4, 0xFFF3DE, 0.9)
      .beginFill(0xDF6D3C, 0.92)
      .drawRoundedRect(px + 14, py + 14, 156, 34, 17)
      .endFill();
    const tagTxt = makeText(p.tag, 18, 0xFFFDF9, true);
    tagTxt.anchor.set(0.5);
    tagTxt.position.set(px + 92, py + 31);
    this._frame.addChild(innerRim, tagBg, tagTxt);

    // 拍立得下半部分手写签注区
    let y = py + ph + 22;
    const nameTxt = makeText(`${staff.name} · ${staff.title}`, 28, PAPER_INK, true);
    nameTxt.position.set(px + 6, y);
    this._frame.addChild(nameTxt);

    const stars = drawStars(new PIXI.Graphics(), slot === 1 ? 3 : MAX_STAR, MAX_STAR, 10, 5);
    stars.position.set(-px - 128, y + 16);
    this._frame.addChild(stars);
    y += 44;

    const sceneTxt = makeText(p.scene, 19, PAPER_SOFT);
    sceneTxt.style.wordWrap = true;
    sceneTxt.style.wordWrapWidth = pw - 12;
    sceneTxt.style.breakWords = true;
    sceneTxt.style.lineHeight = 28;
    sceneTxt.position.set(px + 6, y);
    this._frame.addChild(sceneTxt);
    y += sceneTxt.height + 14;

    const quoteBox = new PIXI.Graphics()
      .lineStyle(1, 0xE2D0C8, 0.9)
      .beginFill(0xF3EAE3, 0.88)
      .drawRoundedRect(px, y, pw, 104, 14)
      .endFill();
    const quoteTxt = makeText(`“${p.quote}”`, 21, PAPER_ROSE, true);
    quoteTxt.style.wordWrap = true;
    quoteTxt.style.wordWrapWidth = pw - 36;
    quoteTxt.style.breakWords = true;
    quoteTxt.style.lineHeight = 30;
    quoteTxt.position.set(px + 18, y + 14);
    const noteTxt = makeText(`${shop.name}  ${p.note}`, 17, PAPER_SOFT, true);
    noteTxt.anchor.set(1, 1);
    noteTxt.position.set(px + pw - 18, y + 94);
    this._frame.addChild(quoteBox, quoteTxt, noteTxt);

    const okBtn = new Button({
      width: 268,
      height: 62,
      variant: 'rose',
      fontSize: 23,
      label: '珍藏收下 ✦',
      onTap: () => this.close(),
    });
    okBtn.position.set(0, fh / 2 - 48);
    this._frame.addChild(okBtn);
  }
}

export const StaffPolaroidModal = new StaffPolaroidModalClass();
