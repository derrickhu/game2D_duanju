/**
 * 玩法状态门面：UI 只通过这里改存档。
 * 负责每帧结算挂机收益（含江叙白自动接单与股市定时跳动）、跨门槛发解锁事件、爆单状态与定时存盘。
 */
import { BALANCE } from '@/data/balance';
import type { StaffId } from '@/data/staff';
import type { StockId } from '@/data/stocks';
import type { HeroId } from '@/data/story';
import type { StreetEventDef } from '@/data/streetEvents';
import type { AreaId, OutfitId, ShopId } from '@/data/world';
import { EV } from '@/config/events';
import { EventBus } from '@/core/EventBus';
import { Game } from '@/core/Game';
import { SaveManager } from '@/managers/SaveManager';
import * as A from '@/sim/actions';
import { computeSynergies, incomePerSec, isFeverActive, type EmpireSynergies } from '@/sim/economy';
import { claimQuest, currentQuest, type QuestProgress } from '@/sim/quests';
import type { BuyMode, GameSave } from '@/sim/save';
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

  get synergies(): EmpireSynergies {
    return computeSynergies(this.save);
  }

  get comboActive(): boolean {
    return Date.now() < this._comboUntil;
  }

  get feverActive(): boolean {
    return isFeverActive(this.save, Date.now());
  }

  get feverLeftSec(): number {
    return Math.max(0, (this.save.feverUntil - Date.now()) / 1000);
  }

  start(): void {
    if (this._started) return;
    this._started = true;
    this._lastSaveAt = Date.now();
    Game.ticker.add(() => this._update(Game.ticker.deltaMS / 1000));
  }

  tap(): A.InteractiveTapResult {
    const now = Date.now();
    this._tapTimes = this._tapTimes.filter((t) => now - t < 1000);
    this._tapTimes.push(now);
    if (this._tapTimes.length >= BALANCE.comboTapsPerSec) {
      this._comboUntil = now + BALANCE.comboDurationSec * 1000;
    }
    const r = this._mutate(() => A.tapInteractive(this.save, now, this.comboActive));
    if (r.feverTriggered) EventBus.emit(EV.feverChanged, true);
    return r;
  }

  serveOrder(): { amount: number; feverTriggered: boolean; inspirationGained: number } {
    const r = this._mutate(() => A.serveCustomerOrder(this.save, Date.now()));
    if (r.feverTriggered) EventBus.emit(EV.feverChanged, true);
    return r;
  }

  setBuyMode(mode: BuyMode): void {
    if (this.save.buyMode === mode) return;
    this.save.buyMode = mode;
    EventBus.emit(EV.saveChanged);
  }

  buyShop(id: ShopId, count: number | 'max' | BuyMode = this.save.buyMode): A.BuyShopResult | null {
    const r = this._mutate(() => A.buyShop(this.save, id, count));
    if (r) {
      EventBus.emit(EV.shopChanged, id);
      if (r.metHero) EventBus.emit(EV.heroChanged, r.metHero, true);
    }
    return r;
  }

  upgradeStaff(id: StaffId, mode: number | BuyMode = this.save.buyMode): A.StaffUpgradeResult | null {
    const r = this._mutate(() => A.upgradeStaff(this.save, id, mode));
    if (r) EventBus.emit(EV.staffChanged, id, r);
    return r;
  }

  get quest(): QuestProgress | null {
    return currentQuest(this.save);
  }

  claimQuest(): { cash: number; roses: number } {
    const p = currentQuest(this.save);
    if (!p || !p.done) return { cash: 0, roses: 0 };
    const roses = p.roses;
    const cash = this._mutate(() => claimQuest(this.save));
    if (cash > 0) {
      EventBus.emit(EV.questChanged);
      this.flush();
    }
    return { cash, roses: cash > 0 ? roses : 0 };
  }

  upgradeSkill(mode: number | BuyMode = this.save.buyMode): boolean {
    return this._mutate(() => A.upgradeSkill(this.save, mode));
  }

  investBond(heroId: HeroId): boolean {
    const ok = this._mutate(() => A.investBond(this.save, heroId));
    if (ok) EventBus.emit(EV.heroChanged, heroId, false);
    return ok;
  }

  resolveStreetEvent(event: StreetEventDef, optionIdx: 0 | 1 | 2): A.StreetEventResolution {
    const r = this._mutate(() => A.resolveStreetEvent(this.save, event, optionIdx, Date.now()));
    if (r.feverTriggered) EventBus.emit(EV.feverChanged, true);
    this.flush();
    return r;
  }

  clearChapterBattle(chapterId: number): number {
    const roses = this._mutate(() => A.clearChapterBattle(this.save, chapterId));
    if (roses > 0) this.flush();
    return roses;
  }

  winAreaCrown(areaId: AreaId): ReturnType<typeof A.winAreaCrownBattle> {
    const res = this._mutate(() => A.winAreaCrownBattle(this.save, areaId));
    if (res) {
      EventBus.emit(EV.areaCrownChanged, areaId);
      EventBus.emit(EV.shopChanged, null);
      this.flush();
    }
    return res;
  }

  claimChapterClimax(chapterId: number, choice: 'A' | 'B'): number {
    const roses = this._mutate(() => A.claimChapterClimax(this.save, chapterId, choice));
    if (roses > 0) this.flush();
    return roses;
  }

  // ---- 招牌爆品研发室 ----
  craftRecipe(baseId: string, soulId: string, hypeId: string): A.CraftRecipeResult | null {
    const res = this._mutate(() => A.craftRecipe(this.save, baseId, soulId, hypeId));
    if (res) {
      EventBus.emit(EV.recipeChanged);
      EventBus.emit(EV.shopChanged, null);
      this.flush();
    }
    return res;
  }

  buyInspiration(): boolean {
    const ok = this._mutate(() => A.buyInspiration(this.save));
    if (ok) {
      EventBus.emit(EV.recipeChanged);
      this.flush();
    }
    return ok;
  }

  equipShopRecipe(shopId: ShopId, comboKey: string | null): boolean {
    const ok = this._mutate(() => A.equipShopRecipe(this.save, shopId, comboKey));
    if (ok) {
      EventBus.emit(EV.recipeChanged);
      EventBus.emit(EV.shopChanged, shopId);
      this.flush();
    }
    return ok;
  }

  // ---- 店员专长驻店 & 商业外勤差遣 ----
  assignShopManager(shopId: ShopId, staffId: StaffId | null): boolean {
    const ok = this._mutate(() => A.assignShopManager(this.save, shopId, staffId));
    if (ok) {
      EventBus.emit(EV.dispatchChanged);
      EventBus.emit(EV.shopChanged, shopId);
      this.flush();
    }
    return ok;
  }

  startDispatch(slotIdx: number, missionId: string, staffIds: StaffId[]): boolean {
    const ok = this._mutate(() => A.startStaffDispatch(this.save, slotIdx, missionId, staffIds, Date.now()));
    if (ok) {
      EventBus.emit(EV.dispatchChanged);
      this.flush();
    }
    return ok;
  }

  claimDispatch(slotIdx: number): A.DispatchClaimResult | null {
    const res = this._mutate(() => A.claimStaffDispatch(this.save, slotIdx, Date.now()));
    if (res) {
      EventBus.emit(EV.dispatchChanged);
      this.flush();
    }
    return res;
  }

  refreshDispatchBoard(): void {
    A.refreshDispatchBoard(this.save);
    EventBus.emit(EV.dispatchChanged);
    this.flush();
  }

  // ---- 晚星风投 · 股市做空操盘 ----
  tradeStock(stockId: StockId, direction: 'long' | 'short', budgetRatio: number): ReturnType<typeof A.tradeStock> {
    const res = this._mutate(() => A.tradeStock(this.save, stockId, direction, budgetRatio));
    if (res.ok) {
      EventBus.emit(EV.stockChanged);
      this.flush();
    }
    return res;
  }

  settleStock(stockId: StockId): ReturnType<typeof A.settleStock> {
    const res = this._mutate(() => A.settleStock(this.save, stockId));
    if (res.ok) {
      EventBus.emit(EV.stockChanged);
      this.flush();
    }
    return res;
  }

  spendInsiderToken(): boolean {
    const ok = this._mutate(() => A.spendInsiderToken(this.save, Date.now()));
    if (ok) {
      EventBus.emit(EV.stockChanged);
      this.flush();
    }
    return ok;
  }

  replyChat(threadId: string, optionIdx: 0 | 1): number {
    const roses = this._mutate(() => A.replyChat(this.save, threadId, optionIdx));
    if (roses > 0) {
      EventBus.emit(EV.chatChanged);
      this.flush();
    }
    return roses;
  }

  likeMoment(postId: string): number {
    const roses = this._mutate(() => A.likeMoment(this.save, postId));
    if (roses > 0) {
      EventBus.emit(EV.chatChanged);
      this.flush();
    }
    return roses;
  }

  prestigeSeason(): boolean {
    const ok = A.prestigeSeason(this.save, Date.now());
    if (ok) {
      EventBus.emit(EV.seasonChanged, this.save.season);
      EventBus.emit(EV.saveChanged);
      EventBus.emit(EV.moneyChanged);
      EventBus.emit(EV.rosesChanged);
      EventBus.emit(EV.shopChanged, null);
      this.flush();
    }
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

  unlockOutfitByAd(id: OutfitId): void {
    A.unlockByAd(this.save, `outfit:${id}`);
    this.save.outfit = id;
    EventBus.emit(EV.moneyChanged);
    EventBus.emit(EV.saveChanged);
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

  gmAddMoney(): number {
    const amount = this._mutate(() => A.gmAddMoney(this.save));
    EventBus.emit(EV.recipeChanged);
    EventBus.emit(EV.stockChanged);
    this.flush();
    return amount;
  }

  gmUnlockAllVideos(): void {
    A.gmUnlockAllVideos(this.save);
    EventBus.emit(EV.moneyChanged);
    EventBus.emit(EV.rosesChanged);
    EventBus.emit(EV.shopChanged, null);
    this.flush();
  }

  flush(): void {
    this.save.lastActiveAt = Date.now();
    SaveManager.flush();
    this._lastSaveAt = Date.now();
  }

  private _update(dtSec: number): void {
    const dt = Math.min(dtSec, 1);
    const prevStockTick = this.save.stockNextTickAt;
    this._mutate(() => A.tick(this.save, dt, Date.now()));
    if (this.save.stockNextTickAt !== prevStockTick) {
      EventBus.emit(EV.stockChanged);
    }
    if (Date.now() - this._lastSaveAt > AUTOSAVE_MS) this.flush();
  }

  private _mutate<T>(fn: () => T): T {
    const before = this.save.netWorth;
    const moneyBefore = this.save.money;
    const rosesBefore = this.save.roses;
    const inspBefore = this.save.inspiration;
    const result = fn();
    if (this.save.money !== moneyBefore) EventBus.emit(EV.moneyChanged);
    if (this.save.roses !== rosesBefore) EventBus.emit(EV.rosesChanged);
    if (this.save.inspiration !== inspBefore) EventBus.emit(EV.inspirationChanged);
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
