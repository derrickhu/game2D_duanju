/** 主线任务进度与领奖 */
import { QUESTS, type QuestDef } from '../data/quests.ts';
import { STAFF } from '../data/staff.ts';
import { baseIncomePerSec, staffInArea, staffStar } from './economy.ts';
import { earn, isChapterCleared } from './actions.ts';
import type { GameSave } from './save.ts';

export interface QuestProgress {
  quest: QuestDef;
  current: number;
  target: number;
  done: boolean;
  reward: number;
}

function progressOf(save: GameSave, quest: QuestDef): [number, number] {
  const g = quest.goal;
  switch (g.kind) {
    case 'taps': return [save.taps, g.count];
    case 'skill': return [save.skillLevel, g.level];
    case 'shop': return [save.shops[g.shop] ?? 0, g.level];
    case 'staffCount': return [STAFF.filter((s) => (save.staff[s.id] ?? 0) > 0).length, g.count];
    case 'staffStar': return [Math.max(0, ...STAFF.map((s) => staffStar(save.staff[s.id] ?? 0))), g.star];
    case 'areaStaff': {
      const ids = staffInArea(g.area);
      return [ids.filter((id) => (save.staff[id] ?? 0) > 0).length, ids.length];
    }
    case 'bond': return [save.bonds[g.hero] ?? 0, g.level];
    case 'netWorth': return [save.netWorth, g.amount];
    case 'chapterWatched': return [isChapterCleared(save, g.chapter) ? 1 : 0, 1];
    case 'liveBoost': return [save.liveBoosts, g.count];
  }
}

export function questReward(save: GameSave, quest: QuestDef): number {
  return Math.max(quest.minReward, baseIncomePerSec(save) * quest.rewardSec);
}

/** 当前任务；全部做完返回 null */
export function currentQuest(save: GameSave): QuestProgress | null {
  const quest = QUESTS[save.questIndex];
  if (!quest) return null;
  const [current, target] = progressOf(save, quest);
  return { quest, current: Math.min(current, target), target, done: current >= target, reward: questReward(save, quest) };
}

/** 领奖并切到下一条；没完成返回 0 */
export function claimQuest(save: GameSave): number {
  const p = currentQuest(save);
  if (!p || !p.done) return 0;
  earn(save, p.reward);
  save.questIndex += 1;
  return p.reward;
}
