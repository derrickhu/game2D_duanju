/** 主界面随机街头/打脸奇遇，以及主线章节高潮的二选一爽点抉择。 */

export interface StreetEventOption {
  label: string;
  outcome: string;
  cashSec: number;
  minCash: number;
  roses: number;
  feverAdd: number;
}

export interface StreetEventDef {
  id: string;
  badge: string;
  title: string;
  desc: string;
  minChapter: number;
  options: readonly [StreetEventOption, StreetEventOption];
}

export const STREET_EVENTS: readonly StreetEventDef[] = [
  {
    id: 'blogger_visit',
    badge: '📸',
    title: '百万美食博主突袭探店',
    desc: '网红博主举着手机直播进门：“听说假千金摆摊做的星星酥一绝，真的假的？”',
    minChapter: 0,
    options: [
      {
        label: '现场开炉炫技，请全场试吃',
        outcome: '直播间瞬间涌入十万人，弹幕刷屏“姐姐好飒”，当场卖空三车！',
        cashSec: 65, minCash: 450, roses: 2, feverAdd: 0.6,
      },
      {
        label: '推出限量印章礼盒高价预售',
        outcome: '粉丝疯抢预售号，定金直接塞爆收款码！',
        cashSec: 95, minCash: 650, roses: 1, feverAdd: 0.3,
      },
    ],
  },
  {
    id: 'fake_review',
    badge: '💥',
    title: '苏婉柔买水军刷恶意差评',
    desc: '一夜之间冒出三百条黑帖污蔑晚星用廉价奶油，门口有路人犹豫观望。',
    minChapter: 1,
    options: [
      {
        label: '公开后厨监控 + 海关进口报关单',
        outcome: '铁证打脸！水军账号被扒出全是苏氏公关买的，舆论彻底反转！',
        cashSec: 85, minCash: 2500, roses: 3, feverAdd: 0.5,
      },
      {
        label: '直接发律师函索赔十倍名誉损失',
        outcome: '造谣带头人连夜删帖道歉并赔付和解金，大快人心！',
        cashSec: 110, minCash: 3500, roses: 2, feverAdd: 0.35,
      },
    ],
  },
  {
    id: 'mystery_vip',
    badge: '🎁',
    title: '神秘黑卡匿名包场大单',
    desc: '一位戴白手套的特助递来黑金卡：“我家先生包下今天全部新品，分送全城福利院。”',
    minChapter: 1,
    options: [
      {
        label: '痛快接单，额外附赠手写祝福卡',
        outcome: '特助微笑着留下一束罕见的香槟玫瑰，账面瞬间入账巨款！',
        cashSec: 90, minCash: 3000, roses: 4, feverAdd: 0.4,
      },
      {
        label: '以晚星联名公益名义双倍加赠',
        outcome: '“晚星暖心公益”登上同城热搜榜首，客流彻底沸腾！',
        cashSec: 75, minCash: 2500, roses: 3, feverAdd: 1.0,
      },
    ],
  },
  {
    id: 'poach_staff',
    badge: '⚡',
    title: '竞争对手高薪挖角店员',
    desc: '对街豪门猎头堵在后门，开出双倍工资想挖走你的主力帅哥店员。',
    minChapter: 2,
    options: [
      {
        label: '当场宣布全员分红激励计划',
        outcome: '店员们齐声把猎头轰出门外：“给苏老板打工才有奔头！”干劲暴涨！',
        cashSec: 80, minCash: 1.5e4, roses: 3, feverAdd: 0.75,
      },
      {
        label: '反手收购猎头手里的黄金铺位信息',
        outcome: '不仅稳住军心，还顺藤摸瓜截胡了对手看中的旺铺订单！',
        cashSec: 120, minCash: 2.2e4, roses: 2, feverAdd: 0.3,
      },
    ],
  },
  {
    id: 'ex_fiance_queue',
    badge: '🌧️',
    title: '前未婚夫的车又停在街对面',
    desc: '店员小声汇报：“老板，傅少爷又淋着小雨排在队尾买少糖星星酥了，卖不卖？”',
    minChapter: 3,
    options: [
      {
        label: '照常收钱，多收二十块包装费',
        outcome: '谁的钱不是赚？傅景辞默默付了双倍现金，站在车边红了眼眶。',
        cashSec: 100, minCash: 8e4, roses: 3, feverAdd: 0.4,
      },
      {
        label: '挂出“今日售罄”牌子送给前排顾客',
        outcome: '排在他前面的一对情侣欢呼雀跃，围观群众纷纷夸老板大气！',
        cashSec: 75, minCash: 6e4, roses: 4, feverAdd: 0.8,
      },
    ],
  },
  {
    id: 'magazine_cover',
    badge: '👑',
    title: '《时尚商界》邀约年度封面人物',
    desc: '主编亲自登门：“苏总，这一期原本定的是苏家千金，我们全票决定换成您！”',
    minChapter: 4,
    options: [
      {
        label: '穿自家高定出镜，带火全线产业',
        outcome: '杂志预售一秒售罄，名下所有门店预约排到三个月后！',
        cashSec: 125, minCash: 8e5, roses: 5, feverAdd: 1.0,
      },
      {
        label: '携旗下精英团队拍群像大片',
        outcome: '“神仙老板与她的男神天团”血洗热搜，投资合作雪片般飞来！',
        cashSec: 105, minCash: 6e5, roses: 6, feverAdd: 0.6,
      },
    ],
  },
];

/** 每章看完视频后弹出的高潮爽点抉择（亲手完成最后一击） */
export interface ChapterClimaxDef {
  chapterId: number;
  prompt: string;
  choiceA: { label: string; reply: string; roses: number };
  choiceB: { label: string; reply: string; roses: number };
}

export const CHAPTER_CLIMAXES: ReadonlyMap<number, ChapterClimaxDef> = new Map([
  [1, {
    chapterId: 1,
    prompt: '王姐灰溜溜带人逃走，围观食客纷纷鼓掌叫好。第一桶金到手，今晚怎么庆祝？',
    choiceA: { label: '给整条街食客每盒多加一块酥', reply: '口碑炸裂！老街食客自发帮你在朋友圈宣传，明日预订翻倍！', roses: 2 },
    choiceB: { label: '留一盒刚出炉的送去隔壁烧烤摊', reply: '陆屿接过温热的纸盒，耳尖在炭火光里悄悄红了一截。', roses: 3 },
  }],
  [2, {
    chapterId: 2,
    prompt: '整栋临街小楼已归你名下，脸色铁青的周房东还想讨回面子求续租管理权。',
    choiceA: { label: '当场清退二房东，减免邻铺租金', reply: '整条街店主都念你的好，晚星首店开业花篮摆出五十米！', roses: 3 },
    choiceB: { label: '把招牌挂上顶楼最显眼处', reply: '夜空藏青配金星的招牌点亮整条街，所有路人都记住了“晚星”！', roses: 3 },
  }],
  [3, {
    chapterId: 3,
    prompt: '十倍赔偿账单拍在傅景辞面前，苏婉柔咬着嘴唇装委屈要替他求情。',
    choiceA: { label: '“少一分钱就请商场保安广播催缴”', reply: '傅景辞脸色惨白刷卡结账，全场顾客拍手称快！', roses: 4 },
    choiceB: { label: '把两人的名字列入全城门店黑名单', reply: '“本店恕不接待恶客”立牌一出，同城热搜直接爆了！', roses: 4 },
  }],
  [4, {
    chapterId: 4,
    prompt: '法庭宣判苏氏食品侵权败诉，苏氏代理律师私下递话想花钱买断不公开道歉。',
    choiceA: { label: '“一分钱不降，全城大屏滚动道歉三天”', reply: '苏氏股票应声跌停，外婆的星星秘方终于堂堂正正冠上你的名字！', roses: 5 },
    choiceB: { label: '把全部胜诉赔偿金投入新产品研发', reply: '沈砚看着你果断签字的样子，眼底掠过一抹罕见的欣赏笑意。', roses: 5 },
  }],
  [5, {
    chapterId: 5,
    prompt: '慈善晚宴聚光灯聚焦在你身上，被拦在门外的苏父苏母托侍者递来字条认亲。',
    choiceA: { label: '看都不看，直接让人原样退回', reply: '“苏晚女士独资冠名”八个烫金大字亮彻全场，你早已不需要任何人的姓氏！', roses: 6 },
    choiceB: { label: '举杯向全场宣布晚星进军高端商圈', reply: '名流巨贾纷纷上前敬酒递名片，你的商业帝国正式迈入亿级！', roses: 6 },
  }],
  [6, {
    chapterId: 6,
    prompt: '收购苏氏协议落定，门外暴雨倾盆，傅景辞攥着真相录音站在雨里求你回头。',
    choiceA: { label: '留下那句“不恨也不爱了”，潇洒乘车离去', reply: '后视镜里的身影彻底缩成一个小点——你的前方已是万丈星途。', roses: 8 },
    choiceB: { label: '将当年的旧戒指摘下扔进大厦喷泉', reply: '水花溅起的一瞬，旧日枷锁彻底清零，从此天地广阔只属于你！', roses: 8 },
  }],
  [7, {
    chapterId: 7,
    prompt: '盛家老宅两排管家保镖齐声高呼“恭迎大小姐”，假冒认亲的苏婉柔瘫软在地。',
    choiceA: { label: '端坐主位：“报警，顺便彻查二十二年前旧案”', reply: '雷霆手腕震慑全族叔伯，盛氏千亿信托正式归入你的麾下！', roses: 10 },
    choiceB: { label: '将外婆的旧铁盒供上书案正中', reply: '兜兜转转二十二年，外婆守住的小星星终于照亮了整座盛家。', roses: 10 },
  }],
  [8, {
    chapterId: 8,
    prompt: '千亿敲钟礼成，漫天金雨洒落舞台，全城媒体话筒对准新晋首富苏晚——',
    choiceA: { label: '“靠别人给的叫施舍，亲手赢来的才叫江山！”', reply: '金句刷屏全国财经头条，晚星商业女皇传奇正式加冕！', roses: 15 },
    choiceB: { label: '望向台下那个一直注视着你的人微笑举杯', reply: '灯光暗下又亮起，属于你们的专属终章才刚刚开始——', roses: 15 },
  }],
]);
