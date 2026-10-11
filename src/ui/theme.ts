import * as PIXI from 'pixi.js';

/** 奶油 + 玫瑰金。正式 UI 美术到位前全部用色块。 */
export const COLORS = {
  bg: 0xFFF4EE,
  bgDeep: 0xF7E1DA,
  card: 0xFFFFFF,
  cardMuted: 0xF4ECE8,
  rose: 0xE07A8B,
  roseDeep: 0xC2566B,
  gold: 0xD9A35B,
  goldLight: 0xF6D9A6,
  ink: 0x3A2A2E,
  inkSoft: 0x8C7479,
  disabled: 0xD8CCCF,
  mask: 0x1A1014,
  white: 0xFFFFFF,
  /** 主界面和产业地图：烟灰磨砂玻璃 + 香槟金描边，压在写实背景上不抢人物 */
  glass: 0x1C1417,
  champagne: 0xECCE96,
  champagneDeep: 0xC9A266,
  textOnGlass: 0xF7F0EA,
  textOnGlassSoft: 0xCFC3BC,
} as const;

export const FONT = 'PingFang SC, Hiragino Sans GB, Microsoft YaHei, sans-serif';
export const FONT_NUM = 'Didot, Georgia, Times New Roman, serif';

export const GLASS_ALPHA = 0.5;

export function drawGlass(g: PIXI.Graphics, x: number, y: number, w: number, h: number, r: number, alpha = GLASS_ALPHA): PIXI.Graphics {
  g.lineStyle(2, COLORS.champagne, 0.55, 0);
  g.beginFill(COLORS.glass, alpha).drawRoundedRect(x, y, w, h, r).endFill();
  g.lineStyle(0);
  return g;
}

export function makeNumText(text: string, size: number, fill: number = COLORS.champagne): PIXI.Text {
  return new PIXI.Text(text, { fontFamily: FONT_NUM, fontSize: size, fill, fontWeight: '400' });
}

export function textStyle(size: number, fill: number = COLORS.ink, bold = false): Partial<PIXI.ITextStyle> {
  return { fontFamily: FONT, fontSize: size, fill, fontWeight: bold ? '700' : '400' };
}

export function makeText(text: string, size: number, fill: number = COLORS.ink, bold = false): PIXI.Text {
  return new PIXI.Text(text, textStyle(size, fill, bold));
}

/** 一排五角星，点亮前 lit 颗；原点在第一颗中心 */
export function drawStars(g: PIXI.Graphics, lit: number, total: number, r: number, gap = r * 0.5): PIXI.Graphics {
  for (let s = 0; s < total; s++) {
    const cx = s * (r * 2 + gap);
    const pts: number[] = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rr = i % 2 === 0 ? r : r * 0.45;
      pts.push(cx + Math.cos(a) * rr, Math.sin(a) * rr);
    }
    if (s < lit) g.lineStyle(0).beginFill(COLORS.champagne).drawPolygon(pts).endFill();
    else g.lineStyle(1.5, COLORS.champagne, 0.5).beginFill(COLORS.glass, 0.4).drawPolygon(pts).endFill();
  }
  g.lineStyle(0);
  return g;
}

export function roundRect(w: number, h: number, r: number, fill: number, alpha = 1): PIXI.Graphics {
  const g = new PIXI.Graphics();
  g.beginFill(fill, alpha).drawRoundedRect(0, 0, w, h, r).endFill();
  return g;
}
