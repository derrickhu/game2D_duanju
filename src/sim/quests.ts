/** 主线任务进度、玫瑰奖励与通关后自动生成的无限商业目标 */
import { QUESTS, type QuestDef } from '../data/quests.ts';
import { STAFF } from '../data/staff.ts';
import { SHOPS } from '../data/world.ts';
import { addRoses, earn, isChapterCleared } from './actions.ts';
import { baseIncomePerSec, staffInArea, staffStar } from './economy.ts';
import type { GameSave } from './save.ts';

export interface QuestProgress {
  quest: QuestDef;
  current: number;
  target: number;
  done: boolean;
  reward: number;
  roses: number;
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

/** 固定主线任务全部做完后，按序号循环生成无限帝国扩张目标 */
function buildEndlessQuest(index: number): QuestDef {
  const extra = index - QUESTS.length;
  const kindIdx = extra % 3;
  const tier = Math.floor(extra / 3) + 1;
  if (kindIdx === 0) {
    const shop = SHOPS[(extra * 3) % SHOPS.length];
    const targetLv = 50 + tier * 25;
    return {
      title: `将${shop.name}扩建至 Lv.${targetLv}`,
      goal: { kind: 'shop', shop: shop.id, level: targetLv },
      rewardSec: 420,
      minReward: 1e10 * tier,
      roses: 5,
    };
  }
  if (kindIdx === 1) {
    const targetSkill = 60 + tier * 15;
    return {
      title: `主理人手艺精修至 Lv.${targetSkill}`,
      goal: { kind: 'skill', level: targetSkill },
      rewardSec: 420,
      minReward: 1e10 * tier,
      roses: 5,
    };
  }
  const targetWorth = 1e11 * (2 ** tier);
  return {
    title: '商业帝国估值再翻倍',
    goal: { kind: 'netWorth', amount: targetWorth },
    rewardSec: 500,
    minReward: 2e10 * tier,
    roses: 8,
  };
}

export function questReward(save: GameSave, quest: QuestDef): number {
  return Math.max(quest.minReward, baseIncomePerSec(save) * Math.min(45, quest.rewardSec * 0.16));
}

/** 当前任务（固定 56 条做完后无缝衔接无限帝国任务） */
export function currentQuest(save: GameSave): QuestProgress | null {
  const quest = QUESTS[save.questIndex] ?? buildEndlessQuest(save.questIndex);
  const [current, target] = progressOf(save, quest);
  return {
    quest,
    current: Math.min(current, target),
    target,
    done: current >= target,
    reward: questReward(save, quest),
    roses: quest.roses,
  };
}

export interface ClaimQuestResult {
  cash: number;
  roses: number;
}

/** 领奖（现金 + 心动玫瑰）并切到下一条；没完成返回 0 */
export function claimQuest(save: GameSave): number {
  const p = currentQuest(save);
  if (!p || !p.done) return 0;
  earn(save, p.reward);
  addRoses(save, p.roses);
  save.questIndex += 1;
  return p.reward;
}
