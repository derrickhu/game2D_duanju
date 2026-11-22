/** 晚星手机系统：男主私聊（二选一撩人互动 + 领玫瑰）与朋友圈动态（吃瓜打脸 + 心动暗糖）。 */
import type { HeroId } from './story.ts';

export interface ChatThreadDef {
  id: string;
  heroId: HeroId;
  /** 解锁条件：羁绊达到 minBond，或主线章节达到 minChapter */
  minBond?: number;
  minChapter?: number;
  preview: string;
  opening: readonly string[];
  replies: readonly [
    { text: string; heroReply: string; roses: number },
    { text: string; heroReply: string; roses: number },
  ];
}

export interface MomentPostDef {
  id: string;
  author: string;
  roleTag: string;
  heroId?: HeroId;
  minChapter: number;
  minBond?: number;
  content: string;
  location: string;
  comments: readonly { who: string; text: string }[];
}

export const CHAT_THREADS: readonly ChatThreadDef[] = [
  {
    id: 'luyu_1', heroId: 'luyu', minBond: 1,
    preview: '伞放推车下了，明晚还下雨。',
    opening: [
      '伞给你塞推车隔层里了，天气预报说明晚还有雨。',
      '收摊太重的话喊一声，我就在隔壁。',
    ],
    replies: [
      { text: '那你淋雨回去没感冒吧？明天请你吃第一炉星星酥！', heroReply: '没感冒。……草莓味的也行，你做什么我都吃。', roses: 2 },
      { text: '陆老板这么照顾生意，不怕我抢你夜市客流呀？', heroReply: '抢走正好，省得我烤串，专心给你看摊子。', roses: 2 },
    ],
  },
  {
    id: 'luyu_2', heroId: 'luyu', minBond: 3,
    preview: '冰柜底层给你留了夜宵。',
    opening: [
      '今天对账看你揉了三次太阳穴。',
      '店里冰柜第二层有温好的桂花牛乳，喝完再走。',
    ],
    replies: [
      { text: '你盯账本还是盯我呀？连揉几次都数得清~', heroReply: '……盯你。账本哪有老板好看。', roses: 3 },
      { text: '留一半，等会儿锁门一起分着喝。', heroReply: '好。我在店门口台阶等你，不催你。', roses: 3 },
    ],
  },
  {
    id: 'jiang_1', heroId: 'jiangxubai', minBond: 1,
    preview: '姐姐！今天拉花练出小星星了！',
    opening: [
      '姐姐！！快看我刚拍的拿铁照片，今天没歪成小猫，是一颗超标准的五角星！',
      '第一杯已经放进保温袋了，我骑车五分钟到总店！',
    ],
    replies: [
      { text: '慢点骑车注意安全，姐姐在吧台给你留了泡芙。', heroReply: '收到！！有姐姐留的泡芙我能蹬出火箭速度！(≧▽≦)', roses: 2 },
      { text: '嘴这么甜，是不是把给客人的糖浆偷偷喝掉了？', heroReply: '冤枉啊姐姐，明明是一看到你的消息自动变甜的……', roses: 2 },
    ],
  },
  {
    id: 'jiang_2', heroId: 'jiangxubai', minBond: 3,
    preview: '后台恶意爬虫我已经顺手清干净啦~',
    opening: [
      '姐姐，昨晚有人雇黑客想挤崩咱们小程序抢购页。',
      '我已经顺着IP把他们服务器挂上了晚星新品宣传图，不用谢我~',
    ],
    replies: [
      { text: '我们家小学弟深藏不露啊，今晚姐姐请你吃大餐！', heroReply: '不要大餐，只要姐姐把周末下午借我两小时逛校园就好。', roses: 3 },
      { text: '干得漂亮，回头给你发首席技术官奖金！', heroReply: '奖金存姐姐那儿当恋爱基金……咳，我是说团建基金！', roses: 3 },
    ],
  },
  {
    id: 'guye_1', heroId: 'guye', minBond: 1,
    preview: '老板！便当盒放前台保温箱了！',
    opening: [
      '老板，听说你今天连开三场选址会没顾上吃午饭？',
      '少油煎牛排配西兰花我装好送前台了，凉了不好吃，快去尝两口！',
    ],
    replies: [
      { text: '已经在吃啦，顾教练手艺比米其林还香！', heroReply: '真的？！那我明早五点去买新鲜牛肋条，天天给你开小灶！', roses: 2 },
      { text: '投喂老板这么勤快，想要什么奖励？', heroReply: '下班来馆里让我教你十分钟防身术就行，我想多看你一会儿。', roses: 2 },
    ],
  },
  {
    id: 'shenyan_1', heroId: 'shenyan', minBond: 1,
    preview: '侵权案补充证据已归档，早点休息。',
    opening: [
      '苏小姐，苏氏食品近三年的进货流水漏洞已全部取证完毕。',
      '开庭那天你只需要穿得漂亮点坐着看戏。现在十一点半了，去睡觉。',
    ],
    replies: [
      { text: '沈大律师自己不也还在律所加班吗？彼此彼此~', heroReply: '……替心仪的委托人加班，不算苦差事。晚安，苏晚。', roses: 3 },
      { text: '赢了官司我把第一炉庆功蛋糕送到沈律师办公室！', heroReply: '好。茶我已经备好了，随时恭候苏总大驾。', roses: 3 },
    ],
  },
  {
    id: 'qinye_1', heroId: 'qinye', minBond: 1,
    preview: '新头盔到了，按你头围订的。',
    opening: [
      '喂，上次你说吹江风冷，新订的全碳纤防风头盔到了，星空蓝内衬。',
      '副驾和后座都空着，今晚带你去跨江大桥兜两圈？',
    ],
    replies: [
      { text: '秦老板亲自当司机，出场费得多贵呀？', heroReply: '别人给十万都不载。你来，倒贴一盒棒棒糖给你。', roses: 3 },
      { text: '十分钟后楼下见，开太快我可要掐你腰的！', heroReply: '行啊，巴不得你抱紧点。已经在你大厦楼下了，下来吧。', roses: 3 },
    ],
  },
  {
    id: 'xu_1', heroId: 'xuzhiheng', minBond: 1,
    preview: '今日医嘱：不许拿冰美式当晚饭。',
    opening: [
      '程朗刚跟我打小报告，说某位大总裁今天喝了两杯冰美式还没碰主食。',
      '正好我下夜班路过晚星大厦，山药排骨粥在楼下，下来拿还是我端上去？',
    ],
    replies: [
      { text: '许医生查房查到我公司来啦？快上来歇会儿！', heroReply: '遵命。对不听话的重点保护对象，总得亲自盯紧一点。', roses: 3 },
      { text: '知错就改！喝完粥顺便给许医生发一份甜品抵餐费~', heroReply: '成交。只要你在跟前好好吃完，抵一辈子都划算。', roses: 3 },
    ],
  },
  {
    id: 'zhou_1', heroId: 'zhouyining', minBond: 1,
    preview: '老板，新歌小样只发了你一个人。',
    opening: [
      '老板，刚在录音棚录完《晚星》的木吉他清唱版，还没给经纪人听。',
      '你戴耳机听，第三十二秒那句呼吸声，是想着你唱的。',
    ],
    replies: [
      { text: '单曲循环三遍了，我们家以宁天生就该站在最大的舞台中央！', heroReply: '那演唱会第一排正中间永远锁死你的名字，不许缺席。', roses: 3 },
      { text: '第32秒听得耳朵都麻了，周大顶流这是犯规撩老板！', heroReply: '只对你一个人犯规。别人想听，门都没有。', roses: 3 },
    ],
  },
  {
    id: 'huo_1', heroId: 'huotingchen', minBond: 1,
    preview: '城南那块地皮我让人撤标了，归你。',
    opening: [
      '听说晚星旗舰广场看中了城南核心地块。霍氏刚撤了竞标书。',
      '别误会，不是让你。是想把霍氏新大楼建在你隔壁，方便约你吃午饭。',
    ],
    replies: [
      { text: '霍总这算盘打得全金融街都听见了，午饭你买单？', heroReply: '买单归我，整条街的餐厅随苏总挑，随叫随到。', roses: 4 },
      { text: '谁要你让？公开竞标我照样能赢过霍总！', heroReply: '信。输给苏总心服口服——那今晚庆祝赢家请我喝杯咖啡？', roses: 4 },
    ],
  },
];

export const MOMENT_POSTS: readonly MomentPostDef[] = [
  {
    id: 'm_ch1', author: '老街吃货日报', roleTag: '同城热榜', minChapter: 1,
    content: '家人们谁懂啊！老街夜市新来的漂亮妹妹做的星星酥绝了，外酥里糯还带桂花香，恶霸王姐来闹事结果被隔壁帅哥一个眼神吓跑，今晚排队两小时起步！',
    location: '云城 · 老街夜市',
    comments: [
      { who: '阿北', text: '认准晚星小推车！五公里闪送找我！' },
      { who: '陆屿', text: '明晚早点收摊，天凉。' },
    ],
  },
  {
    id: 'm_ch2', author: '周房东', roleTag: '破防现场', minChapter: 2,
    content: '看走了眼……谁能想到被苏家赶出来的小丫头全款买下了整栋临街商业楼？！有没有认识晚星苏总的帮说句好话，我想续签物业合同……',
    location: '云城 · 晚星甜品旗舰楼',
    comments: [
      { who: '小满', text: '略略略，当初翻三倍押金的时候可不是这副嘴脸！' },
    ],
  },
  {
    id: 'm_jiang', author: '江叙白', roleTag: '大学城主理人', heroId: 'jiangxubai', minChapter: 2, minBond: 1,
    content: '今日份店长日常：研发新品×1，赶走搭讪路人×3，等某位大忙人姐姐来视察的第 180 分钟。☕✨',
    location: '晚星咖啡 · 大学城店',
    comments: [
      { who: '夏骁', text: '哥你对着手机傻笑一中午了，豆子还没磨呢！' },
      { who: '江叙白', text: '回复 夏骁：闭嘴去搬你的牛奶箱。' },
    ],
  },
  {
    id: 'm_ch4', author: '沈砚', roleTag: '红圈合伙人', heroId: 'shenyan', minChapter: 4,
    content: '执业八年最干脆的一场胜诉。原配方归位，侵权方全渠道致歉。恭喜委托人苏总。',
    location: '云城中级人民法院',
    comments: [
      { who: '宋书意', text: '沈律居然发工作以外的朋友圈了？！活久见！！' },
      { who: '季淮', text: '毕竟是唯一享受免费加班待遇的VIP委托人。' },
    ],
  },
  {
    id: 'm_ch6', author: '财经前线速递', roleTag: '头条快讯', minChapter: 6,
    content: '【重磅】晚星商业正式完成对老牌企业苏氏食品的控股收购！三年前被逐出家门的养女苏晚逆风翻盘，前未婚夫傅氏少东家冒雨伫立大厦外数小时未获接见！',
    location: '晚星大厦总部',
    comments: [
      { who: '顾野', text: '老板牛逼！！今晚全馆会员免单庆功！' },
      { who: '周以宁', text: '转发抽奖送一百盒晚星礼盒，祝贺我老板。' },
    ],
  },
  {
    id: 'm_ch8', author: '霍霆琛', roleTag: '霍氏掌门人', heroId: 'huotingchen', minChapter: 8,
    content: '商场上唯一赢过我的对手，也是我此生唯一想并肩的人。祝贺敲钟，云城首富苏晚女士。👑',
    location: '云城证券交易所',
    comments: [
      { who: '陆屿', text: '排队。她先认识我的。' },
      { who: '沈砚', text: '温馨提示：合作协议不代表优先择偶权。' },
      { who: '秦朔', text: '？？？楼上几位老狐狸装都不装了是吧！' },
    ],
  },
];
