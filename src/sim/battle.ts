/**
 * 3 回合「商战底牌克制对决」纯数值逻辑：
 * - 根据玩家已开门店、镇店爆品、专长店员与男主羁绊动态构建【口碑 / 资本 / 法务】王牌卡组；
 * - 克制命中触发 2.0x 破防暴击（口碑克资本、资本克法务、法务克口碑），同系 1.15x，被克 0.72x。
 */
import { SUIT_META, type BattleEncounterDef, type BattleSuit, type EnemyMoveDef } from '../data/battleCards.ts';
import type { ShopId } from '../data/world.ts';
import { specialtyTotalStars } from './dispatchSim.ts';
import { computeRecipeBuffs } from './recipeSim.ts';
import { effectiveBond } from './unlocks.ts';
import type { GameSave } from './save.ts';

export interface PlayerBattleCard {
  id: string;
  suit: BattleSuit;
  title: string;
  subtitle: string;
  shopIconId: ShopId;
  power: number;
}

export type RelationOutcome = 'counter' | 'neutral' | 'weak';

export function evaluateSuitRelation(cardSuit: BattleSuit, enemySuit: BattleSuit): RelationOutcome {
  if (SUIT_META[cardSuit].beats === enemySuit) return 'counter';
  if (SUIT_META[enemySuit].beats === cardSuit) return 'weak';
  return 'neutral';
}

/** 计算玩家综合帝国商战底蕴基准战力 */
export function computeBaseBattlePower(save: GameSave): number {
  const nwScore = Math.max(60, Math.pow(Math.max(1, save.netWorth), 0.36) * 14);
  let shopScore = 0;
  for (const lv of Object.values(save.shops ?? {})) {
    shopScore += (lv ?? 0) * 6;
  }
  return Math.round(nwScore + shopScore + save.skillLevel * 8);
}

/** 为本场对决构建三系代表王牌（确保每回合都能抽出口碑/资本/法务各一张供玩家策略克制决策！） */
export function buildBattleHand(save: GameSave, encounter: BattleEncounterDef, moraleBoost = false): PlayerBattleCard[] {
  const recBuffs = computeRecipeBuffs(save);
  const boostFactor = moraleBoost ? 1.55 : 1;

  // 让基础战力与当前关卡推荐战力保持在可博弈区间：养成越高碾压越爽，刚达标时靠属性克制稳赢
  const rawPower = computeBaseBattlePower(save);
  const anchoredPower = Math.max(encounter.recommendedPower * 0.88, rawPower) * boostFactor;

  const repBonus = 1 + recBuffs.battleSuitBonus.rep + specialtyTotalStars(save, 'pr') * 0.04 + specialtyTotalStars(save, 'craft') * 0.03 + effectiveBond(save, 'luyu') * 0.06 + effectiveBond(save, 'zhouyining') * 0.06;
  const capBonus = 1 + recBuffs.battleSuitBonus.cap + specialtyTotalStars(save, 'ops') * 0.04 + effectiveBond(save, 'huotingchen') * 0.08 + effectiveBond(save, 'qinye') * 0.05;
  const legBonus = 1 + recBuffs.battleSuitBonus.leg + specialtyTotalStars(save, 'fin') * 0.06 + effectiveBond(save, 'shenyan') * 0.08 + effectiveBond(save, 'xuzhiheng') * 0.05;

  const hasAgency = (save.shops.agency ?? 0) > 0;
  const hasDessert = (save.shops.dessert ?? 0) > 0;
  const hasGroup = (save.shops.group ?? 0) > 0;
  const hasHotel = (save.shops.hotel ?? 0) > 0;
  const hasLaw = (save.shops.law ?? 0) > 0;

  const repCard: PlayerBattleCard = {
    id: 'card_rep',
    suit: 'rep',
    title: hasAgency ? '全网热搜直播打脸' : hasDessert ? '晚星万人口碑盲测' : '当街开炉真材实证',
    subtitle: '克制【资本】盘外招',
    shopIconId: hasAgency ? 'agency' : hasDessert ? 'dessert' : 'stall',
    power: Math.round(anchoredPower * repBonus),
  };

  const capCard: PlayerBattleCard = {
    id: 'card_cap',
    suit: 'cap',
    title: hasGroup ? '百亿现金流全资吞并' : hasHotel ? '名流黑卡验资清场' : '十倍违约金拍桌买断',
    subtitle: '克制【法务】盘外招',
    shopIconId: hasGroup ? 'group' : hasHotel ? 'hotel' : 'garage',
    power: Math.round(anchoredPower * capBonus),
  };

  const legCard: PlayerBattleCard = {
    id: 'card_leg',
    suit: 'leg',
    title: hasLaw ? '沈砚红圈金牌反诉函' : '海关溯源与公证铁证',
    subtitle: '克制【口碑】水军招',
    shopIconId: hasLaw ? 'law' : 'clinic',
    power: Math.round(anchoredPower * legBonus),
  };

  return [repCard, capCard, legCard];
}

/** 单回合交锋结算：返回削减对手气焰百分比 (0~100) 与克制评价 */
export function resolveCardClash(
  card: PlayerBattleCard,
  enemyMove: EnemyMoveDef,
  recommendedPower: number,
): { damagePct: number; relation: RelationOutcome; label: string } {
  const relation = evaluateSuitRelation(card.suit, enemyMove.suit);
  const relMult = relation === 'counter' ? 1.95 : relation === 'neutral' ? 1.08 : 0.68;
  const powerRatio = Math.min(1.65, Math.max(0.65, card.power / Math.max(1, recommendedPower)));
  // 标准克制一击约打掉 44%~65% 气焰（3 回合选对 2 次克制即可稳稳击穿 100% 气焰！）
  const rawPct = 28 * relMult * powerRatio;
  const damagePct = Math.max(14, Math.min(85, Math.round(rawPct)));

  const label = relation === 'counter'
    ? `✦ 属性克制破防！气焰 -${damagePct}%`
    : relation === 'neutral'
      ? `正面交锋压制 · 气焰 -${damagePct}%`
      : `招式受阻 · 气焰 -${damagePct}%`;

  return { damagePct, relation, label };
}
