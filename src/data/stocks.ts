/**
 * 晚星风投 · 商海操盘数据表：
 * 5 支世界观强关联股票（含高波动宿敌股「苏氏食品」专供借券做空打脸）+ 15 条商海风声与男主内幕批注。
 */
import type { HeroId } from './story.ts';

export type StockId = 'sushi' | 'oldst' | 'chain' | 'glow' | 'star';

export interface StockDef {
  id: StockId;
  code: string;
  name: string;
  sector: string;
  basePrice: number;
  minPrice: number;
  maxPrice: number;
  volatility: number; // 单轮基础随机振幅
  rivalTag?: string;
}

export const STOCKS: readonly StockDef[] = [
  {
    id: 'sushi',
    code: 'SU·004',
    name: '苏氏食品',
    sector: '宿敌豪门 · 可重仓做空',
    basePrice: 52,
    minPrice: 8,
    maxPrice: 118,
    volatility: 0.13,
    rivalTag: '宿敌标的',
  },
  {
    id: 'oldst',
    code: 'WJ·101',
    name: '老街文旅',
    sector: '夜间消费 · 稳健蓝筹',
    basePrice: 24,
    minPrice: 9,
    maxPrice: 72,
    volatility: 0.07,
  },
  {
    id: 'chain',
    code: 'YC·208',
    name: '云城冷链',
    sector: '生鲜物流 · 周期轮动',
    basePrice: 36,
    minPrice: 12,
    maxPrice: 98,
    volatility: 0.09,
  },
  {
    id: 'glow',
    code: 'XY·512',
    name: '星耀医美',
    sector: '轻奢抗衰 · 成长白马',
    basePrice: 84,
    minPrice: 28,
    maxPrice: 210,
    volatility: 0.11,
  },
  {
    id: 'star',
    code: 'DL·888',
    name: '顶流娱乐',
    sector: '影视造星 · 高弹题材',
    basePrice: 64,
    minPrice: 18,
    maxPrice: 175,
    volatility: 0.14,
  },
];

export interface StockRumorDef {
  id: string;
  stockId: StockId;
  /** 公开市场风声（所有玩家可见） */
  headline: string;
  /** 内幕方向偏移：正数看涨（宜做多），负数看跌（宜做空） */
  drift: number;
  /** 提供精准内幕批注的男主与提示语 */
  insiderHero: HeroId;
  insiderNote: string;
}

export const STOCK_RUMORS: readonly StockRumorDef[] = [
  {
    id: 'rm_sushi_fake_cream',
    stockId: 'sushi',
    headline: '市场传闻某老牌食品厂植脂末冒充动物奶油被送检。',
    drift: -0.22,
    insiderHero: 'shenyan',
    insiderNote: '沈砚密报：抽检结果明早公示，苏氏必吃顶格罚单，建议重仓做空！',
  },
  {
    id: 'rm_sushi_plagiarize',
    stockId: 'sushi',
    headline: '苏氏食品高调预告“星辰酥”新品发布会，散户跟风抢筹。',
    drift: -0.19,
    insiderHero: 'luyu',
    insiderNote: '陆屿密报：配方是苏婉柔偷的半成品，开售当天就会翻车暴跌！',
  },
  {
    id: 'rm_sushi_loan_fail',
    stockId: 'sushi',
    headline: '苏卫国频频出入金融街各大银行总部洽谈过桥贷款。',
    drift: -0.24,
    insiderHero: 'huotingchen',
    insiderNote: '霍霆琛密报：三家银行已联合拒贷，苏氏资金链断了，做空稳赚。',
  },
  {
    id: 'rm_sushi_deadcat',
    stockId: 'sushi',
    headline: '苏家宣布变卖城南两处旧厂房回笼现金自救。',
    drift: 0.15,
    insiderHero: 'huotingchen',
    insiderNote: '霍霆琛密报：短线会有护盘资金拉一波超跌反弹，空单注意止盈反手！',
  },
  {
    id: 'rm_oldst_subsidy',
    stockId: 'oldst',
    headline: '市政厅拟评选年度非遗美食示范街区，客流数据持续升温。',
    drift: 0.17,
    insiderHero: 'luyu',
    insiderNote: '陆屿密报：红头文件刚签发，老街文旅拿下了头号补贴，看涨！',
  },
  {
    id: 'rm_oldst_rain',
    stockId: 'oldst',
    headline: '气象台发布连续强降雨预警，户外夜市景区客流短期承压。',
    drift: -0.13,
    insiderHero: 'jiangxubai',
    insiderNote: '江叙白提醒：这几周露天摊位停摆，老街文旅短线回调可做空或等低吸。',
  },
  {
    id: 'rm_chain_boom',
    stockId: 'chain',
    headline: '生鲜冷链即时配送订单量环比激增，多家连锁餐饮争抢仓位。',
    drift: 0.19,
    insiderHero: 'qinye',
    insiderNote: '秦朔密报：冷链车队排期已经满到下个月，业绩大超预期，看多！',
  },
  {
    id: 'rm_chain_fuel',
    stockId: 'chain',
    headline: '干线货运燃油成本上调，部分中小型物流商利润率收窄。',
    drift: -0.15,
    insiderHero: 'qinye',
    insiderNote: '秦朔密报：云城冷链刚赔了一笔冻品违约金，股价下轮大概率跳水。',
  },
  {
    id: 'rm_glow_patent',
    stockId: 'glow',
    headline: '新一代无创胶原光电仪获批上市，高净值会员预约爆满。',
    drift: 0.22,
    insiderHero: 'xuzhiheng',
    insiderNote: '许知衡密报：临床修复数据非常漂亮，机构正在扫货星耀医美！',
  },
  {
    id: 'rm_glow_ad_fine',
    stockId: 'glow',
    headline: '监管部门开展医美行业夸大宣传专项整顿排查。',
    drift: -0.17,
    insiderHero: 'shenyan',
    insiderNote: '沈砚密报：两家同行被停业整顿，板块短期恐慌下挫，宜借券做空。',
  },
  {
    id: 'rm_star_concert',
    stockId: 'star',
    headline: '现象级巡回演唱会门票三秒售罄，衍生周边收入破亿。',
    drift: 0.24,
    insiderHero: 'zhouyining',
    insiderNote: '周以宁密报：追加的五场体育场批文刚下来，顶流娱乐还要大涨！',
  },
  {
    id: 'rm_star_flop',
    stockId: 'star',
    headline: '某重金投资的古偶大剧口碑扑街，广告商纷纷要求撤资。',
    drift: -0.21,
    insiderHero: 'zhouyining',
    insiderNote: '周以宁密报：对家公司的S+项目彻底砸穿保底协议，果断做空！',
  },
];

export const STOCK_BY_ID: ReadonlyMap<StockId, StockDef> = new Map(
  STOCKS.map((s) => [s.id, s]),
);
