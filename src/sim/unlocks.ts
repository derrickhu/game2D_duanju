/** 由身价和存档推导的解锁状态。只读，不改存档。 */
import { MAX_BOND } from '../data/balance.ts';
import { staffById, type StaffId } from '../data/staff.ts';
import { CHAPTERS, HEROES, VIDEOS, heroById, type ChapterDef, type HeroId } from '../data/story.ts';
import { AREAS, OUTFITS, SHOPS, type AreaDef, type OutfitDef, type ShopDef, type ShopId } from '../data/world.ts';
import type { GameSave } from './save.ts';

export function currentChapter(netWorth: number): number {
  let id = 0;
  for (const ch of CHAPTERS) if (netWorth >= ch.unlockNetWorth) id = ch.id;
  return id;
}

export function isShopUnlocked(save: GameSave, id: ShopId): boolean {
  const shop = SHOPS.find((s) => s.id === id);
  return !!shop && save.netWorth >= shop.unlockNetWorth;
}

/** 所属门店开业后才能招聘 */
export function isStaffAvailable(save: GameSave, id: StaffId): boolean {
  return (save.shops[staffById(id).shop] ?? 0) > 0;
}

export function unlockedAreas(netWorth: number): AreaDef[] {
  return AREAS.filter((a) => netWorth >= a.unlockNetWorth);
}

export function unlockedOutfits(netWorth: number): OutfitDef[] {
  return OUTFITS.filter((o) => netWorth >= o.unlockNetWorth);
}

/** 羁绊能否升到下一级；不能时给出原因文案 */
export function bondBlockReason(save: GameSave, heroId: HeroId): string | null {
  const hero = heroById(heroId);
  const level = save.bonds[heroId] ?? 0;
  if (!hero.shop) return '随主线剧情推进';
  if (level <= 0) return '开店后相遇';
  if (level >= MAX_BOND) return '羁绊已满';
  const gate = hero.chapterGate;
  if (gate && level >= 2) {
    const need = gate[level - 2];
    if (currentChapter(save.netWorth) < need) return `主线第 ${need} 章后解锁`;
  }
  return null;
}

/** 不关联门店的男主，羁绊等级由主线章节决定 */
export function chapterBondLevel(save: GameSave, heroId: HeroId): number {
  const hero = heroById(heroId);
  if (!hero.chapterBond) return save.bonds[heroId] ?? 0;
  const ch = currentChapter(save.netWorth);
  return hero.chapterBond.filter((need) => ch >= need).length;
}

export function effectiveBond(save: GameSave, heroId: HeroId): number {
  return heroById(heroId).shop ? save.bonds[heroId] ?? 0 : chapterBondLevel(save, heroId);
}

export function isVideoUnlocked(save: GameSave, videoId: string): boolean {
  const video = VIDEOS.get(videoId);
  if (!video) return false;
  if (video.kind === 'main') {
    const ch = CHAPTERS.find((c) => c.videos.includes(videoId));
    return !!ch && save.netWorth >= ch.unlockNetWorth;
  }
  for (const hero of HEROES) {
    const idx = hero.bondVideos.indexOf(videoId);
    if (idx >= 0) return effectiveBond(save, hero.id) > idx;
    if (hero.extraVideo === videoId) {
      return effectiveBond(save, hero.id) >= MAX_BOND && save.adUnlocked.includes(videoId);
    }
  }
  return false;
}

/** 番外：羁绊已满但还没看广告解锁 */
export function isVideoAdPending(save: GameSave, videoId: string): boolean {
  const video = VIDEOS.get(videoId);
  if (!video?.adLocked || save.adUnlocked.includes(videoId)) return false;
  const hero = HEROES.find((h) => h.extraVideo === videoId);
  return !!hero && effectiveBond(save, hero.id) >= MAX_BOND;
}

export interface Goal {
  label: string;
  target: number;
  progress: number;
}

/** 主界面“下一章”进度条 */
export function nextGoal(save: GameSave): Goal | null {
  const next = CHAPTERS.find((c) => c.unlockNetWorth > save.netWorth);
  if (!next) return null;
  return {
    label: `第 ${next.id} 章 · ${next.title}`,
    target: next.unlockNetWorth,
    progress: Math.min(1, save.netWorth / next.unlockNetWorth),
  };
}

export interface Crossed {
  chapters: ChapterDef[];
  areas: AreaDef[];
  shops: ShopDef[];
  outfits: OutfitDef[];
}

/** 身价从 before 涨到 after 时新跨过的门槛，用来弹解锁提示 */
export function crossedThresholds(before: number, after: number): Crossed {
  const hit = <T extends { unlockNetWorth: number }>(list: readonly T[]): T[] =>
    list.filter((x) => x.unlockNetWorth > before && x.unlockNetWorth <= after);
  return { chapters: hit(CHAPTERS), areas: hit(AREAS), shops: hit(SHOPS), outfits: hit(OUTFITS) };
}
