import { VIDEOS } from '@/data/story';
import { Platform } from '@/core/PlatformService';
import { ToastManager } from '@/core/ToastManager';
import { GameState } from '@/managers/GameState';
import { isVideoAdPending, isVideoUnlocked } from '@/sim/unlocks';
import { VideoService, type VideoResult } from './VideoService';

/** 播放一段剧情；番外未解锁时先走激励广告。 */
export async function playStory(videoId: string): Promise<VideoResult> {
  const save = GameState.save;
  if (!isVideoUnlocked(save, videoId)) {
    if (!isVideoAdPending(save, videoId)) {
      ToastManager.show('还没解锁');
      return 'error';
    }
    const unlocked = await new Promise<boolean>((resolve) => {
      const scene = videoId.endsWith('_alt') ? 'altEnding' : 'heroExtra';
      let rewarded = false;
      Platform.showRewardedVideo(scene, () => { rewarded = true; }, () => resolve(rewarded));
    });
    if (!unlocked) return 'error';
    GameState.unlockByAd(videoId);
  }
  const result = await VideoService.play(videoId, save.watched.includes(videoId));
  if (result !== 'error') GameState.markWatched(videoId);
  return result;
}

/** 连播（序章、章节），遇到缺片就停，避免连续弹提示 */
export async function playStorySequence(ids: readonly string[]): Promise<void> {
  for (const id of ids) {
    if (!VIDEOS.has(id)) continue;
    const r = await playStory(id);
    if (r === 'error') return;
  }
}
