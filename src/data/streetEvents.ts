/**
 * 主界面突发商海/打脸决策奇遇（升级为三路线策略博弈：稳健公关 / 实力检定反击 / 资本豪赌掀桌）
 * 以及主线章节结尾的高潮爽点抉择。
 */
import type { ShopId, StaffSpecialty } from './world.ts';

export interface StreetSteadyOption {
  kind: 'steady';
  label: string;
  outcome: string;
  cashSec: number;
  minCash: number;
  roses: number;
  feverAdd: number;
  inspiration?: number;
}

export interface StreetCheckOption {
  kind: 'check';
  label: string;
  reqDesc: string;
  checkType: 'specialty' | 'shopLevel' | 'recipes';
  specialty?: StaffSpecialty;
  shopId?: ShopId;
  targetVal: number;
  outcomeWin: string;
  outcomeFail: string;
  cashSec: number;
  minCash: number;
  roses: number;
  inspiration: number;
  feverAdd: number;
}

export interface StreetGambleOption {
  kind: 'gamble';
  label: string;
  stakeRatio: number; // 押注当前流动现金比例 (0.15~0.25)
  baseChance: number; // 基础胜率 (0.58~0.68)，受风控/公关店员加成最高至 0.88
  outcomeWin: string;
  outcomeFail: string;
  winMult: number;    // 赢时净赚本金倍数 + 额外秒伤奖励
  cashSec: number;
  minCash: number;
  roses: number;
}

export interface StreetEventDef {
  id: string;
  title: string;
  desc: string;
  minChapter: number;
  options: readonly [StreetSteadyOption, StreetCheckOption, StreetGambleOption];
}

export const STREET_EVENTS: readonly StreetEventDef[] = [
  {
    id: 'blogger_visit',
    title: '百万美食博主突袭探店',
    desc: '毒舌探店网红举着云台进门直播：“听说假千金摆摊做的星星酥一绝，该不会是剧本吧？”',
    minChapter: 0,
    options: [
      {
        kind: 'steady',
        label: '礼貌招待，赠送标准试吃礼盒',
        outcome: '博主尝后连连点头，评论区路人好感度稳步上涨！',
        cashSec: 65, minCash: 500, roses: 2, feverAdd: 0.35, inspiration: 1,
      },
      {
        kind: 'check',
        label: '当众蒙眼盲测对比市面名品',
        reqDesc: '检定：研发系店员星级或已研发 2 款爆品',
        checkType: 'recipes',
        targetVal: 2,
        outcomeWin: '盲测全票碾压！直播间十万人刷屏“姐姐手艺封神”，当场卖空三车！',
        outcomeFail: '仓促准备略显紧张，不过扎实口感还是赢下不少回头客。',
        cashSec: 155, minCash: 1600, roses: 4, inspiration: 2, feverAdd: 0.65,
      },
      {
        kind: 'gamble',
        label: '押款投流买断同城热搜榜一',
        stakeRatio: 0.20,
        baseChance: 0.65,
        winMult: 3.6,
        outcomeWin: '热搜词条当晚爆红出圈，周边十条街顾客连夜排队抢购！',
        outcomeFail: '撞上娱乐圈大瓜分流，好在保住了基础曝光。',
        cashSec: 120, minCash: 1200, roses: 4,
      },
    ],
  },
  {
    id: 'fake_review',
    title: '苏婉柔买水军刷恶意差评',
    desc: '一夜之间冒出三百条黑帖污蔑晚星用廉价植脂末，门口不少新客犹豫观望。',
    minChapter: 1,
    options: [
      {
        kind: 'steady',
        label: '开放透明橱窗并派发试吃券',
        outcome: '真材实料一目了然，老顾客自发晒单替你澄清！',
        cashSec: 80, minCash: 2500, roses: 2, feverAdd: 0.35, inspiration: 1,
      },
      {
        kind: 'check',
        label: '调取海关报关单 + 公关团队反击',
        reqDesc: '检定：危机公关店员总星级 ≥ 2★',
        checkType: 'specialty',
        specialty: 'pr',
        targetVal: 2,
        outcomeWin: '铁证打脸！水军后台被扒出全是苏氏公关转账，舆论彻底反转！',
        outcomeFail: '澄清长文发出稍慢半拍，但仍稳住了核心客群。',
        cashSec: 185, minCash: 6800, roses: 5, inspiration: 2, feverAdd: 0.75,
      },
      {
        kind: 'gamble',
        label: '重金悬赏十万征集造谣源头',
        stakeRatio: 0.22,
        baseChance: 0.62,
        winMult: 4.0,
        outcomeWin: '水军包工头贪图悬赏当场反水举报雇主，对方连夜赔付十倍和解金！',
        outcomeFail: '对方连夜注销了空壳号，悬赏金打了水漂但震慑了宵小。',
        cashSec: 160, minCash: 6000, roses: 5,
      },
    ],
  },
  {
    id: 'mystery_vip',
    title: '神秘黑卡匿名包场急单',
    desc: '戴白手套的特助递来黑金卡：“我家先生半小时内要五百盒高定伴手礼送往慈善院。”',
    minChapter: 1,
    options: [
      {
        kind: 'steady',
        label: '按现有库存稳妥交付三百盒',
        outcome: '特助微笑着留下一束香槟玫瑰，定金秒速到账！',
        cashSec: 85, minCash: 3200, roses: 3, feverAdd: 0.4, inspiration: 1,
      },
      {
        kind: 'check',
        label: '调度金牌运营全速开炉五百盒全接',
        reqDesc: '检定：金牌运营店员总星级 ≥ 3★',
        checkType: 'specialty',
        specialty: 'ops',
        targetVal: 3,
        outcomeWin: '分秒不差完美交付！幕后大佬追加全年VIP长约并赠予内幕厚礼！',
        outcomeFail: '最后五十盒晚到了五分钟，按原价结算了已完成部分。',
        cashSec: 195, minCash: 8800, roses: 6, inspiration: 3, feverAdd: 0.8,
      },
      {
        kind: 'gamble',
        label: '自掏腰包升级双层烫金礼盒联名捐赠',
        stakeRatio: 0.18,
        baseChance: 0.66,
        winMult: 3.8,
        outcomeWin: '“晚星暖心公益”轰动名流圈，当天门店客流直接原地引爆！',
        outcomeFail: '包装定制成本偏高，赚了满堂彩但现金微亏。',
        cashSec: 145, minCash: 6500, roses: 5,
      },
    ],
  },
  {
    id: 'poach_staff',
    title: '竞争对手堵门双倍高薪挖角',
    desc: '对街豪门猎头堵在后巷，开出双倍底薪想挖走你的主力帅哥店员。',
    minChapter: 2,
    options: [
      {
        kind: 'steady',
        label: '发放季度暖心奖金稳住军心',
        outcome: '店员们笑着把猎头名片扔进垃圾桶，干劲十足！',
        cashSec: 85, minCash: 1.5e4, roses: 2, feverAdd: 0.4, inspiration: 1,
      },
      {
        kind: 'check',
        label: '启动竞业反诉并反挖对方旺铺情报',
        reqDesc: '检定：铁腕风控店员总星级 ≥ 3★',
        checkType: 'specialty',
        specialty: 'fin',
        targetVal: 3,
        outcomeWin: '不仅把猎头吓得赔礼道歉，还顺势截胡了对手看中的黄金大单！',
        outcomeFail: '猎头灰溜溜撤退，但没能套出他们的新铺底价。',
        cashSec: 210, minCash: 4.5e4, roses: 5, inspiration: 2, feverAdd: 0.7,
      },
      {
        kind: 'gamble',
        label: '豪掷重金直接买断对街铺面扩建',
        stakeRatio: 0.22,
        baseChance: 0.62,
        winMult: 4.2,
        outcomeWin: '对手刚签完意向就被房东通知换业主了，转手赚翻双倍转租违约金！',
        outcomeFail: '竞价胶着流拍撤回，损失了部分竞标保证金。',
        cashSec: 175, minCash: 3.8e4, roses: 5,
      },
    ],
  },
  {
    id: 'raw_material_squeeze',
    title: '苏氏施压供应商哄抬进口奶油价',
    desc: '苏卫国暗中打招呼卡脖子，三家冷链原料商同时宣布断供涨价五成。',
    minChapter: 2,
    options: [
      {
        kind: 'steady',
        label: '启用备用库存，主推中式茶点过渡',
        outcome: '灵活换菜单平稳度过风波，老客纷纷夸新口味惊艳！',
        cashSec: 90, minCash: 2.4e4, roses: 3, feverAdd: 0.35, inspiration: 2,
      },
      {
        kind: 'check',
        label: '绕开中间商直签海外牧场包机直采',
        reqDesc: '检定：咖啡馆达到 Lv.15',
        checkType: 'shopLevel',
        shopId: 'cafe',
        targetVal: 15,
        outcomeWin: '牧场直采成本反而降了三成！苏氏屯的高价奶油全烂在了自己库里！',
        outcomeFail: '清关多耗了一天时间，小赚一笔差价平稳落地。',
        cashSec: 220, minCash: 6.8e4, roses: 6, inspiration: 3, feverAdd: 0.75,
      },
      {
        kind: 'gamble',
        label: '反手在期货盘扫货锁死高端乳脂仓单',
        stakeRatio: 0.24,
        baseChance: 0.60,
        winMult: 4.5,
        outcomeWin: '行情暴涨！苏氏采购部不得不反过来高价求你转让仓单，血赚一笔！',
        outcomeFail: '国际乳价小幅回调，平盘出局小损手续费。',
        cashSec: 190, minCash: 5.5e4, roses: 6,
      },
    ],
  },
  {
    id: 'ex_fiance_queue',
    title: '前未婚夫淋雨排在门店队尾',
    desc: '店员小声汇报：“老板，傅景辞的车停在街对面，本人淋着雨排了半小时买少糖星星酥。”',
    minChapter: 3,
    options: [
      {
        kind: 'steady',
        label: '公事公办照常收款，多收礼盒包装费',
        outcome: '谁的钱不是赚？傅景辞默默刷了双倍账单，站在雨幕里红了眼眶。',
        cashSec: 95, minCash: 8e4, roses: 3, feverAdd: 0.4, inspiration: 1,
      },
      {
        kind: 'check',
        label: '借狗仔镜头顺势官宣“前任也真香”限定款',
        reqDesc: '检定：危机公关店员总星级 ≥ 5★',
        checkType: 'specialty',
        specialty: 'pr',
        targetVal: 5,
        outcomeWin: '吃瓜群众把门店围得水泄不通，全城名媛跟风打卡同款礼盒！',
        outcomeFail: '狗仔拍糊了照片，不过门店晚高峰销量依旧喜人。',
        cashSec: 230, minCash: 2.2e5, roses: 6, inspiration: 3, feverAdd: 0.85,
      },
      {
        kind: 'gamble',
        label: '当场发起“挥别错的人”全场买一赠一狂欢',
        stakeRatio: 0.18,
        baseChance: 0.66,
        winMult: 3.9,
        outcomeWin: '全城独立女性顾客疯狂涌入下单支持，单日营业额直接破纪录！',
        outcomeFail: '赠品发得太猛，口碑拉满但短线摊薄了些许毛利。',
        cashSec: 180, minCash: 1.8e5, roses: 6,
      },
    ],
  },
  {
    id: 'magazine_cover',
    title: '《时尚商界》开天窗换封面人物',
    desc: '主编亲自登门致意：“苏总，金九刊原本定的是苏家，现在编辑部全票改邀您压轴！”',
    minChapter: 4,
    options: [
      {
        kind: 'steady',
        label: '穿自家高定出镜，畅谈创业初心',
        outcome: '专访金句频出，杂志预售上线五分钟抢购一空！',
        cashSec: 115, minCash: 8e5, roses: 4, feverAdd: 0.5, inspiration: 2,
      },
      {
        kind: 'check',
        label: '携旗下精英店员天团拍跨页群像大片',
        reqDesc: '检定：律所达到 Lv.20',
        checkType: 'shopLevel',
        shopId: 'law',
        targetVal: 20,
        outcomeWin: '“神仙女总裁与她的男神高管团”血洗热搜，加盟意向书雪片般飞来！',
        outcomeFail: '档期紧凑只拍了单人封底与内页，依然圈粉无数。',
        cashSec: 260, minCash: 2.5e6, roses: 8, inspiration: 4, feverAdd: 0.9,
      },
      {
        kind: 'gamble',
        label: '包下全城地标巨幕同步首发封面大片',
        stakeRatio: 0.22,
        baseChance: 0.64,
        winMult: 4.3,
        outcomeWin: '外滩与金融街巨幕点亮那一刻，三大高奢品牌连夜送来联名支票！',
        outcomeFail: '巨幕排期竞价高昂，赚足了排面但广告费小超预算。',
        cashSec: 210, minCash: 2.0e6, roses: 7,
      },
    ],
  },
  {
    id: 'short_squeeze_trap',
    title: '华尔街游资试探做空晚星供应链',
    desc: '几家境外空头基金散布晚星扩张过快谣言，试图在盘中打压关联合作商股价。',
    minChapter: 5,
    options: [
      {
        kind: 'steady',
        label: '公布充沛现金流审计报告稳定市场',
        outcome: '百亿账面现金铁证如山，谣言不攻自破！',
        cashSec: 130, minCash: 8e6, roses: 5, feverAdd: 0.45, inspiration: 2,
      },
      {
        kind: 'check',
        label: '联动铁腕风控团队设局逼空对手盘',
        reqDesc: '检定：铁腕风控店员总星级 ≥ 8★',
        checkType: 'specialty',
        specialty: 'fin',
        targetVal: 8,
        outcomeWin: '教科书级逼空反杀！空头基金被迫割肉平仓，晚星净收巨额溢价！',
        outcomeFail: '空头察觉风向提前溜走，稳稳收下部分对手违约金。',
        cashSec: 300, minCash: 2.6e7, roses: 9, inspiration: 4, feverAdd: 1.0,
      },
      {
        kind: 'gamble',
        label: '调动流动资金十倍反手扫货轧空',
        stakeRatio: 0.25,
        baseChance: 0.62,
        winMult: 4.8,
        outcomeWin: '拉出史诗级长阳线，空头爆仓出局，财经频道连播三天封神战役！',
        outcomeFail: '盘中多空拉锯激烈，震荡洗盘后耗损了部分冲击成本。',
        cashSec: 250, minCash: 2.0e7, roses: 9,
      },
    ],
  },
];

/** 每章看完视频后弹出的高潮爽点抉择（亲手完成最后一击 + 获得差异化战略物资） */
export interface ChapterClimaxChoice {
  label: string;
  reply: string;
  roses: number;
  inspiration: number;
  insiderTokens: number;
}

export interface ChapterClimaxDef {
  chapterId: number;
  prompt: string;
  choiceA: ChapterClimaxChoice;
  choiceB: ChapterClimaxChoice;
}

export const CHAPTER_CLIMAXES: ReadonlyMap<number, ChapterClimaxDef> = new Map([
  [1, {
    chapterId: 1,
    prompt: '王姐灰溜溜带人逃走，围观食客纷纷鼓掌叫好。第一桶金到手，今晚怎么庆功？',
    choiceA: { label: '给整条街食客每盒多加一块金桂酥', reply: '口碑炸裂！老街食客自发帮你在朋友圈宣传，爆品灵感泉涌！', roses: 2, inspiration: 3, insiderTokens: 0 },
    choiceB: { label: '留一盒刚出炉的送去隔壁烧烤摊', reply: '陆屿接过温热的纸盒，耳尖在炭火光里悄悄红了一截。', roses: 4, inspiration: 1, insiderTokens: 0 },
  }],
  [2, {
    chapterId: 2,
    prompt: '整栋临街小楼已归你名下，脸色铁青的周房东还想厚着脸皮求保留二房东分成。',
    choiceA: { label: '当场清退二房东，减免邻铺租金换情报', reply: '整条街店主都念你的好，纷纷把商圈风声第一时间报给你！', roses: 3, inspiration: 1, insiderTokens: 2 },
    choiceB: { label: '把夜空藏青金星招牌挂上顶楼最显眼处', reply: '璀璨金星招牌点亮整条街，研发新单品的灵感瞬间迸发！', roses: 3, inspiration: 3, insiderTokens: 0 },
  }],
  [3, {
    chapterId: 3,
    prompt: '十倍赔偿账单拍在傅景辞面前，苏婉柔咬着嘴唇装委屈要替他求情。',
    choiceA: { label: '“少一分钱就请商场广播全楼催缴”', reply: '傅景辞脸色惨白刷卡结账，还让你顺手摸清了苏氏近期资金虚实！', roses: 4, inspiration: 1, insiderTokens: 2 },
    choiceB: { label: '把两人的名字列入全城门店黑名单', reply: '“本店恕不接待恶客”立牌冲上热搜，高定礼盒灵感大爆发！', roses: 5, inspiration: 3, insiderTokens: 0 },
  }],
  [4, {
    chapterId: 4,
    prompt: '法庭宣判苏氏食品侵权败诉，苏氏代理律师私下递话想花高价买断不公开道歉。',
    choiceA: { label: '“一分钱不降，全城大屏滚动道歉三天”', reply: '苏氏股价应声重挫，你手里多了一张精准做空苏氏的王牌！', roses: 5, inspiration: 2, insiderTokens: 3 },
    choiceB: { label: '把全部胜诉赔偿金投入新产品研发室', reply: '沈砚看着你果断签字的样子，眼底掠过一抹罕见的欣赏笑意。', roses: 6, inspiration: 5, insiderTokens: 1 },
  }],
  [5, {
    chapterId: 5,
    prompt: '慈善晚宴聚光灯聚焦在你身上，被拦在门外的苏父苏母托侍者递来字条认亲。',
    choiceA: { label: '看都不看，直接让人原样退回', reply: '“苏晚女士独资冠名”烫金大字亮彻全场，你早已不需要任何人的姓氏！', roses: 7, inspiration: 3, insiderTokens: 2 },
    choiceB: { label: '举杯向全场名流发布晚星高端线蓝图', reply: '投行巨贾纷纷上前递名片透露行业密报，商业帝国迈入亿级！', roses: 6, inspiration: 2, insiderTokens: 4 },
  }],
  [6, {
    chapterId: 6,
    prompt: '收购苏氏协议落定，门外暴雨倾盆，傅景辞攥着真相录音站在雨里求你回头。',
    choiceA: { label: '留下那句“不恨也不爱了”，潇洒乘车离去', reply: '后视镜里的身影彻底缩成一个小点——你的前方已是万丈星途。', roses: 9, inspiration: 4, insiderTokens: 2 },
    choiceB: { label: '将当年的旧戒指摘下扔进大厦喷泉', reply: '水花溅起的一瞬旧日枷锁清零，全城资本都在仰望晚星的下一步！', roses: 8, inspiration: 3, insiderTokens: 4 },
  }],
  [7, {
    chapterId: 7,
    prompt: '盛家老宅两排管家保镖齐声高呼“恭迎大小姐”，假冒认亲的苏婉柔瘫软在地。',
    choiceA: { label: '端坐主位：“报警，顺便彻查二十二年前旧案”', reply: '雷霆手腕震慑全族叔伯，盛氏千亿商业情报网尽归你调遣！', roses: 11, inspiration: 4, insiderTokens: 5 },
    choiceB: { label: '将外婆的旧铁盒供上书案正中', reply: '兜兜转转二十二年，外婆守住的传世秘方手札全部重见天日！', roses: 12, inspiration: 8, insiderTokens: 2 },
  }],
  [8, {
    chapterId: 8,
    prompt: '千亿敲钟礼成，漫天金雨洒落舞台，全城媒体话筒对准新晋首富苏晚——',
    choiceA: { label: '“靠别人给的叫施舍，亲手赢来的才叫江山！”', reply: '金句刷屏全国财经头条，晚星商业女皇传奇正式加冕！', roses: 16, inspiration: 6, insiderTokens: 5 },
    choiceB: { label: '望向台下那个一直注视着你的人微笑举杯', reply: '灯光暗下又亮起，属于你们的专属终章才刚刚开始——', roses: 18, inspiration: 5, insiderTokens: 4 },
  }],
]);
