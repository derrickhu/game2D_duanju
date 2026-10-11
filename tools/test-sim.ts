import assert from 'node:assert/strict';
import { formatMoney } from '../src/sim/format.ts';
import { createSave, normalizeSave } from '../src/sim/save.ts';
import {
  maxAffordableLevels, shopIncome, shopUpgradeCost, shopUpgradeCostN, skillValue, tapValue,
} from '../src/sim/economy.ts';
import {
  buyShop, claimRushOrder, computeOffline, investBond, startLiveBoost, tap, tick, upgradeSkill,
} from '../src/sim/actions.ts';
import {
  bondBlockReason, crossedThresholds, currentChapter, effectiveBond, isVideoAdPending, isVideoUnlocked, nextGoal,
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

test('里程碑翻倍', () => {
  assert.equal(shopIncome('stall', 9, 0), 9);
  assert.equal(shopIncome('stall', 10, 0), 20);
  assert.equal(shopIncome('stall', 10, 2), 30);
  assert.equal(skillValue(10), 100);
});

test('点击：技能 + 5% 每秒收益，连击 ×2', () => {
  const s = createSave(NOW);
  assert.equal(tapValue(s, NOW, false), 5);
  assert.equal(tapValue(s, NOW, true), 10);
  s.money = 1e6;
  buyShop(s, 'stall', 10);
  assert.equal(tapValue(s, NOW, false), 5 + 20 * 0.05);
});

test('开店遇到男主，羁绊受章节门槛限制', () => {
  const s = createSave(NOW);
  s.netWorth = 1e4;
  s.money = 1e9;
  const r = buyShop(s, 'dessert', 1);
  assert.equal(r?.metHero, 'luyu');
  assert.ok(investBond(s, 'luyu'));
  assert.equal(s.bonds.luyu, 2);
  assert.equal(bondBlockReason(s, 'luyu'), '主线第 4 章后解锁');
  assert.ok(!investBond(s, 'luyu'));
  s.netWorth = 1e7;
  assert.ok(investBond(s, 'luyu'));
});

test('未解锁门店不能买', () => {
  const s = createSave(NOW);
  s.money = 1e12;
  assert.equal(buyShop(s, 'cafe', 1), null);
});

test('身价只涨不跌，花钱不扣身价', () => {
  const s = createSave(NOW);
  for (let i = 0; i < 10; i++) tap(s, NOW, false);
  assert.equal(s.netWorth, 50);
  s.money = 100;
  s.netWorth = 100;
  buyShop(s, 'stall', 1);
  assert.equal(s.money, 0);
  assert.equal(s.netWorth, 100);
  s.money = 50;
  assert.ok(upgradeSkill(s));
  assert.equal(s.netWorth, 100);
});

test('tick 和离线', () => {
  const s = createSave(NOW);
  s.money = 1e6;
  buyShop(s, 'stall', 10);
  tick(s, 2, NOW);
  assert.equal(s.netWorth - 0, 40);
  const off = computeOffline(s, NOW + 10 * 3600 * 1000);
  assert.equal(off.seconds, 2 * 3600);
  assert.equal(off.amount, 20 * 7200 * 0.5);
});

test('急单保底和直播叠加封顶', () => {
  const s = createSave(NOW);
  assert.equal(claimRushOrder(s, NOW), 1000);
  startLiveBoost(s, NOW);
  startLiveBoost(s, NOW);
  assert.equal(s.boostUntil, NOW + 1200 * 1000);
  for (let i = 0; i < 10; i++) startLiveBoost(s, NOW);
  assert.equal(s.boostUntil, NOW + 3600 * 1000);
});

test('章节、视频解锁、番外广告', () => {
  const s = createSave(NOW);
  assert.equal(currentChapter(0), 0);
  assert.ok(isVideoUnlocked(s, 'ch00_s01'));
  assert.ok(!isVideoUnlocked(s, 'ch01_s01'));
  s.netWorth = 1e4;
  assert.ok(isVideoUnlocked(s, 'ch01_s01'));
  assert.equal(nextGoal(s)?.target, 1e5);
  assert.equal(effectiveBond(s, 'fujingshen'), 1);
  s.netWorth = 1e9;
  assert.equal(effectiveBond(s, 'fujingshen'), 5);
  assert.ok(isVideoAdPending(s, 'fujingshen_alt'));
  assert.ok(!isVideoUnlocked(s, 'fujingshen_alt'));
  s.adUnlocked.push('fujingshen_alt');
  assert.ok(isVideoUnlocked(s, 'fujingshen_alt'));
});

test('跨门槛检测', () => {
  const c = crossedThresholds(5e3, 2e5);
  assert.deepEqual(c.chapters.map((x) => x.id), [1, 2]);
  assert.deepEqual(c.areas.map((x) => x.id), ['campus']);
});

test('坏档兜底', () => {
  const s = normalizeSave({ version: 1, money: NaN, netWorth: -5, skillLevel: 0 }, NOW);
  assert.equal(s.money, 0);
  assert.equal(s.netWorth, 0);
  assert.equal(s.skillLevel, 1);
  assert.equal(normalizeSave(null, NOW).version, 1);
});

console.log(`\n${passed} passed`);
