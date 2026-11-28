/**
 * 招牌爆品研发室纯数值逻辑：
 * 解析三词条组合 -> 生成确定性品阶 (B/A/S/SS) 与名称/词条属性 -> 计算门店镇店加成与全局研发加成。
 */
import {
  BUFF_LABELS,
  RECIPE_BASES,
  RECIPE_HYPES,
  RECIPE_SOULS,
  SIGNATURE_BY_KEY,
  type IngredientDef,
  type RecipeBuffKind,
  type RecipeGrade,
} from '../data/recipes.ts';
import type { ShopId } from '../data/world.ts';
import type { GameSave } from './save.ts';

export interface ResolvedRecipe {
  comboKey: string;
  name: string;
  grade: RecipeGrade;
  isSignature: boolean;
  buffKind: RecipeBuffKind;
  buffVal: number;
  desc: string;
  roseFirstReward: number;
  level: number;
}

function hashCombo(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export function makeComboKey(baseId: string, soulId: string, hypeId: string): string {
  return `${baseId}_${soulId}_${hypeId}`;
}

export function findIngredients(comboKey: string): [IngredientDef, IngredientDef, IngredientDef] | null {
  const parts = comboKey.split('_');
  if (parts.length < 3) return null;
  const base = RECIPE_BASES.find((b) => b.id === parts[0]);
  const soul = RECIPE_SOULS.find((s) => s.id === parts[1]);
  // hype id might contain underscore like campus_pop or gala_auction
  const hypeId = parts.slice(2).join('_');
  const hype = RECIPE_HYPES.find((h) => h.id === hypeId);
  if (!base || !soul || !hype) return null;
  return [base, soul, hype];
}

/** 根据 comboKey 与当前熟练阶数(level >= 1)推导完整爆品属性 */
export function resolveRecipe(comboKey: string, level = 1): ResolvedRecipe {
  const lvScale = 1 + Math.max(0, level - 1) * 0.18;
  const sig = SIGNATURE_BY_KEY.get(comboKey);
  if (sig) {
    return {
      comboKey,
      name: sig.name,
      grade: sig.grade,
      isSignature: true,
      buffKind: sig.buffKind,
      buffVal: sig.baseVal * lvScale,
      desc: sig.desc,
      roseFirstReward: sig.roseReward,
      level,
    };
  }

  const triple = findIngredients(comboKey) ?? [RECIPE_BASES[0], RECIPE_SOULS[0], RECIPE_HYPES[0]];
  const [b, s, h] = triple;
  const hash = hashCombo(comboKey);
  const totalAff = b.affinity + s.affinity + h.affinity + (hash % 3);

  let grade: RecipeGrade = 'B';
  if (totalAff >= 10) grade = 'S';
  else if (totalAff >= 8) grade = 'A';

  const buffChoices: RecipeBuffKind[] = [b.buffBias, s.buffBias, h.buffBias];
  const buffKind = buffChoices[hash % buffChoices.length];

  const gradeFactor = grade === 'S' ? 1.45 : grade === 'A' ? 1.15 : 0.85;
  const rawBase: Record<RecipeBuffKind, number> = {
    shopIncome: 0.28,
    tapCrit: 0.04,
    battleRep: 0.22,
    battleCap: 0.22,
    battleLeg: 0.22,
    costCut: 0.03,
  };

  const shortSoul = s.name.slice(0, 2);
  const shortBase = b.name.slice(-2);
  const prefix = h.tag.slice(0, 2);
  return {
    comboKey,
    name: `${prefix}·${shortSoul}${shortBase}`,
    grade,
    isSignature: false,
    buffKind,
    buffVal: rawBase[buffKind] * gradeFactor * lvScale,
    desc: `融合「${b.name}」与「${s.name}」，借势「${h.name}」打造的晚星自研单品。`,
    roseFirstReward: grade === 'S' ? 3 : grade === 'A' ? 2 : 1,
    level,
  };
}

export function formatRecipeBuff(r: ResolvedRecipe): string {
  const pct = Math.round(r.buffVal * 100);
  return `${BUFF_LABELS[r.buffKind]} +${pct}%`;
}

/** 汇总当前已挂载爆品与爆品图鉴收集带来的帝国增益 */
export interface RecipeAggregateBuffs {
  collectionEmpireBonus: number; // 每解锁 1 款配方永久 +2% 帝国收益（SS 额外 +3%）
  tapCritBonus: number;
  costCutBonus: number;
  battleSuitBonus: { rep: number; cap: number; leg: number };
  shopIncomeBonus: Partial<Record<ShopId, number>>;
}

export function computeRecipeBuffs(save: GameSave): RecipeAggregateBuffs {
  let collectionEmpireBonus = 0;
  for (const [key, lv] of Object.entries(save.discoveredRecipes ?? {})) {
    if (!(lv > 0)) continue;
    const r = resolveRecipe(key, lv);
    collectionEmpireBonus += r.grade === 'SS' ? 0.05 : r.grade === 'S' ? 0.03 : 0.015;
  }

  let tapCritBonus = 0;
  let costCutBonus = 0;
  const battleSuitBonus = { rep: 0, cap: 0, leg: 0 };
  const shopIncomeBonus: Partial<Record<ShopId, number>> = {};

  for (const [shopId, key] of Object.entries(save.equippedRecipes ?? {}) as [ShopId, string | undefined][]) {
    if (!key) continue;
    const lv = save.discoveredRecipes?.[key] ?? 0;
    if (lv <= 0) continue;
    const r = resolveRecipe(key, lv);
    // 任意镇店招牌本身即提供基础 +15% 本店客单价，若词条是 shopIncome 则再叠加词条数值
    let localShopAdd = 0.15;
    if (r.buffKind === 'shopIncome') localShopAdd += r.buffVal;
    else if (r.buffKind === 'tapCrit') tapCritBonus += r.buffVal;
    else if (r.buffKind === 'costCut') costCutBonus += r.buffVal;
    else if (r.buffKind === 'battleRep') battleSuitBonus.rep += r.buffVal;
    else if (r.buffKind === 'battleCap') battleSuitBonus.cap += r.buffVal;
    else if (r.buffKind === 'battleLeg') battleSuitBonus.leg += r.buffVal;
    shopIncomeBonus[shopId] = (shopIncomeBonus[shopId] ?? 0) + localShopAdd;
  }

  return {
    collectionEmpireBonus,
    tapCritBonus: Math.min(0.35, tapCritBonus),
    costCutBonus: Math.min(0.20, costCutBonus),
    battleSuitBonus,
    shopIncomeBonus,
  };
}

/** 现金直购 1 点研发灵感的动态花费（约等于 25 秒挂机产出，最低 180） */
export function inspirationBuyCost(baseIncPerSec: number): number {
  return Math.max(180, Math.round(baseIncPerSec * 25));
}
