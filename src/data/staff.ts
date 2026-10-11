/** 店员（策划案 §4.7 / §6.3）：每家门店 A、B 两位，门店开业后可招聘。 */
import type { ShopId } from './world.ts';

export type StaffId =
  | 'abei' | 'linqi' | 'xiaoman' | 'wenyan' | 'liang' | 'xiaxiao' | 'baiyu' | 'chenlie'
  | 'songzhiyi' | 'jihuai' | 'luochuan' | 'ouyangche' | 'sumu' | 'jitang' | 'nanxing' | 'xiaomo'
  | 'qiye' | 'wensheng' | 'allen' | 'lifeng';

export interface StaffDef {
  id: StaffId;
  name: string;
  title: string;
  shop: ShopId;
  slot: 'A' | 'B';
  /** [入职台词, ★2 台词] */
  lines: readonly [string, string];
}

export const STAFF: readonly StaffDef[] = [
  { id: 'abei', name: '阿北', title: '外卖小哥', shop: 'stall', slot: 'A',
    lines: ['姐，以后你的单我包了，五公里内二十分钟送到！', '今天雨大，我把保温箱裹了三层，一块都没塌。'] },
  { id: 'linqi', name: '林栖', title: '街头吉他手', shop: 'stall', slot: 'B',
    lines: ['你的摊子旁边，正好缺一首歌。', '有人问我这首歌叫什么，我说叫《老板》。'] },
  { id: 'xiaoman', name: '小满', title: '烘焙学徒', shop: 'dessert', slot: 'A',
    lines: ['老板！我会打发奶油，打一百次都不累！', '今天的草莓蛋糕，第一块留给你。'] },
  { id: 'wenyan', name: '温言', title: '裱花师', shop: 'dessert', slot: 'B',
    lines: ['裱花和做人一样，手要稳。', '这朵玫瑰裱了四十分钟，送你，不卖。'] },
  { id: 'liang', name: '黎昂', title: '混血咖啡师', shop: 'cafe', slot: 'A',
    lines: ['第一杯拉花，送老板。是一颗心，你没看错。', '我在杯底写了一句话，喝完才能看。'] },
  { id: 'xiaxiao', name: '夏骁', title: '篮球队长', shop: 'cafe', slot: 'B',
    lines: ['学姐，我下课就来，搬货这种事交给我。', '今天比赛赢了，奖杯放店里镇店。'] },
  { id: 'baiyu', name: '白屿', title: '瑜伽老师', shop: 'gym', slot: 'A',
    lines: ['先深呼吸。你最近太累了，老板。', '肩膀放松，剩下的交给我们。'] },
  { id: 'chenlie', name: '陈烈', title: '拳击陪练', shop: 'gym', slot: 'B',
    lines: ['谁敢来闹事，先过我这关。', '想学两招吗？我教你，不收钱。'] },
  { id: 'songzhiyi', name: '宋知意', title: '律师助理', shop: 'law', slot: 'A',
    lines: ['沈律师让我跟着你，合同我已经逐字核过了。', '对方律师的漏洞，我标了十七处。'] },
  { id: 'jihuai', name: '季淮', title: '首席秘书', shop: 'law', slot: 'B',
    lines: ['今天的行程已排好，您只需要负责赢。', '您的咖啡，三分糖，和昨天一样。'] },
  { id: 'luochuan', name: '罗川', title: '机修技师', shop: 'garage', slot: 'A',
    lines: ['车交给我，保证比新的还猛。', '你的车我顺手打了蜡，能照镜子。'] },
  { id: 'ouyangche', name: '欧阳澈', title: '涂装设计师', shop: 'garage', slot: 'B',
    lines: ['给你的车画一颗星，全城独一份。', '这套配色，我叫它“晚星蓝”。'] },
  { id: 'sumu', name: '苏木', title: '护士小哥', shop: 'clinic', slot: 'A',
    lines: ['别紧张，我会一直在旁边。', '记得按时吃饭，我会监督你的。'] },
  { id: 'jitang', name: '纪棠', title: '形象顾问', shop: 'clinic', slot: 'B',
    lines: ['你本来就好看，我只是让所有人都看见。', '今晚的造型，会让所有人记住你的名字。'] },
  { id: 'nanxing', name: '南星', title: '练习生', shop: 'agency', slot: 'A',
    lines: ['等我出道，第一个感谢的人就是你！', '新歌的 demo，你是第一个听的。'] },
  { id: 'xiaomo', name: '萧陌', title: '超模', shop: 'agency', slot: 'B',
    lines: ['走秀的时候，我只看台下的你。', '下一季的封面，我想和你的品牌一起拍。'] },
  { id: 'qiye', name: '祁夜', title: '首席调酒师', shop: 'hotel', slot: 'A',
    lines: ['这杯叫“身价暴涨”，只调给你一个人。', '今晚的特调，我加了一点星光。'] },
  { id: 'wensheng', name: '闻笙', title: '驻场钢琴师', shop: 'hotel', slot: 'B',
    lines: ['今晚的曲子，都是为你选的。', '这首是新写的，还没有名字，你来取。'] },
  { id: 'allen', name: '艾伦', title: '私人管家', shop: 'group', slot: 'A',
    lines: ['小姐，您的茶，七十五度，刚刚好。', '您今天辛苦了，热水已经放好。'] },
  { id: 'lifeng', name: '厉锋', title: '首席保镖', shop: 'group', slot: 'B',
    lines: ['从今天起，没人能再动你一根头发。', '我站在这里，你只管往前走。'] },
];

const BY_ID = new Map(STAFF.map((s) => [s.id, s]));

export function staffById(id: StaffId): StaffDef {
  const s = BY_ID.get(id);
  if (!s) throw new Error(`unknown staff ${id}`);
  return s;
}

export function staffForShop(shop: ShopId): StaffDef[] {
  return STAFF.filter((s) => s.shop === shop);
}

/** ★3 解锁“工作日常”，★5 解锁“专属片段” */
export function staffVideoId(id: StaffId, index: 1 | 2): string {
  return `staff_${id}_${index}`;
}

/** 已经做好并上传 CDN 的店员小视频；没做好的在卡片上显示“制作中” */
export const STAFF_VIDEOS_READY: ReadonlySet<string> = new Set<string>();
