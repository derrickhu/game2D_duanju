/** 城区、门店、商业协同光环、女主服装与身份头衔。 */

export type AreaId = 'oldstreet' | 'campus' | 'cbd' | 'riverside' | 'ent' | 'finance';

export interface AreaDef {
  id: AreaId;
  name: string;
  unlockNetWorth: number;
  vibe: string;
}

export const AREAS: readonly AreaDef[] = [
  { id: 'oldstreet', name: '老街夜市', unlockNetWorth: 0, vibe: '烟火灯串 · 逆袭起点' },
  { id: 'campus', name: '大学城', unlockNetWorth: 1e5, vibe: '梧桐书香 · 青春客流' },
  { id: 'cbd', name: 'CBD', unlockNetWorth: 1e6, vibe: '摩天律政 · 精英商圈' },
  { id: 'riverside', name: '江景区', unlockNetWorth: 5e7, vibe: '跨江霓虹 · 名流俱乐部' },
  { id: 'ent', name: '娱乐区', unlockNetWorth: 1e9, vibe: '星光巨幕 · 造星工厂' },
  { id: 'finance', name: '金融区', unlockNetWorth: 4e9, vibe: '云端停机坪 · 资本中枢' },
];

export type ShopId =
  | 'stall' | 'dessert' | 'cafe' | 'gym' | 'law'
  | 'garage' | 'clinic' | 'agency' | 'hotel' | 'group';

export type SynergyKind =
  | 'tapMult'
  | 'allShopMult'
  | 'staffMult'
  | 'tapShare'
  | 'costDiscount'
  | 'rushMult'
  | 'offlineRate'
  | 'feverMult'
  | 'areaMult'
  | 'empireMult';

export interface ShopSynergyDef {
  kind: SynergyKind;
  label: string;
  /** Lv25 激活初阶全局光环，Lv50 升为高阶全局光环 */
  lv25: number;
  lv50: number;
  unit: 'pct' | 'pt';
}

export interface ShopDef {
  id: ShopId;
  name: string;
  badge: string;
  area: AreaId;
  unlockNetWorth: number;
  baseCost: number;
  baseIncome: number;
  /** 随里程碑解锁的 5 档招牌单品（Lv1 / Lv10 / Lv25 / Lv50 / Lv100+） */
  products: readonly [string, string, string, string, string];
  /** 老店不淘汰机制：达到 Lv25 / Lv50 给全商业帝国提供永久协同增益 */
  synergy: ShopSynergyDef;
}

/**
 * 10 家产业阶梯：考虑中后期团建 ×2、羁绊、老店光环叠加约 4~8 倍，
 * 中后期门店裸回本时间逐级拉长，使活跃通关总时长稳定在 90~120 分钟，且终章前必开出晚星集团。
 */
export const SHOPS: readonly ShopDef[] = [
  {
    id: 'stall', name: '甜品摊', badge: '🧁', area: 'oldstreet',
    unlockNetWorth: 0, baseCost: 100, baseIncome: 1,
    products: ['红糖桂花糕', '古法星星酥', '流心奶黄酥', '晚星伴手礼', '老街非遗排队王'],
    synergy: { kind: 'tapMult', label: '手艺点击收益', lv25: 0.25, lv50: 0.60, unit: 'pct' },
  },
  {
    id: 'dessert', name: '甜品店', badge: '🍰', area: 'oldstreet',
    unlockNetWorth: 1e4, baseCost: 3.2e3, baseIncome: 10,
    products: ['草莓拿破仑', '星空慕斯杯', '法式歌剧院', '高定翻糖甜品台', '云城甜品地标'],
    synergy: { kind: 'allShopMult', label: '全门店基础收益', lv25: 0.15, lv50: 0.35, unit: 'pct' },
  },
  {
    id: 'cafe', name: '咖啡馆', badge: '☕', area: 'campus',
    unlockNetWorth: 1e5, baseCost: 4.5e4, baseIncome: 70,
    products: ['小猫拉花拿铁', '桂花冰萃美式', '晚星特调Dirty', '庄园手冲瑰夏', '高校打卡圣地'],
    synergy: { kind: 'staffMult', label: '全员店员产出', lv25: 0.25, lv50: 0.60, unit: 'pct' },
  },
  {
    id: 'gym', name: '健身房', badge: '🥊', area: 'cbd',
    unlockNetWorth: 1e6, baseCost: 5.5e5, baseIncome: 480,
    products: ['燃脂团课卡', '女子防身私教', '拳击减压特训', '明星体态定制', 'CBD运动生活馆'],
    synergy: { kind: 'tapShare', label: '点击转化秒伤比例', lv25: 0.008, lv50: 0.018, unit: 'pt' },
  },
  {
    id: 'law', name: '律所（合作）', badge: '⚖️', area: 'cbd',
    unlockNetWorth: 1e7, baseCost: 6.5e6, baseIncome: 3.6e3,
    products: ['秘方专利维权', '商业合同风控', '反商业诋毁诉讼', '跨国并购法务', '红圈金牌律所'],
    synergy: { kind: 'costDiscount', label: '全门店升级减免', lv25: 0.08, lv50: 0.18, unit: 'pct' },
  },
  {
    id: 'garage', name: '改装车行', badge: '🏎️', area: 'riverside',
    unlockNetWorth: 5e7, baseCost: 3.8e7, baseIncome: 1.5e4,
    products: ['晚星蓝改色膜', '赛道级氮气调校', '超跑私人养护', '冠军车队联名', '江景超跑俱乐部'],
    synergy: { kind: 'rushMult', label: '急单与奇遇收益', lv25: 0.30, lv50: 0.70, unit: 'pct' },
  },
  {
    id: 'clinic', name: '医美诊所', badge: '💎', area: 'riverside',
    unlockNetWorth: 1.5e8, baseCost: 1.3e8, baseIncome: 4.5e4,
    products: ['水光焕肤管理', '光电轻奢抗衰', '红毯急救SPA', '私人健康顾问', '名流高定美学馆'],
    synergy: { kind: 'offlineRate', label: '离线收益转化率', lv25: 0.12, lv50: 0.25, unit: 'pt' },
  },
  {
    id: 'agency', name: '经纪公司', badge: '🌟', area: 'ent',
    unlockNetWorth: 1e9, baseCost: 9e8, baseIncome: 2.6e5,
    products: ['新星练习生企划', '金曲《晚星》首发', 'S级漫剧出品', '万人体育场巡演', '亚洲造星娱乐集团'],
    synergy: { kind: 'feverMult', label: '爆单与直播收益', lv25: 0.30, lv50: 0.75, unit: 'pct' },
  },
  {
    id: 'hotel', name: '云顶酒店', badge: '🏰', area: 'finance',
    unlockNetWorth: 4e9, baseCost: 3.2e9, baseIncome: 1.1e6,
    products: ['云端行政酒廊', '米其林三星晚宴', '停机坪皇家礼宾', '慈善名流夜宴', '七星地标奢华酒店'],
    synergy: { kind: 'areaMult', label: '城区团建加成增幅', lv25: 0.20, lv50: 0.50, unit: 'pct' },
  },
  {
    id: 'group', name: '晚星集团', badge: '👑', area: 'finance',
    unlockNetWorth: 1.8e10, baseCost: 1.2e10, baseIncome: 5.5e6,
    products: ['晚星商业综合体', '全国餐饮供应链', '盛氏家族信托合流', '跨国资本控股', '云城首富商业帝国'],
    synergy: { kind: 'empireMult', label: '全帝国最终乘区', lv25: 0.30, lv50: 0.80, unit: 'pct' },
  },
];

export type OutfitId = 'tee' | 'shirt' | 'tweed' | 'suit' | 'gown';

export interface OutfitDef {
  id: OutfitId;
  name: string;
  unlockNetWorth: number;
  scene: string;
  counterName: string;
  orderItems: readonly [string, string, string];
}

export const OUTFITS: readonly OutfitDef[] = [
  {
    id: 'tee', name: '白 T 恤 + 帆布围裙', unlockNetWorth: 0,
    scene: '暖阳花巷', counterName: '外婆的甜品木摊',
    orderItems: ['🧁 桂花糕', '⭐ 星星酥', '🥛 热豆浆'],
  },
  {
    id: 'shirt', name: '白衬衫店员装', unlockNetWorth: 1e4,
    scene: '晚星甜品首店', counterName: '法式甜品展示柜',
    orderItems: ['🍰 草莓拿破仑', '✨ 星空慕斯', '☕ 猫咪拿铁'],
  },
  {
    id: 'tweed', name: '小香风名媛外套', unlockNetWorth: 1e7,
    scene: '落地窗总裁办', counterName: '品牌主理人办公台',
    orderItems: ['📋 加盟合约', '🎁 非遗礼盒单', '💼 品牌联名案'],
  },
  {
    id: 'suit', name: '高定雪白西装', unlockNetWorth: 1e9,
    scene: '晚星大厦顶楼', counterName: '董事长战略决策台',
    orderItems: ['🏢 地产收购书', '🌟 顶流代言约', '📈 集团注资单'],
  },
  {
    id: 'gown', name: '星河藏青高定礼服', unlockNetWorth: 1e11,
    scene: '首富发布会盛典', counterName: '晚星盛典主礼台',
    orderItems: ['👑 盛氏遗产交接', '💎 跨国敲钟席', '🥂 慈善主宾席'],
  },
];

export interface QueenTitleDef {
  title: string;
  unlockNetWorth: number;
}

export const QUEEN_TITLES: readonly QueenTitleDef[] = [
  { title: '夜市甜品摊主', unlockNetWorth: 0 },
  { title: '晚星人气店长', unlockNetWorth: 1e4 },
  { title: '连锁品牌主理人', unlockNetWorth: 1e5 },
  { title: '商圈新锐投资人', unlockNetWorth: 1e6 },
  { title: '打脸维权女总裁', unlockNetWorth: 1e7 },
  { title: '亿万慈善企业家', unlockNetWorth: 1e8 },
  { title: '百亿商界猎手', unlockNetWorth: 1e9 },
  { title: '盛家真千金掌门', unlockNetWorth: 1e10 },
  { title: '云城首富女皇', unlockNetWorth: 1e11 },
];

export function queenTitleFor(netWorth: number): string {
  let current = QUEEN_TITLES[0].title;
  for (const t of QUEEN_TITLES) {
    if (netWorth >= t.unlockNetWorth) current = t.title;
  }
  return current;
}

export function shopById(id: ShopId): ShopDef {
  const shop = SHOPS.find((s) => s.id === id);
  if (!shop) throw new Error(`unknown shop ${id}`);
  return shop;
}

/** 当前门店等级对应的招牌单品名称 */
export function shopProductAt(shop: ShopDef, level: number): string {
  if (level >= 100) return shop.products[4];
  if (level >= 50) return shop.products[3];
  if (level >= 25) return shop.products[2];
  if (level >= 10) return shop.products[1];
  return shop.products[0];
}
