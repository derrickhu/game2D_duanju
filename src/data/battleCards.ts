/**
 * 3 回合「商战底牌克制对决」数据表：
 * 口碑公关 (rep) 克 资本压价 (cap)，资本压价 (cap) 克 法务铁拳 (leg)，法务铁拳 (leg) 克 口碑水军 (rep)。
 * 涵盖主线 8 大章节恶人 Boss 战 + 6 大城区「商圈冠名竞标战」（每区 3 阶）。
 */
import type { AreaId } from './world.ts';

export type BattleSuit = 'rep' | 'cap' | 'leg';

export const SUIT_META: Readonly<Record<BattleSuit, {
  name: string;
  short: string;
  beats: BattleSuit;
  color: number;
  softBg: number;
}>> = {
  rep: { name: '口碑公关', short: '口碑', beats: 'cap', color: 0xD85A4A, softBg: 0xFDE9E4 },
  cap: { name: '资本财力', short: '资本', beats: 'leg', color: 0xC2821E, softBg: 0xFFF4D9 },
  leg: { name: '法务铁拳', short: '法务', beats: 'rep', color: 0x2F7E6A, softBg: 0xE2F5EE },
};

export interface EnemyMoveDef {
  suit: BattleSuit;
  title: string;
  taunt: string;
}

export interface BattleEncounterDef {
  id: string;
  title: string;
  rivalName: string;
  rivalTitle: string;
  conflict: string;
  slapQuote: string;
  recommendedPower: number;
  roseReward: number;
  cashRewardSec: number;
  insiderReward: number;
  moves: readonly [EnemyMoveDef, EnemyMoveDef, EnemyMoveDef];
}

/** 主线第 1~8 章 Boss 商战配置 */
export const CHAPTER_BATTLES: ReadonlyMap<number, BattleEncounterDef> = new Map([
  [1, {
    id: 'ch_1',
    title: '第 1 章 · 老街立威战',
    rivalName: '王姐',
    rivalTitle: '老街恶霸地头蛇',
    conflict: '带人堵住木摊造谣点心不干净，强索双倍摊位保护费',
    slapQuote: '整条街的食客都在排我的星星酥，你算哪根葱？',
    recommendedPower: 90,
    roseReward: 4,
    cashRewardSec: 60,
    insiderReward: 0,
    moves: [
      { suit: 'rep', title: '当街撒泼造谣', taunt: '“大家别买！假千金做的点心吃坏肚子没人管！”' },
      { suit: 'cap', title: '恶意哄抬摊位费', taunt: '“想在这儿摆摊？先交三千块管理费再说！”' },
      { suit: 'rep', title: '雇混混堵路起哄', taunt: '“今天不低头认怂，一块糕都别想卖出去！”' },
    ],
  }],
  [2, {
    id: 'ch_2',
    title: '第 2 章 · 旺铺夺楼战',
    rivalName: '周房东',
    rivalTitle: '势利眼二房东',
    conflict: '看你生意火爆临时毁约，坐地起价三倍押金要把铺子转租给苏家',
    slapQuote: '谁说我要租？这整栋临街小楼，我已经跟原业主全款过户了！',
    recommendedPower: 220,
    roseReward: 5,
    cashRewardSec: 90,
    insiderReward: 1,
    moves: [
      { suit: 'cap', title: '临时翻倍涨押金', taunt: '“没十万现金免谈，苏家大小姐可出双倍价！”' },
      { suit: 'leg', title: '拿霸王租约压人', taunt: '“白纸黑字写着二房东有权随时清场，你去告啊！”' },
      { suit: 'cap', title: '断水断电逼退场', taunt: '“看你个落魄丫头拿什么跟我耗！”' },
    ],
  }],
  [3, {
    id: 'ch_3',
    title: '第 3 章 · 黑卡反杀战',
    rivalName: '傅景辞 & 苏婉柔',
    rivalTitle: '傲慢前任与白莲真千金',
    conflict: '故意打翻限量甜品台，甩出副卡羞辱你摆摊丢尽豪门脸面',
    slapQuote: '恶意插队加毁损高定商品，按十倍照价赔偿，刷卡还是滚？',
    recommendedPower: 520,
    roseReward: 6,
    cashRewardSec: 120,
    insiderReward: 1,
    moves: [
      { suit: 'cap', title: '甩黑金卡羞辱砸场', taunt: '“开个价吧，多少钱才肯关店别出来丢人现眼？”' },
      { suit: 'rep', title: '苏婉柔红眼装委屈', taunt: '“姐姐是不是还恨我抢走了景辞哥，才故意拿点心烫我……”' },
      { suit: 'leg', title: '威胁动用商场关系封店', taunt: '“信不信一句话让物业明天就封了你的门面？”' },
    ],
  }],
  [4, {
    id: 'ch_4',
    title: '第 4 章 · 秘方庭审战',
    rivalName: '苏氏食品法务团',
    rivalTitle: '豪门金牌讼棍团',
    conflict: '窃取外婆古法星星酥配方抢发新品，反咬晚星商标侵权索赔千万',
    slapQuote: '二十年前的手稿笔迹鉴定在此——苏氏全线山寨品立刻下架赔偿！',
    recommendedPower: 1200,
    roseReward: 8,
    cashRewardSec: 150,
    insiderReward: 2,
    moves: [
      { suit: 'leg', title: '恶意抢注反诉侵权', taunt: '“苏氏法务部从没输过官司，识相的乖乖交出配方！”' },
      { suit: 'rep', title: '通稿抹黑晚星抄袭', taunt: '“全城营销号都已经发稿了，看谁还信你个个体户！”' },
      { suit: 'cap', title: '天价诉讼保全冻结', taunt: '“拖上两年庭审，足够把你的现金流彻底拖垮！”' },
    ],
  }],
  [5, {
    id: 'ch_5',
    title: '第 5 章 · 慈善主宾战',
    rivalName: '苏家养父母',
    rivalTitle: '攀附权贵的势利豪门',
    conflict: '捐赠不够格被拦在门外，撞见盛装出席的你竟当众叱骂你偷混进场',
    slapQuote: '睁大眼睛看清楚，今晚慈善夜唯一冠名主宾，姓苏名晚。',
    recommendedPower: 2800,
    roseReward: 10,
    cashRewardSec: 180,
    insiderReward: 2,
    moves: [
      { suit: 'rep', title: '当众造谣偷礼服混场', taunt: '“保安！这丫头早被苏家赶出门了，肯定偷了请柬混进来的！”' },
      { suit: 'cap', title: '吹嘘苏氏百亿家底', taunt: '“离开苏家你连高定裙角都摸不起，还不快过来认错！”' },
      { suit: 'leg', title: '施压主办方取消席位', taunt: '“有她没我们苏家，请主办方立刻核验她的验资函！”' },
    ],
  }],
  [6, {
    id: 'ch_6',
    title: '第 6 章 · 破产收购战',
    rivalName: '苏卫国',
    rivalTitle: '穷途末路的苏氏董事长',
    conflict: '苏氏资金链彻底崩盘，既想求晚星注资救命，又妄想摆长辈架子拿控股权',
    slapQuote: '签了这份一折清盘收购书，苏氏还能留块招牌——慢走不送。',
    recommendedPower: 6500,
    roseReward: 12,
    cashRewardSec: 220,
    insiderReward: 2,
    moves: [
      { suit: 'rep', title: '打二十年养育道德牌', taunt: '“不管怎么说苏家养了你二十年，你不救苏氏就是白眼狼！”' },
      { suit: 'leg', title: '暗藏毒丸条款保大权', taunt: '“注资十亿可以，但董事长投票权必须还归我苏卫国！”' },
      { suit: 'cap', title: '虚报库存资产漫天要价', taunt: '“瘦死的骆驼比马大，少于五十亿估值我绝不签字！”' },
    ],
  }],
  [7, {
    id: 'ch_7',
    title: '第 7 章 · 豪门正本战',
    rivalName: '苏婉柔',
    rivalTitle: '持假报告冒认首富千金',
    conflict: '买通黑诊所伪造亲子报告闯入盛家老宅，妄图截胡千亿家族信托',
    slapQuote: '拿假报告骗到我外公家里来了？管家，关门，移交法办！',
    recommendedPower: 15000,
    roseReward: 15,
    cashRewardSec: 260,
    insiderReward: 3,
    moves: [
      { suit: 'leg', title: '呈交伪造基因鉴定书', taunt: '“白纸黑字的医院钢印在此，我才是盛家真正的血脉！”' },
      { suit: 'rep', title: '痛哭卖惨博族老同情', taunt: '“苏晚抢了我的公司还不够，现在连我亲外公都要抢走吗！”' },
      { suit: 'cap', title: '私许重利拉拢旁系叔伯', taunt: '“只要各位叔伯支持我继任信托，分红全部提高三成！”' },
    ],
  }],
  [8, {
    id: 'ch_8',
    title: '第 8 章 · 首富加冕战',
    rivalName: '旧日名利场联盟',
    rivalTitle: '盘踞云城的旧财阀集团',
    conflict: '在晚星集团千亿敲钟前夕联合做空围剿，妄图阻击新晋女首富登顶',
    slapQuote: '三年前你们笑我一无所有，今天，整个云城的规矩由晚星来定！',
    recommendedPower: 36000,
    roseReward: 22,
    cashRewardSec: 360,
    insiderReward: 4,
    moves: [
      { suit: 'cap', title: '百亿游资恶意砸盘做空', taunt: '“集合十家私募砸穿晚星发行价，看她怎么敲这个钟！”' },
      { suit: 'rep', title: '跨国黑公关全网狙击', taunt: '“三百篇质疑财报的通稿同时引爆，让散户恐慌踩踏！”' },
      { suit: 'leg', title: '发难供应链排他协议', taunt: '“封锁原料与院线渠道，逼她在上市前夜签城下之盟！”' },
    ],
  }],
]);

export interface AreaCrownTierDef {
  areaId: AreaId;
  tier: 1 | 2 | 3;
  encounter: BattleEncounterDef;
}

const AREA_RIVALS: Readonly<Record<AreaId, { rival: string; title: string; powerBase: number }>> = {
  oldstreet: { rival: '网红霸王餐饮盟', title: '老街流量收割团', powerBase: 140 },
  campus: { rival: '外资星耀咖啡链', title: '补贴倾销大鳄', powerBase: 420 },
  cbd: { rival: '君合天衡资本派', title: 'CBD 写字楼庄家', powerBase: 1400 },
  riverside: { rival: '滨江名流游艇会', title: '老钱俱乐部理事', powerBase: 4200 },
  ent: { rival: '天娱星辉传媒', title: '内娱垄断老东家', powerBase: 11000 },
  finance: { rival: '华尔街秃鹫基金', title: '跨国做空巨鳄', powerBase: 28000 },
};

export function getAreaCrownEncounter(areaId: AreaId, areaName: string, tier: 1 | 2 | 3): BattleEncounterDef {
  const cfg = AREA_RIVALS[areaId];
  const mult = tier === 1 ? 1 : tier === 2 ? 2.6 : 6.5;
  const tierLabel = tier === 1 ? '初阶立威' : tier === 2 ? '半壁江山' : '商圈女皇';
  const suitOrder: readonly [BattleSuit, BattleSuit, BattleSuit] = tier === 1
    ? ['rep', 'cap', 'leg']
    : tier === 2
      ? ['cap', 'leg', 'rep']
      : ['leg', 'rep', 'cap'];
  return {
    id: `area_${areaId}_${tier}`,
    title: `${areaName} · ${tierLabel}竞标`,
    rivalName: cfg.rival,
    rivalTitle: `${cfg.title}（第${tier}轮）`,
    conflict: `争夺「${areaName}」独家商业冠名权，胜出后本区全产业产出永久 +20%！`,
    slapQuote: `从今天起，「${areaName}」黄金地标冠名权归晚星所有！`,
    recommendedPower: Math.round(cfg.powerBase * mult),
    roseReward: 2 + tier * 2,
    cashRewardSec: 65 + tier * 35,
    insiderReward: tier >= 2 ? 1 : 0,
    moves: [
      { suit: suitOrder[0], title: '铺天盖地买榜控评', taunt: '“这条街的热搜词条我们全包了，晚星休想分一杯羹！”' },
      { suit: suitOrder[1], title: '烧钱补贴恶意抢客', taunt: '“用十倍流动资金打价格战，看谁先撑不住关门！”' },
      { suit: suitOrder[2], title: '排他竞业条款施压', taunt: '“商圈核心铺位合约都在我们手里，识相的趁早退出！”' },
    ],
  };
}
