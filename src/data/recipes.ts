/**
 * 招牌爆品研发室数据表：
 * 「核心基底 × 灵魂风味 × 破圈造势」三维度词条池 + 16 款传世命名爆品配方 + 全组合保底推演规则。
 */

export type RecipeGrade = 'B' | 'A' | 'S' | 'SS';

export type RecipeBuffKind =
  | 'shopIncome'   // 挂载门店秒伤独立加成
  | 'tapCrit'      // 挂载后全局手艺暴击率加成
  | 'battleRep'    // 商战【口碑】系手牌威力加成
  | 'battleCap'    // 商战【资本】系手牌威力加成
  | 'battleLeg'    // 商战【法务】系手牌威力加成
  | 'costCut';     // 全局门店升级花费额外减免

export interface IngredientDef {
  id: string;
  slot: 'base' | 'soul' | 'hype';
  name: string;
  tag: string;
  unlockNetWorth: number;
  affinity: number; // 基础品质权重 1~4
  buffBias: RecipeBuffKind;
}

export const RECIPE_BASES: readonly IngredientDef[] = [
  { id: 'puff', slot: 'base', name: '古法起酥皮', tag: '传统非遗', unlockNetWorth: 0, affinity: 2, buffBias: 'shopIncome' },
  { id: 'mousse', slot: 'base', name: '法式云朵慕斯', tag: '轻盈奶香', unlockNetWorth: 0, affinity: 2, buffBias: 'battleRep' },
  { id: 'brew', slot: 'base', name: '庄园冷萃原液', tag: '回甘醇厚', unlockNetWorth: 0, affinity: 2, buffBias: 'tapCrit' },
  { id: 'nectar', slot: 'base', name: '桃胶燕窝冻', tag: '轻奢养颜', unlockNetWorth: 5e4, affinity: 3, buffBias: 'shopIncome' },
  { id: 'aroma', slot: 'base', name: '冷制雪松香膏', tag: '名流沙龙', unlockNetWorth: 5e6, affinity: 3, buffBias: 'battleLeg' },
  { id: 'essence', slot: 'base', name: '极光胜肽精华', tag: '高定黑科技', unlockNetWorth: 1e8, affinity: 4, buffBias: 'battleCap' },
];

export const RECIPE_SOULS: readonly IngredientDef[] = [
  { id: 'osmanthus', slot: 'soul', name: '金桂甜酒酿', tag: '外婆秘传', unlockNetWorth: 0, affinity: 2, buffBias: 'shopIncome' },
  { id: 'berry', slot: 'soul', name: '红颜鲜草莓', tag: '清甜爆汁', unlockNetWorth: 0, affinity: 2, buffBias: 'tapCrit' },
  { id: 'matcha', slot: 'soul', name: '宇治千目抹茶', tag: '微苦禅意', unlockNetWorth: 0, affinity: 2, buffBias: 'costCut' },
  { id: 'truffle', slot: 'soul', name: '黑松露海盐', tag: '米其林风味', unlockNetWorth: 1e5, affinity: 3, buffBias: 'battleCap' },
  { id: 'goldleaf', slot: 'soul', name: '食用99金箔', tag: '晚宴吸睛', unlockNetWorth: 1e7, affinity: 3, buffBias: 'battleRep' },
  { id: 'camellia', slot: 'soul', name: '高山红山茶萃', tag: '东方高定', unlockNetWorth: 2e8, affinity: 4, buffBias: 'shopIncome' },
];

export const RECIPE_HYPES: readonly IngredientDef[] = [
  { id: 'tasting', slot: 'hype', name: '夜市开炉试吃', tag: '十里飘香', unlockNetWorth: 0, affinity: 2, buffBias: 'shopIncome' },
  { id: 'starbox', slot: 'hype', name: '星空烫金礼盒', tag: '送礼体面', unlockNetWorth: 0, affinity: 2, buffBias: 'battleRep' },
  { id: 'campus_pop', slot: 'hype', name: '校草一日店长', tag: '少女尖叫', unlockNetWorth: 0, affinity: 2, buffBias: 'tapCrit' },
  { id: 'blindbox', slot: 'hype', name: '隐藏款纹章签', tag: '复购疯抢', unlockNetWorth: 2e5, affinity: 3, buffBias: 'costCut' },
  { id: 'patent', slot: 'hype', name: '独家秘方公证', tag: '铁壁护城河', unlockNetWorth: 1e7, affinity: 3, buffBias: 'battleLeg' },
  { id: 'gala_auction', slot: 'hype', name: '慈善夜限量竞拍', tag: '豪门争藏', unlockNetWorth: 5e8, affinity: 4, buffBias: 'battleCap' },
];

export interface SignatureRecipeDef {
  comboKey: string; // `${baseId}_${soulId}_${hypeId}`
  name: string;
  grade: 'S' | 'SS';
  buffKind: RecipeBuffKind;
  baseVal: number;
  desc: string;
  /** 未研发出时显示在推理手札里的暗语线索 */
  hint: string;
  roseReward: number;
}

export const SIGNATURE_RECIPES: readonly SignatureRecipeDef[] = [
  {
    comboKey: 'puff_osmanthus_starbox',
    name: '月宫金桂星星酥',
    grade: 'SS',
    buffKind: 'shopIncome',
    baseVal: 0.55,
    desc: '外婆手札头号绝学，千层酥皮咬开满口桂花香，烫金星盒一盒难求。',
    hint: '手札线索：「古法起酥」裹住「金桂甜酒」，再装进「星空烫金盒」。',
    roseReward: 5,
  },
  {
    comboKey: 'puff_osmanthus_tasting',
    name: '老街十里桂花酥',
    grade: 'S',
    buffKind: 'tapCrit',
    baseVal: 0.06,
    desc: '当街开炉热气腾腾，整条夜市的食客都被香味勾得走不动路。',
    hint: '手札线索：「古法起酥」配「金桂甜酒」，趁热在「夜市开炉试吃」。',
    roseReward: 3,
  },
  {
    comboKey: 'mousse_berry_starbox',
    name: '绯色初恋拿破仑',
    grade: 'S',
    buffKind: 'battleRep',
    baseVal: 0.32,
    desc: '酸甜红颜莓撞上云朵慕斯，口碑好评率飙上同城榜一。',
    hint: '手札线索：「云朵慕斯」点缀「红颜草莓」，系上「星空烫金盒」丝带。',
    roseReward: 3,
  },
  {
    comboKey: 'brew_matcha_campus_pop',
    name: '梧桐宇治冰萃',
    grade: 'S',
    buffKind: 'shopIncome',
    baseVal: 0.42,
    desc: '大学城爆火断货王，学长递出咖啡那一刻快门声响成一片。',
    hint: '手札线索：「庄园冷萃」融入「宇治抹茶」，请「校草一日店长」快闪。',
    roseReward: 3,
  },
  {
    comboKey: 'mousse_matcha_tasting',
    name: '青岚云顶舒芙蕾',
    grade: 'S',
    buffKind: 'costCut',
    baseVal: 0.04,
    desc: '极致轻盈的抹茶奶盖配方，损耗率极低，备受连锁门店推崇。',
    hint: '手札线索：「云朵慕斯」轻筛「宇治抹茶」，现场「夜市开炉试吃」。',
    roseReward: 3,
  },
  {
    comboKey: 'brew_berry_campus_pop',
    name: '微醺莓果冷萃冻',
    grade: 'S',
    buffKind: 'tapCrit',
    baseVal: 0.07,
    desc: '清爽果香混搭冷萃咖啡因，手艺出单速度翻倍提升。',
    hint: '手札线索：「庄园冷萃」碰撞「红颜草莓」，引爆「校草一日店长」话题。',
    roseReward: 3,
  },
  {
    comboKey: 'nectar_osmanthus_blindbox',
    name: '晚星琥珀燕窝盏',
    grade: 'SS',
    buffKind: 'shopIncome',
    baseVal: 0.65,
    desc: '温润桃胶燕窝佐以桂花酿，碗底藏着纯金纹章签，名媛圈疯抢。',
    hint: '手札线索：「桃胶燕窝」慢炖「金桂甜酒」，暗藏「隐藏款纹章签」。',
    roseReward: 6,
  },
  {
    comboKey: 'puff_truffle_blindbox',
    name: '黑金松露千层酥',
    grade: 'S',
    buffKind: 'battleCap',
    baseVal: 0.35,
    desc: '咸甜交织的高奢口感，连挑剔的投行高管都整箱预订做伴手礼。',
    hint: '手札线索：「古法起酥」撒上「黑松露海盐」，搭配「隐藏款纹章签」。',
    roseReward: 4,
  },
  {
    comboKey: 'nectar_goldleaf_starbox',
    name: '流光碎金星河冻',
    grade: 'SS',
    buffKind: 'battleRep',
    baseVal: 0.48,
    desc: '晃动间金箔如星河倾泻，一经亮相便碾压苏氏全部旧款礼盒。',
    hint: '手札线索：「桃胶燕窝」缀满「食用金箔」，盛入「星空烫金盒」。',
    roseReward: 6,
  },
  {
    comboKey: 'aroma_matcha_patent',
    name: '听松冷翠东方香',
    grade: 'SS',
    buffKind: 'battleLeg',
    baseVal: 0.50,
    desc: '独家注册气味商标与专利配方，任何山寨对手露头即赔穿底裤。',
    hint: '手札线索：「冷制雪松香」调入「宇治抹茶」，完成「独家秘方公证」。',
    roseReward: 6,
  },
  {
    comboKey: 'aroma_truffle_patent',
    name: '律政锋芒定制礼',
    grade: 'S',
    buffKind: 'costCut',
    baseVal: 0.06,
    desc: 'CBD 商务谈判桌上人手一份的高定伴手礼，签约折扣水到渠成。',
    hint: '手札线索：「冷制雪松香」融合「黑松露海盐」，附「独家秘方公证」。',
    roseReward: 4,
  },
  {
    comboKey: 'essence_goldleaf_gala_auction',
    name: '晚星女皇鎏金瓶',
    grade: 'SS',
    buffKind: 'battleCap',
    baseVal: 0.58,
    desc: '慈善晚宴压轴拍出天价的传世单品，彻底奠定晚星高奢帝国地位。',
    hint: '手札线索：「极光胜肽」封存「食用金箔」，压轴「慈善夜限量竞拍」。',
    roseReward: 8,
  },
  {
    comboKey: 'essence_camellia_patent',
    name: '盛氏红茶冻龄饮',
    grade: 'SS',
    buffKind: 'shopIncome',
    baseVal: 0.80,
    desc: '高山红山茶与胜肽原液完美共振，全国高定门店排队排到半年后。',
    hint: '手札线索：「极光胜肽」萃合「高山红山茶」，锁定「独家秘方公证」。',
    roseReward: 8,
  },
  {
    comboKey: 'essence_camellia_gala_auction',
    name: '星河永昼高定礼',
    grade: 'SS',
    buffKind: 'tapCrit',
    baseVal: 0.10,
    desc: '千亿敲钟盛典主宾席限定国礼，一单利润顶普通品牌一整年。',
    hint: '手札线索：「极光胜肽」凝练「高山红山茶」，登顶「慈善夜限量竞拍」。',
    roseReward: 10,
  },
];

export const SIGNATURE_BY_KEY: ReadonlyMap<string, SignatureRecipeDef> = new Map(
  SIGNATURE_RECIPES.map((r) => [r.comboKey, r]),
);

export const BUFF_LABELS: Readonly<Record<RecipeBuffKind, string>> = {
  shopIncome: '挂载门店秒伤',
  tapCrit: '手艺暴击概率',
  battleRep: '商战口碑牌力',
  battleCap: '商战资本牌力',
  battleLeg: '商战法务牌力',
  costCut: '门店升级减免',
};
