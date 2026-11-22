/** 男主页面共用的状态推导：解锁文案、玫瑰可投资判断、红点。 */
import { BOND_LEVELS } from '@/data/balance';
import { FINAL_CHAPTER, HIDDEN_BOND, type HeroDef } from '@/data/story';
import { shopById } from '@/data/world';
import { GameState } from '@/managers/GameState';
import { bondRoseCost, canAffordBond } from '@/sim/economy';
import { bondBlockReason, effectiveBond, isVideoAdPending, isVideoUnlocked } from '@/sim/unlocks';

export function metCondition(hero: HeroDef): string {
  return hero.shop ? `开${shopById(hero.shop).name}后相遇` : '主线剧情中登场';
}

export function bondVideoCondition(hero: HeroDef, i: number): string {
  if (hero.chapterBond) {
    const ch = hero.chapterBond[i];
    return ch === 0 ? '序章解锁' : `主线第 ${ch} 章解锁`;
  }
  if (i === 0) return metCondition(hero);
  return `羁绊升到「${BOND_LEVELS[i].stage}」`;
}

export function hiddenVideoCondition(hero: HeroDef, i: number): string {
  if (hero.chapterHidden) return `主线第 ${hero.chapterHidden[i]} 章解锁`;
  return `羁绊升到「${BOND_LEVELS[HIDDEN_BOND[i] - 1].stage}」`;
}

export function extraCondition(hero: HeroDef): string {
  return hero.shop ? metCondition(hero) : '主线第 6 章后开放';
}

export function endingCondition(): string {
  return `羁绊满级 · 主线第 ${FINAL_CHAPTER} 章解锁`;
}

export function canInvest(hero: HeroDef): boolean {
  const save = GameState.save;
  return !!hero.shop && !bondBlockReason(save, hero.id);
}

export function investAffordable(hero: HeroDef): boolean {
  if (!canInvest(hero)) return false;
  return canAffordBond(GameState.save, hero.id);
}

/** 玫瑰足够直接投资时亮红点（避免仅靠现金兜底时频繁打扰） */
export function investRoseReady(hero: HeroDef): boolean {
  if (!canInvest(hero)) return false;
  const save = GameState.save;
  return save.roses >= bondRoseCost(hero.id, effectiveBond(save, hero.id));
}

export function heroHasNews(hero: HeroDef): boolean {
  const save = GameState.save;
  const all = [...hero.bondVideos, ...hero.hiddenVideos, ...(hero.endingVideo ? [hero.endingVideo] : [])];
  const fresh = all.some((v) => isVideoUnlocked(save, v) && !save.watched.includes(v));
  return fresh || isVideoAdPending(save, hero.extraVideo) || investRoseReady(hero);
}
