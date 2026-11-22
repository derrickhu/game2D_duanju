/**
 * 高定杂志风（Starlight & Champagne Editorial）矢量线性图标库。
 * 全部采用原生分辨率抗锯齿几何金线绘制，零锯齿、零白边、与韩漫高精度立绘完美统一。
 */
import * as PIXI from 'pixi.js';

export type EditorialIconId =
  | 'shop'
  | 'rose'
  | 'staff'
  | 'story'
  | 'wardrobe'
  | 'live'
  | 'gift'
  | 'phone'
  | 'crown'
  | 'lock'
  | 'stall'
  | 'dessert'
  | 'cafe'
  | 'gym'
  | 'law'
  | 'garage'
  | 'clinic'
  | 'agency'
  | 'hotel'
  | 'group';

/** 绘制精致四角星芒（✦） */
export function drawDiamondStar(
  g: PIXI.Graphics,
  cx: number,
  cy: number,
  r: number,
  color = 0xE8CA96,
  alpha = 1,
): PIXI.Graphics {
  const inner = r * 0.26;
  g.lineStyle(0)
    .beginFill(color, alpha)
    .drawPolygon([
      cx, cy - r,
      cx + inner, cy - inner,
      cx + r, cy,
      cx + inner, cy + inner,
      cx, cy + r,
      cx - inner, cy + inner,
      cx - r, cy,
      cx - inner, cy - inner,
    ])
    .endFill();
  return g;
}

/**
 * 在原点 `(0, 0)` 绘制一枚高定金色线性图标（外接尺寸 `size × size`）。
 */
export function drawEditorialIcon(
  g: PIXI.Graphics,
  id: EditorialIconId,
  size = 36,
  color = 0xE8CA96,
  accent = 0xDF7A92,
): PIXI.Graphics {
  const u = size * 0.5;
  const sw = Math.max(1.8, size * 0.056);
  g.lineStyle(sw, color, 0.96);

  switch (id) {
    case 'shop': {
      // 精品法式橱窗建筑
      g.beginFill(color, 0.10).drawRoundedRect(-u * 0.72, -u * 0.2, u * 1.44, u * 0.94, 3).endFill();
      g.lineStyle(sw, color, 0.96);
      // 顶棚弧形遮阳篷
      g.moveTo(-u * 0.84, -u * 0.2)
        .lineTo(-u * 0.62, -u * 0.68)
        .lineTo(u * 0.62, -u * 0.68)
        .lineTo(u * 0.84, -u * 0.2)
        .closePath();
      g.moveTo(-u * 0.28, -u * 0.68).lineTo(-u * 0.34, -u * 0.2);
      g.moveTo(u * 0.28, -u * 0.68).lineTo(u * 0.34, -u * 0.2);
      // 门框
      g.drawRoundedRect(-u * 0.24, u * 0.14, u * 0.48, u * 0.6, 2);
      drawDiamondStar(g, 0, -u * 0.86, u * 0.18, accent);
      break;
    }

    case 'rose': {
      // 切面宝石心 + 星芒
      g.beginFill(accent, 0.22);
      g.moveTo(0, u * 0.76)
        .bezierCurveTo(-u * 0.95, u * 0.15, -u * 0.88, -u * 0.68, 0, -u * 0.22)
        .bezierCurveTo(u * 0.88, -u * 0.68, u * 0.95, u * 0.15, 0, u * 0.76)
        .endFill();
      g.lineStyle(sw * 0.75, color, 0.65);
      g.moveTo(-u * 0.36, -u * 0.14).lineTo(0, u * 0.32).lineTo(u * 0.36, -u * 0.14);
      drawDiamondStar(g, u * 0.58, -u * 0.64, u * 0.22, color);
      break;
    }

    case 'staff': {
      // 高定领结徽章 + 胸针星
      g.beginFill(color, 0.12).drawCircle(0, -u * 0.34, u * 0.32).endFill();
      g.lineStyle(sw, color, 0.96);
      g.moveTo(-u * 0.72, u * 0.72)
        .bezierCurveTo(-u * 0.72, u * 0.16, -u * 0.36, u * 0.08, 0, u * 0.08)
        .bezierCurveTo(u * 0.36, u * 0.08, u * 0.72, u * 0.16, u * 0.72, u * 0.72);
      // V领礼服翻领
      g.lineStyle(sw * 0.82, color, 0.85);
      g.moveTo(-u * 0.26, u * 0.12).lineTo(0, u * 0.54).lineTo(u * 0.26, u * 0.12);
      drawDiamondStar(g, u * 0.58, -u * 0.48, u * 0.2, accent);
      break;
    }

    case 'story': {
      // 胶片场记框 + 璀璨播放星标
      g.beginFill(color, 0.10).drawRoundedRect(-u * 0.78, -u * 0.56, u * 1.56, u * 1.24, 4).endFill();
      g.lineStyle(sw, color, 0.96);
      g.moveTo(-u * 0.78, -u * 0.2).lineTo(u * 0.78, -u * 0.2);
      g.moveTo(-u * 0.32, -u * 0.56).lineTo(-u * 0.12, -u * 0.2);
      g.moveTo(u * 0.18, -u * 0.56).lineTo(u * 0.38, -u * 0.2);
      g.lineStyle(0).beginFill(color, 0.95)
        .drawPolygon([-u * 0.16, -u * 0.02, -u * 0.16, u * 0.46, u * 0.28, u * 0.22])
        .endFill();
      break;
    }

    case 'wardrobe': {
      // 高定晚礼服裙摆剪影 + 金衣架
      g.moveTo(0, -u * 0.54)
        .bezierCurveTo(0, -u * 0.78, u * 0.24, -u * 0.78, u * 0.2, -u * 0.58);
      g.beginFill(accent, 0.16);
      g.moveTo(0, -u * 0.52)
        .lineTo(-u * 0.34, -u * 0.22)
        .lineTo(-u * 0.18, u * 0.08)
        .lineTo(-u * 0.68, u * 0.74)
        .lineTo(u * 0.68, u * 0.74)
        .lineTo(u * 0.18, u * 0.08)
        .lineTo(u * 0.34, -u * 0.22)
        .closePath()
        .endFill();
      drawDiamondStar(g, 0, u * 0.36, u * 0.2, color);
      break;
    }

    case 'live': {
      // 环形补光灯 + 麦克风
      g.drawCircle(0, -u * 0.12, u * 0.64);
      g.beginFill(accent, 0.25).drawRoundedRect(-u * 0.18, -u * 0.38, u * 0.36, u * 0.52, u * 0.18).endFill();
      g.lineStyle(sw, color, 0.96);
      g.moveTo(0, u * 0.52).lineTo(0, u * 0.78);
      g.moveTo(-u * 0.32, u * 0.78).lineTo(u * 0.32, u * 0.78);
      drawDiamondStar(g, u * 0.62, -u * 0.62, u * 0.22, accent);
      break;
    }

    case 'gift': {
      // 丝带高定礼盒
      g.beginFill(color, 0.12).drawRoundedRect(-u * 0.66, -u * 0.22, u * 1.32, u * 0.92, 4).endFill();
      g.drawRoundedRect(-u * 0.74, -u * 0.44, u * 1.48, u * 0.24, 3);
      g.moveTo(0, -u * 0.44).lineTo(0, u * 0.70);
      // 蝴蝶结双耳
      g.moveTo(0, -u * 0.44)
        .bezierCurveTo(-u * 0.48, -u * 0.84, -u * 0.62, -u * 0.44, 0, -u * 0.44)
        .bezierCurveTo(u * 0.62, -u * 0.44, u * 0.48, -u * 0.84, 0, -u * 0.44);
      break;
    }

    case 'phone': {
      // 全面屏微聊手机 + 消息星泡
      g.beginFill(color, 0.10).drawRoundedRect(-u * 0.48, -u * 0.74, u * 0.96, u * 1.48, 6).endFill();
      g.lineStyle(sw * 0.85, color, 0.75).moveTo(-u * 0.16, u * 0.54).lineTo(u * 0.16, u * 0.54);
      drawDiamondStar(g, 0, -u * 0.12, u * 0.26, accent);
      break;
    }

    case 'crown':
    case 'group': {
      // 女皇星冕
      g.beginFill(color, 0.18)
        .drawPolygon([
          -u * 0.74, u * 0.46,
          -u * 0.82, -u * 0.24,
          -u * 0.36, u * 0.12,
          0, -u * 0.58,
          u * 0.36, u * 0.12,
          u * 0.82, -u * 0.24,
          u * 0.74, u * 0.46,
        ])
        .endFill();
      g.lineStyle(sw, color, 0.96).moveTo(-u * 0.74, u * 0.64).lineTo(u * 0.74, u * 0.64);
      drawDiamondStar(g, 0, -u * 0.74, u * 0.18, accent);
      break;
    }

    case 'lock': {
      g.beginFill(color, 0.12).drawRoundedRect(-u * 0.56, -u * 0.08, u * 1.12, u * 0.82, 4).endFill();
      g.arc(0, -u * 0.08, u * 0.34, Math.PI, 0);
      drawDiamondStar(g, 0, u * 0.32, u * 0.18, color);
      break;
    }

    case 'stall':
    case 'dessert': {
      // 精致法式甜品圆顶盅
      g.beginFill(accent, 0.16).arc(0, u * 0.24, u * 0.64, Math.PI, 0).closePath().endFill();
      g.moveTo(-u * 0.82, u * 0.24).lineTo(u * 0.82, u * 0.24);
      g.moveTo(-u * 0.28, u * 0.56).lineTo(u * 0.28, u * 0.56);
      g.moveTo(0, u * 0.24).lineTo(0, u * 0.56);
      drawDiamondStar(g, 0, -u * 0.56, u * 0.22, color);
      break;
    }

    case 'cafe': {
      // 骨瓷咖啡杯 + 香气弧线
      g.beginFill(color, 0.14).drawRoundedRect(-u * 0.58, -u * 0.16, u * 1.0, u * 0.68, 5).endFill();
      g.arc(u * 0.42, u * 0.16, u * 0.2, -Math.PI / 2, Math.PI / 2);
      g.moveTo(-u * 0.72, u * 0.64).lineTo(u * 0.62, u * 0.64);
      g.lineStyle(sw * 0.8, accent, 0.9);
      g.moveTo(-u * 0.16, -u * 0.34).bezierCurveTo(-u * 0.28, -u * 0.52, -u * 0.02, -u * 0.58, -u * 0.12, -u * 0.74);
      g.moveTo(u * 0.14, -u * 0.34).bezierCurveTo(u * 0.02, -u * 0.52, u * 0.28, -u * 0.58, u * 0.18, -u * 0.74);
      break;
    }

    case 'gym': {
      // 哑铃徽章
      g.moveTo(-u * 0.46, 0).lineTo(u * 0.46, 0);
      g.beginFill(color, 0.18).drawRoundedRect(-u * 0.74, -u * 0.42, u * 0.26, u * 0.84, 3).endFill();
      g.beginFill(color, 0.18).drawRoundedRect(u * 0.48, -u * 0.42, u * 0.26, u * 0.84, 3).endFill();
      drawDiamondStar(g, 0, -u * 0.5, u * 0.2, accent);
      break;
    }

    case 'law': {
      // 正义天平
      g.moveTo(0, -u * 0.68).lineTo(0, u * 0.68);
      g.moveTo(-u * 0.42, u * 0.68).lineTo(u * 0.42, u * 0.68);
      g.moveTo(-u * 0.68, -u * 0.36).lineTo(u * 0.68, -u * 0.36);
      g.beginFill(color, 0.16).arc(-u * 0.52, u * 0.14, u * 0.24, 0, Math.PI).closePath().endFill();
      g.beginFill(color, 0.16).arc(u * 0.52, u * 0.14, u * 0.24, 0, Math.PI).closePath().endFill();
      break;
    }

    case 'garage': {
      // 超跑方向盘 / 星轮
      g.drawCircle(0, 0, u * 0.72);
      g.beginFill(accent, 0.22).drawCircle(0, 0, u * 0.22).endFill();
      g.moveTo(-u * 0.7, -u * 0.12).lineTo(-u * 0.22, -u * 0.05);
      g.moveTo(u * 0.7, -u * 0.12).lineTo(u * 0.22, -u * 0.05);
      g.moveTo(0, u * 0.22).lineTo(0, u * 0.72);
      break;
    }

    case 'clinic': {
      // 高定医美星钻十字
      g.beginFill(accent, 0.16)
        .drawPolygon([0, -u * 0.76, u * 0.64, 0, 0, u * 0.76, -u * 0.64, 0])
        .endFill();
      drawDiamondStar(g, 0, 0, u * 0.34, color);
      break;
    }

    case 'agency': {
      // 星探聚光灯五角星徽
      drawDiamondStar(g, 0, 0, u * 0.76, color);
      g.lineStyle(sw * 0.8, accent, 0.85).drawCircle(0, 0, u * 0.54);
      break;
    }

    case 'hotel': {
      // 云顶双塔摩天楼
      g.beginFill(color, 0.14).drawRect(-u * 0.56, -u * 0.44, u * 0.48, u * 1.16).endFill();
      g.beginFill(accent, 0.14).drawRect(u * 0.04, -u * 0.70, u * 0.52, u * 1.42).endFill();
      g.moveTo(-u * 0.76, u * 0.72).lineTo(u * 0.76, u * 0.72);
      drawDiamondStar(g, -u * 0.32, -u * 0.72, u * 0.18, color);
      break;
    }
  }

  g.lineStyle(0);
  return g;
}
