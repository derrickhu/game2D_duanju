/**
 * CDN 资源配置（微信云存储，和其他 Rosa 小游戏共用同一 CloudBase 环境，用 filePrefix 隔离）。
 *
 * 代码里一律写 minigame 根下的逻辑路径，例如 `subpkg_images/portrait_luyu.jpg`。
 * 剧情视频全部走 CDN（`videos/` 目录不进包）；首屏 UI 和 Loading 图留在包内。
 */

export interface CdnConfig {
  enabled: boolean;
  appId: string;
  cloudEnv: string;
  cloudBucket: string;
  baseUrl: string;
  filePrefix: string;
  cacheRootName: string;
  downloadRetry: number;
  downloadTimeoutMs: number;
  cdnDirs: readonly string[];
  /** 仅这些前缀算 CDN；同目录里未命中的仍打进微信包。 */
  cdnPrefixes: readonly string[];
  bundledDirs: readonly string[];
  ignoreFiles: readonly string[];
}

export const CDN_CONFIG: CdnConfig = {
  enabled: true,
  appId: 'wx06d4ac75bc87dec2',
  cloudEnv: 'rosa-env-d7grf78r5dbd37323',
  cloudBucket: '726f-rosa-env-d7grf78r5dbd37323-1414200063',
  baseUrl: 'https://726f-rosa-env-d7grf78r5dbd37323-1414200063.tcb.qcloud.la',
  filePrefix: 'duanju/assets_cdn',
  cacheRootName: 'duanju_cdn_cache_v1',
  downloadRetry: 2,
  downloadTimeoutMs: 30000,
  cdnDirs: [
    'subpkg_images',
    'subpkg_audio',
    'videos',
  ],
  cdnPrefixes: [
    'subpkg_images/portrait_',
    'subpkg_images/scene_',
    'subpkg_images/city_',
    'subpkg_images/suwan_',
    'subpkg_images/staff_',
    'subpkg_audio/',
    'videos/',
  ],
  bundledDirs: [
    'boot',
  ],
  ignoreFiles: ['game.js', '.DS_Store', 'Thumbs.db', '.gitkeep'],
};
