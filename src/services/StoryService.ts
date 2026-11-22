import { getHeroScript } from '@/data/heroScripts';
import { FINAL_CHAPTER, VIDEOS, isVideoFileReady, type ChapterDef } from '@/data/story';
import { Platform } from '@/core/PlatformService';
import { ToastManager } from '@/core/ToastManager';
import { GameState } from '@/managers/GameState';
import { BusinessBattleModal } from '@/scenes/home/BusinessBattleModal';
import { CGTheater } from '@/scenes/home/CGTheater';
import { finaleHero, isVideoAdPending, isVideoUnlocked } from '@/sim/unlocks';
import { VideoService, type VideoResult } from './VideoService';

/**
 * 播放一段剧情或男主剧集：
 * - 已制作视频的段落走 VideoService（失败时若有剧本则无缝降级到韩漫 CG 剧场）；
 * - 其余男主心动线、暗面线、花絮、结局直接进入韩漫 CG 剧场，零黑屏等待。
 */
export async function playStory(videoId: string): Promise<VideoResult> {
  const save = GameState.save;
  if (!isVideoUnlocked(save, videoId)) {
    if (!isVideoAdPending(save, videoId)) {
      ToastManager.show('还没解锁该剧情');
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

  let result: VideoResult;
  if (isVideoFileReady(videoId)) {
    result = await VideoService.play(videoId, save.watched.includes(videoId));
    if (result === 'error' && getHeroScript(videoId)) {
      result = await CGTheater.play(videoId);
    }
  } else {
    result = await CGTheater.play(videoId);
  }

  if (result !== 'error') GameState.markWatched(videoId);
  return result;
}

/** 章节连播列表；终章后面接羁绊最高男主的专属结局 */
export function chapterPlaylist(ch: ChapterDef, from = 0): string[] {
  const list = ch.videos.slice(from);
  const ending = finaleHero(GameState.save).endingVideo;
  if (ch.id === FINAL_CHAPTER && ending) list.push(ending);
  return list;
}

/** 连播（序章、章节），遇到异常中断避免连续弹提示 */
export async function playStorySequence(ids: readonly string[]): Promise<void> {
  for (const id of ids) {
    if (!VIDEOS.has(id)) continue;
    const r = await playStory(id);
    if (r === 'error') return;
  }
}

/** 完整章节体验流：身价商战碾压对决 → 章节连播 → 高潮二选一打脸抉择 */
export async function playChapterFlow(ch: ChapterDef, from = 0): Promise<void> {
  if (ch.id > 0) {
    const ok = await BusinessBattleModal.showBattle(ch);
    if (!ok) return;
  }
  await playStorySequence(chapterPlaylist(ch, from));
  if (ch.id > 0) {
    await BusinessBattleModal.showClimax(ch.id);
  }
}
