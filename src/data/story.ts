/**
 * 主线章节、男主、视频目录。对应策划案 §6、§7。
 *
 * 视频文件放 CDN 的 `videos/` 目录，文件名 = 视频 id + `.mp4`。
 * 视频还没生成时，播放会失败并提示“剧情视频制作中”，不影响解锁逻辑。
 */
import type { ShopId } from './world.ts';

export type VideoKind = 'main' | 'bond' | 'hidden' | 'extra' | 'ending';

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
  { id: 0, title: '序章 · 退婚宴', unlockNetWorth: 0, videos: ['ch00'] },
  { id: 1, title: '摆摊第一天', unlockNetWorth: 1e4, videos: ['ch01_s01', 'ch01_s02', 'ch01_s03', 'ch01_s04'] },
  { id: 2, title: '全款拿下', unlockNetWorth: 1e5, videos: ['ch02_s01', 'ch02_s02', 'ch02_s03', 'ch02_s04'] },
  { id: 3, title: '黑卡砸场', unlockNetWorth: 1e6, videos: ['ch03_s01', 'ch03_s02', 'ch03_s03', 'ch03_s04'] },
  { id: 4, title: '恶人先告状', unlockNetWorth: 1e7, videos: ['ch04_s01', 'ch04_s02', 'ch04_s03', 'ch04_s04'] },
  { id: 5, title: '千万晚宴', unlockNetWorth: 1e8, videos: ['ch05_s01', 'ch05_s02', 'ch05_s03', 'ch05_s04'] },
  { id: 6, title: '跪求注资', unlockNetWorth: 1e9, videos: ['ch06_s01', 'ch06_s02', 'ch06_s03', 'ch06_s04'] },
  { id: 7, title: '恭迎大小姐', unlockNetWorth: 1e10, videos: ['ch07_s01', 'ch07_s02', 'ch07_s03', 'ch07_s04'] },
  { id: 8, title: '全城首富', unlockNetWorth: 1e11, videos: ['ch08_s01', 'ch08_s02', 'ch08_s03', 'ch08_s04'] },
];

export type HeroId =
  | 'luyu' | 'jiangxubai' | 'guye' | 'shenyan'
  | 'qinye' | 'xuzhiheng' | 'zhouyining' | 'huotingchen' | 'fujingshen';

type Five = readonly [string, string, string, string, string];
type Two = readonly [string, string];

export interface HeroDef {
  id: HeroId;
  name: string;
  title: string;
  /** 暗面称号：她看不见的那一面 */
  darkSide: string;
  /** 关联门店；没有关联门店的男主不能投资，羁绊随主线推进 */
  shop: ShopId | null;
  /** 羁绊 Lv3/Lv4/Lv5 额外要求的主线章节（主线男主防剧透） */
  chapterGate?: readonly [number, number, number];
  /** 不关联门店的男主：第 i 段羁绊视频在主线第 chapterBond[i] 章解锁 */
  chapterBond?: readonly [number, number, number, number, number];
  /** 不关联门店的男主：两段暗面在主线第几章解锁 */
  chapterHidden?: readonly [number, number];
  /** 心动线标题；不填用羁绊阶段名 */
  bondTitles?: Five;
  bondVideos: Five;
  /** 暗面线：她看不见的两段，羁绊 Lv2 / Lv4 解锁 */
  hiddenTitles: Two;
  hiddenVideos: Two;
  /** 看广告解锁。门店男主是暗面花絮，傅景辞是另一个结局 */
  extraTitle: string;
  extraVideo: string;
  /** 专属结局；羁绊满级且主线到第 8 章解锁 */
  endingVideo?: string;
}

const bond = (id: string): Five => [1, 2, 3, 4, 5].map((n) => `${id}_b${n}`) as unknown as Five;
const hidden = (id: string): Two => [`${id}_h1`, `${id}_h2`];

function shopHero(id: HeroId, name: string, title: string, darkSide: string, shop: ShopId, hiddenTitles: Two, extraTitle: string, extra?: Partial<HeroDef>): HeroDef {
  return {
    id, name, title, darkSide, shop,
    bondVideos: bond(id),
    hiddenTitles, hiddenVideos: hidden(id),
    extraTitle, extraVideo: `${id}_extra`,
    endingVideo: `${id}_ending`,
    ...extra,
  };
}

export const HEROES: readonly HeroDef[] = [
  shopHero('luyu', '陆屿', '隐藏继承人', '盛家的笑面阎王', 'dessert', ['笑面阎王', '十五年'], '一百盒', { chapterGate: [4, 6, 7] }),
  shopHero('jiangxubai', '江叙白', '温柔学弟', '白切黑的黑客 K', 'cafe', ['双标', 'K'], '醉话'),
  shopHero('guye', '顾野', '阳光教练', '地下拳台的野狼', 'gym', ['野狼', '双标'], '念念'),
  shopHero('shenyan', '沈砚', '冷面律师', '父亲没打赢的官司', 'law', ['刽子手', '旧卷宗'], '告白陈述书'),
  shopHero('qinye', '秦朔', '痞帅赛车手', '退役车神零号', 'garage', ['三年没笑', '刹车'], '弯道'),
  shopHero('xuzhiheng', '许知衡', '温柔医生', '没有温度的手术刀', 'clinic', ['400 毫升', '温柔刀'], '练习'),
  shopHero('zhouyining', '周以宁', '落难顶流', '宁折不弯', 'agency', ['拆台', '饭局'], '楼下'),
  shopHero('huotingchen', '霍霆琛', '宿敌霸总', '冷血的收购机器', 'group', ['不是你', '干净地赢'], '不土'),
  // 序章退婚 → 第 3 章砸场 → 第 5 章晚宴 → 第 6 章雨中求复合 → 第 6 章“原谅他”结局；广告解锁“再踩一脚”结局
  {
    id: 'fujingshen', name: '傅景辞', title: '前未婚夫', darkSide: '迟到的真心', shop: null,
    chapterBond: [0, 3, 5, 6, 6], chapterHidden: [6, 8],
    bondTitles: ['退婚', '砸场', '晚宴', '雨中', '结局 · 原谅他'],
    bondVideos: bond('fujingshen'),
    hiddenTitles: ['排队', '证据'], hiddenVideos: hidden('fujingshen'),
    extraTitle: '结局 · 再踩一脚', extraVideo: 'fujingshen_alt',
  },
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
    ch.videos.forEach((id, i) => map.set(id, {
      id,
      title: ch.videos.length === 1 ? ch.title : `${ch.title} · ${i + 1}`,
      kind: 'main',
    }));
  }
  for (const hero of HEROES) {
    hero.bondVideos.forEach((id, i) => map.set(id, { id, title: `${hero.name} · ${bondTitle(hero, i)}`, kind: 'bond' }));
    hero.hiddenVideos.forEach((id, i) => map.set(id, { id, title: `${hero.name} · ${hero.hiddenTitles[i]}`, kind: 'hidden' }));
    map.set(hero.extraVideo, { id: hero.extraVideo, title: `${hero.name} · ${hero.extraTitle}`, kind: 'extra', adLocked: true });
    if (hero.endingVideo) map.set(hero.endingVideo, { id: hero.endingVideo, title: `${hero.name} · 专属结局`, kind: 'ending' });
  }
  return map;
}

const STAGES = ['初遇', '心动', '暧昧', '告白', '专属约会'];

export function bondTitle(hero: HeroDef, i: number): string {
  return hero.bondTitles?.[i] ?? STAGES[i];
}

/** 暗面需要的羁绊等级（门店男主） */
export const HIDDEN_BOND: readonly [number, number] = [2, 4];

/** 全城首富那一章结尾播放的专属结局 */
export const FINAL_CHAPTER = 8;

export const VIDEOS: ReadonlyMap<string, VideoDef> = buildVideoCatalog();

export function videoPath(id: string): string {
  return `videos/${id}.mp4`;
}
