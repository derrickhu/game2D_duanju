/**
 * 剧情视频播放。
 *
 * 小游戏：wx.createVideo 盖在画布上面（underGameView 在开发者工具和部分机型上黑屏），
 *   上下各留一条，Pixi 在条带里画标题和“跳过”按钮。
 * 浏览器：<video> 盖在画布上，点击跳过。
 *
 * 视频走 CDN 直链（videos/<id>.mp4），不下载到本地缓存。
 * CDN 域名需要在小程序后台加到 downloadFile 合法域名。
 */
import * as PIXI from 'pixi.js';
import { VIDEOS, videoPath } from '@/data/story';
import { CdnAssetService } from '@/core/CdnAssetService';
import { Game } from '@/core/Game';
import { OverlayManager } from '@/core/OverlayManager';
import { Platform } from '@/core/PlatformService';
import { SceneManager } from '@/core/SceneManager';
import { ToastManager } from '@/core/ToastManager';
import { Button } from '@/ui/Button';
import { COLORS, makeText } from '@/ui/theme';

export type VideoResult = 'ended' | 'skipped' | 'error';

/** 第一次看，开播几秒后才能跳过；看过的随时可跳 */
const SKIP_DELAY_SEC = 3;

/** 原生视频盖在画布上面会挡住触摸，标题和“跳过”只能放在视频上下留出的条带里（逻辑像素） */
const TOP_BAR = 56;
const BOTTOM_BAR = 150;

interface NativeVideo {
  play(): void;
  destroy(): void;
  onEnded(cb: () => void): void;
  onError(cb: (e: unknown) => void): void;
  onPlay(cb: () => void): void;
}

class VideoServiceClass {
  private _playing = false;

  get playing(): boolean {
    return this._playing;
  }

  play(videoId: string, watchedBefore: boolean): Promise<VideoResult> {
    if (this._playing) return Promise.resolve('error');
    const def = VIDEOS.get(videoId);
    const url = CdnAssetService.publicUrl(videoPath(videoId));
    this._playing = true;

    return new Promise<VideoResult>((resolve) => {
      const scene = SceneManager.current?.container;
      if (scene) scene.visible = false;
      const hiddenPanels = OverlayManager.container.children.filter((c) => c.visible);
      for (const p of hiddenPanels) p.visible = false;
      const layer = this._buildLayer(def?.title ?? videoId);
      let player: { destroy(): void } | null = null;
      let settled = false;

      const finish = (result: VideoResult): void => {
        if (settled) return;
        settled = true;
        this._playing = false;
        try { player?.destroy(); } catch (_) {}
        layer.destroy({ children: true });
        if (scene) scene.visible = true;
        for (const p of hiddenPanels) if (!p.destroyed) p.visible = true;
        if (result === 'error') ToastManager.show('剧情视频制作中，敬请期待');
        resolve(result);
      };

      const skip = new Button({
        width: 150, height: 64, label: '跳过', color: COLORS.mask, fontSize: 28,
        onTap: () => finish('skipped'),
      });
      skip.alpha = 0.75;
      skip.position.set(Game.logicWidth - 100, Game.logicHeight - Game.safeBottom - 80);
      skip.visible = watchedBefore;
      layer.addChild(skip);
      if (!watchedBefore) setTimeout(() => { if (!skip.destroyed) skip.visible = true; }, SKIP_DELAY_SEC * 1000);

      player = Platform.isMinigame && typeof Platform.api?.createVideo === 'function'
        ? this._playNative(url, finish)
        : this._playBrowser(url, finish);
      if (!player) finish('error');
    });
  }

  private _buildLayer(title: string): PIXI.Container {
    const layer = new PIXI.Container();
    layer.zIndex = 20000;
    const bg = new PIXI.Graphics();
    bg.beginFill(0x000000).drawRect(0, 0, Game.logicWidth, Game.logicHeight).endFill();
    bg.eventMode = 'static';
    layer.addChild(bg);
    const title_ = makeText(title, 30, COLORS.white, true);
    title_.position.set(32, Game.safeTop + 8);
    title_.alpha = 0.85;
    layer.addChild(title_);
    OverlayManager.container.addChild(layer);
    return layer;
  }

  private _playNative(src: string, finish: (r: VideoResult) => void): { destroy(): void } | null {
    try {
      const top = Math.round((Game.safeTop + TOP_BAR) * Game.contentScale);
      const bottom = Math.round((Game.safeBottom + BOTTOM_BAR) * Game.contentScale);
      const video: NativeVideo = Platform.api.createVideo({
        x: 0,
        y: top,
        width: Game.screenWidth,
        height: Math.max(100, Game.screenHeight - top - bottom),
        src,
        autoplay: true,
        controls: false,
        showCenterPlayBtn: false,
        showProgress: false,
        enableProgressGesture: false,
        obeyMuteSwitch: false,
        objectFit: 'contain',
        backgroundColor: '#000000',
      });
      video.onEnded(() => finish('ended'));
      video.onError((e) => {
        console.warn('[Video] 播放失败', src, e);
        finish('error');
      });
      video.play();
      return video;
    } catch (e) {
      console.warn('[Video] createVideo 失败', e);
      return null;
    }
  }

  private _playBrowser(src: string, finish: (r: VideoResult) => void): { destroy(): void } | null {
    if (typeof document === 'undefined') return null;
    const el = document.createElement('video');
    el.src = src;
    el.autoplay = true;
    el.playsInline = true;
    el.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;object-fit:contain;background:#000;z-index:-1';
    el.onended = () => finish('ended');
    el.onerror = () => finish('error');
    document.body.appendChild(el);
    void el.play().catch(() => finish('error'));
    return { destroy: () => el.remove() };
  }
}

export const VideoService = new VideoServiceClass();
