/**
 * 节奏模拟：模拟真实活跃玩家（每秒点 4 下 + 接顾客气泡 + 领任务 + 通商战 + 用玫瑰升羁绊），
 * 打印到达每章的在线时间、全产业开业情况、男主羁绊等级与店员占比。
 */
import { STAFF } from '../src/data/staff.ts';
import { CHAPTERS, HEROES } from '../src/data/story.ts';
import { SHOPS } from '../src/data/world.ts';
import {
  buyShop, clearChapterBattle, investBond, markWatched,
  serveCustomerOrder, tapInteractive, tick, upgradeSkill, upgradeStaff,
} from '../src/sim/actions.ts';
import {
  baseIncomePerSec, bondRoseCost, shopIncomeIn, shopUpgradeCostIn,
  skillUpgradeCost, skillValue, staffIncomeIn, staffIncomePerSec, staffUpgradeCost,
} from '../src/sim/economy.ts';
import { formatDuration, formatMoney } from '../src/sim/format.ts';
import { claimQuest, currentQuest } from '../src/sim/quests.ts';
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
    const gain = shopIncomeIn(s, shop.id, lv + 1) - shopIncomeIn(s, shop.id, lv);
    const cost = shopUpgradeCostIn(s, shop.id, lv, 1);
    // 临近 Lv25 / Lv50 帝国协同光环时提高购买优先级
    const synWeight = (lv >= 18 && lv < 25) || (lv >= 40 && lv < 50) ? 0.55 : 1;
    out.push({ score: (cost / Math.max(gain, 1e-9)) * synWeight, buy: () => !!buyShop(s, shop.id, 1) });
  }
  if (WITH_STAFF) {
    for (const st of STAFF) {
      if (!isStaffAvailable(s, st.id)) continue;
      const lv = s.staff[st.id] ?? 0;
      const gain = staffIncomeIn(s, st.id, lv + 1) - staffIncomeIn(s, st.id, lv);
      const hireBonus = lv === 0 ? 0.45 : 1; // 集齐城区团建 ×2 权重
      out.push({ score: (staffUpgradeCost(st.id, lv) / Math.max(gain, 1e-9)) * hireBonus, buy: () => !!upgradeStaff(s, st.id, 1) });
    }
  }
  const tapGain = (skillValue(s.skillLevel + 1) - skillValue(s.skillLevel)) * TAPS_PER_SEC;
  out.push({ score: skillUpgradeCost(s.skillLevel) / Math.max(tapGain, 1e-9), buy: () => upgradeSkill(s, 1) });
  return out.sort((a, b) => a.score - b.score);
}

const s = createSave(0);
let reached = 0;
console.log(`活跃玩家模拟，每秒点击 ${TAPS_PER_SEC} 次，含顾客点单/主线任务/玫瑰羁绊/帝国光环\n`);
for (let t = 1; t <= MAX_SEC; t++) {
  const now = t * 1000;
  for (let i = 0; i < TAPS_PER_SEC; i++) tapInteractive(s, now, false, 0.5);
  if (t % 6 === 0) serveCustomerOrder(s, now);
  tick(s, 1, now);

  // 自动领已完成任务
  for (let qGuard = 0; qGuard < 5; qGuard++) {
    if (claimQuest(s) <= 0) break;
  }
  // 有玫瑰就优先投资已解锁男主
  for (const hero of HEROES) {
    if (!hero.shop || bondBlockReason(s, hero.id)) continue;
    const lv = s.bonds[hero.id] ?? 0;
    if (s.roses >= bondRoseCost(hero.id, lv)) investBond(s, hero.id);
  }
  // 贪心购买最优产业/店员/技能
  for (let guard = 0; guard < 50; guard++) {
    const best = options(s)[0];
    if (!best || !best.buy()) break;
  }

  const ch = currentChapter(s.netWorth);
  while (reached < ch) {
    reached += 1;
    const def = CHAPTERS[reached];
    clearChapterBattle(s, def.id);
    for (const v of def.videos) markWatched(s, v);
    console.log(
      `第 ${def.id} 章 ${def.title.padEnd(6, '　')} ${formatDuration(t).padStart(10)}`
      + `  身价 ${formatMoney(s.netWorth).padStart(8)}  每秒 ${formatMoney(baseIncomePerSec(s)).padStart(8)}`
      + `  店员占 ${(100 * staffIncomePerSec(s) / Math.max(baseIncomePerSec(s), 1e-9)).toFixed(0).padStart(3)}%`
      + `  余玫瑰 ${String(s.roses).padStart(3)}`,
    );
  }
  if (reached >= CHAPTERS.length - 1) break;
}
if (reached < CHAPTERS.length - 1) console.log(`\n${formatDuration(MAX_SEC)} 内只到第 ${reached} 章`);
console.log(
  '\n门店等级', JSON.stringify(s.shops),
  '\n男主羁绊', JSON.stringify(s.bonds),
  '\n手艺等级', s.skillLevel,
  '\n已招店员数', Object.keys(s.staff).length, JSON.stringify(s.staff),
  '\n当前任务序号', s.questIndex, currentQuest(s)?.quest.title,
);
