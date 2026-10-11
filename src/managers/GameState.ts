/**
 * 玩法状态门面：UI 只通过这里改存档。
 * 负责每帧结算挂机收益、跨门槛发解锁事件、定时存盘。
 */
import { BALANCE } from '@/data/balance';
import type { StaffId } from '@/data/staff';
import type { HeroId } from '@/data/story';
import type { OutfitId, ShopId } from '@/data/world';
import { EV } from '@/config/events';
import { EventBus } from '@/core/EventBus';
import { Game } from '@/core/Game';
import { SaveManager } from '@/managers/SaveManager';
import * as A from '@/sim/actions';
import { incomePerSec } from '@/sim/economy';
import { claimQuest, currentQuest, type QuestProgress } from '@/sim/quests';
import type { GameSave } from '@/sim/save';
import { crossedThresholds } from '@/sim/unlocks';

const AUTOSAVE_MS = 10_000;

class GameStateClass {
  private _lastSaveAt = 0;
  private _tapTimes: number[] = [];
  private _comboUntil = 0;
  private _started = false;

  get save(): GameSave {
    return SaveManager.data;
  }

  get incomePerSec(): number {
    return incomePerSec(this.save, Date.now());
  }

  get comboActive(): boolean {
    return Date.now() < this._comboUntil;
  }

  start(): void {
    if (this._started) return;
    this._started = true;
    this._lastSaveAt = Date.now();
    Game.ticker.add(() => this._update(Game.ticker.deltaMS / 1000));
  }

  tap(): number {
    const now = Date.now();
    this._tapTimes = this._tapTimes.filter((t) => now - t < 1000);
    this._tapTimes.push(now);
    if (this._tapTimes.length >= BALANCE.comboTapsPerSec) {
      this._comboUntil = now + BALANCE.comboDurationSec * 1000;
    }
    return this._mutate(() => A.tap(this.save, now, this.comboActive));
  }

  buyShop(id: ShopId, count: number | 'max'): A.BuyShopResult | null {
    const r = this._mutate(() => A.buyShop(this.save, id, count));
    if (r) {
      EventBus.emit(EV.shopChanged, id);
      if (r.metHero) EventBus.emit(EV.heroChanged, r.metHero, true);
    }
    return r;
  }

  upgradeStaff(id: StaffId): A.StaffUpgradeResult | null {
    const r = this._mutate(() => A.upgradeStaff(this.save, id));
    if (r) EventBus.emit(EV.staffChanged, id, r);
    return r;
  }

  get quest(): QuestProgress | null {
    return currentQuest(this.save);
  }

  /** 领当前任务奖励；没完成返回 0 */
  claimQuest(): number {
    const got = this._mutate(() => claimQuest(this.save));
    if (got > 0) {
      EventBus.emit(EV.questChanged);
      this.flush();
    }
    return got;
  }

  upgradeSkill(): boolean {
    return this._mutate(() => A.upgradeSkill(this.save));
  }

  investBond(heroId: HeroId): boolean {
    const ok = this._mutate(() => A.investBond(this.save, heroId));
    if (ok) EventBus.emit(EV.heroChanged, heroId, false);
    return ok;
  }

  claimOffline(multiplier: number): number {
    const { amount } = A.computeOffline(this.save, Date.now());
    const total = amount * multiplier;
    this._mutate(() => A.earn(this.save, total));
    this.save.lastActiveAt = Date.now();
    return total;
  }

  claimRushOrder(): number {
    return this._mutate(() => A.claimRushOrder(this.save, Date.now()));
  }

  startLiveBoost(): void {
    A.startLiveBoost(this.save, Date.now());
    EventBus.emit(EV.boostChanged);
    this.flush();
  }

  markWatched(videoId: string): void {
    if (A.markWatched(this.save, videoId)) {
      EventBus.emit(EV.videoWatched, videoId);
      this.flush();
    }
  }

  unlockByAd(videoId: string): void {
    A.unlockByAd(this.save, videoId);
    this.flush();
  }

  setOutfit(id: OutfitId): void {
    this.save.outfit = id;
    EventBus.emit(EV.saveChanged);
  }

  setTutorialStep(step: number): void {
    this.save.tutorialStep = step;
    EventBus.emit(EV.tutorialStepChanged, step);
    this.flush();
  }

  flush(): void {
    this.save.lastActiveAt = Date.now();
    SaveManager.flush();
    this._lastSaveAt = Date.now();
  }

  private _update(dtSec: number): void {
    // 切后台回来 deltaMS 可能很大，那段由离线收益结算
    const dt = Math.min(dtSec, 1);
    this._mutate(() => A.tick(this.save, dt, Date.now()));
    if (Date.now() - this._lastSaveAt > AUTOSAVE_MS) this.flush();
  }

  private _mutate<T>(fn: () => T): T {
    const before = this.save.netWorth;
    const moneyBefore = this.save.money;
    const result = fn();
    if (this.save.money !== moneyBefore) EventBus.emit(EV.moneyChanged);
    if (this.save.netWorth > before) this._emitCrossed(before, this.save.netWorth);
    return result;
  }

  private _emitCrossed(before: number, after: number): void {
    const c = crossedThresholds(before, after);
    for (const ch of c.chapters) EventBus.emit(EV.chapterUnlocked, ch);
    for (const area of c.areas) EventBus.emit(EV.areaUnlocked, area);
    for (const o of c.outfits) EventBus.emit(EV.outfitUnlocked, o);
    if (c.shops.length) EventBus.emit(EV.shopChanged, null);
  }
}

export const GameState = new GameStateClass();
