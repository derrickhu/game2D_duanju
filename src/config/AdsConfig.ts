/**
 * 微信激励视频广告位，和策划案 §9.1 的广告点一一对应。
 * 后台建好广告位后把 id 填进来；空串表示未开通，RewardedAdService 会返回 unavailable。
 */
export const REWARDED_AD_UNITS = {
  rushOrder: '',
  liveBoost: '',
  offlineDouble: '',
  rushRenovate: '',
  heroExtra: '',
  altEnding: '',
} as const;

export type RewardedAdScene = keyof typeof REWARDED_AD_UNITS;
