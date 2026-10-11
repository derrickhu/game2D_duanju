import '@/core/pixiUnsafeEvalPatch';
import { analytics, initAnalytics, setAnalyticsUserId } from '@/analytics';
import { SAVE_KEY } from '@/config/CloudConfig';
import { EV } from '@/config/events';
import { AudioManager } from '@/core/AudioManager';
import { CdnAssetService } from '@/core/CdnAssetService';
import { EventBus } from '@/core/EventBus';
import { Game } from '@/core/Game';
import { type CloudImportInfo, PersistService } from '@/core/PersistService';
import { Platform } from '@/core/PlatformService';
import { SceneManager } from '@/core/SceneManager';
import { CloudSyncManager } from '@/managers/CloudSyncManager';
import { GameState } from '@/managers/GameState';
import { SaveManager } from '@/managers/SaveManager';
import { HomeScene } from '@/scenes/HomeScene';
import { LoadingScene } from '@/scenes/LoadingScene';
import { ensureBootSubpackages } from '@/utils/bootSubpackages';
import { preloadTextures } from '@/utils/assets';
import { outfitFigurePath, outfitScenePath } from '@/data/art';

const BOOT_HOLD_MS = 1800;

CloudSyncManager.prewarm();

function handleCloudSaveReload(info: CloudImportInfo): void {
  console.warn(`[duanju] 云端存档已覆盖本地，准备刷新 reason=${info.reason}, updatedAt=${info.updatedAt}`);
  Platform.showToast('已恢复云端存档，正在刷新', 'none');
  if (Platform.restartMiniProgram()) return;
  SaveManager.load();
  EventBus.emit(EV.saveChanged);
}

function installErrorHooks(): void {
  if (typeof GameGlobal === 'undefined') return;
  const prevError = GameGlobal.onError;
  const prevReject = GameGlobal.onUnhandledRejection;
  GameGlobal.onError = (msg: string) => {
    console.error('[GlobalError]', msg);
    try { prevError?.(msg); } catch { /* */ }
    analytics.trackAppError(msg, { source: 'GameGlobal.onError' });
  };
  GameGlobal.onUnhandledRejection = (ev: any) => {
    console.error('[UnhandledRejection]', ev?.reason || ev);
    try { prevReject?.(ev); } catch { /* */ }
    analytics.trackAppError(ev?.reason || ev, { source: 'unhandledRejection' });
  };
}

async function main(): Promise<void> {
  initAnalytics();
  installErrorHooks();

  const canvas = (typeof GameGlobal !== 'undefined' && GameGlobal.canvas)
    ? GameGlobal.canvas
    : (globalThis as any).canvas ?? (typeof document !== 'undefined' ? document.querySelector('canvas') : null);
  if (!canvas) {
    console.error('[duanju] 找不到主 canvas');
    return;
  }

  Game.init(canvas);
  AudioManager.init();

  const loading = new LoadingScene();
  SceneManager.register(loading);
  SceneManager.switchTo('loading');
  const started = Date.now();

  let initialSaveLoaded = false;
  PersistService.subscribeCloudImport((info) => {
    if (!info.changedKeys.includes(SAVE_KEY) || !initialSaveLoaded) return;
    handleCloudSaveReload(info);
  });

  const bootPacks = ensureBootSubpackages((done, total) => {
    loading.setProgress(0.05 + done / Math.max(1, total) * 0.4);
  });
  const startupSync = await CloudSyncManager.awaitStartupSync();
  if (CloudSyncManager.userId) setAnalyticsUserId(CloudSyncManager.userId);
  loading.setProgress(0.5);

  SaveManager.load();
  initialSaveLoaded = true;

  await CdnAssetService.fetchManifest();
  void AudioManager.preloadSfx();
  await bootPacks;
  const outfit = GameState.save.outfit;
  await preloadTextures([outfitScenePath(outfit), outfitFigurePath(outfit)], (done, total) => {
    loading.setProgress(0.6 + done / total * 0.4);
  });
  loading.setProgress(1);

  await new Promise<void>((resolve) => {
    globalThis.setTimeout(resolve, Math.max(0, BOOT_HOLD_MS - (Date.now() - started)));
  });
  SceneManager.register(new HomeScene());
  SceneManager.switchTo('home');
  GameState.start();
  AudioManager.playBgm('home');

  // 首帧之后再挂分享菜单，太早调用真机会静默失败
  globalThis.setTimeout(() => {
    Platform.bindShareMenu(() => '假千金逆袭');
  }, 0);

  analytics.trackSessionStart({ entry: 'main_boot', cloud_sync_status: startupSync.status });

  let lastHideAt = 0;
  Platform.onHide(() => {
    GameState.flush();
    void CloudSyncManager.flushNow('hide');
    analytics.trackSessionEnd('app-hide');
    lastHideAt = Date.now();
  });
  Platform.onShow(() => {
    if (lastHideAt > 0) {
      analytics.trackAppShow({ from_background: true, background_ms: Math.max(0, Date.now() - lastHideAt) });
    }
  });

  console.log(`[duanju] 启动完成 v${typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev'}`);
}

void main().catch((e) => {
  console.error('[duanju] 启动失败:', e);
  analytics.trackAppError(e, { source: 'main.catch' });
});
