/** 城区、门店、女主服装。对应策划案 §4.2、§4.3、§5。 */

export type AreaId = 'oldstreet' | 'campus' | 'cbd' | 'riverside' | 'ent' | 'finance';

export interface AreaDef {
  id: AreaId;
  name: string;
  unlockNetWorth: number;
}

export const AREAS: readonly AreaDef[] = [
  { id: 'oldstreet', name: '老街夜市', unlockNetWorth: 0 },
  { id: 'campus', name: '大学城', unlockNetWorth: 1e5 },
  { id: 'cbd', name: 'CBD', unlockNetWorth: 1e6 },
  { id: 'riverside', name: '江景区', unlockNetWorth: 1e8 },
  { id: 'ent', name: '娱乐区', unlockNetWorth: 1e9 },
  { id: 'finance', name: '金融区', unlockNetWorth: 1e10 },
];

export type ShopId =
  | 'stall' | 'dessert' | 'cafe' | 'gym' | 'law'
  | 'garage' | 'clinic' | 'agency' | 'hotel' | 'group';

export interface ShopDef {
  id: ShopId;
  name: string;
  area: AreaId;
  unlockNetWorth: number;
  baseCost: number;
  baseIncome: number;
}

export const SHOPS: readonly ShopDef[] = [
  { id: 'stall', name: '甜品摊', area: 'oldstreet', unlockNetWorth: 0, baseCost: 100, baseIncome: 1 },
  { id: 'dessert', name: '甜品店', area: 'oldstreet', unlockNetWorth: 1e4, baseCost: 3e3, baseIncome: 20 },
  { id: 'cafe', name: '咖啡馆', area: 'campus', unlockNetWorth: 1e5, baseCost: 4e4, baseIncome: 200 },
  { id: 'gym', name: '健身房', area: 'cbd', unlockNetWorth: 1e6, baseCost: 5e5, baseIncome: 2e3 },
  { id: 'law', name: '律所（合作）', area: 'cbd', unlockNetWorth: 1e7, baseCost: 6e6, baseIncome: 2e4 },
  { id: 'garage', name: '改装车行', area: 'riverside', unlockNetWorth: 1e8, baseCost: 8e7, baseIncome: 2e5 },
  { id: 'clinic', name: '医美诊所', area: 'riverside', unlockNetWorth: 1e8, baseCost: 4e8, baseIncome: 9e5 },
  { id: 'agency', name: '经纪公司', area: 'ent', unlockNetWorth: 1e9, baseCost: 5e9, baseIncome: 1e7 },
  { id: 'hotel', name: '云顶酒店', area: 'finance', unlockNetWorth: 1e10, baseCost: 6e10, baseIncome: 1e8 },
  { id: 'group', name: '晚星集团', area: 'finance', unlockNetWorth: 5e10, baseCost: 8e11, baseIncome: 1.2e9 },
];

export type OutfitId = 'tee' | 'shirt' | 'tweed' | 'suit' | 'gown';

export interface OutfitDef {
  id: OutfitId;
  name: string;
  unlockNetWorth: number;
  scene: string;
}

export const OUTFITS: readonly OutfitDef[] = [
  { id: 'tee', name: '白 T 恤 + 帆布围裙', unlockNetWorth: 0, scene: '雨后夜市' },
  { id: 'shirt', name: '白衬衫店员装', unlockNetWorth: 1e4, scene: '自己的甜品店' },
  { id: 'tweed', name: '小香风外套', unlockNetWorth: 1e7, scene: '落地窗办公室' },
  { id: 'suit', name: '白西装', unlockNetWorth: 1e9, scene: '晚星大厦顶楼' },
  { id: 'gown', name: '高定礼服', unlockNetWorth: 1e11, scene: '终章发布会' },
];

export function shopById(id: ShopId): ShopDef {
  const shop = SHOPS.find((s) => s.id === id);
  if (!shop) throw new Error(`unknown shop ${id}`);
  return shop;
}
