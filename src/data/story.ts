/**
 * 主线章节、男主、合伙人特权、视频与动态CG目录。
 *
 * - 主线（序章~第8章）与陆屿已出片段走 CDN 视频播放；
 * - 其余男主心动线、暗面线、花絮与结局统一走「韩漫心动 CG 剧场」（零黑屏缓冲，预留 `subpkg_images/cg_<id>.jpg` 扩展位）。
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

export interface ChapterRivalDef {
  rivalName: string;
  rivalTitle: string;
  conflict: string;
  slapQuote: string;
  roseReward: number;
}

export interface ChapterDef {
  id: number;
  title: string;
  unlockNetWorth: number;
  videos: readonly string[];
  rival?: ChapterRivalDef;
}

export const CHAPTERS: readonly ChapterDef[] = [
  { id: 0, title: '序章 · 退婚宴', unlockNetWorth: 0, videos: ['ch00'] },
  {
    id: 1, title: '摆摊第一天', unlockNetWorth: 1e4,
    videos: ['ch01_s01', 'ch01_s02', 'ch01_s03', 'ch01_s04'],
    rival: {
      rivalName: '王姐', rivalTitle: '老街恶霸地头蛇',
      conflict: '带人掀翻点心盒，索要双倍保护费',
      slapQuote: '整条街的摊位都在排我的星星酥，你算哪根葱？',
      roseReward: 3,
    },
  },
  {
    id: 2, title: '全款拿下', unlockNetWorth: 1e5,
    videos: ['ch02_s01', 'ch02_s02', 'ch02_s03', 'ch02_s04'],
    rival: {
      rivalName: '周房东', rivalTitle: '势利眼二房东',
      conflict: '嘲讽假千金租不起铺面，临时坐地起价三倍押金',
      slapQuote: '谁说我要租？这整栋楼，我已经和业主全款签下了！',
      roseReward: 4,
    },
  },
  {
    id: 3, title: '黑卡砸场', unlockNetWorth: 1e6,
    videos: ['ch03_s01', 'ch03_s02', 'ch03_s03', 'ch03_s04'],
    rival: {
      rivalName: '傅景辞 & 苏婉柔', rivalTitle: '傲慢前任与白莲真千金',
      conflict: '当众吐掉甜品砸店，甩出黑卡要苏晚低头认错',
      slapQuote: '恶意插队加毁损商品，按十倍结账，刷卡还是滚？',
      roseReward: 5,
    },
  },
  {
    id: 4, title: '恶人先告状', unlockNetWorth: 1e7,
    videos: ['ch04_s01', 'ch04_s02', 'ch04_s03', 'ch04_s04'],
    rival: {
      rivalName: '苏氏食品法务部', rivalTitle: '豪门金牌律师团',
      conflict: '偷走外婆古法秘方抢发新品，反告晚星甜品侵权',
      slapQuote: '二十年前的手稿笔迹鉴定在此——苏氏全线产品立刻下架道歉！',
      roseReward: 6,
    },
  },
  {
    id: 5, title: '千万晚宴', unlockNetWorth: 1e8,
    videos: ['ch05_s01', 'ch05_s02', 'ch05_s03', 'ch05_s04'],
    rival: {
      rivalName: '苏家养父母', rivalTitle: '被拦在门外的势利豪门',
      conflict: '捐赠不足千万被拒之门外，却笃定苏晚只是来端盘子的服务生',
      slapQuote: '不好意思，今晚慈善夜唯一的主宾兼最高捐赠人，姓苏名晚。',
      roseReward: 8,
    },
  },
  {
    id: 6, title: '跪求注资', unlockNetWorth: 1e9,
    videos: ['ch06_s01', 'ch06_s02', 'ch06_s03', 'ch06_s04'],
    rival: {
      rivalName: '苏卫国', rivalTitle: '资金链断裂的苏氏董事长',
      conflict: '苏氏股价崩盘面临破产，在晚星大堂苦等三小时求见',
      slapQuote: '签了这份一折收购书，苏氏还能留个招牌——慢走不送。',
      roseReward: 10,
    },
  },
  {
    id: 7, title: '恭迎大小姐', unlockNetWorth: 1e10,
    videos: ['ch07_s01', 'ch07_s02', 'ch07_s03', 'ch07_s04'],
    rival: {
      rivalName: '苏婉柔', rivalTitle: '持假DNA冒充首富外孙女',
      conflict: '在盛家老宅哭诉认亲，妄图独吞盛氏千亿信托遗产',
      slapQuote: '拿假报告骗到我外公家里来了？管家，关门，报警！',
      roseReward: 12,
    },
  },
  {
    id: 8, title: '全城首富', unlockNetWorth: 1e11,
    videos: ['ch08_s01', 'ch08_s02', 'ch08_s03', 'ch08_s04'],
    rival: {
      rivalName: '旧日豪门全员', rivalTitle: '曾经看轻她的名利场',
      conflict: '晚星集团千亿敲钟盛典，昔日仇家排队递名片求合作',
      slapQuote: '三年前你们笑我一无所有，今天，我不必再看任何人脸色！',
      roseReward: 20,
    },
  },
];

export type HeroId =
  | 'luyu' | 'jiangxubai' | 'guye' | 'shenyan'
  | 'qinye' | 'xuzhiheng' | 'zhouyining' | 'huotingchen' | 'fujingshen';

export type PartnerSkillKind =
  | 'critChance'
  | 'autoTap'
  | 'staffBoost'
  | 'shopDiscount'
  | 'rushBoost'
  | 'offlineBoost'
  | 'feverBoost'
  | 'empireBoost'
  | 'fameBoost';

export interface HeroPartnerSkill {
  name: string;
  desc: string;
  kind: PartnerSkillKind;
  perBond: number;
}

type Five = readonly [string, string, string, string, string];
type Two = readonly [string, string];

export interface HeroDef {
  id: HeroId;
  name: string;
  title: string;
  /** 角色专属印象色（用于韩漫卡片与CG剧场氛围光） */
  accentColor: number;
  /** 暗面称号：她看不见的那一面 */
  darkSide: string;
  /** 关联门店；没有关联门店的男主不能投资，羁绊随主线推进 */
  shop: ShopId | null;
  /** 合伙人专属商业特权（随羁绊等级成长） */
  skill: HeroPartnerSkill;
  /** 羁绊 Lv3/Lv4/Lv5 额外要求的主线章节（主线男主防剧透） */
  chapterGate?: readonly [number, number, number];
  /** 不关联门店的男主：第 i 段羁绊在主线第 chapterBond[i] 章解锁 */
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

function shopHero(
  id: HeroId,
  name: string,
  title: string,
  accentColor: number,
  darkSide: string,
  shop: ShopId,
  skill: HeroPartnerSkill,
  hiddenTitles: Two,
  extraTitle: string,
  extra?: Partial<HeroDef>,
): HeroDef {
  return {
    id, name, title, accentColor, darkSide, shop, skill,
    bondVideos: bond(id),
    hiddenTitles, hiddenVideos: hidden(id),
    extraTitle, extraVideo: `${id}_extra`,
    endingVideo: `${id}_ending`,
    ...extra,
  };
}

export const HEROES: readonly HeroDef[] = [
  shopHero(
    'luyu', '陆屿', '隐藏继承人', 0x4A6FA5, '盛家的笑面阎王', 'dessert',
    { name: '偏爱暴击', desc: '手艺点击触发「3倍甜品暴击」概率 +7%/级', kind: 'critChance', perBond: 0.07 },
    ['笑面阎王', '十五年'], '一百盒', { chapterGate: [4, 6, 7] },
  ),
  shopHero(
    'jiangxubai', '江叙白', '温柔学弟', 0x6B9E78, '白切黑的黑客 K', 'cafe',
    { name: 'K的自动脚本', desc: '后台每秒自动帮你制作点单 +1次/级', kind: 'autoTap', perBond: 1 },
    ['双标', 'K'], '醉话',
  ),
  shopHero(
    'guye', '顾野', '阳光教练', 0xD96B52, '地下拳台的野狼', 'gym',
    { name: '热血团魂', desc: '全员帅哥店员每秒产出 +18%/级', kind: 'staffBoost', perBond: 0.18 },
    ['野狼', '双标'], '念念',
  ),
  shopHero(
    'shenyan', '沈砚', '冷面律师', 0xB8925A, '父亲没打赢的官司', 'law',
    { name: '法务护航', desc: '所有门店开店与升级费用减免 3%/级', kind: 'shopDiscount', perBond: 0.03 },
    ['刽子手', '旧卷宗'], '告白陈述书',
  ),
  shopHero(
    'qinye', '秦朔', '痞帅赛车手', 0xD1495B, '退役车神零号', 'garage',
    { name: '零号极速', desc: '接急单与街头奇遇现金收益 +22%/级', kind: 'rushBoost', perBond: 0.22 },
    ['三年没笑', '刹车'], '弯道',
  ),
  shopHero(
    'xuzhiheng', '许知衡', '温柔医生', 0x5B9AA0, '没有温度的手术刀', 'clinic',
    { name: '安心守护', desc: '离线收益转化率 +4%/级，上限 +30分/级', kind: 'offlineBoost', perBond: 0.04 },
    ['400 毫升', '温柔刀'], '练习',
  ),
  shopHero(
    'zhouyining', '周以宁', '落难顶流', 0x9B72AA, '宁折不弯', 'agency',
    { name: '顶流效应', desc: '爆单 Fever 与直播带货倍率额外 +25%/级', kind: 'feverBoost', perBond: 0.25 },
    ['拆台', '饭局'], '楼下',
  ),
  shopHero(
    'huotingchen', '霍霆琛', '宿敌霸总', 0x3D6B5E, '冷血的收购机器', 'group',
    { name: '资本杠杆', desc: '全商业帝国最终每秒收益 +20%/级', kind: 'empireBoost', perBond: 0.20 },
    ['不是你', '干净地赢'], '不土',
  ),
  {
    id: 'fujingshen', name: '傅景辞', title: '前未婚夫', accentColor: 0x7A8B99,
    darkSide: '迟到的真心', shop: null,
    skill: { name: '全城热议', desc: '每次主线打脸他的悔恨都化为品牌热度，全收益 +5%/阶', kind: 'fameBoost', perBond: 0.05 },
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

/** 已有实拍/动画视频文件的剧集集合；未在此集合中的男主剧集自动走「韩漫心动 CG 剧场」 */
export const READY_VIDEOS: ReadonlySet<string> = new Set<string>([
  'ch00',
  'ch01_s01', 'ch01_s02', 'ch01_s03', 'ch01_s04',
  'ch02_s01', 'ch02_s02', 'ch02_s03', 'ch02_s04',
  'ch03_s01', 'ch03_s02', 'ch03_s03', 'ch03_s04',
  'ch04_s01', 'ch04_s02', 'ch04_s03', 'ch04_s04',
  'ch05_s01', 'ch05_s02', 'ch05_s03', 'ch05_s04',
  'ch06_s01', 'ch06_s02', 'ch06_s03', 'ch06_s04',
  'ch07_s01', 'ch07_s02', 'ch07_s03', 'ch07_s04',
  'ch08_s01', 'ch08_s02', 'ch08_s03', 'ch08_s04',
  'luyu_b1', 'luyu_b2', 'luyu_b3', 'luyu_ending',
]);

export function isVideoFileReady(id: string): boolean {
  return READY_VIDEOS.has(id);
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

/** 预留的男主 CG 插画路径（后续生图额度恢复后放入 subpkg_images 即可自动启用） */
export function heroCgPath(videoId: string): string {
  return `subpkg_images/cg_${videoId}.jpg`;
}
