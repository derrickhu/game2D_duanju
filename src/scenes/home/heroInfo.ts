/** 男主页面共用的状态推导：解锁文案、红点。 */
import { BOND_LEVELS } from '@/data/balance';
import type { HeroDef } from '@/data/story';
import { shopById } from '@/data/world';
import { GameState } from '@/managers/GameState';
import { bondUpgradeCost } from '@/sim/economy';
import { bondBlockReason, effectiveBond, isVideoAdPending, isVideoUnlocked } from '@/sim/unlocks';

export function metCondition(hero: HeroDef): string {
  return hero.shop ? `开${shopById(hero.shop).name}后相遇` : '主线剧情中登场';
}

/** 第 i 段羁绊剧情还没解锁时的提示 */
export function bondVideoCondition(hero: HeroDef, i: number): string {
  if (hero.chapterBond) {
    const ch = hero.chapterBond[i];
    return ch === 0 ? '序章解锁' : `主线第 ${ch} 章解锁`;
  }
  if (i === 0) return metCondition(hero);
  return `羁绊升到「${BOND_LEVELS[i].stage}」`;
}

export function canInvest(hero: HeroDef): boolean {
  const save = GameState.save;
  return !!hero.shop && !bondBlockReason(save, hero.id);
}

export function investAffordable(hero: HeroDef): boolean {
  if (!canInvest(hero)) return false;
  const save = GameState.save;
  return save.money >= bondUpgradeCost(hero.id, effectiveBond(save, hero.id));
}

/** 有新剧情没看，或者能投资且钱够 */
export function heroHasNews(hero: HeroDef): boolean {
  const save = GameState.save;
  const fresh = hero.bondVideos.some((v) => isVideoUnlocked(save, v) && !save.watched.includes(v));
  return fresh || isVideoAdPending(save, hero.extraVideo) || investAffordable(hero);
}
