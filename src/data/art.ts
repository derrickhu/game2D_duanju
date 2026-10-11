/** 游戏内美术路径。图都在 CDN（见 CdnConfig.cdnPrefixes），不进微信包。 */
import type { HeroId } from './story.ts';
import type { OutfitId } from './world.ts';

/** 每套造型对应的点击场景背景 */
export function outfitScenePath(id: OutfitId): string {
  return `subpkg_images/scene_${id}.jpg`;
}

/** 女主当前造型的全身立绘（透明底） */
export function outfitFigurePath(id: OutfitId): string {
  return `subpkg_images/suwan_${id}.png`;
}

export function heroPortraitPath(id: HeroId): string {
  return `subpkg_images/portrait_${id}.jpg`;
}
