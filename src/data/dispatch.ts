/**
 * 商业外勤差遣任务库：
 * 玩家派遣 1~3 名空闲店员组成专项小组，匹配「匠心研发 / 金牌运营 / 危机公关 / 铁腕风控」专长，
 * 冲击最高 100% 大成功暴击，获取大额现金、心动玫瑰、爆品研发灵感与商海内幕研报券。
 */
import type { StaffSpecialty } from './staff.ts';

export interface DispatchMissionDef {
  id: string;
  title: string;
  desc: string;
  minChapter: number;
  stars: 1 | 2 | 3 | 4 | 5;
  durationSec: number;
  slots: 1 | 2 | 3;
  requiredSpecialties: readonly StaffSpecialty[];
  cashSec: number;
  minCash: number;
  roses: number;
  inspiration: number;
  insiderTokens: number;
}

export const DISPATCH_MISSIONS: readonly DispatchMissionDef[] = [
  {
    id: 'dp_osmanthus_pick',
    title: '桂花古树清晨直采',
    desc: '赶在露水未干前包下郊外百年金桂园头茬鲜花，锁住招牌香气。',
    minChapter: 0,
    stars: 1,
    durationSec: 75,
    slots: 1,
    requiredSpecialties: ['craft'],
    cashSec: 45, minCash: 600, roses: 1, inspiration: 2, insiderTokens: 0,
  },
  {
    id: 'dp_night_delivery',
    title: '写字楼加班下午茶团单',
    desc: '附近互联网大厂临时加订两百份点心，准时送达可签下包月协议。',
    minChapter: 0,
    stars: 1,
    durationSec: 90,
    slots: 1,
    requiredSpecialties: ['ops'],
    cashSec: 65, minCash: 900, roses: 1, inspiration: 1, insiderTokens: 0,
  },
  {
    id: 'dp_street_busking',
    title: '老街星光快闪路演',
    desc: '在夜市入口搭起暖光音乐角与试吃台，把整条街客流吸到晚星门口。',
    minChapter: 0,
    stars: 2,
    durationSec: 120,
    slots: 2,
    requiredSpecialties: ['pr', 'craft'],
    cashSec: 85, minCash: 2800, roses: 2, inspiration: 2, insiderTokens: 0,
  },
  {
    id: 'dp_campus_fest',
    title: '高校社团联名游园会',
    desc: '承包大学城迎新晚会甜品与特调饮品吧台，打响年轻群体口碑。',
    minChapter: 1,
    stars: 2,
    durationSec: 150,
    slots: 2,
    requiredSpecialties: ['ops', 'craft'],
    cashSec: 95, minCash: 9000, roses: 2, inspiration: 2, insiderTokens: 1,
  },
  {
    id: 'dp_anti_troll',
    title: '顺藤摸瓜取证黑水军',
    desc: '追踪恶意差评背后的公关公司资金流水，拿到苏婉柔买黑铁证。',
    minChapter: 1,
    stars: 2,
    durationSec: 180,
    slots: 2,
    requiredSpecialties: ['fin', 'pr'],
    cashSec: 105, minCash: 1.5e4, roses: 3, inspiration: 1, insiderTokens: 1,
  },
  {
    id: 'dp_cbd_popup',
    title: 'CBD 精英商务茶歇竞标',
    desc: '拿下跨国律所与投行总部的全年行政下午茶订单，利润丰厚。',
    minChapter: 2,
    stars: 3,
    durationSec: 240,
    slots: 2,
    requiredSpecialties: ['ops', 'fin'],
    cashSec: 125, minCash: 6e4, roses: 3, inspiration: 2, insiderTokens: 1,
  },
  {
    id: 'dp_patent_guard',
    title: '外婆古方全品类商标布局',
    desc: '赶在山寨厂商抢注前完成三十五个国际分类防御性注册。',
    minChapter: 2,
    stars: 3,
    durationSec: 300,
    slots: 2,
    requiredSpecialties: ['fin', 'craft'],
    cashSec: 135, minCash: 1.2e5, roses: 3, inspiration: 3, insiderTokens: 1,
  },
  {
    id: 'dp_sushi_audit',
    title: '暗访苏氏代工冷库漏洞',
    desc: '合法调研苏氏食品临期原料批次流向，提前掌握商海做空风向。',
    minChapter: 3,
    stars: 3,
    durationSec: 300,
    slots: 3,
    requiredSpecialties: ['fin', 'ops', 'pr'],
    cashSec: 150, minCash: 4.5e5, roses: 4, inspiration: 2, insiderTokens: 2,
  },
  {
    id: 'dp_river_carshow',
    title: '江景超跑之夜品牌联名',
    desc: '以“晚星蓝”定制涂装亮相江畔名流车展，高端客单价直线起飞。',
    minChapter: 4,
    stars: 4,
    durationSec: 420,
    slots: 3,
    requiredSpecialties: ['craft', 'pr', 'ops'],
    cashSec: 175, minCash: 3.5e6, roses: 5, inspiration: 3, insiderTokens: 2,
  },
  {
    id: 'dp_paris_runway',
    title: '高定秀场后台伴手礼企划',
    desc: '携旗下超模与美学顾问空降时装周，让晚星登顶国际时尚版面。',
    minChapter: 5,
    stars: 4,
    durationSec: 540,
    slots: 3,
    requiredSpecialties: ['pr', 'craft', 'fin'],
    cashSec: 210, minCash: 2.8e7, roses: 6, inspiration: 4, insiderTokens: 2,
  },
  {
    id: 'dp_hostile_buyout',
    title: '二级市场悄悄吸筹苏氏散股',
    desc: '通过多家离岸壳公司分散吸纳苏氏流通筹码，为总攻收购铺路。',
    minChapter: 6,
    stars: 5,
    durationSec: 600,
    slots: 3,
    requiredSpecialties: ['fin', 'fin', 'ops'],
    cashSec: 260, minCash: 3.2e8, roses: 8, inspiration: 4, insiderTokens: 3,
  },
  {
    id: 'dp_global_summit',
    title: '亚太商业女皇峰会主礼',
    desc: '统筹云顶酒店皇家安保与国宴级甜品台，全球资本巨头齐聚签约。',
    minChapter: 7,
    stars: 5,
    durationSec: 720,
    slots: 3,
    requiredSpecialties: ['fin', 'pr', 'craft'],
    cashSec: 320, minCash: 2.5e9, roses: 10, inspiration: 5, insiderTokens: 3,
  },
];

export const DISPATCH_BY_ID: ReadonlyMap<string, DispatchMissionDef> = new Map(
  DISPATCH_MISSIONS.map((m) => [m.id, m]),
);
