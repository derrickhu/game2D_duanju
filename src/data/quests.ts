/** 主线任务（覆盖序章至终章 1000 亿，做完后在 sim/quests.ts 自动衔接无限里程碑任务）。 */
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
  /** 现金奖励 = max(minReward, 每秒收益 × rewardSec) */
  rewardSec: number;
  minReward: number;
  /** 额外赠送的心动玫瑰数量 */
  roses: number;
}

const q = (
  title: string,
  goal: QuestGoal,
  rewardSec: number,
  minReward = 200,
  roses = 1,
): QuestDef => ({ title, goal, rewardSec, minReward, roses });

export const QUESTS: readonly QuestDef[] = [
  // 序章 ~ 第 1 章（夜市起步）
  q('亲手制作甜品 20 次', { kind: 'taps', count: 20 }, 0, 200, 1),
  q('手艺升到 Lv5', { kind: 'skill', level: 5 }, 60, 250, 1),
  q('甜品摊升到 Lv5', { kind: 'shop', shop: 'stall', level: 5 }, 60, 300, 2),
  q('录用第一位店员阿北', { kind: 'staffCount', count: 1 }, 90, 400, 2),
  q('甜品摊突破 Lv10 质变', { kind: 'shop', shop: 'stall', level: 10 }, 90, 600, 2),
  q('身价达到 1 万', { kind: 'netWorth', amount: 1e4 }, 120, 1200, 3),
  q('观看第 1 章打脸剧情', { kind: 'chapterWatched', chapter: 1 }, 120, 1500, 2),

  // 第 1 章 ~ 第 2 章（首店与陆屿）
  q('开启晚星甜品店', { kind: 'shop', shop: 'dessert', level: 1 }, 120, 2500, 3),
  q('与陆屿升至「心动」', { kind: 'bond', hero: 'luyu', level: 2 }, 150, 3500, 2),
  q('录用 3 位帅哥店员', { kind: 'staffCount', count: 3 }, 150, 4000, 2),
  q('任意店员晋升 ★2', { kind: 'staffStar', star: 2 }, 150, 5000, 2),
  q('甜品店升到 Lv10', { kind: 'shop', shop: 'dessert', level: 10 }, 180, 7000, 2),
  q('身价达到 10 万', { kind: 'netWorth', amount: 1e5 }, 180, 1.2e4, 3),
  q('观看第 2 章剧情', { kind: 'chapterWatched', chapter: 2 }, 180, 1.5e4, 2),

  // 第 2 章 ~ 第 3 章（进军大学城）
  q('在大学城开启咖啡馆', { kind: 'shop', shop: 'cafe', level: 1 }, 180, 2.5e4, 3),
  q('录满老街夜市团建店员', { kind: 'areaStaff', area: 'oldstreet' }, 200, 3e4, 3),
  q('任意店员晋升 ★3 解锁拍立得', { kind: 'staffStar', star: 3 }, 200, 3.5e4, 3),
  q('与江叙白升至「心动」', { kind: 'bond', hero: 'jiangxubai', level: 2 }, 200, 4e4, 2),
  q('手艺精进到 Lv20', { kind: 'skill', level: 20 }, 200, 5e4, 2),
  q('甜品摊达到 Lv25 激活帝国光环', { kind: 'shop', shop: 'stall', level: 25 }, 220, 6e4, 3),
  q('身价达到 100 万', { kind: 'netWorth', amount: 1e6 }, 240, 1.2e5, 4),
  q('观看第 3 章砸场反转', { kind: 'chapterWatched', chapter: 3 }, 240, 1.5e5, 3),

  // 第 3 章 ~ 第 4 章（立足 CBD 与维权胜诉）
  q('在 CBD 开启健身房', { kind: 'shop', shop: 'gym', level: 1 }, 240, 2.5e5, 3),
  q('录满大学城团建店员', { kind: 'areaStaff', area: 'campus' }, 240, 3.5e5, 3),
  q('咖啡馆升到 Lv25 激活店员光环', { kind: 'shop', shop: 'cafe', level: 25 }, 260, 5e5, 3),
  q('与顾野升至「心动」', { kind: 'bond', hero: 'guye', level: 2 }, 260, 6e5, 2),
  q('录用满 8 位店员', { kind: 'staffCount', count: 8 }, 260, 8e5, 3),
  q('身价达到 1000 万', { kind: 'netWorth', amount: 1e7 }, 280, 1.2e6, 5),
  q('观看第 4 章胜诉剧情', { kind: 'chapterWatched', chapter: 4 }, 280, 1.5e6, 3),

  // 第 4 章 ~ 第 5 章（江景名流圈）
  q('与沈砚合作开启金牌律所', { kind: 'shop', shop: 'law', level: 1 }, 280, 3e6, 4),
  q('与沈砚升至「心动」享升级减免', { kind: 'bond', hero: 'shenyan', level: 2 }, 280, 4e6, 3),
  q('录满 CBD 精英店员', { kind: 'areaStaff', area: 'cbd' }, 300, 6e6, 4),
  q('律所达到 Lv25 激活全局减免光环', { kind: 'shop', shop: 'law', level: 25 }, 300, 1e7, 4),
  q('在江景区开启改装车行', { kind: 'shop', shop: 'garage', level: 1 }, 300, 1.8e7, 4),
  q('任意店员晋升 ★4', { kind: 'staffStar', star: 4 }, 300, 2.5e7, 4),
  q('身价突破 1 亿', { kind: 'netWorth', amount: 1e8 }, 320, 4e7, 6),
  q('观看第 5 章千万晚宴', { kind: 'chapterWatched', chapter: 5 }, 320, 5e7, 4),

  // 第 5 章 ~ 第 6 章（反手收购苏氏）
  q('开启名流医美诊所', { kind: 'shop', shop: 'clinic', level: 1 }, 320, 8e7, 4),
  q('与陆屿升至「暧昧」', { kind: 'bond', hero: 'luyu', level: 3 }, 320, 1e8, 4),
  q('录满江景区全员店员', { kind: 'areaStaff', area: 'riverside' }, 340, 1.8e8, 5),
  q('与许知衡升至「心动」', { kind: 'bond', hero: 'xuzhiheng', level: 2 }, 340, 2.5e8, 3),
  q('甜品店升至 Lv50 激活高阶光环', { kind: 'shop', shop: 'dessert', level: 50 }, 340, 4e8, 5),
  q('身价突破 10 亿', { kind: 'netWorth', amount: 1e9 }, 360, 6e8, 8),
  q('观看第 6 章收购苏氏', { kind: 'chapterWatched', chapter: 6 }, 360, 8e8, 5),

  // 第 6 章 ~ 第 7 章（娱乐帝国与盛家真千金）
  q('成立晚星娱乐经纪公司', { kind: 'shop', shop: 'agency', level: 1 }, 360, 1.2e9, 5),
  q('签下顶流周以宁并升至「心动」', { kind: 'bond', hero: 'zhouyining', level: 2 }, 360, 2e9, 4),
  q('开启金融区云顶酒店', { kind: 'shop', shop: 'hotel', level: 1 }, 380, 4e9, 6),
  q('任意店员达到满星 ★5', { kind: 'staffStar', star: 5 }, 380, 6e9, 6),
  q('身价突破 100 亿', { kind: 'netWorth', amount: 1e10 }, 400, 1e10, 10),
  q('观看第 7 章恭迎大小姐', { kind: 'chapterWatched', chapter: 7 }, 400, 1.5e10, 6),

  // 第 7 章 ~ 第 8 章（决战千亿首富）
  q('创立晚星集团总部', { kind: 'shop', shop: 'group', level: 1 }, 420, 2.5e10, 8),
  q('与宿敌霍霆琛升至「心动」', { kind: 'bond', hero: 'huotingchen', level: 2 }, 420, 4e10, 6),
  q('集齐全部 20 名传奇店员', { kind: 'staffCount', count: 20 }, 450, 6e10, 10),
  q('晚星集团升至 Lv25 激活女皇光环', { kind: 'shop', shop: 'group', level: 25 }, 450, 8e10, 10),
  q('身价登顶 1000 亿全城首富', { kind: 'netWorth', amount: 1e11 }, 500, 1.5e11, 15),
  q('观看第 8 章首富终章盛典', { kind: 'chapterWatched', chapter: 8 }, 500, 2e11, 20),
];
