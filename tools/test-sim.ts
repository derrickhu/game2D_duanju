import assert from 'node:assert/strict';
import { STAFF } from '../src/data/staff.ts';
import { STREET_EVENTS } from '../src/data/streetEvents.ts';
import { formatMoney } from '../src/sim/format.ts';
import { createSave, normalizeSave } from '../src/sim/save.ts';
import {
  areaStaffMultiplier, baseIncomePerSec, computeSynergies, maxAffordableLevels,
  shopIncome, shopUpgradeCost, shopUpgradeCostN, skillValue, staffIncome,
  staffStar, staffUpgradeCost, tapValue,
} from '../src/sim/economy.ts';
import {
  buyShop, claimRushOrder, clearChapterBattle, computeOffline, investBond,
  likeMoment, prestigeSeason, replyChat, resolveStreetEvent, serveCustomerOrder,
  startLiveBoost, tap, tapInteractive, tick, upgradeSkill, upgradeStaff,
  assignShopManager, claimStaffDispatch, craftRecipe, equipShopRecipe,
  settleStock, spendInsiderToken, startStaffDispatch, tradeStock, winAreaCrownBattle,
} from '../src/sim/actions.ts';
import { CHAPTER_BATTLES } from '../src/data/battleCards.ts';
import { buildBattleHand, evaluateSuitRelation, resolveCardClash } from '../src/sim/battle.ts';
import { shopIncomeIn } from '../src/sim/economy.ts';
import { currentStockPrice } from '../src/sim/stockSim.ts';
import { claimQuest, currentQuest } from '../src/sim/quests.ts';
import {
  bondBlockReason, crossedThresholds, currentChapter, effectiveBond,
  isVideoAdPending, isVideoUnlocked, nextGoal, unreadChatCount,
} from '../src/sim/unlocks.ts';

const NOW = 1_800_000_000_000;
let passed = 0;
function test(name: string, fn: () => void): void {
  fn();
  passed += 1;
  console.log(`  ok  ${name}`);
}

test('formatMoney 中文单位', () => {
  assert.equal(formatMoney(999), '999');
  assert.equal(formatMoney(12345), '1.23万');
  assert.equal(formatMoney(1.5e9), '15.0亿');
  assert.equal(formatMoney(2e12), '2.00万亿');
  assert.equal(formatMoney(3e16), '3.00京');
});

test('门店价格几何级数，批量 = 逐级之和', () => {
  let sum = 0;
  for (let l = 3; l < 8; l++) sum += shopUpgradeCost('stall', l);
  assert.ok(Math.abs(shopUpgradeCostN('stall', 3, 5) - sum) < 1e-6);
  const n = maxAffordableLevels('stall', 3, sum + 1);
  assert.equal(n, 5);
});

test('里程碑翻倍与玫瑰奖励', () => {
  assert.equal(shopIncome('stall', 9, 0), 9);
  assert.equal(shopIncome('stall', 10, 0), 20);
  assert.ok(Math.abs(shopIncome('stall', 10, 2) - 28) < 1e-9);
  assert.equal(skillValue(10), 100);
  const s = createSave(NOW);
  s.money = 1e6;
  const r = buyShop(s, 'stall', 10);
  assert.equal(r?.milestoneReached, 10);
  assert.equal(s.roses, 2);
});

test('点击：技能 + 4% 每秒收益，连击 ×2，Fever 满槽触发', () => {
  const s = createSave(NOW);
  assert.equal(tapValue(s, NOW, false), 5);
  assert.equal(tapValue(s, NOW, true), 10);
  s.money = 1e6;
  buyShop(s, 'stall', 10);
  assert.ok(Math.abs(tapValue(s, NOW, false) - (5 + 20 * 0.04)) < 1e-9);
  for (let i = 0; i < 9; i++) serveCustomerOrder(s, NOW);
  const tenth = serveCustomerOrder(s, NOW);
  assert.equal(tenth.feverTriggered, true);
  assert.ok(s.feverUntil > NOW);
});

test('开店遇到男主，优先用玫瑰升羁绊且受章节门槛限制', () => {
  const s = createSave(NOW);
  s.netWorth = 1e4;
  s.money = 1e6;
  s.roses = 10;
  const r = buyShop(s, 'dessert', 1);
  assert.equal(r?.metHero, 'luyu');
  const moneyAfterShop = s.money;
  assert.ok(investBond(s, 'luyu'));
  assert.equal(s.bonds.luyu, 2);
  assert.equal(s.roses, 4); // 优先扣玫瑰，不扣开店现金
  assert.equal(s.money, moneyAfterShop);
  assert.equal(bondBlockReason(s, 'luyu'), '主线第 4 章后解锁');
  assert.ok(!investBond(s, 'luyu'));
  s.netWorth = 1e7;
  s.roses = 20;
  assert.ok(investBond(s, 'luyu'));
  assert.equal(s.bonds.luyu, 3);
});

test('老店 Lv25/50 商业协同光环与男主合伙人特权生效', () => {
  const s = createSave(NOW);
  s.netWorth = 1e7;
  s.money = 1e11;
  buyShop(s, 'law', 25); // 律所 Lv25 -8% 升级费 + 沈砚 Lv1 -3% = -11%
  const syn = computeSynergies(s);
  assert.ok(Math.abs(syn.costDiscount - 0.11) < 1e-9);
  buyShop(s, 'cafe', 1); // 遇到江叙白 Lv1 -> 每秒自动点击 1 次
  const before = s.money;
  tick(s, 1, NOW);
  assert.ok(s.money > before + baseIncomePerSec(s) * 0.99);
  // 陆屿暴击测试
  buyShop(s, 'dessert', 1);
  const critRes = tapInteractive(s, NOW, false, 0.01);
  assert.equal(critRes.crit, true);
});

test('未解锁门店不能买 & 身价只涨不跌', () => {
  const s = createSave(NOW);
  s.money = 1e12;
  assert.equal(buyShop(s, 'cafe', 1), null);

  const s2 = createSave(NOW);
  for (let i = 0; i < 10; i++) tap(s2, NOW, false);
  assert.equal(s2.netWorth, 50);
  s2.money = 100;
  s2.netWorth = 100;
  buyShop(s2, 'stall', 1);
  assert.equal(s2.money, 0);
  assert.equal(s2.netWorth, 100);
});

test('tick、离线与急单直播', () => {
  const s = createSave(NOW);
  s.money = 1e6;
  buyShop(s, 'stall', 10);
  const base = baseIncomePerSec(s);
  tick(s, 2, NOW);
  assert.ok(Math.abs(s.netWorth - base * 2) < 1e-6);
  const off = computeOffline(s, NOW + 10 * 3600 * 1000);
  assert.equal(off.seconds, 2 * 3600);
  assert.ok(Math.abs(off.amount - base * 7200 * 0.5) < 1e-6);

  const s2 = createSave(NOW);
  assert.equal(claimRushOrder(s2, NOW), 1000);
  startLiveBoost(s2, NOW);
  startLiveBoost(s2, NOW);
  assert.equal(s2.boostUntil, NOW + 1200 * 1000);
});

test('章节、视频解锁、微聊、商战与赛季转生', () => {
  const s = createSave(NOW);
  assert.equal(currentChapter(0), 0);
  assert.ok(isVideoUnlocked(s, 'ch00'));
  s.netWorth = 1e4;
  assert.ok(isVideoUnlocked(s, 'ch01_s01'));
  assert.equal(nextGoal(s)?.target, 1e5);
  assert.equal(clearChapterBattle(s, 1), 3);
  assert.equal(clearChapterBattle(s, 1), 0);

  s.money = 1e6;
  buyShop(s, 'dessert', 1);
  assert.ok(unreadChatCount(s) >= 1);
  assert.equal(replyChat(s, 'luyu_1', 0), 2);
  assert.equal(likeMoment(s, 'm_ch1'), 1);

  const evRes = resolveStreetEvent(s, STREET_EVENTS[0], 0, NOW);
  assert.ok(evRes.cash > 0 && evRes.roses > 0);

  s.netWorth = 1e9;
  assert.equal(effectiveBond(s, 'fujingshen'), 5);
  assert.ok(isVideoAdPending(s, 'fujingshen_alt'));
  s.adUnlocked.push('fujingshen_alt');
  assert.ok(isVideoUnlocked(s, 'fujingshen_alt'));

  // 终章转生测试
  s.netWorth = 1e11;
  const rosesBefore = s.roses;
  assert.ok(prestigeSeason(s, NOW));
  assert.equal(s.season, 2);
  assert.equal(s.netWorth, 0);
  assert.equal(s.bonds.luyu, 1);
  assert.equal(s.roses, rosesBefore + 15);
  assert.ok(Math.abs(computeSynergies(s).seasonMult - 2.2) < 1e-9);
});

test('跨门槛检测与坏档兜底', () => {
  const c = crossedThresholds(5e3, 2e5);
  assert.deepEqual(c.chapters.map((x) => x.id), [1, 2]);
  assert.deepEqual(c.areas.map((x) => x.id), ['campus']);

  const s = normalizeSave({ version: 1, money: NaN, netWorth: -5, skillLevel: 0 }, NOW);
  assert.equal(s.money, 0);
  assert.equal(s.netWorth, 0);
  assert.equal(s.skillLevel, 1);
});

test('店员批量升级、升星与团建加成', () => {
  const s = createSave(NOW);
  s.money = 1e9;
  assert.equal(upgradeStaff(s, 'abei'), null);
  buyShop(s, 'stall', 1);
  assert.equal(staffUpgradeCost('abei', 0), 250);
  const hired = upgradeStaff(s, 'abei');
  assert.equal(hired?.hired, true);
  const toStar = upgradeStaff(s, 'abei', 'next');
  assert.equal(s.staff.abei, 10);
  assert.equal(toStar?.newStar, 2);
  assert.equal(staffStar(10), 2);
  assert.equal(STAFF.length, 20);

  s.netWorth = 1e4;
  buyShop(s, 'dessert', 1);
  for (const id of ['linqi', 'xiaoman', 'wenyan'] as const) upgradeStaff(s, id);
  assert.equal(areaStaffMultiplier(s, 'oldstreet'), 2);
  assert.ok(staffIncome('abei', 10) > 0);
});

test('主线任务含玫瑰奖励且 56 条后无缝衔接无限帝国任务', () => {
  const s = createSave(NOW);
  assert.equal(currentQuest(s)?.done, false);
  for (let i = 0; i < 20; i++) tap(s, NOW, false);
  assert.equal(currentQuest(s)?.done, true);
  assert.equal(claimQuest(s), 200);
  assert.equal(s.roses, 1);
  assert.equal(s.questIndex, 1);
  s.questIndex = 999;
  assert.ok(currentQuest(s) !== null);
});

test('招牌爆品研发室：命中传世配方 SS 月宫金桂星星酥 + 挂载门店秒伤提升', () => {
  const s = createSave(NOW);
  s.money = 1e6;
  buyShop(s, 'stall', 5);
  const incBefore = shopIncomeIn(s, 'stall');
  const crafted = craftRecipe(s, 'puff', 'osmanthus', 'starbox');
  assert.ok(crafted);
  assert.equal(crafted.isNew, true);
  assert.equal(crafted.recipe.grade, 'SS');
  assert.equal(crafted.recipe.name, '月宫金桂星星酥');
  assert.equal(crafted.rosesGained, 5);
  assert.ok(equipShopRecipe(s, 'stall', crafted.recipe.comboKey));
  const incAfter = shopIncomeIn(s, 'stall');
  assert.ok(incAfter > incBefore * 1.65);
});

test('店员四大专长驻店共振 + 商业外勤组队派遣与结算', () => {
  const s = createSave(NOW);
  s.netWorth = 1e4;
  s.money = 1e7;
  buyShop(s, 'dessert', 5);
  upgradeStaff(s, 'wenyan', 10); // 温禾 Lv10 = ★2，craft 专长契合甜品店
  const beforeMgr = shopIncomeIn(s, 'dessert');
  assert.ok(assignShopManager(s, 'dessert', 'wenyan'));
  const afterMgr = shopIncomeIn(s, 'dessert');
  assert.ok(afterMgr > beforeMgr * 1.35);

  assert.ok(startStaffDispatch(s, 0, 'dp_osmanthus_pick', ['wenyan'], NOW));
  assert.equal(claimStaffDispatch(s, 0, NOW + 10_000), null); // 未到期不可领
  const got = claimStaffDispatch(s, 0, NOW + 80_000, 0.01);
  assert.ok(got);
  assert.equal(got.greatSuccess, true);
  assert.ok(got.cash > 0 && got.roses >= 3 && got.inspiration >= 3);
});

test('晚星风投：借券做空苏氏食品暴利 + 亏损绝不倒扣历史身价', () => {
  const s = createSave(NOW);
  s.money = 10_000;
  s.netWorth = 10_000;
  const openPrice = currentStockPrice(s, 'sushi');
  const opened = tradeStock(s, 'sushi', 'short', 0.5); // 5000 做空苏氏
  assert.equal(opened.ok, true);
  assert.equal(s.money, 5_000);

  // 苏氏股价腰斩暴跌 -> 做空狂赚
  s.stockPrices.sushi = [openPrice, openPrice * 0.5];
  const closedWin = settleStock(s, 'sushi');
  assert.equal(closedWin.ok, true);
  assert.equal(closedWin.wasShortSushi, true);
  assert.ok(closedWin.pnl > 2_000);
  assert.ok(s.netWorth > 12_000);

  // 反向测试：若做多遇到下跌，只亏本金，绝不倒扣历史最高 netWorth
  const peakNetWorth = s.netWorth;
  tradeStock(s, 'oldst', 'long', 0.5);
  s.stockPrices.oldst = [24, 15];
  const closedLoss = settleStock(s, 'oldst');
  assert.ok(closedLoss.pnl < 0);
  assert.equal(s.netWorth, peakNetWorth);

  assert.equal(spendInsiderToken(s, NOW), true);
});

test('3回合商战三系克制倍率、商圈冠名加成与三选一检定/豪赌奇遇', () => {
  assert.equal(evaluateSuitRelation('rep', 'cap'), 'counter');
  assert.equal(evaluateSuitRelation('cap', 'leg'), 'counter');
  assert.equal(evaluateSuitRelation('leg', 'rep'), 'counter');

  const s = createSave(NOW);
  s.netWorth = 1e4;
  s.money = 5e4;
  buyShop(s, 'stall', 5);
  const enc = CHAPTER_BATTLES.get(1)!;
  const hand = buildBattleHand(s, enc);
  assert.equal(hand.length, 3);
  const legCard = hand.find((c) => c.suit === 'leg')!;
  const clashCounter = resolveCardClash(legCard, enc.moves[0], enc.recommendedPower); // leg beats rep
  assert.equal(clashCounter.relation, 'counter');
  assert.ok(clashCounter.damagePct >= 45);

  const beforeCrown = shopIncomeIn(s, 'stall');
  const crown = winAreaCrownBattle(s, 'oldstreet');
  assert.equal(crown?.newTier, 1);
  assert.ok(shopIncomeIn(s, 'stall') > beforeCrown * 1.19);

  // 突发事件：方案二实力检定 & 方案三资本豪赌
  const checkRes = resolveStreetEvent(s, STREET_EVENTS[0], 1, NOW, 0.01);
  assert.equal(checkRes.won, true);
  const gambleWin = resolveStreetEvent(s, STREET_EVENTS[0], 2, NOW, 0.01);
  assert.equal(gambleWin.won, true);
  assert.equal(gambleWin.feverTriggered, true);
});

console.log(`\n${passed} passed`);
