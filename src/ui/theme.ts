import * as PIXI from 'pixi.js';
import { UI_SLICES } from '@/data/art';
import { gameTexture, isTextureReady, whenTextureReady } from '@/utils/assets';
import { drawDiamondStar } from './EditorialIcons';

/**
 * v7「暖奶油香槟柔光 · 雕金丝缎 + 2.5x 视网膜锐利排版」视觉系统：
 * - 所有面板、票根、铭牌、货币条统一使用带底托高光、内缩丝线与四角星芒的 @2x 九宫格切片；
 * - 所有文字强制 2.5x 超采样渲染，禁用 <15px 微小字与廉价系统 Emoji，正文采用浓郁深可可色 (#4A3423)。
 */
export const COLORS = {
  bg: 0xFBF3E4,
  bgMid: 0xF7EBD6,
  bgDeep: 0xEFE0C6,

  card: 0xFFFDF9,
  cardWarm: 0xFCF3E3,
  cardBlush: 0xFFF3EC,
  cardMuted: 0xEAE1D4,

  borderSoft: 0xE4D1B5,
  borderGold: 0xDFB870,
  shadow: 0x6E4F28,

  rose: 0xE46C5E,
  roseDeep: 0xC64F3D,
  roseSoft: 0xFDE6DE,
  gold: 0xEBB958,
  goldDeep: 0x9E601B,
  goldLight: 0xFFF6DC,
  mint: 0x349E5A,
  coral: 0xDA6E3B,

  ink: 0x4A3423,
  inkSoft: 0x7D644E,
  inkMuted: 0xA48E78,
  disabled: 0xDFD6CA,
  disabledText: 0x918375,
  white: 0xFFFDF9,

  mask: 0x33271D,
  noirBg: 0x1A0F15,
  noirCard: 0x2B1722,
  noirBorder: 0xB85A74,
  glass: 0xFFFDF9,
  champagne: 0xF7DD9B,
  champagneDeep: 0xC68C3A,
  textOnGlass: 0xFAF4EC,
  textOnGlassSoft: 0xCFC2CE,
} as const;

export const FONT = 'PingFang SC, Hiragino Sans GB, STHeitiSC-Medium, Microsoft YaHei, sans-serif';
export const FONT_NUM = 'Avenir Next, PingFang SC, Hiragino Sans GB, sans-serif';

export const GLASS_ALPHA = 0.95;

const gradCache = new Map<string, PIXI.Texture>();

function unpackRgb(hex: number): [number, number, number] {
  return [(hex >> 16) & 0xff, (hex >> 8) & 0xff, hex & 0xff];
}

export function verticalGradientTexture(topHex: number, midHex: number, botHex: number, h = 128): PIXI.Texture {
  const key = `${topHex.toString(16)}_${midHex.toString(16)}_${botHex.toString(16)}_${h}`;
  const hit = gradCache.get(key);
  if (hit) return hit;

  const w = 4;
  const pixels = new Uint8Array(w * h * 4);
  const [r1, g1, b1] = unpackRgb(topHex);
  const [r2, g2, b2] = unpackRgb(midHex);
  const [r3, g3, b3] = unpackRgb(botHex);

  for (let y = 0; y < h; y++) {
    const t = y / Math.max(1, h - 1);
    let r: number;
    let g: number;
    let b: number;
    if (t < 0.5) {
      const k = t * 2;
      r = r1 + (r2 - r1) * k;
      g = g1 + (g2 - g1) * k;
      b = b1 + (b2 - b1) * k;
    } else {
      const k = (t - 0.5) * 2;
      r = r2 + (r3 - r2) * k;
      g = g2 + (g3 - g2) * k;
      b = b2 + (b3 - b2) * k;
    }
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      pixels[idx] = Math.round(r);
      pixels[idx + 1] = Math.round(g);
      pixels[idx + 2] = Math.round(b);
      pixels[idx + 3] = 255;
    }
  }
  const tex = new PIXI.Texture(PIXI.BaseTexture.fromBuffer(pixels, w, h));
  gradCache.set(key, tex);
  return tex;
}

export interface NineSlice2xSpec {
  path: string;
  pad2x: number;
  left2x: number;
  top2x: number;
  right2x: number;
  bottom2x: number;
}

export function createNineSlice2x(
  spec: NineSlice2xSpec,
  w1x: number,
  h1x: number,
  centered = false,
): PIXI.Container {
  const wrap = new PIXI.Container();
  const build = (): void => {
    if (wrap.destroyed) return;
    for (const c of wrap.removeChildren()) c.destroy();
    const tex = gameTexture(spec.path);
    if (!isTextureReady(tex)) return;

    const plane = new PIXI.NineSlicePlane(tex, spec.left2x, spec.top2x, spec.right2x, spec.bottom2x);
    const targetW2 = Math.max(1, w1x * 2 + spec.pad2x * 2);
    const targetH2 = Math.max(1, h1x * 2 + spec.pad2x * 2);
    const minW2 = spec.left2x + spec.right2x + 2;
    const minH2 = spec.top2x + spec.bottom2x + 2;

    const drawW2 = Math.max(minW2, targetW2);
    const drawH2 = Math.max(minH2, targetH2);
    plane.width = drawW2;
    plane.height = drawH2;

    const sx = 0.5 * (targetW2 / drawW2);
    const sy = 0.5 * (targetH2 / drawH2);
    plane.scale.set(sx, sy);

    const pad1xX = spec.pad2x * sx;
    const pad1xY = spec.pad2x * sy;
    if (centered) {
      plane.position.set(-w1x / 2 - pad1xX, -h1x / 2 - pad1xY);
    } else {
      plane.position.set(-pad1xX, -pad1xY);
    }
    wrap.addChild(plane);
  };

  const tex = gameTexture(spec.path);
  if (isTextureReady(tex)) build();
  else whenTextureReady(spec.path, build);
  return wrap;
}

export function makeStickerSprite(path: string, w1x: number, h1x = w1x, centered = true): PIXI.Sprite {
  const sp = new PIXI.Sprite(PIXI.Texture.EMPTY);
  if (centered) sp.anchor.set(0.5);
  const fit = (): void => {
    if (sp.destroyed) return;
    const tex = gameTexture(path);
    if (!isTextureReady(tex)) return;
    sp.texture = tex;
    const s = Math.min(w1x / tex.width, h1x / tex.height);
    sp.scale.set(s);
    sp.visible = true;
  };
  sp.visible = false;
  const tex = gameTexture(path);
  if (isTextureReady(tex)) fit();
  else whenTextureReady(path, fit);
  return sp;
}

/** 高定双金线柔光雕花牌（带底托立体唇边、内缩细金框与四角星芒） */
export function makeCouturePlaque(w1x: number, h1x: number, blush = false, centered = false): PIXI.Container {
  return createNineSlice2x(
    {
      path: blush ? UI_SLICES.cardCoutureBlush : UI_SLICES.cardCouturePlaque,
      pad2x: 16,
      left2x: 72,
      top2x: 72,
      right2x: 72,
      bottom2x: 76,
    },
    w1x,
    h1x,
    centered,
  );
}

/** 菱格暗纹香槟金丝缎横幅铭牌 */
export function makeRibbonBanner(w1x: number, h1x = 52, centered = false): PIXI.Container {
  return createNineSlice2x(
    { path: UI_SLICES.bannerRibbonGold, pad2x: 14, left2x: 112, top2x: 56, right2x: 112, bottom2x: 56 },
    w1x,
    h1x,
    centered,
  );
}

/** 展示舞台底部珠光双金线铭牌框 */
export function makeStageNameplate(w1x: number, h1x = 84, centered = false): PIXI.Container {
  return createNineSlice2x(
    { path: UI_SLICES.tagStageGlass, pad2x: 14, left2x: 108, top2x: 72, right2x: 108, bottom2x: 72 },
    w1x,
    h1x,
    centered,
  );
}

/** 电影票根式章节卡片（左侧 124px 菱格鎏金副券 + 半圆齿孔虚线 + 右侧白瓷内框） */
export function makeChapterTicket(
  w1x: number,
  h1x: number,
  mode: 'open' | 'fresh' | 'locked' = 'open',
): PIXI.Container {
  const path = mode === 'fresh'
    ? UI_SLICES.cardChapterFresh
    : mode === 'locked'
      ? UI_SLICES.cardChapterLocked
      : UI_SLICES.cardChapterTicket;
  return createNineSlice2x(
    { path, pad2x: 16, left2x: 312, top2x: 84, right2x: 84, bottom2x: 88 },
    w1x,
    h1x,
    false,
  );
}

/** 男主页 2×3 记忆典藏小印章卡 */
export function makeMemoryStamp(
  w1x: number,
  h1x: number,
  mode: 'open' | 'fresh' | 'gold' | 'locked' = 'open',
  centered = false,
): PIXI.Container {
  const path = mode === 'gold'
    ? UI_SLICES.cardMemoryGold
    : mode === 'fresh'
      ? UI_SLICES.cardMemoryFresh
      : mode === 'locked'
        ? UI_SLICES.cardMemoryLocked
        : UI_SLICES.cardMemoryOpen;
  return createNineSlice2x(
    { path, pad2x: 12, left2x: 64, top2x: 74, right2x: 64, bottom2x: 64 },
    w1x,
    h1x,
    centered,
  );
}

export function drawLuxuryPageBg(container: PIXI.Container, w: number, h: number, dark = false): void {
  for (const c of container.removeChildren()) c.destroy();
  const sprite = new PIXI.Sprite(
    dark
      ? verticalGradientTexture(0x211119, 0x2F1824, 0x170B11, 128)
      : verticalGradientTexture(0xFFFDF8, 0xFBF2E1, 0xF5E5CB, 128),
  );
  sprite.width = w;
  sprite.height = h;
  container.addChild(sprite);

  const deco = new PIXI.Graphics();
  if (dark) {
    deco.beginFill(0xB84A69, 0.09).drawCircle(w * 0.82, h * 0.16, w * 0.45).endFill();
    deco.beginFill(COLORS.champagne, 0.04).drawCircle(w * 0.18, h * 0.76, w * 0.38).endFill();
  } else {
    deco.beginFill(0xFCE4BE, 0.45).drawCircle(w * 0.5, h * 0.06, w * 0.58).endFill();
    deco.beginFill(0xFFE6A3, 0.34).drawCircle(78, 136, 26).endFill();
    deco.beginFill(0xFFE6A3, 0.22).drawCircle(142, 148, 38).endFill();
    deco.beginFill(0xFFE6A3, 0.26).drawCircle(w - 64, h * 0.68, 30).endFill();
    deco.beginFill(0xFFD6C9, 0.20).drawCircle(w * 0.86, h * 0.28, w * 0.28).endFill();
    drawDiamondStar(deco, 34, 178, 6.5, 0xDFB87A, 0.75);
    drawDiamondStar(deco, w - 34, h * 0.64, 6.5, 0xDFB87A, 0.75);
  }
  container.addChild(deco);
}

export function makeOrnatePanel(w: number, h: number, alpha = 1): PIXI.Container {
  const wrap = new PIXI.Container();
  wrap.alpha = alpha;

  const shell = createNineSlice2x(
    { path: UI_SLICES.modalCreamShell, pad2x: 36, left2x: 96, top2x: 96, right2x: 96, bottom2x: 96 },
    w,
    h,
    false,
  );
  wrap.addChild(shell);

  if (h >= 180 && w >= 260) {
    const header = createNineSlice2x(
      { path: UI_SLICES.modalPeachHeader, pad2x: 0, left2x: 160, top2x: 56, right2x: 80, bottom2x: 40 },
      w - 6,
      80,
      false,
    );
    header.position.set(3, 3);
    wrap.addChild(header);
  }
  return wrap;
}

export function makeRibbonHeader(titleStr: string, width = 480): PIXI.Container {
  const wrap = new PIXI.Container();
  const pw = Math.min(width, 520);

  const g = new PIXI.Graphics();
  drawDiamondStar(g, -pw * 0.34, 28, 5.5, 0xDFB478, 0.92);
  drawDiamondStar(g, -pw * 0.34 - 14, 28, 3.8, 0xDFB478, 0.72);
  drawDiamondStar(g, pw * 0.34, 28, 5.5, 0xDFB478, 0.92);
  drawDiamondStar(g, pw * 0.34 + 14, 28, 3.8, 0xDFB478, 0.72);
  wrap.addChild(g);

  const text = makeText(titleStr, 29, COLORS.ink, true);
  text.style.letterSpacing = 2;
  text.anchor.set(0.5);
  text.y = 28;
  if (text.width > pw - 110) text.scale.set((pw - 110) / text.width);
  wrap.addChild(text);

  return wrap;
}

/**
 * 兜底矢量暖奶白双线立体卡片（增加底部香槟立体唇边与内缩白丝圈，即使小尺寸矢量块也具温润瓷感）
 */
export function drawCreamCard(
  g: PIXI.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  opts?: { fill?: number; alpha?: number; borderColor?: number; borderWidth?: number; shadow?: boolean },
): PIXI.Graphics {
  const fill = opts?.fill ?? COLORS.card;
  const alpha = opts?.alpha ?? 0.98;
  const borderColor = opts?.borderColor ?? COLORS.borderGold;
  const borderWidth = opts?.borderWidth ?? 1.5;
  const shadow = opts?.shadow ?? true;

  if (shadow) {
    g.lineStyle(0);
    g.beginFill(COLORS.shadow, 0.12).drawRoundedRect(x, y + 4, w, h, r).endFill();
  }
  // 底部 2.5px 香槟立体唇边
  g.lineStyle(0);
  g.beginFill(0xE6CAA0, alpha).drawRoundedRect(x, y + 2, w, h, r).endFill();
  g.lineStyle(borderWidth, borderColor, 0.95);
  g.beginFill(fill, alpha).drawRoundedRect(x, y, w, h, r).endFill();
  g.lineStyle(0);
  if (h >= 36 && w >= r * 2 + 16) {
    g.lineStyle(1, 0xFFFFFF, 0.78).drawRoundedRect(x + 3, y + 2.5, w - 6, h - 5, Math.max(4, r - 3));
    g.lineStyle(0);
  }
  return g;
}

export function drawGlass(
  g: PIXI.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  alpha = GLASS_ALPHA,
): PIXI.Graphics {
  return drawCreamCard(g, x, y, w, h, r, {
    fill: COLORS.card,
    alpha,
    borderColor: COLORS.borderGold,
    borderWidth: 1.5,
    shadow: true,
  });
}

export function drawNoirCard(
  g: PIXI.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  alpha = 0.92,
): PIXI.Graphics {
  g.lineStyle(0).beginFill(0x000000, 0.34).drawRoundedRect(x, y + 5, w, h, r).endFill();
  g.lineStyle(1.3, COLORS.noirBorder, 0.82);
  g.beginFill(COLORS.noirCard, alpha).drawRoundedRect(x, y, w, h, r).endFill();
  g.lineStyle(0);
  return g;
}

export function makeNumText(text: string, size: number, fill: number = COLORS.goldDeep): PIXI.Text {
  const t = new PIXI.Text(text, {
    fontFamily: FONT_NUM,
    fontSize: size,
    fill,
    fontWeight: '800',
  });
  t.resolution = 2.5;
  return t;
}

export function textStyle(size: number, fill: number = COLORS.ink, bold = false): Partial<PIXI.ITextStyle> {
  return {
    fontFamily: FONT,
    fontSize: size,
    fill,
    fontWeight: bold ? '800' : '600',
  };
}

export function makeText(text: string, size: number, fill: number = COLORS.ink, bold = false): PIXI.Text {
  const t = new PIXI.Text(text, textStyle(size, fill, bold));
  t.resolution = 2.5;
  return t;
}

/** v8 饱满圆润高对比标题字（带柔光描边与微立体高光投影） */
export function makeDisplayText(
  text: string,
  size: number,
  fill: number = 0xFFFFFF,
  strokeColor: number = 0x5A3A22,
  strokeWidth = 4.2,
): PIXI.Text {
  const t = new PIXI.Text(text, {
    fontFamily: FONT,
    fontSize: size,
    fill,
    fontWeight: '800',
    stroke: strokeColor,
    strokeThickness: strokeWidth,
    lineJoin: 'round',
    dropShadow: true,
    dropShadowColor: strokeColor,
    dropShadowAlpha: 0.24,
    dropShadowBlur: 0,
    dropShadowDistance: 1.5,
    dropShadowAngle: Math.PI / 2,
  });
  t.resolution = 2.5;
  return t;
}

export function drawStars(g: PIXI.Graphics, lit: number, total: number, r: number, gap = r * 0.5): PIXI.Graphics {
  for (let s = 0; s < total; s++) {
    const cx = s * (r * 2 + gap);
    const pts: number[] = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rr = i % 2 === 0 ? r : r * 0.44;
      pts.push(cx + Math.cos(a) * rr, Math.sin(a) * rr);
    }
    if (s < lit) {
      g.lineStyle(1.2, 0xC98D32, 0.85).beginFill(0xFFD559).drawPolygon(pts).endFill();
    } else {
      g.lineStyle(1.1, 0xD2BE9E, 0.8).beginFill(0xF5EBDC, 0.9).drawPolygon(pts).endFill();
    }
  }
  g.lineStyle(0);
  return g;
}

export function drawHearts(g: PIXI.Graphics, lit: number, total: number, r: number, gap = r * 0.6, dark = false): PIXI.Graphics {
  for (let s = 0; s < total; s++) {
    const cx = s * (r * 2 + gap);
    const on = s < lit;
    if (on) g.lineStyle(1.4, 0xC94C48, 0.8).beginFill(0xFF6480);
    else if (dark) g.lineStyle(1.2, COLORS.champagne, 0.38).beginFill(COLORS.noirBg, 0.5);
    else g.lineStyle(1.2, 0xE2B5AC, 0.85).beginFill(0xFCECE8, 0.95);
    g.moveTo(cx, r * 0.9)
      .bezierCurveTo(cx - r * 1.3, r * 0.05, cx - r * 1.05, -r * 1.05, cx, -r * 0.35)
      .bezierCurveTo(cx + r * 1.05, -r * 1.05, cx + r * 1.3, r * 0.05, cx, r * 0.9)
      .endFill();
  }
  g.lineStyle(0);
  return g;
}

export function roundRect(w: number, h: number, r: number, fill: number, alpha = 1): PIXI.Graphics {
  const g = new PIXI.Graphics();
  g.beginFill(fill, alpha).drawRoundedRect(0, 0, w, h, r).endFill();
  return g;
}
