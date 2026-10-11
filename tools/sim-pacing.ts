/**
 * 节奏模拟：贪心玩家（每秒点 4 下，钱够就买回本最快的东西，不看广告），
 * 打印到达每章的在线时间。对照策划案 §4.5 的目标。
 */
import { CHAPTERS, HEROES } from '../src/data/story.ts';
import { SHOPS } from '../src/data/world.ts';
import { STAFF } from '../src/data/staff.ts';
import { buyShop, investBond, tap, tick, upgradeSkill, upgradeStaff } from '../src/sim/actions.ts';
import {
  bondUpgradeCost, baseIncomePerSec, shopIncome, shopUpgradeCost, skillUpgradeCost, skillValue,
  staffIncome, staffIncomePerSec, staffUpgradeCost,
} from '../src/sim/economy.ts';
import { formatDuration, formatMoney } from '../src/sim/format.ts';
import { createSave, type GameSave } from '../src/sim/save.ts';
import { bondBlockReason, currentChapter, isShopUnlocked, isStaffAvailable } from '../src/sim/unlocks.ts';

const WITH_STAFF = !process.argv.includes('--no-staff');

const TAPS_PER_SEC = Number(process.argv[2] ?? 4);
const MAX_SEC = 30 * 3600;

type Option = { score: number; buy: () => boolean };

function options(s: GameSave): Option[] {
  const out: Option[] = [];
  for (const shop of SHOPS) {
    if (!isShopUnlocked(s, shop.id)) continue;
    const lv = s.shops[shop.id] ?? 0;
    const hero = HEROES.find((h) => h.shop === shop.id);
    const bond = hero ? s.bonds[hero.id] ?? 0 : 0;
    const gain = shopIncome(shop.id, lv + 1, bond) - shopIncome(shop.id, lv, bond);
    const cost = shopUpgradeCost(shop.id, lv);
    out.push({ score: cost / Math.max(gain, 1e-9), buy: () => !!buyShop(s, shop.id, 1) });
  }
  for (const hero of HEROES) {
    if (!hero.shop || bondBlockReason(s, hero.id)) continue;
    const lv = s.bonds[hero.id] ?? 0;
    const base = shopIncome(hero.shop, s.shops[hero.shop] ?? 0, lv);
    const next = shopIncome(hero.shop, s.shops[hero.shop] ?? 0, lv + 1);
    out.push({ score: bondUpgradeCost(hero.id, lv) / Math.max(next - base, 1e-9), buy: () => investBond(s, hero.id) });
  }
  if (WITH_STAFF) {
    for (const st of STAFF) {
      if (!isStaffAvailable(s, st.id)) continue;
      const lv = s.staff[st.id] ?? 0;
      const gain = staffIncome(st.id, lv + 1) - staffIncome(st.id, lv);
      out.push({ score: staffUpgradeCost(st.id, lv) / Math.max(gain, 1e-9), buy: () => !!upgradeStaff(s, st.id) });
    }
  }
  const tapGain = (skillValue(s.skillLevel + 1) - skillValue(s.skillLevel)) * TAPS_PER_SEC;
  out.push({ score: skillUpgradeCost(s.skillLevel) / Math.max(tapGain, 1e-9), buy: () => upgradeSkill(s) });
  return out.sort((a, b) => a.score - b.score);
}

const s = createSave(0);
let reached = 0;
console.log(`贪心玩家，每秒点击 ${TAPS_PER_SEC} 次，不看广告${WITH_STAFF ? '' : '，不招店员'}\n`);
for (let t = 1; t <= MAX_SEC; t++) {
  for (let i = 0; i < TAPS_PER_SEC; i++) tap(s, t * 1000, false);
  tick(s, 1, t * 1000);
  for (let guard = 0; guard < 50; guard++) {
    const best = options(s)[0];
    if (!best || !best.buy()) break;
  }
  const ch = currentChapter(s.netWorth);
  while (reached < ch) {
    reached += 1;
    const def = CHAPTERS[reached];
    console.log(
      `第 ${def.id} 章 ${def.title.padEnd(6, '　')} ${formatDuration(t).padStart(10)}`
      + `  身价 ${formatMoney(s.netWorth).padStart(8)}  每秒 ${formatMoney(baseIncomePerSec(s)).padStart(8)}`
      + `  店员占 ${(100 * staffIncomePerSec(s) / Math.max(baseIncomePerSec(s), 1e-9)).toFixed(0).padStart(3)}%`,
    );
  }
  if (reached >= CHAPTERS.length - 1) break;
}
if (reached < CHAPTERS.length - 1) console.log(`\n${formatDuration(MAX_SEC)} 内只到第 ${reached} 章`);
console.log('\n门店等级', JSON.stringify(s.shops), '\n羁绊', JSON.stringify(s.bonds), '\n技能', s.skillLevel, '\n店员', JSON.stringify(s.staff));
