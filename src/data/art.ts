/**
 * 游戏内美术路径（v9：原设韩漫立绘与原设场景 + 一体化珠光舱 UI + 2.5D 商业帝国沙盘大地图与 10 座独立绘制地标建筑）。
 */
import type { StaffId } from './staff.ts';
import type { HeroId } from './story.ts';
import type { OutfitId, ShopId } from './world.ts';

export const ICONS = {
  shop: 'subpkg_images/v6_ico_nav_shop_on.png',
  shopOff: 'subpkg_images/v6_ico_nav_shop_off.png',
  rose: 'subpkg_images/v6_ico_nav_hero_on.png',
  roseOff: 'subpkg_images/v6_ico_nav_hero_off.png',
  staff: 'subpkg_images/v6_ico_nav_staff_on.png',
  staffOff: 'subpkg_images/v6_ico_nav_staff_off.png',
  story: 'subpkg_images/v6_ico_nav_story_on.png',
  storyOff: 'subpkg_images/v6_ico_nav_story_off.png',
  wardrobe: 'subpkg_images/v6_ico_nav_wardrobe_on.png',
  wardrobeOff: 'subpkg_images/v6_ico_nav_wardrobe_off.png',

  live: 'subpkg_images/v6_ico_side_live.png',
  gift: 'subpkg_images/v6_ico_side_rush.png',
  phone: 'subpkg_images/v6_ico_side_phone.png',
  crown: 'subpkg_images/v6_ico_side_buff.png',
  event: 'subpkg_images/v6_ico_side_event.png',
  sideLab: 'subpkg_images/v12_ico_side_lab.png',
  sideStock: 'subpkg_images/v12_ico_side_stock.png',
  sideDispatch: 'subpkg_images/v12_ico_side_dispatch.png',

  currencyRose: 'subpkg_images/v6_ico_currency_rose.png',
  coins: 'subpkg_images/v6_ico_currency_cash.png',
  questStar: 'subpkg_images/v6_ico_quest_star.png',
  trophy: 'subpkg_images/v6_ico_reward_trophy.png',
  lock: 'subpkg_images/v6_ico_lock_ornate.png',
  boutique: 'subpkg_images/v6_ico_shop_boutique.png',
  salon: 'subpkg_images/v6_ico_shop_salon.png',
} as const;

export const UI_SLICES = {
  btnLgGold: 'subpkg_images/v6_btn_satin_lg_gold.png',
  btnMdGreen: 'subpkg_images/v6_btn_satin_md_green.png',
  btnMdCoral: 'subpkg_images/v6_btn_satin_md_coral.png',
  btnMdCream: 'subpkg_images/v6_btn_satin_md_cream.png',
  btnMdDisabled: 'subpkg_images/v6_btn_satin_md_disabled.png',
  btnSmCoral: 'subpkg_images/v6_btn_satin_sm_coral.png',
  btnSmGold: 'subpkg_images/v6_btn_satin_sm_gold.png',
  btnBackTab: 'subpkg_images/v6_btn_back_tab.png',

  hudProfileCard: 'subpkg_images/v6_hud_profile_card.png',
  pillTopCurrency: 'subpkg_images/v6_pill_top_currency.png',
  badgeSidePearl: 'subpkg_images/v6_badge_side_pearl.png',
  questFloatPill: 'subpkg_images/v6_quest_float_pill.png',
  bubbleOrderSatin: 'subpkg_images/v6_bubble_order_satin.png',
  pillBuyMode: 'subpkg_images/v6_pill_buy_mode.png',

  dockChampagneWave: 'subpkg_images/v6_dock_champagne_wave.png',
  navActiveHalo: 'subpkg_images/v6_nav_active_halo.png',

  progTrack: 'subpkg_images/v6_prog_satin_track.png',
  progGold: 'subpkg_images/v6_prog_satin_gold.png',
  progGreen: 'subpkg_images/v6_prog_satin_green.png',

  modalCreamShell: 'subpkg_images/v6_modal_cream_shell.png',
  modalPeachHeader: 'subpkg_images/v6_modal_peach_header.png',
  cardGridUnlocked: 'subpkg_images/v6_card_grid_unlocked.png',
  cardGridReady: 'subpkg_images/v6_card_grid_ready.png',
  cardGridLocked: 'subpkg_images/v6_card_grid_locked.png',
  modalTabOn: 'subpkg_images/v6_modal_tab_on.png',
  modalTabOff: 'subpkg_images/v6_modal_tab_off.png',

  pillCurrencyLight: 'subpkg_images/v7_pill_currency_light.png',
  barChapterRibbon: 'subpkg_images/v7_bar_chapter_ribbon.png',
  cardCouturePlaque: 'subpkg_images/v7_card_couture_plaque.png',
  cardCoutureBlush: 'subpkg_images/v7_card_couture_blush.png',
  cardChapterTicket: 'subpkg_images/v7_card_chapter_ticket.png',
  cardChapterFresh: 'subpkg_images/v7_card_chapter_fresh.png',
  cardChapterLocked: 'subpkg_images/v7_card_chapter_locked.png',
  pillEpNew: 'subpkg_images/v7_pill_ep_new.png',
  pillEpDone: 'subpkg_images/v7_pill_ep_done.png',
  cardMemoryOpen: 'subpkg_images/v7_card_memory_open.png',
  cardMemoryFresh: 'subpkg_images/v7_card_memory_fresh.png',
  cardMemoryGold: 'subpkg_images/v7_card_memory_gold.png',
  cardMemoryLocked: 'subpkg_images/v7_card_memory_locked.png',
  bannerRibbonGold: 'subpkg_images/v7_banner_ribbon_gold.png',
  tagStageGlass: 'subpkg_images/v7_tag_stage_glass.png',

  // v8 一体化三段式顶底舱 & 杂志玻璃面板切片
  v8TopHeaderDock: 'subpkg_images/v8_top_header_dock.png',
  v8TopChapterTab: 'subpkg_images/v8_top_chapter_tab.png',
  v8BottomConsoleTray: 'subpkg_images/v8_bottom_console_tray.png',
  v8QuestWellCard: 'subpkg_images/v8_quest_well_card.png',
  v8BtnCtaCoral: 'subpkg_images/v8_btn_cta_coral.png',
  v8BtnCtaPeach: 'subpkg_images/v8_btn_cta_peach.png',
  v8BtnMintPill: 'subpkg_images/v8_btn_mint_pill.png',
  v8NavTabActive: 'subpkg_images/v8_nav_tab_active.png',
  v8BubbleSpeech: 'subpkg_images/v8_bubble_speech.png',
  v8GlassHeroDock: 'subpkg_images/v8_glass_hero_dock.png',
  v8CardShopBanner: 'subpkg_images/v8_card_shop_banner.png',
  v8CardShopReady: 'subpkg_images/v8_card_shop_ready.png',
} as const;

export const UI_SKINS = {
  ribbonHeader: UI_SLICES.modalPeachHeader,
  btnRose: UI_SLICES.btnMdCoral,
  btnGold: UI_SLICES.btnLgGold,
  cardOrnate: UI_SLICES.modalCreamShell,
  counterSweet: 'subpkg_images/ui_counter_sweet.png',
  counterExec: 'subpkg_images/ui_counter_exec.png',
} as const;

/** 10 大产业专属 2.5D 清透糖果珐琅贴纸图标 */
export const SHOP_ICONS: Readonly<Record<ShopId, string>> = {
  stall: 'subpkg_images/v6_ico_shop_stall.png',
  dessert: 'subpkg_images/v6_ico_shop_dessert.png',
  cafe: 'subpkg_images/v6_ico_shop_cafe.png',
  gym: 'subpkg_images/v6_ico_shop_gym.png',
  law: 'subpkg_images/v6_ico_shop_law.png',
  garage: 'subpkg_images/v6_ico_shop_garage.png',
  clinic: 'subpkg_images/v6_ico_shop_clinic.png',
  agency: 'subpkg_images/v6_ico_shop_agency.png',
  hotel: 'subpkg_images/v6_ico_shop_hotel.png',
  group: 'subpkg_images/v6_ico_shop_group.png',
};

export const SHOP_STICKER_ICONS = SHOP_ICONS;

/** 10 大产业门头横幅插画（用于次要列表模式与男主背景氛围） */
export const SHOP_BANNERS: Readonly<Record<ShopId, string>> = {
  stall: 'subpkg_images/v8_shop_stall.jpg',
  dessert: 'subpkg_images/v8_shop_dessert.jpg',
  cafe: 'subpkg_images/v8_shop_cafe.jpg',
  gym: 'subpkg_images/v8_shop_gym.jpg',
  law: 'subpkg_images/v8_shop_law.jpg',
  garage: 'subpkg_images/v8_shop_garage.jpg',
  clinic: 'subpkg_images/v8_shop_clinic.jpg',
  agency: 'subpkg_images/v8_shop_agency.jpg',
  hotel: 'subpkg_images/v8_shop_hotel.jpg',
  group: 'subpkg_images/v8_shop_group.jpg',
};

/** v11 韩漫唯美清透 2D 落日江湾商业版图底板（与男女主韩漫立绘画风完全一致，包内直出） */
export const GRAND_CITY_MAP = 'subpkg_images/v11_map_base.jpg';

/** v11 大地图上单独绘制的 10 座韩漫精细线稿 2D 等距地标建筑（透明底 PNG） */
export const SHOP_BUILDINGS: Readonly<Record<ShopId, string>> = {
  stall: 'subpkg_images/v11_bldg_stall.png',
  dessert: 'subpkg_images/v11_bldg_dessert.png',
  cafe: 'subpkg_images/v11_bldg_cafe.png',
  gym: 'subpkg_images/v11_bldg_gym.png',
  law: 'subpkg_images/v11_bldg_law.png',
  garage: 'subpkg_images/v11_bldg_garage.png',
  clinic: 'subpkg_images/v11_bldg_clinic.png',
  agency: 'subpkg_images/v11_bldg_agency.png',
  hotel: 'subpkg_images/v11_bldg_hotel.png',
  group: 'subpkg_images/v11_bldg_group.png',
};

/**
 * 10 座韩漫 2D 地标建筑在 900×2000 落日江湾大地图上的精准广场坐标 [nx, ny] 与 750 宽基准尺寸
 */
export const SHOP_MAP_SPOTS: Readonly<Record<ShopId, { readonly nx: number; readonly ny: number; readonly size: number }>> = {
  stall: { nx: 0.285, ny: 0.786, size: 148 },
  dessert: { nx: 0.565, ny: 0.838, size: 154 },
  cafe: { nx: 0.655, ny: 0.682, size: 164 },
  gym: { nx: 0.155, ny: 0.538, size: 154 },
  garage: { nx: 0.825, ny: 0.562, size: 162 },
  law: { nx: 0.365, ny: 0.474, size: 164 },
  clinic: { nx: 0.625, ny: 0.4284, size: 154 },
  agency: { nx: 0.200, ny: 0.388, size: 148 },
  hotel: { nx: 0.430, ny: 0.314, size: 144 },
  group: { nx: 0.660, ny: 0.312, size: 148 },
};

/** 主界面顾客点单气泡配套的彩绘商品图标（按女主阶段演进） */
export const ORDER_BUBBLE_ICONS: Readonly<Record<OutfitId, readonly [string, string, string]>> = {
  tee: [SHOP_STICKER_ICONS.stall, SHOP_STICKER_ICONS.dessert, SHOP_STICKER_ICONS.cafe],
  shirt: [SHOP_STICKER_ICONS.dessert, ICONS.salon, SHOP_STICKER_ICONS.cafe],
  tweed: [SHOP_STICKER_ICONS.law, ICONS.gift, ICONS.boutique],
  suit: [SHOP_STICKER_ICONS.hotel, SHOP_STICKER_ICONS.agency, SHOP_STICKER_ICONS.group],
  gown: [ICONS.crown, SHOP_STICKER_ICONS.clinic, SHOP_STICKER_ICONS.group],
};

/** 男主拍立得回忆卡封面插画映射（76 张专属韩漫 CG 已全量配齐） */
export const HERO_THUMB_POOL: Readonly<Record<HeroId, readonly string[]>> = {
  luyu: [
    'subpkg_images/cg_luyu_b4.jpg',
    'subpkg_images/cg_luyu_b5.jpg',
    'subpkg_images/cg_luyu_h1.jpg',
    'subpkg_images/cg_luyu_h2.jpg',
    'subpkg_images/cg_luyu_extra.jpg',
  ],
  jiangxubai: [
    'subpkg_images/cg_jiangxubai_b1.jpg',
    'subpkg_images/cg_jiangxubai_b2.jpg',
    'subpkg_images/cg_jiangxubai_b3.jpg',
    'subpkg_images/cg_jiangxubai_b4.jpg',
    'subpkg_images/cg_jiangxubai_b5.jpg',
    'subpkg_images/cg_jiangxubai_ending.jpg',
    'subpkg_images/cg_jiangxubai_h1.jpg',
    'subpkg_images/cg_jiangxubai_h2.jpg',
    'subpkg_images/cg_jiangxubai_extra.jpg',
  ],
  guye: [
    'subpkg_images/cg_guye_b1.jpg',
    'subpkg_images/cg_guye_b2.jpg',
    'subpkg_images/cg_guye_b3.jpg',
    'subpkg_images/cg_guye_b4.jpg',
    'subpkg_images/cg_guye_b5.jpg',
    'subpkg_images/cg_guye_ending.jpg',
    'subpkg_images/cg_guye_h1.jpg',
    'subpkg_images/cg_guye_h2.jpg',
    'subpkg_images/cg_guye_extra.jpg',
  ],
  shenyan: [
    'subpkg_images/cg_shenyan_b1.jpg',
    'subpkg_images/cg_shenyan_b2.jpg',
    'subpkg_images/cg_shenyan_b3.jpg',
    'subpkg_images/cg_shenyan_b4.jpg',
    'subpkg_images/cg_shenyan_b5.jpg',
    'subpkg_images/cg_shenyan_ending.jpg',
    'subpkg_images/cg_shenyan_h1.jpg',
    'subpkg_images/cg_shenyan_h2.jpg',
    'subpkg_images/cg_shenyan_extra.jpg',
  ],
  qinye: [
    'subpkg_images/cg_qinye_b1.jpg',
    'subpkg_images/cg_qinye_b2.jpg',
    'subpkg_images/cg_qinye_b3.jpg',
    'subpkg_images/cg_qinye_b4.jpg',
    'subpkg_images/cg_qinye_b5.jpg',
    'subpkg_images/cg_qinye_ending.jpg',
    'subpkg_images/cg_qinye_h1.jpg',
    'subpkg_images/cg_qinye_h2.jpg',
    'subpkg_images/cg_qinye_extra.jpg',
  ],
  xuzhiheng: [
    'subpkg_images/cg_xuzhiheng_b1.jpg',
    'subpkg_images/cg_xuzhiheng_b2.jpg',
    'subpkg_images/cg_xuzhiheng_b3.jpg',
    'subpkg_images/cg_xuzhiheng_b4.jpg',
    'subpkg_images/cg_xuzhiheng_b5.jpg',
    'subpkg_images/cg_xuzhiheng_ending.jpg',
    'subpkg_images/cg_xuzhiheng_h1.jpg',
    'subpkg_images/cg_xuzhiheng_h2.jpg',
    'subpkg_images/cg_xuzhiheng_extra.jpg',
  ],
  zhouyining: [
    'subpkg_images/cg_zhouyining_b1.jpg',
    'subpkg_images/cg_zhouyining_b2.jpg',
    'subpkg_images/cg_zhouyining_b3.jpg',
    'subpkg_images/cg_zhouyining_b4.jpg',
    'subpkg_images/cg_zhouyining_b5.jpg',
    'subpkg_images/cg_zhouyining_ending.jpg',
    'subpkg_images/cg_zhouyining_h1.jpg',
    'subpkg_images/cg_zhouyining_h2.jpg',
    'subpkg_images/cg_zhouyining_extra.jpg',
  ],
  huotingchen: [
    'subpkg_images/cg_huotingchen_b1.jpg',
    'subpkg_images/cg_huotingchen_b2.jpg',
    'subpkg_images/cg_huotingchen_b3.jpg',
    'subpkg_images/cg_huotingchen_b4.jpg',
    'subpkg_images/cg_huotingchen_b5.jpg',
    'subpkg_images/cg_huotingchen_ending.jpg',
    'subpkg_images/cg_huotingchen_h1.jpg',
    'subpkg_images/cg_huotingchen_h2.jpg',
    'subpkg_images/cg_huotingchen_extra.jpg',
  ],
  fujingshen: [
    'subpkg_images/cg_fujingshen_b1.jpg',
    'subpkg_images/cg_fujingshen_b2.jpg',
    'subpkg_images/cg_fujingshen_b3.jpg',
    'subpkg_images/cg_fujingshen_b4.jpg',
    'subpkg_images/cg_fujingshen_b5.jpg',
    'subpkg_images/cg_fujingshen_alt.jpg',
    'subpkg_images/cg_fujingshen_h1.jpg',
    'subpkg_images/cg_fujingshen_h2.jpg',
  ],
};

/** 首屏预热全部 @2x UI 切片与贴纸图标 */
export const BOOT_UI_TEXTURES: readonly string[] = [
  ...Object.values(ICONS),
  ...Object.values(UI_SLICES),
  ...Object.values(SHOP_STICKER_ICONS),
];

export function outfitCounterPath(id: OutfitId): string {
  return id === 'tee' || id === 'shirt' ? UI_SKINS.counterSweet : UI_SKINS.counterExec;
}

export function shopBannerPath(id: ShopId): string {
  return SHOP_BANNERS[id];
}

export function shopBuildingPath(id: ShopId): string {
  return SHOP_BUILDINGS[id];
}

export function heroCardThumbPath(heroId: HeroId, index: number, hidden = false): string {
  const pool = HERO_THUMB_POOL[heroId];
  if (hidden) return pool[pool.length - 1];
  return pool[index % pool.length];
}

/** v10 提亮精修版 2D 场景背景图（包内直出，彻底绕开旧版暗色 CDN 缓存） */
export function outfitScenePath(id: OutfitId): string {
  return `subpkg_images/v10_scene_${id}.jpg`;
}

/** v10 无损提亮精修版苏晚原设站立立绘（100% 保持原设五官与 2D 画风，肤色与明度通透提亮） */
export function outfitFigurePath(id: OutfitId): string {
  return `subpkg_images/v10_suwan_${id}.png`;
}

export function staffFigurePath(id: StaffId): string {
  return `subpkg_images/staff_${id}.png`;
}

export function heroFigurePath(id: HeroId): string {
  return `subpkg_images/hero_${id}.png`;
}

export function heroPortraitPath(id: HeroId): string {
  return `subpkg_images/portrait_${id}.jpg`;
}
