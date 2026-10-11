/**
 * 主线章节、男主、视频目录。对应策划案 §6、§7。
 *
 * 视频文件放 CDN 的 `videos/` 目录，文件名 = 视频 id + `.mp4`。
 * 视频还没生成时，播放会失败并提示“剧情视频制作中”，不影响解锁逻辑。
 */
import type { ShopId } from './world.ts';

export type VideoKind = 'main' | 'bond' | 'extra' | 'ending';

export interface VideoDef {
  id: string;
  title: string;
  kind: VideoKind;
  /** 需要看激励广告才能解锁 */
  adLocked?: boolean;
}

export interface ChapterDef {
  id: number;
  title: string;
  unlockNetWorth: number;
  videos: readonly string[];
}

export const CHAPTERS: readonly ChapterDef[] = [
  { id: 0, title: '序章 · 订婚宴', unlockNetWorth: 0, videos: ['ch00_s01', 'ch00_s02', 'ch00_s03', 'ch00_s04'] },
  { id: 1, title: '第一单', unlockNetWorth: 1e4, videos: ['ch01_s01', 'ch01_s02', 'ch01_s03', 'ch01_s04'] },
  { id: 2, title: '我的店', unlockNetWorth: 1e5, videos: ['ch02_s01', 'ch02_s02', 'ch02_s03', 'ch02_s04'] },
  { id: 3, title: '砸场', unlockNetWorth: 1e6, videos: ['ch03_s01', 'ch03_s02', 'ch03_s03', 'ch03_s04'] },
  { id: 4, title: '抄袭官司', unlockNetWorth: 1e7, videos: ['ch04_s01', 'ch04_s02', 'ch04_s03', 'ch04_s04'] },
  { id: 5, title: '慈善晚宴', unlockNetWorth: 1e8, videos: ['ch05_s01', 'ch05_s02', 'ch05_s03', 'ch05_s04'] },
  { id: 6, title: '收购苏氏', unlockNetWorth: 1e9, videos: ['ch06_s01', 'ch06_s02', 'ch06_s03', 'ch06_s04'] },
  { id: 7, title: '身世', unlockNetWorth: 1e10, videos: ['ch07_s01', 'ch07_s02', 'ch07_s03', 'ch07_s04'] },
  { id: 8, title: '全城首富', unlockNetWorth: 1e11, videos: ['ch08_s01', 'ch08_s02', 'ch08_s03', 'ch08_s04'] },
];

export type HeroId =
  | 'luyu' | 'jiangxubai' | 'guye' | 'shenyan'
  | 'qinye' | 'xuzhiheng' | 'zhouyining' | 'huotingchen' | 'fujingshen';

export interface HeroDef {
  id: HeroId;
  name: string;
  title: string;
  /** 关联门店；没有关联门店的男主不能投资，羁绊随主线推进 */
  shop: ShopId | null;
  /** 羁绊 Lv3/Lv4/Lv5 额外要求的主线章节（主线男主防剧透） */
  chapterGate?: readonly [number, number, number];
  /** 不关联门店的男主：第 i 段羁绊视频在主线第 chapterBond[i] 章解锁 */
  chapterBond?: readonly [number, number, number, number, number];
  bondVideos: readonly [string, string, string, string, string];
  extraVideo: string;
}

const bond = (id: string): [string, string, string, string, string] =>
  [1, 2, 3, 4, 5].map((n) => `${id}_b${n}`) as [string, string, string, string, string];

export const HEROES: readonly HeroDef[] = [
  { id: 'luyu', name: '陆屿', title: '隐藏继承人', shop: 'dessert', chapterGate: [4, 6, 7], bondVideos: bond('luyu'), extraVideo: 'luyu_extra' },
  { id: 'jiangxubai', name: '江叙白', title: '温柔学弟', shop: 'cafe', bondVideos: bond('jiangxubai'), extraVideo: 'jiangxubai_extra' },
  { id: 'guye', name: '顾野', title: '阳光教练', shop: 'gym', bondVideos: bond('guye'), extraVideo: 'guye_extra' },
  { id: 'shenyan', name: '沈砚', title: '冷面律师', shop: 'law', bondVideos: bond('shenyan'), extraVideo: 'shenyan_extra' },
  { id: 'qinye', name: '秦野', title: '痞帅赛车手', shop: 'garage', bondVideos: bond('qinye'), extraVideo: 'qinye_extra' },
  { id: 'xuzhiheng', name: '许知衡', title: '温柔医生', shop: 'clinic', bondVideos: bond('xuzhiheng'), extraVideo: 'xuzhiheng_extra' },
  { id: 'zhouyining', name: '周以宁', title: '落难顶流', shop: 'agency', bondVideos: bond('zhouyining'), extraVideo: 'zhouyining_extra' },
  { id: 'huotingchen', name: '霍霆琛', title: '宿敌霸总', shop: 'group', bondVideos: bond('huotingchen'), extraVideo: 'huotingchen_extra' },
  // 序章退婚 → 第 3 章砸场 → 第 5 章晚宴 → 第 6 章雨中求复合 → 第 6 章“原谅他”结局；番外是“再踩一脚”结局
  { id: 'fujingshen', name: '傅景深', title: '前未婚夫', shop: null, chapterBond: [0, 3, 5, 6, 6], bondVideos: bond('fujingshen'), extraVideo: 'fujingshen_alt' },
];

export function heroById(id: HeroId): HeroDef {
  const hero = HEROES.find((h) => h.id === id);
  if (!hero) throw new Error(`unknown hero ${id}`);
  return hero;
}

export function heroForShop(shop: ShopId): HeroDef | null {
  return HEROES.find((h) => h.shop === shop) ?? null;
}

function buildVideoCatalog(): Map<string, VideoDef> {
  const map = new Map<string, VideoDef>();
  for (const ch of CHAPTERS) {
    ch.videos.forEach((id, i) => map.set(id, { id, title: `${ch.title} · ${i + 1}`, kind: 'main' }));
  }
  const stages = ['初遇', '心动', '暧昧', '告白', '专属约会'];
  for (const hero of HEROES) {
    hero.bondVideos.forEach((id, i) => map.set(id, { id, title: `${hero.name} · ${stages[i]}`, kind: 'bond' }));
    map.set(hero.extraVideo, { id: hero.extraVideo, title: `${hero.name} · 番外`, kind: 'extra', adLocked: true });
  }
  return map;
}

export const VIDEOS: ReadonlyMap<string, VideoDef> = buildVideoCatalog();

export function videoPath(id: string): string {
  return `videos/${id}.mp4`;
}
