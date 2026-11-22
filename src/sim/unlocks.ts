/** 由身价和存档推导的解锁状态（含微聊、朋友圈、商战、赛季转生）。只读，不改存档。 */
import { MAX_BOND } from '../data/balance.ts';
import { CHAT_THREADS, MOMENT_POSTS, type ChatThreadDef, type MomentPostDef } from '../data/phoneMessages.ts';
import { staffById, type StaffId } from '../data/staff.ts';
import { CHAPTERS, FINAL_CHAPTER, HEROES, HIDDEN_BOND, VIDEOS, heroById, type ChapterDef, type HeroDef, type HeroId } from '../data/story.ts';
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

/** 暗面第 i 段的门槛是否已到（不看广告） */
export function isHiddenOpen(save: GameSave, hero: HeroDef, i: number): boolean {
  if (hero.chapterHidden) return currentChapter(save.netWorth) >= hero.chapterHidden[i];
  return effectiveBond(save, hero.id) >= HIDDEN_BOND[i];
}

/** 广告番外的门槛：门店男主相遇后就能看花絮；傅景辞的另一个结局要羁绊满级 */
function extraGateOpen(save: GameSave, hero: HeroDef): boolean {
  return effectiveBond(save, hero.id) >= (hero.shop ? 1 : MAX_BOND);
}

/** 主线第 8 章结尾播放谁的结局：羁绊最高的门店男主，平局按列表顺序（陆屿优先） */
export function finaleHero(save: GameSave): HeroDef {
  let best = HEROES[0];
  for (const hero of HEROES) {
    if (hero.endingVideo && effectiveBond(save, hero.id) > effectiveBond(save, best.id)) best = hero;
  }
  return best;
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
    const h = hero.hiddenVideos.indexOf(videoId);
    if (h >= 0) return isHiddenOpen(save, hero, h);
    if (hero.extraVideo === videoId) return extraGateOpen(save, hero) && save.adUnlocked.includes(videoId);
    if (hero.endingVideo === videoId) {
      if (currentChapter(save.netWorth) < FINAL_CHAPTER) return false;
      return effectiveBond(save, hero.id) >= MAX_BOND || finaleHero(save).id === hero.id;
    }
  }
  return false;
}

/** 广告番外：门槛已到但还没看广告解锁 */
export function isVideoAdPending(save: GameSave, videoId: string): boolean {
  const video = VIDEOS.get(videoId);
  if (!video?.adLocked || save.adUnlocked.includes(videoId)) return false;
  const hero = HEROES.find((h) => h.extraVideo === videoId);
  return !!hero && extraGateOpen(save, hero);
}

/** 微聊会话是否已解锁 */
export function isChatUnlocked(save: GameSave, chat: ChatThreadDef): boolean {
  if (chat.minChapter !== undefined && currentChapter(save.netWorth) < chat.minChapter) return false;
  if (chat.minBond !== undefined && effectiveBond(save, chat.heroId) < chat.minBond) return false;
  return true;
}

export function unlockedChats(save: GameSave): ChatThreadDef[] {
  return CHAT_THREADS.filter((c) => isChatUnlocked(save, c));
}

export function unreadChatCount(save: GameSave): number {
  return unlockedChats(save).filter((c) => save.repliedChats[c.id] === undefined).length;
}

export function unlockedMoments(save: GameSave): MomentPostDef[] {
  const ch = currentChapter(save.netWorth);
  return MOMENT_POSTS.filter((m) => {
    if (ch < m.minChapter) return false;
    if (m.heroId && m.minBond !== undefined && effectiveBond(save, m.heroId) < m.minBond) return false;
    return true;
  });
}

export function unlikedMomentCount(save: GameSave): number {
  return unlockedMoments(save).filter((m) => !save.likedMoments.includes(m.id)).length;
}

/** 是否有已解锁但还未打商战对决的章节 */
export function pendingBattleChapter(save: GameSave): ChapterDef | null {
  for (const ch of CHAPTERS) {
    if (ch.id <= 0 || !ch.rival) continue;
    if (save.netWorth >= ch.unlockNetWorth && !save.clearedBattles.includes(ch.id)) return ch;
  }
  return null;
}

/** 是否可开启下一商业赛季（终章身价达标且终章剧情已看或商战已通） */
export function canPrestigeSeason(save: GameSave): boolean {
  return save.netWorth >= CHAPTERS[CHAPTERS.length - 1].unlockNetWorth;
}

export interface Goal {
  label: string;
  target: number;
  progress: number;
  chapterId: number;
}

/** 主界面“下一章”进度条 */
export function nextGoal(save: GameSave): Goal | null {
  const next = CHAPTERS.find((c) => c.unlockNetWorth > save.netWorth);
  if (!next) return null;
  return {
    label: `第 ${next.id} 章 · ${next.title}`,
    target: next.unlockNetWorth,
    progress: Math.min(1, save.netWorth / next.unlockNetWorth),
    chapterId: next.id,
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
