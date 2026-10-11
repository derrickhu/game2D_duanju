/**
 * 游戏内美术路径。场景、立绘、头像、城市地图在 CDN（见 CdnConfig.cdnPrefixes）；
 * UI 图标很小，打在 images 分包里，保证首屏就有。
 */
import type { StaffId } from './staff.ts';
import type { HeroId } from './story.ts';
import type { OutfitId, ShopId } from './world.ts';

export const ICONS = {
  shop: 'subpkg_images/icon_shop.png',
  rose: 'subpkg_images/icon_rose.png',
  story: 'subpkg_images/icon_story.png',
  wardrobe: 'subpkg_images/icon_wardrobe.png',
  live: 'subpkg_images/icon_live.png',
  gift: 'subpkg_images/icon_gift.png',
  lock: 'subpkg_images/icon_lock.png',
  coins: 'subpkg_images/icon_coins.png',
  staff: 'subpkg_images/icon_staff.png',
} as const;

/** 产业页城市地图（750×1334，等距微缩城市，招牌留空，店名由程序叠加） */
export const CITY_MAP = 'subpkg_images/city_map.jpg';

/**
 * 每家店在城市地图上的定位点，按地图原图归一化（0~1）。
 * 从下往上：老街夜市、大学城、CBD、江景区、娱乐区、金融区。
 */
export const SHOP_MAP_POS: Readonly<Record<ShopId, readonly [number, number]>> = {
  stall: [0.27, 0.84],
  dessert: [0.66, 0.86],
  cafe: [0.66, 0.68],
  gym: [0.42, 0.43],
  law: [0.70, 0.35],
  garage: [0.73, 0.48],
  clinic: [0.90, 0.52],
  agency: [0.17, 0.27],
  hotel: [0.54, 0.20],
  group: [0.63, 0.12],
};

/** 每套造型对应的点击场景背景 */
export function outfitScenePath(id: OutfitId): string {
  return `subpkg_images/scene_${id}.jpg`;
}

/** 女主当前造型的全身立绘（透明底） */
export function outfitFigurePath(id: OutfitId): string {
  return `subpkg_images/suwan_${id}.png`;
}

/** 店员全身立绘（透明底，高 960） */
export function staffFigurePath(id: StaffId): string {
  return `subpkg_images/staff_${id}.png`;
}

/** 男主全身像（透明底，高 1280，3/4 侧身） */
export function heroFigurePath(id: HeroId): string {
  return `subpkg_images/hero_${id}.png`;
}

export function heroPortraitPath(id: HeroId): string {
  return `subpkg_images/portrait_${id}.jpg`;
}
