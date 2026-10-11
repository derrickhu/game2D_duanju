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
} as const;

export const FONT = 'PingFang SC, Hiragino Sans GB, Microsoft YaHei, sans-serif';

export function textStyle(size: number, fill: number = COLORS.ink, bold = false): Partial<PIXI.ITextStyle> {
  return { fontFamily: FONT, fontSize: size, fill, fontWeight: bold ? '700' : '400' };
}

export function makeText(text: string, size: number, fill: number = COLORS.ink, bold = false): PIXI.Text {
  return new PIXI.Text(text, textStyle(size, fill, bold));
}

export function roundRect(w: number, h: number, r: number, fill: number, alpha = 1): PIXI.Graphics {
  const g = new PIXI.Graphics();
  g.beginFill(fill, alpha).drawRoundedRect(0, 0, w, h, r).endFill();
  return g;
}
