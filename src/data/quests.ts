/** 主线任务（策划案 §4.8）：一次只显示一条，按顺序推进。 */
import type { AreaId, ShopId } from './world.ts';
import type { HeroId } from './story.ts';

export type QuestGoal =
  | { kind: 'taps'; count: number }
  | { kind: 'skill'; level: number }
  | { kind: 'shop'; shop: ShopId; level: number }
  | { kind: 'staffCount'; count: number }
  | { kind: 'staffStar'; star: number }
  | { kind: 'areaStaff'; area: AreaId }
  | { kind: 'bond'; hero: HeroId; level: number }
  | { kind: 'netWorth'; amount: number }
  | { kind: 'chapterWatched'; chapter: number }
  | { kind: 'liveBoost'; count: number };

export interface QuestDef {
  title: string;
  goal: QuestGoal;
  /** 奖励 = max(minReward, 每秒收益 × rewardSec) */
  rewardSec: number;
  minReward: number;
}

const q = (title: string, goal: QuestGoal, rewardSec: number, minReward = 200): QuestDef => ({ title, goal, rewardSec, minReward });

export const QUESTS: readonly QuestDef[] = [
  q('点击赚钱 20 次', { kind: 'taps', count: 20 }, 0, 200),
  q('手艺升到 Lv5', { kind: 'skill', level: 5 }, 60),
  q('甜品摊升到 Lv5', { kind: 'shop', shop: 'stall', level: 5 }, 60),
  q('录用第一位店员', { kind: 'staffCount', count: 1 }, 90, 300),
  q('身价达到 1 万', { kind: 'netWorth', amount: 1e4 }, 120, 1000),
  q('观看第 1 章', { kind: 'chapterWatched', chapter: 1 }, 120, 1000),
  q('开甜品店', { kind: 'shop', shop: 'dessert', level: 1 }, 120, 2000),
  q('陆屿羁绊升到心动', { kind: 'bond', hero: 'luyu', level: 2 }, 150, 3000),
  q('录用 3 位店员', { kind: 'staffCount', count: 3 }, 150, 3000),
  q('任意店员达到 ★2', { kind: 'staffStar', star: 2 }, 150, 3000),
  q('甜品店升到 Lv10', { kind: 'shop', shop: 'dessert', level: 10 }, 180, 5000),
  q('身价达到 10 万', { kind: 'netWorth', amount: 1e5 }, 180, 1e4),
  q('开咖啡馆', { kind: 'shop', shop: 'cafe', level: 1 }, 180, 2e4),
  q('任意店员达到 ★3', { kind: 'staffStar', star: 3 }, 200, 2e4),
  q('录满老街夜市的店员', { kind: 'areaStaff', area: 'oldstreet' }, 200, 2e4),
  q('手艺升到 Lv25', { kind: 'skill', level: 25 }, 200, 3e4),
  q('开一次直播带货', { kind: 'liveBoost', count: 1 }, 200, 3e4),
  q('咖啡馆升到 Lv25', { kind: 'shop', shop: 'cafe', level: 25 }, 240, 5e4),
  q('录满大学城的店员', { kind: 'areaStaff', area: 'campus' }, 240, 5e4),
  q('身价达到 100 万', { kind: 'netWorth', amount: 1e6 }, 300, 1e5),
  q('开健身房', { kind: 'shop', shop: 'gym', level: 1 }, 300, 2e5),
  q('江叙白羁绊升到暧昧', { kind: 'bond', hero: 'jiangxubai', level: 3 }, 300, 2e5),
  q('任意店员达到 ★4', { kind: 'staffStar', star: 4 }, 300, 3e5),
  q('录用 8 位店员', { kind: 'staffCount', count: 8 }, 300, 3e5),
];
