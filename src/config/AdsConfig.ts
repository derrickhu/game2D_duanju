/**
 * 微信激励视频广告位，和策划案 §9.1 的广告点一一对应。
 * 后台建好广告位后把 id 填进来；空串表示未开通，RewardedAdService 会返回 unavailable。
 */
export const REWARDED_AD_UNITS = {
  rushOrder: 'adunit-54ceb0b1e555234d',
  liveBoost: 'adunit-c9abda95e04d1158',
  offlineDouble: 'adunit-031c7db6c0a2ed5e',
  rushRenovate: 'adunit-07155e4ebef63d2d',
  heroExtra: 'adunit-7081fb5db1c19952',
  altEnding: 'adunit-7081fb5db1c19952',
  wardrobeOutfit: 'adunit-7081fb5db1c19952',
} as const;

export type RewardedAdScene = keyof typeof REWARDED_AD_UNITS;
