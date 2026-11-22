#!/usr/bin/env python3
"""
软件著作权登记 - 文档鉴别材料（设计说明书）PDF 生成工具
项目: 翻盘女王小游戏软件

严格按中国版权保护中心提交规范:
  1. A4 纸张, 纵向
  2. 页眉左侧: 软件全称 + 版本号 + 设计说明书 (与申请表完全一致)
  3. 页眉右侧: 阿拉伯数字连续页码
  4. 页脚: 申请人名称
  5. 文档结构:
     - 第一章 引言
     - 第二章 游戏完整游玩流程（从启动到通关一步步操作说明 + 15 处真机图位）
     - 第三章 软件总体架构设计（分层架构、目录映射、事件总线、主循环与分级资源管线）
     - 第四章 各核心玩法与工程模块详细设计（11 个子系统，含完整数值表、状态机与真实源码片段）
     - 第五章 数据结构设计（存档 Schema、配置接口与运行时状态定义）
     - 第六章 数据接口设计（经济计算、状态变更、解锁推导、平台与云同步接口）
     - 第七章 出错处理与容错设计
     - 第八章 性能优化设计
     - 第九章 结论
"""

import warnings
from pathlib import Path

from fpdf import FPDF
from fpdf.enums import WrapMode
from PIL import Image

warnings.filterwarnings("ignore", category=DeprecationWarning)


SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
OUTPUT = SCRIPT_DIR / '软著文档-翻盘女王-V1.0.0.pdf'

SOFTWARE_FULL_NAME = '深圳幸运呱科技有限公司翻盘女王小游戏软件'
SOFTWARE_VERSION = 'V1.0.0'
APPLICANT_NAME = '深圳幸运呱科技有限公司'

SONGTI_PATH = '/System/Library/Fonts/Supplemental/Songti.ttc'

BODY_FONT_SIZE = 10.5
H1_FONT_SIZE = 16
H2_FONT_SIZE = 14
H3_FONT_SIZE = 12
CODE_FONT_SIZE = 8.5
TABLE_FONT_SIZE = 9.5
HEADER_FONT_SIZE = 10
FOOTER_FONT_SIZE = 9

LINE_HEIGHT = 6.2
CODE_LINE_HEIGHT = 4.6
H1_LINE_HEIGHT = 10
H2_LINE_HEIGHT = 8.5
H3_LINE_HEIGHT = 7.5

LEFT_MARGIN = 22
RIGHT_MARGIN = 18
TOP_MARGIN = 15
BOTTOM_MARGIN = 15

PAGE_W = 210
PAGE_H = 297
CONTENT_W = PAGE_W - LEFT_MARGIN - RIGHT_MARGIN
CONTENT_TOP = TOP_MARGIN + 10

HEADER_TEXT = f'{SOFTWARE_FULL_NAME} {SOFTWARE_VERSION} 设计说明书'
PICS_DIR = SCRIPT_DIR / 'pics'
IMAGE_EXTS = {'.jpg', '.jpeg', '.png'}


def _pic(stem):
    """按主文件名找真机截图，支持 jpg/png 及带前缀的文件名。"""
    fallback = PICS_DIR / f'{stem}.jpg'
    if not PICS_DIR.exists():
        return fallback
    exact = []
    prefixed = []
    for path in PICS_DIR.iterdir():
        if not path.is_file() or path.suffix.lower() not in IMAGE_EXTS:
            continue
        if path.stem == stem:
            exact.append(path)
        elif path.stem.endswith('_' + stem):
            prefixed.append(path)
    if exact:
        return sorted(exact)[0]
    if prefixed:
        return sorted(prefixed)[0]
    return fallback


SCREENSHOTS = {
    'loading': (
        _pic('01_loading'),
        '图1  启动加载界面 - 韩版漫画封面、加载进度与健康游戏忠告',
    ),
    'home': (
        _pic('02_home_stall'),
        '图2  首页经营界面 - 一体化珠光状态顶舱、韩漫明亮经营舞台、点单气泡与双层底栏操控台',
    ),
    'buffs': (
        _pic('03_empire_buffs'),
        '图3  商业帝国增益总览弹窗 - 赛季倍率、门店光环、店员干劲与衣橱加成',
    ),
    'event': (
        _pic('04_street_event'),
        '图4  街头奇遇事件弹窗 - 随机商业事件与二选一经营决策',
    ),
    'shop_map': (
        _pic('05_shop_map'),
        '图5  名下产业主界面（商业版图） - 韩漫 2D 落日江湾大地图与 10 座独立地标建筑',
    ),
    'shop_list': (
        _pic('06_shop_list'),
        '图6  名下产业次视图（店铺列表） - 十家产业门头横幅卡片与极速升级列表',
    ),
    'hero_seen': (
        _pic('07_hero_seen'),
        '图7  心动伙伴界面 - 纯色高级背景、全身合伙人立绘、高定档案与 2x3 人物剧情卡片矩阵',
    ),
    'hero_hidden': (
        _pic('08_hero_hidden'),
        '图8  心动伙伴界面 - 「她看不见的」丝绒酒红纯色暗夜主题与暗面传记卡片',
    ),
    'cg_theater': (
        _pic('09_cg_theater'),
        '图9  韩版漫画人物剧情卡片阅读界面 - 插画分镜、章节铭牌与角色台词',
    ),
    'staff_grid': (
        _pic('10_staff_grid'),
        '图10  精英店员界面 - 六大城区团建加成、店员星级晋升与人物卡片入口',
    ),
    'staff_polaroid': (
        _pic('11_staff_polaroid'),
        '图11  店员专属拍立得人物卡片弹窗 - 实体相纸卡面与角色寄语',
    ),
    'story_tickets': (
        _pic('12_story_tickets'),
        '图12  逆袭剧场界面 - 主线章节票根卡片、分篇胶囊与跨城扩张入口',
    ),
    'battle': (
        _pic('13_business_battle'),
        '图13  章节商业身价交锋弹窗 - 双方身价对比、碾压进度条与获胜玫瑰印章',
    ),
    'phone': (
        _pic('14_phone_chat'),
        '图14  晚星手机界面 - 合伙人私聊消息互动与同城商圈动态',
    ),
    'wardrobe': (
        _pic('15_wardrobe'),
        '图15  千金衣橱界面 - 五套韩版漫画高定造型图鉴与试衣橱窗',
    ),
}


class DocPDF(FPDF):
    def __init__(self):
        super().__init__(orientation='P', unit='mm', format='A4')
        self.set_left_margin(LEFT_MARGIN)
        self.set_right_margin(RIGHT_MARGIN)
        self.set_top_margin(CONTENT_TOP)
        self.set_auto_page_break(auto=True, margin=BOTTOM_MARGIN + 10)
        self.missing_images = []

    def header(self):
        self.set_font('Songti', '', HEADER_FONT_SIZE)
        self.set_text_color(0, 0, 0)
        self.set_xy(LEFT_MARGIN, TOP_MARGIN)
        self.cell(0, 6, HEADER_TEXT, new_x='LEFT', new_y='TOP')
        page_str = str(self.page_no())
        tw = self.get_string_width(page_str)
        self.set_xy(PAGE_W - RIGHT_MARGIN - tw, TOP_MARGIN)
        self.cell(tw, 6, page_str, new_x='LEFT', new_y='TOP')
        line_y = TOP_MARGIN + 7
        self.set_draw_color(0, 0, 0)
        self.set_line_width(0.4)
        self.line(LEFT_MARGIN, line_y, PAGE_W - RIGHT_MARGIN, line_y)
        self.set_y(CONTENT_TOP)

    def footer(self):
        footer_y = PAGE_H - BOTTOM_MARGIN
        self.set_xy(LEFT_MARGIN, footer_y)
        self.set_font('Songti', '', FOOTER_FONT_SIZE)
        self.set_text_color(0, 0, 0)
        self.cell(CONTENT_W, 5, APPLICANT_NAME, align='C')

    def check_page_break(self, h):
        if self.get_y() + h > PAGE_H - BOTTOM_MARGIN - 10:
            self.add_page()

    def write_h1(self, text):
        self.check_page_break(H1_LINE_HEIGHT + 6)
        self.ln(4)
        self.set_font('Songti', '', H1_FONT_SIZE)
        self.set_text_color(0, 0, 0)
        self.set_x(LEFT_MARGIN)
        self.cell(CONTENT_W, H1_LINE_HEIGHT, _safe_text(text), new_x='LMARGIN', new_y='NEXT')
        self.ln(2)

    def write_h2(self, text):
        self.check_page_break(H2_LINE_HEIGHT + 5)
        self.ln(3)
        self.set_font('Songti', '', H2_FONT_SIZE)
        self.set_text_color(0, 0, 0)
        self.set_x(LEFT_MARGIN)
        self.cell(CONTENT_W, H2_LINE_HEIGHT, _safe_text(text), new_x='LMARGIN', new_y='NEXT')
        self.ln(1.5)

    def write_h3(self, text):
        self.check_page_break(H3_LINE_HEIGHT + 4)
        self.ln(2)
        self.set_font('Songti', '', H3_FONT_SIZE)
        self.set_text_color(0, 0, 0)
        self.set_x(LEFT_MARGIN)
        self.cell(CONTENT_W, H3_LINE_HEIGHT, _safe_text(text), new_x='LMARGIN', new_y='NEXT')
        self.ln(1)

    def write_body(self, text, indent=0):
        self.set_font('Songti', '', BODY_FONT_SIZE)
        self.set_text_color(30, 30, 30)
        self.set_x(LEFT_MARGIN + indent)
        self.multi_cell(
            CONTENT_W - indent,
            LINE_HEIGHT,
            _safe_text(text),
            new_x='LMARGIN',
            new_y='NEXT',
            wrapmode=WrapMode.CHAR,
        )

    def write_bullet(self, text, level=0):
        indent = 4 + level * 4
        bullet = '  ' * level + ('- ' if level > 0 else '* ')
        self.write_body(bullet + text, indent=indent)

    def write_code_block(self, lines, title=''):
        self.ln(1.2)
        if title:
            self.check_page_break(CODE_LINE_HEIGHT * 3)
            self.set_font('Songti', '', 9)
            self.set_text_color(80, 80, 80)
            self.set_x(LEFT_MARGIN + 2)
            self.cell(CONTENT_W - 2, 5, _safe_text(f'【源码对应: {title}】'), new_x='LMARGIN', new_y='NEXT')
        self.set_font('Songti', '', CODE_FONT_SIZE)
        self.set_text_color(35, 35, 35)
        for line in lines:
            self.check_page_break(CODE_LINE_HEIGHT)
            self.set_fill_color(244, 244, 246)
            self.set_draw_color(215, 215, 220)
            self.set_x(LEFT_MARGIN + 2)
            safe_line = _safe_text(line.replace('\t', '  '))
            if len(safe_line) > 96:
                safe_line = safe_line[:93] + '...'
            self.cell(
                CONTENT_W - 2,
                CODE_LINE_HEIGHT,
                ' ' + safe_line,
                fill=True,
                new_x='LMARGIN',
                new_y='NEXT',
            )
        self.ln(1.5)

    def write_table(self, headers, rows, col_widths=None, font_size=TABLE_FONT_SIZE):
        self.ln(1)
        if col_widths is None:
            col_widths = [CONTENT_W / len(headers)] * len(headers)
        row_line_h = 5.2
        pad_x = 1.4
        pad_y = 1.3

        def wrap_cell(text, width):
            self.set_font('Songti', '', font_size)
            text = _safe_text(str(text))
            lines = []
            for paragraph in text.split('\n'):
                current = ''
                for ch in paragraph:
                    if self.get_string_width(current + ch) <= width:
                        current += ch
                    else:
                        if current:
                            lines.append(current)
                        current = ch
                lines.append(current)
            return lines or ['']

        def draw_row(cells, fill):
            self.set_font('Songti', '', font_size)
            wrapped = [wrap_cell(c, col_widths[i] - pad_x * 2) for i, c in enumerate(cells)]
            row_h = max(len(lines) for lines in wrapped) * row_line_h + pad_y * 2
            self.check_page_break(row_h)
            y0 = self.get_y()
            x = LEFT_MARGIN
            self.set_fill_color(*fill)
            self.set_draw_color(60, 60, 60)
            self.set_line_width(0.25)
            for i, lines in enumerate(wrapped):
                self.rect(x, y0, col_widths[i], row_h, style='DF')
                self.set_xy(x + pad_x, y0 + pad_y)
                for line in lines:
                    self.cell(col_widths[i] - pad_x * 2, row_line_h, line, new_x='LEFT', new_y='NEXT')
                    self.set_x(x + pad_x)
                x += col_widths[i]
            self.set_y(y0 + row_h)

        self.set_text_color(0, 0, 0)
        draw_row(headers, (228, 228, 232))
        for row in rows:
            self.set_text_color(30, 30, 30)
            draw_row(row, (255, 255, 255))
        self.ln(1.5)

    def write_image(self, img_path, caption='', max_h=94):
        img_path = Path(img_path)
        if not img_path.exists():
            self._write_image_placeholder(img_path, caption)
            return

        img = Image.open(img_path)
        iw, ih = img.size
        max_w = CONTENT_W * 0.48
        ratio = min(max_w / iw, max_h / ih)
        draw_w = iw * ratio
        draw_h = ih * ratio
        total_h = draw_h + 18
        self.check_page_break(total_h)
        self.ln(2.5)
        x = LEFT_MARGIN + (CONTENT_W - draw_w) / 2
        self.image(str(img_path), x=x, y=self.get_y(), w=draw_w, h=draw_h)
        self.set_y(self.get_y() + draw_h + 2)
        if caption:
            self.set_font('Songti', '', 9)
            self.set_text_color(100, 100, 100)
            self.set_x(LEFT_MARGIN)
            self.cell(CONTENT_W, 5, _safe_text(caption), align='C', new_x='LMARGIN', new_y='NEXT')
            self.set_text_color(30, 30, 30)
        self.ln(2.5)

    def _write_image_placeholder(self, img_path, caption):
        self.missing_images.append((str(img_path), caption))
        box_h = 52
        self.check_page_break(box_h + 15)
        self.ln(2.5)
        x = LEFT_MARGIN + CONTENT_W * 0.22
        w = CONTENT_W * 0.56
        y = self.get_y()
        self.set_draw_color(120, 120, 120)
        self.set_fill_color(248, 248, 248)
        self.rect(x, y, w, box_h, style='DF')
        self.set_font('Songti', '', 11)
        self.set_text_color(110, 110, 110)
        self.set_xy(x, y + 15)
        self.cell(w, 7, '待补真机游戏截图', align='C', new_x='LEFT', new_y='NEXT')
        self.set_xy(x, y + 25)
        self.cell(w, 7, img_path.name, align='C', new_x='LEFT', new_y='NEXT')
        self.set_y(y + box_h + 2)
        self.set_font('Songti', '', 9)
        self.set_text_color(100, 100, 100)
        self.set_x(LEFT_MARGIN)
        self.cell(CONTENT_W, 5, _safe_text(caption + '（截图待补）'), align='C', new_x='LMARGIN', new_y='NEXT')
        self.set_text_color(30, 30, 30)
        self.ln(2.5)


def _safe_text(text):
    replacements = {
        '→': '->', '←': '<-', '↑': '^', '↓': 'v', '★': '*',
        '“': '"', '”': '"', '‘': "'", '’': "'",
        '—': '-', '·': '.', '：': ':', '（': '(', '）': ')',
        '×': 'x', '✦': '*', '♥': '*', '♡': '*', '▸': '>', '▶': '>', '✓': 'v',
        '‹': '<', '›': '>', '▾': 'v', '▴': '^',
        '≥': '>=', '≤': '<=', '≠': '!=', '≈': '~=',
    }
    for old, new in replacements.items():
        text = text.replace(old, new)
    return ''.join(c if ord(c) <= 0xFFFF else '?' for c in text)


def img(key):
    return SCREENSHOTS[key]


def write_document(pdf: DocPDF):
    # ==================== 目录 ====================
    pdf.add_page()
    pdf.write_h1('目  录')
    for item in [
        '一、引言',
        '    1.1 编写目的与文档范围',
        '    1.2 软件定位与美术风格概述',
        '    1.3 开发与运行环境配置',
        '    1.4 核心领域术语定义',
        '二、游戏完整游玩流程说明（从启动到通关）',
        '    2.1 阶段一：启动加载、健康忠告与序章开局',
        '    2.2 阶段二：首页经营起步——手艺点击、顾客点单与爆单狂热',
        '    2.3 阶段三：完成目标任务、查看帝国光环与处理街头奇遇',
        '    2.4 阶段四：漫游商业版图大地图、开设十家产业与切换店铺列表批量升级',
        '    2.5 阶段五：邂逅九位商业合伙人、培养羁绊与解锁人物剧情卡片',
        '    2.6 阶段六：招募二十位城区店员、激活团建倍率与收集拍立得卡',
        '    2.7 阶段七：身价跨越章节门槛、商业身价交锋与阅读分篇剧情',
        '    2.8 阶段八：晚星手机私信朋友圈互动与千金衣橱高定换装',
        '    2.9 阶段九：离线挂机结算与千亿首富通关后的跨城新赛季',
        '三、软件总体架构设计',
        '    3.1 总体分层架构与数据单向流',
        '    3.2 源码工程目录与 66 个源码模块职责映射',
        '    3.3 事件总线（EventBus）驱动的视图按需刷新机制',
        '    3.4 单舞台常驻与 OverlayManager 多层级面板调度',
        '    3.5 帧循环（Ticker）与两级纹理异步加载管线',
        '四、各核心玩法与工程模块详细设计（对应源码实现）',
        '    4.1 多维商业乘区耦合引擎设计（src/sim/economy.ts）',
        '    4.2 手艺点击、连击窗口、顾客气泡与爆单能量槽设计（src/sim/actions.ts）',
        '    4.3 六大商圈、十家产业梯度、几何求和与协同光环设计（src/data/world.ts）',
        '    4.4 韩漫 2D 商业版图漫游视口、独立地标排布与双视图设计（src/scenes/home/ShopMap.ts）',
        '    4.5 九位商业合伙人、五阶玫瑰羁绊、章节门禁与双面卡片设计（src/scenes/home/HeroPage.ts）',
        '    4.6 韩版漫画人物卡片画卷阅读器与分镜脚本状态机设计（src/scenes/home/CGTheater.ts）',
        '    4.7 二十位精英店员、A/B 双槽成长、城区团建与拍立得卡设计（src/scenes/home/StaffSheet.ts）',
        '    4.8 逆袭剧场九章票根、商业身价交锋与章末高光抉择设计（BusinessBattleModal.ts）',
        '    4.9 晚星手机私聊分支状态机与商圈动态交互设计（src/scenes/home/PhoneSheet.ts）',
        '    4.10 千金衣橱五套高定造型、九阶女王头衔与跨城转生设计（src/scenes/home/OutfitSheet.ts）',
        '    4.11 56 条引导任务与无限动态目标生成器、奇遇、急单与离线结算设计（src/sim/quests.ts）',
        '    4.12 @2x 九宫格自适应缩放与 2.5x 视网膜 UI 组件库设计（src/ui/theme.ts）',
        '五、数据结构设计',
        '    5.1 本地持久化存档 GameSave 完整字段规范',
        '    5.2 产业、合伙人、章节、店员与手机配置接口定义',
        '六、数据接口设计',
        '    6.1 纯函数经济计算与批量求值接口表',
        '    6.2 存档状态变更事务接口表',
        '    6.3 门槛跨越检测与红点推导接口表',
        '    6.4 平台适配与云同步白名单接口设计',
        '七、出错处理与容错自愈设计',
        '八、性能优化设计',
        '九、结论',
    ]:
        pdf.write_body(item)

    # ==================== 第一章：引言 ====================
    pdf.add_page()
    pdf.write_h1('一、引言')
    pdf.write_h2('1.1 编写目的与文档范围')
    pdf.write_body(
        f'本设计说明书系{SOFTWARE_FULL_NAME}（版本号 {SOFTWARE_VERSION}）申请计算机软件著作权登记的文档鉴别材料。'
        '文档编写遵循两条核心主线: 第一，在第二章按照玩家从启动小游戏到一步步点击出单、开店扩张、招募店员、结识商业合伙人、收集人物卡片、打赢主线商业交锋直至千亿身价跨城扩张的真实游玩顺序，完整讲清游戏全流程操作逻辑；'
        '第二，在第三章至第八章深入到工程源码实现层，逐一给出十家产业、九位合伙人、二十位店员、九章主线、五套高定衣橱及多维乘区耦合引擎的配置表、数学公式、状态转移规则与真实 TypeScript 源码片段，使文档设计与提交的 60 页源程序鉴别材料严格一一对应。'
    )

    pdf.write_h2('1.2 软件定位与美术风格概述')
    pdf.write_body(
        '《翻盘女王》是一款运行于微信小游戏环境的竖屏韩版漫画风格都市商业模拟经营与人物卡片收集休闲游戏。'
        '全软件男女主角全身立绘、明亮化经营舞台、韩漫精细线稿 2D 落日江湾商业版图大地图及 10 座独立绘制 2D 等距地标建筑、剧情分镜插画与拍立得卡面均采用统一的 2D 韩版手绘漫画画风绘制；'
        '界面层采用定制的「三段式一体化暖奶油珠光舱 + 菱格雕金丝缎」视觉体系，所有顶底操控舱、电影票根卡、记忆印章卡、门头横幅卡与按钮均通过高精度 @2x 贴纸与九宫格切片渲染。'
    )
    pdf.write_body(
        '玩法核心将“增量放置经营”与“章节剧情/人物卡片解锁”深度融合: 玩家通过经营甜品摊至晚星集团共 10 家产业持续推高个人身价估值，'
        '用身价解锁主线图文剧情章节与高定衣橱，用经营和互动产出的稀有货币「心动玫瑰」培养商业合伙人羁绊、解锁韩版漫画人物剧情卡片与隐藏传记卡片，并通过培养店员星级收集 40 张店员专属拍立得人物卡。'
    )

    pdf.write_h2('1.3 开发与运行环境配置')
    pdf.write_table(
        ['环境项', '技术规格与工程参数说明'],
        [
            ['目标运行平台', '微信小游戏（基础库 3.12.1+，AppID: wx0a212a8e12191122）；兼容标准 HTML5 浏览器预览环境'],
            ['图形渲染引擎', 'PixiJS 7.3.2 + @pixi/unsafe-eval（适配小游戏无动态代码生成限制环境，启用 2.5x 视网膜字体光栅化）'],
            ['编程语言与规范', 'TypeScript 5.7.3（开启 strict 严格类型检查），目标编译标准 ES2020'],
            ['构建与测试工具', 'Vite 6.4.4 打包器 + scripts/build-platform.mjs 多平台产物脚本 + tools/test-sim.ts 自动化数值测试套件'],
            ['逻辑画布与适配', '固定逻辑分辨率 750x1334（竖屏），运行时按设备物理像素比与微信胶囊安全区（safeTop / safeBottom）动态排版'],
            ['本地持久化机制', 'PersistService 封装 wx.getStorageSync / wx.setStorageSync，主键名 duanju_save，存档版本号 SAVE_VERSION = 1'],
            ['资源分级管理', '首屏 @2x UI 切片（v6_* / v7_* / v8_*）、贴纸图标、提亮版主舞台立绘场景（v10_*）及韩漫 2D 商业版图与 10 座地标建筑（v11_*）随分包加载；其余高清立绘、插画与音频通过 CdnAssetService 按需拉取'],
        ],
        [36, CONTENT_W - 36],
    )

    pdf.write_h2('1.4 核心领域术语定义')
    pdf.write_table(
        ['术语 / 字段名', '工程定义与游戏内作用'],
        [
            ['流动现金 (money)', '玩家当前可支配资金，升级手艺、开设与升级门店、录用升级店员及现金礼盒投资时扣减'],
            ['身价估值 (netWorth)', '当前赛季历史累计总收入，每次调用 earn(save, amount) 时与 money 同步累加，消费不扣减，单调递增'],
            ['心动玫瑰 (roses)', '稀有角色养成货币，由任务、门店质变里程碑、店员录用升星、商业交锋、私聊回复与商圈点赞产出，用于升级合伙人羁绊'],
            ['质变档位 (BuyMode)', '批量购买开关，取值 "1"（升1级）、"10"（连升10级）、"next"（自动计算升至下一质变里程碑所需级数）'],
            ['商业协同 (EmpireSynergies)', '由 10 家门店 Lv25/Lv50 光环、9 位合伙人特权、衣橱收集数与跨城赛季共同计算出的 16 项全局乘区结构'],
            ['爆单狂热 (Fever)', '点击与交付点单气泡积累 feverHeat（0~1），蓄满后触发 8 秒全城爆单，收益乘以 2.2 倍基础狂热倍率及顶流加成'],
            ['记忆印章卡 (MemoryStamp)', '心动伙伴「她看见的」页签下呈 2x3 网格排列的 6 张人物剧情卡片（5 段羁绊剧情 + 1 段专属结局或番外）'],
            ['拍立得卡 (StaffPolaroid)', '每位店员升至 3 星（Lv.25）和 5 星（Lv.100）时分别解锁的工作瞬间卡与下班私藏卡，全员共 40 张'],
        ],
        [44, CONTENT_W - 44],
    )

    # ==================== 第二章：游戏完整游玩流程说明 ====================
    pdf.write_h1('二、游戏完整游玩流程说明（从启动到通关）')
    pdf.write_body(
        '为便于审查人员直观掌握本软件的完整交互脉络，本章严格按照玩家从第一次打开小游戏到达成千亿身价开启跨城新赛季的操作顺序，分九个阶段逐步阐述玩家看到的画面、执行的点击操作以及系统产生的反馈。'
    )

    pdf.write_h2('2.1 阶段一：启动加载、健康忠告与序章开局')
    pdf.write_body(
        '玩家在微信中打开《翻盘女王》后，首先进入启动加载场景（LoadingScene）。画面铺满韩版手绘漫画风格的女主星空礼服封面插画，中下部显示香槟金圆角进度条与「正在加载... xx%」实时百分比，底部固定绘制国家新闻出版署《健康游戏忠告》四行标准文本。'
    )
    pdf.write_body(
        '当首屏 UI 九宫格切片与贴纸图标预加载完毕后，程序读取本地存档 duanju_save。若检测到新玩家（save.tutorialStep === 0），首先进入序章「退婚宴」韩版漫画图文剧场，讲述主角苏晚离开豪门、握着外婆留下的古法甜品方子在雨夜老街重新出发的起因；阅读完成或点击右上角「跳过 >」后正式进入首页经营舞台，并将 tutorialStep 推进至 1，同时刷出首枚顾客点单气泡引导玩家完成首次出单。'
    )
    pdf.write_image(*img('loading'), max_h=96)

    pdf.write_h2('2.2 阶段二：首页经营起步——手艺点击、顾客点单与爆单狂热')
    pdf.write_body(
        '进入首页（HomeScene）后，全屏采用三段式一体化珠光布局: 顶部为象牙金一体化状态舱（v8_top_header_dock），左侧嵌入苏晚圆章头像、「1级 夜市甜品摊主」头衔与珊瑚金身价进度条（「身价 ¥...」及每秒总收益），右侧双层并列心动玫瑰与流动现金槽，顶舱正下方垂挂鎏金章节牌；'
        '画面中央为明亮通透的 2D 韩版漫画经营舞台（LivingStage），身穿「白 T 恤 + 帆布围裙」的苏晚站立在雨后夜市舞台中央，伴随轻柔呼吸微动与暖金丁达尔光束；'
        '底部为双层一体化经营操控台（v8_bottom_console_tray），上层左侧为宽幅主线目标进度卡，右侧为珊瑚金「手艺升级」主按钮（右上角内嵌 x1 / x10 / 质变 档位角标），下层为「产业、伙伴、店员、剧场、衣橱」五栏糖果珐琅导航。'
    )
    pdf.write_body(
        '玩家的核心起步操作如下: 轻触中央经营舞台或尚未凑齐升级费时的暖杏色主按钮，即可亲手制作甜品，每次点击立即获得现金、弹出上浮金额飘字并向顶部现金槽发射抛物线金币粒子；若 1 秒内连续点击达到 5 次，还会激活 3 秒连击双倍（comboMultiplier = 2）。'
        '与此同时，舞台左右两侧定期弹出韩漫对话点单气泡（如「桂花糕」「星星酥」「热豆浆」），玩家点击气泡即可完成一笔高倍率外卖单（相当于 2.5 倍点击加 0.8 秒被动收入），并一次性增加 10% 爆单热度。'
        '当爆单热度蓄满 100% 时，全屏亮起金色脉冲光环，进入持续 8 秒的「全城疯抢爆单时刻」，期间点击与全门店收益同步大幅飙升。攒够 50 元现金后，玩家点击右下角珊瑚金「手艺升级」按钮提升手艺等级，快速拉高单次点击产出。'
    )
    pdf.write_image(*img('home'), max_h=96)

    pdf.write_h2('2.3 阶段三：完成目标任务、查看帝国光环与处理街头奇遇')
    pdf.write_body(
        '在点击经营的同时，玩家跟随底部操控台左侧的主线目标任务卡推进短期目标（例如「制作甜品 20 次」「手艺升至 5 级」「开设甜品摊」）。每条任务达成后左侧星章图标自动变为金杯，点击任务卡即可领走现金与心动玫瑰奖励，并无缝切入下一条目标。'
    )
    pdf.write_body(
        '顶舱下方左右两侧各设有一枚不遮挡中央立绘的轻巧珠光胶囊: 点击左侧「福利助手 v」展开快捷抽屉，内含「接急单」（立即派送相当于 240 秒被动收入的豪门急单）、「直播x2」（开启 10 分钟全场收益翻倍，最高叠加至 60 分钟）与「帝国光环」（点击左上角主角头像亦可直达），随时打开「商业帝国增益总览」弹窗核对当前赛季倍率、全门店光环、店员干劲、成本减免、暴击率与自动接单频率；右侧为带未读红点的「微聊」入口。'
    )
    pdf.write_image(*img('buffs'), max_h=92)
    pdf.write_body(
        '此外，每隔 45 至 75 秒，首页右侧会飞入一枚带翅膀信函贴纸的「奇遇!」气泡。玩家点击后弹出街头商业奇遇二选一弹窗（如探店达人路过、同行恶意挑衅、老主顾包场等），在方案一与方案二中任选其一即可当场结算大笔现金、心动玫瑰与爆单热度。'
    )
    pdf.write_image(*img('event'), max_h=92)

    pdf.write_h2('2.4 阶段四：漫游商业版图大地图、开设十家产业与切换店铺列表批量升级')
    pdf.write_body(
        '当玩家攒满 100 元现金后，点击底部第一栏「产业」打开名下产业页面（ShopMap）。页面默认进入主视图「商业版图」——铺满全屏的韩版漫画精细线稿 2D 落日江湾商业大地图（v11_map_base.jpg），六大商圈的开阔广场上按远近透视独立绘制并排布着 10 座韩漫 2D 等距地标建筑（v11_bldg_*.png），支持上下丝滑拖拽漫游与点选自动聚焦。点击河畔广场上的「甜品摊」并按下底部升级舱中的「新店开业」按钮，甜品摊即刻点亮营业并每秒自动产出被动现金。'
    )
    pdf.write_image(*img('shop_map'), max_h=96)
    pdf.write_body(
        '随着身价依次突破 1 万、10 万、100 万、1000 万、5000 万、1.5 亿、10 亿、40 亿与 180 亿，大地图上从老街河岸一路延伸至江湾金融区的「甜品店、咖啡馆、健身房、律所、改装车行、医美诊所、经纪公司、云顶酒店、晚星集团」共 10 座地标建筑逐一点亮。'
        '玩家可在顶栏右侧切换 [x1 / x10 / 质变] 档位一键连升门店等级: 每跨过 Lv.10 / 25 / 50 / 100 / 200 质变门槛，门店收益翻倍、解锁新招牌单品并获赠 2~15 朵心动玫瑰；升至 Lv.25 与 Lv.50 时更会激活该门店专属的永久跨店协同光环。'
        '点击顶栏左侧的次要视图标签「店铺列表」，可随时切换至宽幅门头插画卡片列表模式，直观对比全部 10 家产业的实时秒产、光环进度并批量升级。'
    )
    pdf.write_image(*img('shop_list'), max_h=96)

    pdf.write_h2('2.5 阶段五：邂逅九位商业合伙人、培养羁绊与解锁人物剧情卡片')
    pdf.write_body(
        '每当玩家首次开设甜品店、咖啡馆、健身房、律所、改装车行、医美诊所、经纪公司或晚星集团时，都会触发驻店商业合伙人邂逅事件（加上随主线章节推进的前未婚夫傅景辞，全篇共 9 位韩版漫画角色）。'
        '点击底部第二栏「伙伴」进入心动伙伴页（HeroPage），背景采用干净纯粹的暖奶油香槟柔光纯色设计，左侧完整展示当前合伙人从头顶到皮鞋的修长全身立绘与双金椭圆舞台光圈（可左右滑动或点底部 9 人圆形肖像栏切换），右侧为双金线高定雕花档案卡与「微聊」快捷按钮。'
    )
    pdf.write_body(
        '玩家使用积攒的心动玫瑰（不足时也可用现金礼盒兜底）点击底部按钮赠送玫瑰，将合伙人羁绊从 Lv.1「初遇」依次升至 Lv.2「心动」、Lv.3「暧昧」、Lv.4「告白」、Lv.5「专属约会」。'
        '每次升阶不仅将该合伙人关联门店的收益倍率最高放大至 3.8 倍、同步强化合伙人商业特权，还会依次点亮右侧「她看见的」页签下 2x3 记忆印章矩阵中的 6 张人物剧情卡片（EP.01 至 FINALE）。'
    )
    pdf.write_image(*img('hero_seen'), max_h=96)
    pdf.write_body(
        '点击档案框上的「她看不见的」页签，整页纯色背景同步切换为丝绒酒红暗夜主题，展示合伙人不为人知的暗面身份称号及暗面传记卡片（在羁绊 Lv.2、Lv.4 及番外解锁后开放阅读）。'
    )
    pdf.write_image(*img('hero_hidden'), max_h=96)
    pdf.write_body(
        '点击任意已解锁的记忆印章卡或暗面传记卡，即打开全屏韩版漫画人物卡片画卷阅读器（CGTheater），在柔焦场景、氛围粒子与角色立绘/定制插画构图中逐幕阅读分镜台词，并在特定分镜做出互动选择。'
    )
    pdf.write_image(*img('cg_theater'), max_h=96)

    pdf.write_h2('2.6 阶段六：招募二十位城区店员、激活团建倍率与收集拍立得卡')
    pdf.write_body(
        '每家产业门店开业后，还会同步开放隶属该门店的 A、B 两位精英店员岗位（10 家门店共 20 位店员，分布在六大城区）。'
        '玩家点击底部第三栏「店员」进入精英店员页（StaffSheet），切换顶部城区页签，消耗现金录用店员（首次录用立得 1 朵玫瑰）。同一城区的全部店员录满后，该城区所有门店收益立即乘以 2 倍团建加成！'
    )
    pdf.write_image(*img('staff_grid'), max_h=96)
    pdf.write_body(
        '持续升级店员跨越 Lv.10 / 25 / 50 / 100 时，店员从 1 星逐步晋升至最高 5 星（每升一星自身产出翻倍并奖励 2 朵玫瑰；全区店员满 5 星时城区团建倍率再乘 2 倍）。'
        '当店员达到 3 星（Lv.25）和 5 星（Lv.100）时，卡片右上角分别解锁「* 日常」与「* 私藏」卡签；点击即可弹出店员专属拍立得人物典藏卡（StaffPolaroidModal），查看韩版漫画工作瞬间/下班私藏插画与手写寄语。'
    )
    pdf.write_image(*img('staff_polaroid'), max_h=96)

    pdf.write_h2('2.7 阶段七：身价跨越章节门槛、商业身价交锋与阅读分篇剧情')
    pdf.write_body(
        '随着身价估值依次跨过 1 万、10 万、100 万、1000 万、1 亿、10 亿、100 亿与 1000 亿，第 1 章至第 8 章主线逆袭章节逐一开放，首页顶舱下方的鎏金章节牌自动切换为醒目的「迎战」提示。'
        '玩家点击该章节牌或进入底部第四栏「剧场」（StorySheet 逆袭剧场），可看到按鎏金齿孔电影票根样式排布的章节卡片。'
    )
    pdf.write_image(*img('story_tickets'), max_h=96)
    pdf.write_body(
        '点击新章节的「迎战开启」按钮后，首先弹出「第 N 章 . 身价交锋」弹窗（BusinessBattleModal），展示本章反派冲突起因及双方身价对比；'
        '点击「* 亮出底牌 . 当场打脸!」按钮，身价碾压进度条瞬间拉满并盖下获胜印章，发放 3~20 朵心动玫瑰。'
        '随后自动进入本章 4 篇分篇剧情阅读，并在第 4 篇阅读完毕后弹出「女主高光抉择」二选一弹窗，玩家亲手拍板反击方式并再获一笔心动玫瑰。'
    )
    pdf.write_image(*img('battle'), max_h=96)

    pdf.write_h2('2.8 阶段八：晚星手机私信朋友圈互动与千金衣橱高定换装')
    pdf.write_body(
        '当满足特定章节与合伙人羁绊条件时，首页右侧「微聊」图标亮起红底未读条数。玩家点开晚星手机（PhoneSheet），可在「私聊消息」中点开合伙人私信并二选一发送回复赢取玫瑰，也可在「商圈动态」中浏览名媛圈与合伙人互怼动态并点赞领玫瑰。'
    )
    pdf.write_image(*img('phone'), max_h=96)
    pdf.write_body(
        '同时，身价跨越 1 万、1000 万、10 亿与 1000 亿时依次自动解锁 4 套新服装（含初始装共 5 套）。玩家在底部第五栏「衣橱」（OutfitSheet）可浏览全部造型、查看总收益加成（每解锁一套全帝国永久 +8%，满图鉴 +32%），并随时换装切换主界面立绘、背景舞台与点单气泡品类。'
    )
    pdf.write_image(*img('wardrobe'), max_h=96)

    pdf.write_h2('2.9 阶段九：离线挂机结算与千亿首富通关后的跨城新赛季')
    pdf.write_body(
        '玩家中途退出小游戏超过 60 秒后重返，系统自动按离线时长（基础上限 2 小时，每推进一章 +45 分钟，最高 12 小时）与离线转化率计算挂机收益，弹出「离线营收报告」供玩家一键入账或翻倍领取。'
    )
    pdf.write_body(
        '当玩家身价达到 1000 亿（1e11）通关第 8 章「全城首富」后，逆袭剧场底部的「跨城商业扩张」卡片正式解锁。点击「上市扩城」确认后，save.season 加 1，完整保留全部合伙人羁绊、玫瑰、手机互动与已收集卡片图鉴，重置现金与门店开启海城新赛季，并永久享有 2.2^(season-1) 的全局赛季收益乘区与 15 朵玫瑰奖励。'
    )

    # ==================== 第三章：软件总体架构设计 ====================
    pdf.write_h1('三、软件总体架构设计')
    pdf.write_h2('3.1 总体分层架构与数据单向流')
    pdf.write_body(
        '本软件在工程上严格执行「纯函数数值模拟层（src/sim） + 静态配置表层（src/data） + 状态门面层（src/managers） + 响应式 PixiJS 视图层（src/scenes & src/ui）」的四层单向依赖架构。'
        'src/sim 下的全部文件不导入任何 PixiJS 或平台 API，所有玩家操作均表现为对纯 JSON 对象 GameSave 的确定性同步变换；GameState 作为唯一状态门面拦截 UI 操作、对比操作前后的身价门槛跨越（crossedThresholds），再通过 EventBus 通知对应视图局部刷新。'
    )
    pdf.write_code_block([
        '[用户触摸交互] -> Scene / Sheet / Button (UI 表现层)',
        '       | 调用门面方法: tap() / buyShop() / upgradeStaff() / investBond()',
        '       v',
        'GameState._mutate() (状态门面层, 记录 before = save.netWorth)',
        '       | 调用纯函数事务: A.tapInteractive() / A.buyShop() / A.upgradeStaff()',
        '       v',
        'src/sim/actions.ts + economy.ts + unlocks.ts (纯函数模拟层, 零 UI 依赖)',
        '       | 返回变更结果, GameState 计算 crossedThresholds(before, after)',
        '       v',
        'EventBus.emit(moneyChanged / shopChanged / chapterUnlocked / outfitUnlocked)',
        '       |',
        '       +--> SaveManager.flush() (10秒节流或关键节点立即持久化至 duanju_save)',
        '       +--> HomeScene / 打开中的二级 Sheet 局部更新文本与按钮可用态',
    ], '单向数据流与门槛事件分发链路')

    pdf.write_h2('3.2 源码工程目录与 66 个源码模块职责映射')
    pdf.write_table(
        ['源码子目录', '文件数', '代表源码文件', '核心工程职责'],
        [
            ['src/core', '11', 'Game.ts, SceneManager.ts, OverlayManager.ts, TweenManager.ts, ToastManager.ts, AudioManager.ts, PersistService.ts, CdnAssetService.ts', 'PixiJS WebGL 画布创建、750x1334 逻辑缩放、2.5x 字体分辨率、缓动动画池、全局提示胶囊、本地存储与 CDN 并发下载缓存'],
            ['src/config', '3', 'CloudConfig.ts, CdnConfig.ts, events.ts', '存储键名（duanju_save）、云同步白名单、CDN 根路径与全局强类型事件常量表 EV'],
            ['src/data', '8', 'balance.ts, world.ts, story.ts, staff.ts, quests.ts, heroScripts.ts, phoneMessages.ts, streetEvents.ts, art.ts', '全局经济常数、6 大商圈与 10 家门店、9 位合伙人、9 章主线、20 位店员、56 条任务、韩漫分镜剧本、私聊动态与 UI/地标美术路径字典'],
            ['src/sim', '6', 'save.ts, economy.ts, actions.ts, unlocks.ts, quests.ts, format.ts', '存档结构与坏档自愈、16 维帝国协同乘区计算、等比级数批量求值、交易状态机、解锁推导与中文大数格式化（万/亿/万亿/京）'],
            ['src/managers', '3', 'GameState.ts, SaveManager.ts, CloudSyncManager.ts', '每帧挂机结算（含自动接单）、连击窗口判定、跨门槛事件派发、10 秒定时存盘与云端存档时间戳合并'],
            ['src/services', '1', 'StoryService.ts', '串联章节身价交锋弹窗、分篇漫画剧情阅读与章末二选一高光抉择的异步编排服务'],
            ['src/scenes', '12', 'LoadingScene.ts, HomeScene.ts, home/LivingStage.ts, ShopMap.ts, HeroPage.ts, StaffSheet.ts, StorySheet.ts, OutfitSheet.ts, PhoneSheet.ts, CGTheater.ts, StaffPolaroidModal.ts, BusinessBattleModal.ts, HirePopup.ts', '启动加载页、三段式主界面与动态经营舞台、商业版图大地图及全部二级业务面板、韩漫阅读器与拍立得典藏弹窗'],
            ['src/ui', '9', 'theme.ts, Page.ts, Button.ts, IconButton.ts, BuyModeBar.ts, ProgressBar.ts, ScrollView.ts, Dialog.ts, EditorialIcons.ts', '@2x 九宫格切片装配器、二级页公共顶栏基类、丝缎按钮、破框贴纸图标按钮、惯性滚动容器与矢量星芒绘制'],
            ['src/utils & analytics', '13', 'assets.ts, analytics/*.ts', '纹理异步就绪回调队列、等比裁切适配（fitCover / showFigure）与轻量运行事件统计模块'],
        ],
        [26, 12, 54, CONTENT_W - 92],
        font_size=8.8,
    )

    pdf.write_h2('3.3 事件总线（EventBus）驱动的视图按需刷新机制')
    pdf.write_body(
        '为避免每帧全量重绘全部 UI 节点，src/config/events.ts 定义了精细化的事件通道，GameState._mutate() 在每次修改存档后精确比对数值变化并按需派发事件:'
    )
    pdf.write_code_block([
        'private _mutate<T>(fn: () => T): T {',
        '  const beforeWorth = this.save.netWorth;',
        '  const beforeMoney = this.save.money;',
        '  const beforeRoses = this.save.roses;',
        '  const res = fn();',
        '  const crossed = crossedThresholds(beforeWorth, this.save.netWorth);',
        '  if (this.save.money !== beforeMoney) EventBus.emit(EV.moneyChanged);',
        '  if (this.save.roses !== beforeRoses) EventBus.emit(EV.rosesChanged);',
        '  for (const a of crossed.areas) EventBus.emit(EV.areaUnlocked, a);',
        '  for (const o of crossed.outfits) EventBus.emit(EV.outfitUnlocked, o);',
        '  for (const ch of crossed.chapters) EventBus.emit(EV.chapterUnlocked, ch);',
        '  return res;',
        '}',
    ], 'src/managers/GameState.ts - _mutate 事务包装与跨门槛事件触发')

    pdf.write_h2('3.4 单舞台常驻与 OverlayManager 多层级面板调度')
    pdf.write_body(
        'Game.stage 根容器开启 sortableChildren = true，自底向上依次承载 SceneManager 主场景层（HomeScene 常驻）、OverlayManager 全屏二级页面与模态框层（zIndex 动态递增，其中 Dialog 为 80、HirePopup 为 110、StaffPolaroidModal 为 120、BusinessBattleModal 为 160、CGTheater 为 19500）以及 ToastManager 顶层轻提示层（zIndex = 30000）。'
        '所有继承自 Page 基类的二级面板（HeroPage、StorySheet、OutfitSheet、PhoneSheet）在构造时自动注册到 OverlayManager.container，平时 visible = false 不参与 GPU 渲染，调用 open() 时置顶并执行 0.2 秒渐显滑入动画。'
    )

    pdf.write_h2('3.5 帧循环（Ticker）与两级纹理异步加载管线')
    pdf.write_body(
        '全局共用 PixiJS 单一 Ticker 实例: GameState._update(dt) 负责调用 A.tick(save, dt, now) 累加每秒挂机收益与江叙白自动接单收益，并在距离上次写盘满 10 秒（AUTOSAVE_MS = 10000）时自动落盘；'
        'HomeScene._update(dt) 负责立绘正弦呼吸微动、点单气泡悬浮动画、顾客订单与街头奇遇倒计时以及 0.2 秒一次的顶栏文本刷新。'
    )

    # ==================== 第四章：各核心玩法与工程模块详细设计 ====================
    pdf.write_h1('四、各核心玩法与工程模块详细设计（对应源码实现）')

    # --- 4.1 ---
    pdf.write_h2('4.1 多维商业乘区耦合引擎设计（src/sim/economy.ts）')
    pdf.write_body(
        '区别于单一线性的放置游戏，本软件在 src/sim/economy.ts 中构建了名为 computeSynergies(save) 的 16 维商业乘区耦合引擎。'
        '它将「10 家门店的 Lv25/Lv50 老店协同光环」、「9 位商业合伙人的羁绊特权」、「20 位店员全录用奖励」、「5 套高定衣橱魅力加成」与「跨城赛季名望倍率」实时聚合为 EmpireSynergies 结构，供点击、门店、店员、急单、离线与狂热公式统一读取:'
    )
    pdf.write_code_block([
        'export function computeSynergies(save: GameSave): EmpireSynergies {',
        '  const syn = new Map<ShopId, number>();',
        '  for (const s of SHOPS) syn.set(s.id, shopSynergyVal(save, s));',
        '  const luyu = save.bonds.luyu ?? 0, jiang = save.bonds.jiangxubai ?? 0;',
        '  const guye = save.bonds.guye ?? 0, shenyan = save.bonds.shenyan ?? 0;',
        '  const qinye = save.bonds.qinye ?? 0, xu = save.bonds.xuzhiheng ?? 0;',
        '  const zhou = save.bonds.zhouyining ?? 0, huo = save.bonds.huotingchen ?? 0;',
        '  const fu = Math.max(0, effectiveBond(save, "fujingshen") - 1);',
        '  const outfitBonus = Math.max(0, unlockedOutfits(save.netWorth).length - 1) * BALANCE.outfitEmpireBonus;',
        '  const fameBonus = fu * 0.05;',
        '  const seasonMult = BALANCE.seasonBaseMult ** Math.max(0, (save.season ?? 1) - 1);',
        '  const tapMult = (1 + (syn.get("stall") ?? 0)) * (allStaffHired(save) ? STAFF_BALANCE.allHiredTapMult : 1);',
        '  const tapShare = BALANCE.tapIncomeShare + (syn.get("gym") ?? 0);',
        '  const allShopMult = 1 + (syn.get("dessert") ?? 0);',
        '  const staffMult = (1 + (syn.get("cafe") ?? 0)) * (1 + guye * 0.18);',
        '  const costDiscount = Math.min(0.45, (syn.get("law") ?? 0) + shenyan * 0.03);',
        '  const rushMult = (1 + (syn.get("garage") ?? 0)) * (1 + qinye * 0.22);',
        '  const offlineRate = Math.min(0.95, BALANCE.offlineRate + (syn.get("clinic") ?? 0) + xu * 0.04);',
        '  const offlineExtraSec = xu * 1800;',
        '  const feverBonus = (syn.get("agency") ?? 0) + zhou * 0.25;',
        '  const areaBonus = syn.get("hotel") ?? 0;',
        '  const critChance = Math.min(0.5, luyu * 0.07);',
        '  const autoTapPerSec = jiang * 0.35;',
        '  const empireMult = (1 + (syn.get("group") ?? 0)) * (1 + huo * 0.12) * (1 + outfitBonus + fameBonus) * seasonMult;',
        '  return { tapMult, tapShare, allShopMult, staffMult, costDiscount, rushMult, offlineRate,',
        '           offlineExtraSec, feverBonus, areaBonus, critChance, autoTapPerSec, outfitBonus, fameBonus, seasonMult, empireMult };',
        '}',
    ], 'src/sim/economy.ts - computeSynergies 多维乘区聚合实现')
    pdf.write_body(
        '设计要点: 为防止减免类与比例类属性溢出，开店升级总折扣 costDiscount 硬封顶为 45%（Math.min(0.45, ...)），离线转化率 offlineRate 硬封顶为 95%（Math.min(0.95, ...)），手艺暴击率 critChance 硬封顶为 50%。'
    )

    # --- 4.2 ---
    pdf.write_h2('4.2 手艺点击、连击窗口、顾客气泡与爆单能量槽设计（src/sim/actions.ts）')
    pdf.write_body(
        '手艺点击系统解决了传统放置游戏“中后期点击彻底沦为摆设”的痛点。在 tapValue(save, now, combo) 中，单次点击基础产出不仅包含随 skillLevel 与质变里程碑（[10, 25, 50, 100, 150, 200] 各翻 2 倍）增长的固定手艺值，还额外注入了「当前帝国每秒总被动收益 x tapShare（初始 4%，健身房 Lv50 提升至 5.8%）」的动态挂钩项:'
    )
    pdf.write_code_block([
        'export function skillValue(level: number): number {',
        '  return BALANCE.skillBaseValue * level * milestoneMultiplier(level, BALANCE.skillMilestones);',
        '}',
        'export function tapValue(save: GameSave, now: number, combo: boolean): number {',
        '  const syn = computeSynergies(save);',
        '  const raw = skillValue(save.skillLevel) * syn.empireMult + baseIncomePerSec(save) * syn.tapShare;',
        '  return raw * syn.tapMult * activeBoostMultiplier(save, now) * (combo ? BALANCE.comboMultiplier : 1);',
        '}',
    ], 'src/sim/economy.ts - 手艺点击动态挂钩公式')

    pdf.write_body(
        '在此基础上，点击交互包含三层即时正反馈机制:'
    )
    pdf.write_bullet('滑动时间窗连击（Combo）: GameState.tap() 维护最近 1000ms 内的点击时间戳队列 _tapTimes；当队列长度 >= 5（每秒点满 5 次）时，刷新 3 秒连击状态（_comboUntil = now + 3000），使点击收益直接 x2。')
    pdf.write_bullet('陆屿三倍甜品暴击（Crit）: tapInteractive() 生成随机数与 syn.critChance（陆屿每级羁绊 +7%）比对，命中时本次点击收益再 x3，UI 弹出 33px 描边金色暴击飘字。')
    pdf.write_bullet('顾客气泡与爆单狂热（Fever）: 普通点击每次增加 0.008 热度，交付前景顾客点单气泡（serveCustomerOrder）发放 2.5 倍点击 + 0.8 秒被动收益并一次性增加 0.10 热度。当 feverHeat >= 1 时清零热度并开启 8 秒爆单狂热，activeBoostMultiplier 乘算 (2.2 + feverBonus) 倍全局增速!')
    pdf.write_code_block([
        'export function tapInteractive(save: GameSave, now: number, combo: boolean, rand = Math.random()): InteractiveTapResult {',
        '  const syn = computeSynergies(save);',
        '  const crit = syn.critChance > 0 && rand < syn.critChance;',
        '  const base = tapValue(save, now, combo);',
        '  const amount = crit ? base * 3 : base;',
        '  earn(save, amount);',
        '  save.taps += 1;',
        '  let feverTriggered = false;',
        '  if (!isFeverActive(save, now)) {',
        '    save.feverHeat = Math.min(1, (save.feverHeat ?? 0) + BALANCE.feverPerTap);',
        '    if (save.feverHeat >= 1 - 1e-9) {',
        '      save.feverHeat = 0;',
        '      save.feverUntil = now + BALANCE.feverDurationSec * 1000;',
        '      feverTriggered = true;',
        '    }',
        '  }',
        '  return { amount, crit, feverTriggered };',
        '}',
    ], 'src/sim/actions.ts - 暴击判定与爆单能量槽状态跃迁')

    # --- 4.3 ---
    pdf.write_h2('4.3 六大商圈、十家产业梯度、几何求和与协同光环设计（src/data/world.ts）')
    pdf.write_body(
        '软件在 src/data/world.ts 中定义了跨越 6 大商圈的 10 家产业门店，身价门槛从 0 元平滑覆盖至 180 亿。每家产业的完整数值参数、五档招牌单品与 Lv25/Lv50 老店协同光环如下表所示（与源码 SHOPS 常量严格一致）:'
    )
    pdf.write_table(
        ['ID / 店名', '所属商圈', '解锁身价', '基础价', '基础秒产', 'Lv25 / Lv50 全局协同光环效果'],
        [
            ['stall 甜品摊', '老街夜市', '0', '100', '1/s', '手艺点击收益 +25% / +60%'],
            ['dessert 甜品店', '老街夜市', '1万', '3,200', '10/s', '全门店基础收益 +15% / +35%'],
            ['cafe 咖啡馆', '大学城', '10万', '4.5万', '70/s', '全员店员产出 +25% / +60%'],
            ['gym 健身房', 'CBD', '100万', '55万', '480/s', '点击转化秒产比例 +0.8pt / +1.8pt'],
            ['law 律所(合作)', 'CBD', '1000万', '650万', '3,600/s', '全门店升级费用减免 -8% / -18%'],
            ['garage 改装车行', '江景区', '5000万', '3800万', '1.5万/s', '急单与街头奇遇收益 +30% / +70%'],
            ['clinic 医美诊所', '江景区', '1.5亿', '1.3亿', '4.5万/s', '离线收益转化率 +12pt / +25pt'],
            ['agency 经纪公司', '娱乐区', '10亿', '9亿', '26万/s', '爆单与直播倍率 +30% / +75%'],
            ['hotel 云顶酒店', '金融区', '40亿', '32亿', '110万/s', '城区团建加成增幅 +20% / +50%'],
            ['group 晚星集团', '金融区', '180亿', '120亿', '550万/s', '全帝国最终乘区 +30% / +80%'],
        ],
        [28, 20, 18, 18, 18, CONTENT_W - 102],
        font_size=8.6,
    )
    pdf.write_body(
        '批量升级花费与最大可购级数采用闭合等比数列公式（公比 g = BALANCE.shopCostGrowth = 1.15）实现 O(1) 精确计算，避免循环累加浮点误差与性能损耗；当跨越 [10, 25, 50, 100, 200] 里程碑时，buyShop 自动按 milestoneRoses ([2, 4, 6, 10, 15]) 发放玫瑰奖励并在首次开店（level === 0）时自动结识对应驻店合伙人:'
    )
    pdf.write_code_block([
        'export function shopUpgradeCostN(id: ShopId, level: number, count: number): number {',
        '  if (count <= 0) return 0;',
        '  const g = BALANCE.shopCostGrowth;',
        '  return shopUpgradeCost(id, level) * (g ** count - 1) / (g - 1);',
        '}',
        'export function maxAffordableLevels(id: ShopId, level: number, money: number, discount = 0): number {',
        '  const first = shopUpgradeCost(id, level) * (1 - discount);',
        '  if (money < first) return 0;',
        '  const g = BALANCE.shopCostGrowth;',
        '  return Math.max(1, Math.floor(Math.log(money * (g - 1) / first + 1) / Math.log(g)));',
        '}',
    ], 'src/sim/economy.ts - 等比级数批量花费与对数反解可买级数')

    # --- 4.4 ---
    pdf.write_h2('4.4 韩漫 2D 商业版图漫游视口、独立地标排布与双视图设计（src/scenes/home/ShopMap.ts）')
    pdf.write_body(
        'ShopMap 组件在同一容器内管理默认主视图 _mapWrap（「商业版图」全景可漫游大地图）与可切换次要视图 _listWrap（「店铺列表」宽幅门头插画卡片列表），由 _mode ("map" | "list") 控制显隐，打开时默认进入主视图 _mode = "map" 并自动聚焦至当前待开业或最高阶产业。'
    )
    pdf.write_body(
        '在「商业版图」主视图中，底图采用 900x2000 全出血韩漫精细线稿 2D 落日江湾画卷（GRAND_CITY_MAP = "subpkg_images/v11_map_base.jpg"，高宽比 MAP_ASPECT = 2000 / 900），支持纵向拖拽与惯性衰减漫游（_scrollY 严格钳制在 [min(0, H - _worldH), 0] 闭区间，确保上下全出血零空白露底）。'
        '10 座独立绘制的韩漫 2D 等距地标建筑（SHOP_BUILDINGS: v11_bldg_stall.png ~ v11_bldg_group.png）按 SHOP_MAP_SPOTS 中的归一化广场坐标 ny 由远及近排序（画家算法）挂载至 _landmarksLayer，未达标建筑自动应用灰度滤镜，当前选中地标绘制香槟金椭圆光托并在底部悬浮升级舱（_mapBottomDock）实时展示地标缩略图、秒产与升级按钮:'
    )
    pdf.write_code_block([
        'private _layoutMapWorld(): void {',
        '  const W = Game.logicWidth, H = Game.logicHeight;',
        '  this._worldH = Math.round(W * MAP_ASPECT);',
        '  this._mapSprite.texture = gameTexture(GRAND_CITY_MAP);',
        '  this._mapSprite.width = W; this._mapSprite.height = this._worldH;',
        '  this._maxScrollY = 0;',
        '  this._minScrollY = Math.min(0, H - this._worldH);',
        '  this._scrollY = Math.max(this._minScrollY, Math.min(this._maxScrollY, this._scrollY));',
        '  this._mapWorld.y = this._scrollY;',
        '}',
        'private _focusOnShop(id: ShopId, animate = true): void {',
        '  const spot = SHOP_MAP_SPOTS[id];',
        '  const visTop = this._topOverlayBottom + 20;',
        '  const visBot = Game.logicHeight - Game.safeBottom - DOCK_H - 24;',
        '  const visCenterY = (visTop + visBot) * 0.53;',
        '  const bldgCenterInWorld = spot.ny * this._worldH - spot.size * 0.35;',
        '  const targetY = Math.max(this._minScrollY, Math.min(this._maxScrollY, Math.round(visCenterY - bldgCenterInWorld)));',
        '  this._scrollY = targetY;',
        '  if (animate) TweenManager.to({ target: this._mapWorld, props: { y: targetY }, duration: 0.32, ease: Ease.easeOutQuad });',
        '  else this._mapWorld.y = targetY;',
        '}',
    ], 'src/scenes/home/ShopMap.ts - 韩漫 2D 商业版图视口钳制与地标自动聚焦算法')

    # --- 4.5 ---
    pdf.write_h2('4.5 九位商业合伙人、五阶玫瑰羁绊、章节门禁与双面卡片设计（HeroPage.ts）')
    pdf.write_body(
        '本软件共设计 9 位韩版漫画商业合伙人（8 位关联产业门店 + 1 位随主线章节推进解锁），其完整配置与商业特权对应 src/data/story.ts 中的 HEROES 数组:'
    )
    pdf.write_table(
        ['角色 ID / 姓名', '公开头衔', '暗面称号 (darkSide)', '关联门店', '专属商业特权与每阶成长系数'],
        [
            ['luyu 陆屿', '隐藏继承人', '盛家的笑面阎王', '甜品店', '偏爱暴击: 手艺 3 倍暴击率 +7%/级 (Lv3/4/5 需第 4/6/7 章)'],
            ['jiangxubai 江叙白', '温柔学弟', '白切黑的黑客 K', '咖啡馆', 'K的自动脚本: 后台自动点击出单 +0.35次/秒/级'],
            ['guye 顾野', '阳光教练', '地下拳台的野狼', '健身房', '热血团魂: 全员店员每秒产出额外 +18%/级'],
            ['shenyan 沈砚', '冷面律师', '父亲没打赢的官司', '律所', '法务护航: 全门店开店与升级费用额外减免 -3%/级'],
            ['qinye 秦朔', '痞帅赛车手', '退役车神零号', '改装车行', '零号极速: 接急单与街头奇遇现金收益 +22%/级'],
            ['xuzhiheng 许知衡', '温柔医生', '没有温度的手术刀', '医美诊所', '安心守护: 离线转化率 +4%/级，离线上限 +30分钟/级'],
            ['zhouyining 周以宁', '落难顶流', '宁折不弯', '经纪公司', '顶流效应: 爆单狂热与直播双倍倍率额外 +25%/级'],
            ['huotingchen 霍霆琛', '宿敌霸总', '冷血的收购机器', '晚星集团', '资本杠杆: 全商业帝国最终乘区额外 +12%/级'],
            ['fujingshen 傅景辞', '前未婚夫', '迟到的真心', '主线推进', '全城热议: 随主线第 0/3/5/6 章升阶，全收益 +5%/阶'],
        ],
        [30, 22, 32, 18, CONTENT_W - 102],
        font_size=8.6,
    )
    pdf.write_body(
        '五阶好感羁绊的消耗与门店收益倍率定义在 BOND_LEVELS 常量表中，采用「优先扣减心动玫瑰、玫瑰不足时允许按关联门店基础价乘以礼盒系数直购」的双轨支付策略（investBond）:'
    )
    pdf.write_table(
        ['羁绊阶数', '关系阶段名称', '升级所需心动玫瑰 (roseCost)', '现金礼盒兜底系数 (fallbackCashFactor)', '对关联门店的收益倍率 (incomeMult)'],
        [
            ['Lv.1', '初遇', '开店自动解锁 (0 朵)', '0', 'x1.0'],
            ['Lv.2', '心动', '6 朵', '关联门店 baseCost x 18', 'x1.4'],
            ['Lv.3', '暧昧', '14 朵', '关联门店 baseCost x 120', 'x1.9'],
            ['Lv.4', '告白', '26 朵', '关联门店 baseCost x 800', 'x2.6'],
            ['Lv.5', '专属约会', '42 朵', '关联门店 baseCost x 4000', 'x3.8'],
        ],
        [20, 28, 42, 46, CONTENT_W - 136],
        font_size=9.0,
    )
    pdf.write_body(
        '羁绊升级门禁与卡片解锁判定在 src/sim/unlocks.ts 与 actions.ts 中通过双轨规则实现: 门店合伙人由 save.bonds[id] 记录等级，若配置了 chapterGate（如陆屿 [4, 6, 7]）则在升 Lv3/4/5 前校验当前章节进度防止提前剧透；主线角色傅景辞不关联门店（shop: null），由 chapterBondLevel 按主线到达章节自动推导有效羁绊等级:'
    )
    pdf.write_code_block([
        'export function bondBlockReason(save: GameSave, heroId: HeroId): string | null {',
        '  const hero = heroById(heroId);',
        '  const level = save.bonds[heroId] ?? 0;',
        '  if (!hero.shop) return "随主线剧情推进";',
        '  if (level <= 0) return "开店后相遇";',
        '  if (level >= MAX_BOND) return "羁绊已满";',
        '  if (hero.chapterGate && level >= 2) {',
        '    const need = hero.chapterGate[level - 2];',
        '    if (currentChapter(save.netWorth) < need) return `主线第 ${need} 章后解锁`;',
        '  }',
        '  return null;',
        '}',
        'export function investBond(save: GameSave, heroId: HeroId): boolean {',
        '  if (bondBlockReason(save, heroId)) return false;',
        '  const level = save.bonds[heroId] ?? 0;',
        '  const roseNeed = bondRoseCost(heroId, level);',
        '  if (save.roses >= roseNeed) {',
        '    save.roses -= roseNeed; save.bonds[heroId] = Math.min(MAX_BOND, level + 1); return true;',
        '  }',
        '  const cashCost = bondUpgradeCost(heroId, level);',
        '  if (save.money < cashCost) return false;',
        '  save.money -= cashCost; save.bonds[heroId] = Math.min(MAX_BOND, level + 1); return true;',
        '}',
    ], 'src/sim/unlocks.ts & actions.ts - 章节门禁校验与玫瑰/礼盒双轨升阶')
    pdf.write_body(
        '在 HeroPage.ts 界面实现上，整页采用纯净高级的暖奶油柔光纯色背景（drawLuxuryPageBg），左侧列（FIG_COL = 334）完整展示合伙人全身立绘与双金椭圆光圈，右侧信息区封装于 makeCouturePlaque 双金线雕花面板中: 「她看见的」页签将 5 段羁绊卡片与结局/番外卡渲染为 2 列 x 3 行的高定记忆印章卡（makeMemoryStamp，支持 locked / fresh / open / gold 四态切片），底部汇总解锁进度；切换「她看不见的」页签时调用 this.setDarkTheme(true)，整页纯色背景、顶栏返回钮与卷宗卡片同步切换为暗夜丝绒酒红配色。'
    )

    # --- 4.6 ---
    pdf.write_h2('4.6 韩版漫画人物卡片画卷阅读器与分镜脚本状态机设计（CGTheater.ts）')
    pdf.write_body(
        'CGTheaterClass（src/scenes/home/CGTheater.ts）是驱动全部人物剧情卡片与分篇漫画故事的核心交互阅读器。其输入为 src/data/heroScripts.ts 中的结构化分镜脚本 HeroEpisodeScript（包含 mood 氛围基调、location 场景地点、suwanOutfit 女主当幕穿搭及 beats 分镜数组）。'
    )
    pdf.write_body(
        '阅读器在渲染每一幕（_renderBeat）时支持两种视觉合成模式: 若定制全屏漫画插画 subpkg_images/cg_<id>.jpg 已就绪，则等比铺满全屏并施加缓慢呼吸推镜；否则自动调取对应阶段的柔焦远景、角色印象色光晕（hero.accentColor）、飘落的樱花/金色星尘粒子（_particlesLayer）以及女主与合伙人双立绘，根据当前说话人（narrator / suwan / hero）实时高亮发言方立绘、压暗聆听方立绘，遇到带选项的分镜则挂起 _choosing = true 弹出互动分支按钮，直至全部幕次读完后写入已读集合:'
    )
    pdf.write_code_block([
        'private _advance(): void {',
        '  if (!this._script || this._choosing) return;',
        '  const nextIdx = this._beatIdx + 1;',
        '  if (nextIdx >= this._script.beats.length) { this._finish("ended"); return; }',
        '  AudioManager.play("ui_click");',
        '  this._beatIdx = nextIdx;',
        '  this._renderBeat();',
        '}',
        'private _tick(): void {',
        '  const dt = Game.ticker.deltaMS / 1000;',
        '  this._time += dt;',
        '  const zoom = 1 + Math.sin(this._time * 0.45) * 0.018;',
        '  this._stage.scale.set(zoom);',
        '  for (const p of this._particles) {',
        '    p.g.x += p.vx * dt + Math.sin(this._time * 1.6 + p.phase) * 0.25;',
        '    p.g.y += p.vy * dt;',
        '    if (p.g.y > Game.logicHeight + 20) { p.g.y = -20; p.g.x = Math.random() * Game.logicWidth; }',
        '  }',
        '}',
    ], 'src/scenes/home/CGTheater.ts - 分镜推进状态机与镜头呼吸粒子循环')

    # --- 4.7 ---
    pdf.write_h2('4.7 二十位精英店员、A/B 双槽成长、城区团建与拍立得卡设计（StaffSheet.ts）')
    pdf.write_body(
        '10 家门店每店配备 A 槽（主力岗）与 B 槽（精英岗）共 20 位店员（src/data/staff.ts）。店员的价格与产出全部锚定其所属门店的 baseCost 与 baseIncome，从而保证任意时期新开门店的店员性价比恒定:'
    )
    pdf.write_bullet('录用价格（Lv.0 -> Lv.1）: A 槽为 shop.baseCost x 2.5，B 槽为 shop.baseCost x 6.0；首次录用立即奖励 1 朵心动玫瑰并弹出 HirePopup 庆典。')
    pdf.write_bullet('升级价格（Lv.n -> Lv.n+1）: A 槽为 shop.baseCost x 0.55 x 1.15^(n-1)，B 槽为 shop.baseCost x 0.85 x 1.15^(n-1)。')
    pdf.write_bullet('星级与产出公式: 等级达到 [10, 25, 50, 100] 时依次晋升 2 星至 5 星（每次升星奖励 2 朵玫瑰），单人基础秒产 = shop.baseIncome x (A槽0.45 | B槽0.60) x level x 2^(star - 1)。')
    pdf.write_bullet('城区团建与全员满编加成: 同一城区内全部店员均已录用（level > 0）时，该城区所有门店收益 x2；全区店员均达 5 星（Lv.100）时再 x2（基础 x4，若云顶酒店达 Lv.50 放大 50% 后高达 x6）！全篇 20 位店员全部录用后，额外激活手艺点击 x2（allHiredTapMult）。')
    pdf.write_table(
        ['城区', '所属门店', 'A 槽店员 (ID / 姓名 / 职位)', 'B 槽店员 (ID / 姓名 / 职位)', '解锁拍立得卡数'],
        [
            ['老街夜市', '甜品摊', 'abei 阿北 (外卖小哥)', 'linqi 林栖 (街头吉他手)', '4 张 (*3工作 / *5私藏)'],
            ['老街夜市', '甜品店', 'xiaoman 小满 (烘焙学徒)', 'wenyan 温禾 (裱花师)', '4 张 (*3工作 / *5私藏)'],
            ['大学城', '咖啡馆', 'liang 黎昂 (混血咖啡师)', 'xiaxiao 夏骁 (篮球队长)', '4 张 (*3工作 / *5私藏)'],
            ['CBD', '健身房', 'baiyu 安澜 (瑜伽老师)', 'chenlie 陈烈 (拳击陪练)', '4 张 (*3工作 / *5私藏)'],
            ['CBD', '律所(合作)', 'songzhiyi 宋书意 (律师助理)', 'jihuai 季淮 (首席秘书)', '4 张 (*3工作 / *5私藏)'],
            ['江景区', '改装车行', 'luochuan 罗川 (机修技师)', 'ouyangche 欧阳澈 (涂装设计师)', '4 张 (*3工作 / *5私藏)'],
            ['江景区', '医美诊所', 'sumu 程朗 (护士小哥)', 'jitang 裴棠 (形象顾问)', '4 张 (*3工作 / *5私藏)'],
            ['娱乐区', '经纪公司', 'nanxing 南星 (练习生)', 'xiaomo 凌陌 (超模)', '4 张 (*3工作 / *5私藏)'],
            ['金融区', '云顶酒店', 'qiye 祁曜 (首席调酒师)', 'wensheng 迟笙 (驻场钢琴师)', '4 张 (*3工作 / *5私藏)'],
            ['金融区', '晚星集团', 'allen 艾伦 (私人管家)', 'lifeng 厉锋 (首席保镖)', '4 张 (*3工作 / *5私藏)'],
        ],
        [20, 22, 46, 48, CONTENT_W - 136],
        font_size=8.6,
    )
    pdf.write_code_block([
        'export function staffUpgradeCostN(id: StaffId, level: number, count: number): number {',
        '  if (count <= 0) return 0;',
        '  let total = 0, cur = level, rem = count;',
        '  if (cur === 0) { total += staffHireCost(id); cur = 1; rem -= 1; }',
        '  if (rem > 0) {',
        '    const g = STAFF_BALANCE.costGrowth;',
        '    total += staffUpgradeCost(id, cur) * (g ** rem - 1) / (g - 1);',
        '  }',
        '  return total;',
        '}',
        'export function areaStaffMultiplier(save: GameSave, area: AreaId): number {',
        '  const ids = staffInArea(area);',
        '  if (!ids.length || !ids.every((id) => (save.staff[id] ?? 0) > 0)) return 1;',
        '  const maxed = ids.every((id) => staffStar(save.staff[id] ?? 0) >= MAX_STAR);',
        '  const hotelLv = save.shops.hotel ?? 0;',
        '  const hotelBonus = hotelLv >= 50 ? shopById("hotel").synergy.lv50 : hotelLv >= 25 ? shopById("hotel").synergy.lv25 : 0;',
        '  const base = STAFF_BALANCE.areaHiredMult * (maxed ? STAFF_BALANCE.areaMaxStarMult : 1);',
        '  return base * (1 + hotelBonus);',
        '}',
    ], 'src/sim/economy.ts - 店员录用与连升分段计价及城区团建计算')

    # --- 4.8 ---
    pdf.write_h2('4.8 逆袭剧场九章票根、商业身价交锋与章末高光抉择设计（BusinessBattleModal.ts）')
    pdf.write_body(
        '主线共设序章与第 1~8 章，每章跨越一个数量级身价门槛，完整章节配置如下表（对应 src/data/story.ts 中的 CHAPTERS）:'
    )
    pdf.write_table(
        ['章节', '章节标题', '解锁身价门槛', '本章商业交锋对手 (rival)', '交锋获胜奖励', '分篇结构'],
        [
            ['序章', '退婚宴', '0 (开局自动)', '无（开篇背景引入）', '-', 'ch00 (1篇)'],
            ['第1章', '摆摊第一天', '1万 (1e4)', '王姐（老街恶霸地头蛇）', '玫瑰 +3', '第1篇~第4篇'],
            ['第2章', '全款拿下', '10万 (1e5)', '周房东（势利眼二房东）', '玫瑰 +4', '第1篇~第4篇'],
            ['第3章', '黑卡砸场', '100万 (1e6)', '傅景辞 & 苏婉柔', '玫瑰 +5', '第1篇~第4篇'],
            ['第4章', '恶人先告状', '1000万 (1e7)', '苏氏食品法务部', '玫瑰 +6', '第1篇~第4篇'],
            ['第5章', '千万晚宴', '1亿 (1e8)', '苏家养父母', '玫瑰 +8', '第1篇~第4篇'],
            ['第6章', '跪求注资', '10亿 (1e9)', '苏卫国（苏氏董事长）', '玫瑰 +10', '第1篇~第4篇'],
            ['第7章', '恭迎大小姐', '100亿 (1e10)', '苏婉柔（冒充首富外孙女）', '玫瑰 +12', '第1篇~第4篇'],
            ['第8章', '全城首富', '1000亿 (1e11)', '旧日豪门全员', '玫瑰 +20', '第1篇~第4篇'],
        ],
        [16, 26, 26, 42, 24, CONTENT_W - 134],
        font_size=8.8,
    )
    pdf.write_body(
        'StoryService.playChapterFlow(ch, startIdx) 将单章体验编排为严谨的三段式异步流水线: '
        '(1) 调用 BusinessBattleModal.showBattle(ch) 完成身价碾压交锋并发放宿敌玫瑰；'
        '(2) 按序遍历本章分篇列表唤起剧情阅读器（终章第 8 章末尾自动通过 finaleHero(save) 选取当前羁绊最高合伙人的专属结局篇追加在队尾）；'
        '(3) 本章读完后调用 BusinessBattleModal.showClimax(ch.id) 弹出章末二选一高光抉择弹窗（CHAPTER_CLIMAXES 覆盖第 1~8 章，分别奖励 2/3/4/5/6/8/10/15 朵玫瑰）:'
    )
    pdf.write_code_block([
        'export function clearChapterBattle(save: GameSave, chapterId: number): number {',
        '  if (save.clearedBattles.includes(chapterId)) return 0;',
        '  const ch = CHAPTERS.find((c) => c.id === chapterId);',
        '  if (!ch || save.netWorth < ch.unlockNetWorth) return 0;',
        '  save.clearedBattles.push(chapterId);',
        '  const roses = ch.rival?.roseReward ?? 0;',
        '  addRoses(save, roses);',
        '  return roses;',
        '}',
        'export function claimChapterClimax(save: GameSave, chapterId: number, choice: "A" | "B"): number {',
        '  if (save.claimedClimaxes.includes(chapterId)) return 0;',
        '  const def = CHAPTER_CLIMAXES.get(chapterId);',
        '  if (!def) return 0;',
        '  save.claimedClimaxes.push(chapterId);',
        '  const roses = choice === "A" ? def.choiceA.roses : def.choiceB.roses;',
        '  addRoses(save, roses);',
        '  return roses;',
        '}',
    ], 'src/sim/actions.ts - 章节商业交锋结算与章末二选一高光领奖')

    # --- 4.9 ---
    pdf.write_h2('4.9 晚星手机私聊分支状态机与商圈动态交互设计（src/scenes/home/PhoneSheet.ts）')
    pdf.write_body(
        '晚星手机模块的数据源位于 src/data/phoneMessages.ts，包含 CHAT_THREADS（合伙人私聊会话）与 MOMENT_POSTS（商圈朋友圈动态）两张静态表。'
        '每条私聊会话配置双条件门禁: minChapter（最低主线章节）与 minBond（对应合伙人最低羁绊等级），由 isChatUnlocked(save, chat) 纯函数实时判定是否开放。'
        '未读会话在列表中置顶并以樱粉雕花牌高亮显示；点入会话详情后，玩家从两项回复中选择分支 idx (0 | 1)，A.replyChat 将选项持久化并发放玫瑰；朋友圈点赞由 A.likeMoment 完成幂等校验与发奖:'
    )
    pdf.write_code_block([
        'export function replyChat(save: GameSave, threadId: string, optionIdx: 0 | 1): number {',
        '  if (save.repliedChats[threadId] !== undefined) return 0;',
        '  const thread = CHAT_THREADS.find((c) => c.id === threadId);',
        '  if (!thread || !isChatUnlocked(save, thread)) return 0;',
        '  save.repliedChats[threadId] = optionIdx;',
        '  const roses = thread.replies[optionIdx].roses;',
        '  addRoses(save, roses);',
        '  return roses;',
        '}',
        'export function likeMoment(save: GameSave, postId: string): number {',
        '  if (save.likedMoments.includes(postId)) return 0;',
        '  const post = MOMENT_POSTS.find((m) => m.id === postId);',
        '  if (!post || currentChapter(save.netWorth) < post.minChapter) return 0;',
        '  save.likedMoments.push(postId);',
        '  addRoses(save, 1);',
        '  return 1;',
        '}',
    ], 'src/sim/actions.ts - 私聊分支选择持久化与商圈动态点赞结算')

    # --- 4.10 ---
    pdf.write_h2('4.10 千金衣橱五套高定造型、九阶女王头衔与跨城转生设计（OutfitSheet.ts）')
    pdf.write_body(
        '主角苏晚的外观成长与身价头衔严格绑定身价数量级，5 套韩版漫画高定造型（OUTFITS）与 9 阶身份头衔（QUEEN_TITLES）配置如下:'
    )
    pdf.write_table(
        ['造型 ID', '高定造型名称', '解锁身价', '配套主界面背景舞台', '配套吧台名称', '对应顾客点单气泡品类'],
        [
            ['tee', '白 T 恤 + 帆布围裙', '0', '雨后夜市', '外婆的木推车', '桂花糕 / 星星酥 / 热豆浆'],
            ['shirt', '白衬衫店员装', '1万', '晚星甜品首店', '法式甜品展示柜', '草莓拿破仑 / 星空慕斯 / 猫咪拿铁'],
            ['tweed', '小香风名媛外套', '1000万', '落地窗总裁办', '品牌主理人办公台', '加盟合约 / 非遗礼盒单 / 品牌联名案'],
            ['suit', '高定雪白西装', '10亿', '晚星大厦顶楼', '董事长战略决策台', '地产收购书 / 顶流代言约 / 集团注资单'],
            ['gown', '星河藏青高定礼服', '1000亿', '首富发布会盛典', '晚星盛典主礼台', '盛氏遗产交接 / 跨国敲钟席 / 慈善主宾席'],
        ],
        [16, 34, 18, 28, 30, CONTENT_W - 126],
        font_size=8.6,
    )
    pdf.write_body(
        '9 阶女王头衔随身价自动晋升: 0 元「夜市甜品摊主」 -> 1 万「晚星人气店长」 -> 10 万「连锁品牌主理人」 -> 100 万「商圈新锐投资人」 -> 1000 万「打脸维权女总裁」 -> 1 亿「亿万慈善企业家」 -> 10 亿「百亿商界猎手」 -> 100 亿「盛家真千金掌门」 -> 1000 亿「云城首富女皇」。'
        '达成 1000 亿后执行 prestigeSeason(save, now) 跨城转生时，代码精确重置当城经营字段而完整保留收集类资产:'
    )
    pdf.write_code_block([
        'export function prestigeSeason(save: GameSave, now: number): boolean {',
        '  if (!canPrestigeSeason(save)) return false;',
        '  save.season = (save.season ?? 1) + 1;',
        '  save.money = 0; save.netWorth = 0; save.skillLevel = 1;',
        '  save.shops = {}; save.staff = {};',
        '  save.outfit = "tee"; save.questIndex = 0;',
        '  save.feverHeat = 0; save.feverUntil = 0; save.boostUntil = 0;',
        '  save.clearedBattles = []; save.claimedClimaxes = [];',
        '  save.lastActiveAt = now;',
        '  addRoses(save, 15);',
        '  return true;',
        '}',
    ], 'src/sim/actions.ts - 跨城新赛季重置与保留边界实现')

    # --- 4.11 ---
    pdf.write_h2('4.11 56 条引导任务与无限动态目标生成器、奇遇、急单与离线结算设计（quests.ts）')
    pdf.write_body(
        '主线任务引擎（src/sim/quests.ts）支持 10 种目标谓词类型（taps 累计点击、skill 手艺等级、shop 指定门店等级、staffCount 录用总人数、staffStar 最高店员星级、areaStaff 录满指定城区、bond 指定合伙人羁绊、netWorth 身价估值、chapterWatched 完成指定章节、liveBoost 开启直播次数）。'
        '当前 56 条手排任务（QUESTS）全部领完后，buildEndlessQuest(index) 自动按 (index - 56) % 3 轮换生成无限递增的门店扩建、手艺精修与估值翻倍目标，保证后期永不断档:'
    )
    pdf.write_code_block([
        'function buildEndlessQuest(index: number): QuestDef {',
        '  const extra = index - QUESTS.length;',
        '  const kindIdx = extra % 3;',
        '  const tier = Math.floor(extra / 3) + 1;',
        '  if (kindIdx === 0) {',
        '    const shop = SHOPS[(extra * 3) % SHOPS.length];',
        '    const targetLv = 50 + tier * 25;',
        '    return { title: `将${shop.name}扩建至 Lv.${targetLv}`,',
        '             goal: { kind: "shop", shop: shop.id, level: targetLv },',
        '             rewardSec: 420, minReward: 1e10 * tier, roses: 5 };',
        '  }',
        '  if (kindIdx === 1) {',
        '    const targetSkill = 60 + tier * 15;',
        '    return { title: `主理人手艺精修至 Lv.${targetSkill}`,',
        '             goal: { kind: "skill", level: targetSkill },',
        '             rewardSec: 420, minReward: 1e10 * tier, roses: 5 };',
        '  }',
        '  return { title: "商业帝国估值再翻倍",',
        '           goal: { kind: "netWorth", amount: 1e11 * (2 ** tier) },',
        '           rewardSec: 500, minReward: 2e10 * tier, roses: 8 };',
        '}',
    ], 'src/sim/quests.ts - 无限动态帝国目标生成器')
    pdf.write_body(
        '随机街头商业奇遇定义于 src/data/streetEvents.ts（共 6 类核心商业冲突事件，按 minChapter 随主线推进解锁，每隔 45~75 秒抽取触发），二选一收益参数如下表:'
    )
    pdf.write_table(
        ['事件 ID / 标题', '最低章节', '方案一（收益秒数 / 保底 / 玫瑰 / 热度）', '方案二（收益秒数 / 保底 / 玫瑰 / 热度）'],
        [
            ['blogger_visit 百万美食博主探店', '序章', '开炉请全场试吃 (65s / ¥450 / +2朵 / +60%热度)', '限量印章礼盒预售 (95s / ¥650 / +1朵 / +30%热度)'],
            ['fake_review 恶意水军刷差评', '第1章', '公开监控与进口报关单 (85s / ¥2500 / +3朵 / +50%)', '发律师函十倍索赔 (110s / ¥3500 / +2朵 / +35%)'],
            ['mystery_vip 神秘黑卡匿名包场', '第1章', '接单附赠手写祝福卡 (90s / ¥3000 / +4朵 / +40%)', '联名公益双倍加赠 (75s / ¥2500 / +3朵 / +100%)'],
            ['poach_staff 对手高薪挖角店员', '第2章', '当场宣布全员分红激励 (80s / ¥1.5万 / +3朵 / +75%)', '反手收购对手旺铺信息 (120s / ¥2.2万 / +2朵 / +30%)'],
            ['ex_fiance_queue 前未婚夫雨中排队', '第3章', '照常收钱加收包装费 (100s / ¥8万 / +3朵 / +40%)', '挂售罄牌送给前排顾客 (75s / ¥6万 / +4朵 / +80%)'],
            ['magazine_cover 时尚商界封面邀约', '第4章', '穿自家高定带火全产业 (125s / ¥80万 / +5朵 / +100%)', '携精英团队拍群像大片 (105s / ¥60万 / +6朵 / +60%)'],
        ],
        [44, 16, 55, CONTENT_W - 115],
        font_size=8.4,
    )
    pdf.write_body(
        '离线挂机收益与豪门急单计算规则如下: 急单每日上限 20 次（rushOrderDailyCap = 20，跨自然日按 YYYY-M-D 键自动归零），每次冷却 180 秒，单笔发放 max(1000, baseIncomePerSec x 240) x rushMult；'
        '离线时长上限 offlineCapSec = min(12小时, 2小时 + 当前章节数 x 45分钟 + 许知衡羁绊等级 x 30分钟)，离线收益 = baseIncomePerSec x 有效离线秒数 x offlineRate（基础 50%，医美诊所与许知衡加成最高至 95%）。'
    )

    # --- 4.12 ---
    pdf.write_h2('4.12 @2x 九宫格自适应缩放与 2.5x 视网膜 UI 组件库设计（src/ui/theme.ts）')
    pdf.write_body(
        '为在小尺寸气泡与大尺寸档案牌上复用同一套高精度 @2x 美术切片且不发生圆角拉伸畸变，src/ui/theme.ts 实现了带外发光边距补偿的 createNineSlice2x 工厂函数:'
    )
    pdf.write_code_block([
        'export function createNineSlice2x(spec: NineSlice2xSpec, w1x: number, h1x: number, centered = false): PIXI.Container {',
        '  const wrap = new PIXI.Container();',
        '  const build = (): void => {',
        '    if (wrap.destroyed) return;',
        '    for (const c of wrap.removeChildren()) c.destroy();',
        '    const tex = gameTexture(spec.path);',
        '    if (!isTextureReady(tex)) return;',
        '    const plane = new PIXI.NineSlicePlane(tex, spec.left2x, spec.top2x, spec.right2x, spec.bottom2x);',
        '    const targetW2 = Math.max(1, w1x * 2 + spec.pad2x * 2);',
        '    const targetH2 = Math.max(1, h1x * 2 + spec.pad2x * 2);',
        '    const drawW2 = Math.max(spec.left2x + spec.right2x + 2, targetW2);',
        '    const drawH2 = Math.max(spec.top2x + spec.bottom2x + 2, targetH2);',
        '    plane.width = drawW2; plane.height = drawH2;',
        '    const sx = 0.5 * (targetW2 / drawW2), sy = 0.5 * (targetH2 / drawH2);',
        '    plane.scale.set(sx, sy);',
        '    const pad1xX = spec.pad2x * sx, pad1xY = spec.pad2x * sy;',
        '    plane.position.set(centered ? -w1x / 2 - pad1xX : -pad1xX, centered ? -h1x / 2 - pad1xY : -pad1xY);',
        '    wrap.addChild(plane);',
        '  };',
        '  const tex = gameTexture(spec.path);',
        '  if (isTextureReady(tex)) build(); else whenTextureReady(spec.path, build);',
        '  return wrap;',
        '}',
    ], 'src/ui/theme.ts - @2x 九宫格自适应防畸变装配算法')

    # ==================== 第五章：数据结构设计 ====================
    pdf.write_h1('五、数据结构设计')
    pdf.write_h2('5.1 本地持久化存档 GameSave 完整字段规范')
    pdf.write_body(
        '存档根对象 GameSave 定义于 src/sim/save.ts，序列化为 JSON 存储在本地键 duanju_save 下，全部 22 个持久化字段定义如下:'
    )
    pdf.write_table(
        ['字段名', 'TypeScript 类型', '默认值', '业务含义与持久化规则'],
        [
            ['version', 'number', '1', '存档结构版本号（SAVE_VERSION = 1），不匹配时安全回退初始化'],
            ['money', 'number', '0', '当前可用流动现金，消费扣减，每次读取时做非负有限数校验'],
            ['netWorth', 'number', '0', '本赛季累计总身价估值，normalizeSave 保证 netWorth >= money'],
            ['roses', 'number', '0', '当前持有的心动玫瑰整数数量'],
            ['season', 'number', '1', '当前所处商业赛季序号（第 1 季起，每次跨城扩业 +1）'],
            ['skillLevel', 'number', '1', '主角手艺等级（最小为 1）'],
            ['shops', 'Partial<Record<ShopId, number>>', '{}', '10 家门店当前等级字典，未开业门店缺省或为 0'],
            ['bonds', 'Partial<Record<HeroId, number>>', '{}', '合伙人好感羁绊等级字典（1~5），未相遇缺省或为 0'],
            ['staff', 'Partial<Record<StaffId, number>>', '{}', '20 位店员当前等级字典，未录用缺省或为 0'],
            ['watched', 'string[]', '[]', '已阅读完毕的主线分篇与人物卡片 ID 列表'],
            ['adUnlocked', 'string[]', '[]', '已解锁的特殊番外人物卡片 ID 列表'],
            ['outfit', 'OutfitId', '"tee"', '当前穿戴的高定造型 ID'],
            ['boostUntil', 'number', '0', '直播双倍收益结束毫秒时间戳'],
            ['feverUntil / feverHeat', 'number / number', '0 / 0', '爆单狂热结束毫秒时间戳与当前蓄能进度（0~1）'],
            ['rushOrder', '{ day, count, lastAt }', '{ "", 0, 0 }', '当日急单日期键、已领次数与上次领取毫秒时间戳'],
            ['lastActiveAt / createdAt', 'number / number', 'now / now', '上次活跃时间戳（用于计算离线时长）与建档时间戳'],
            ['tutorialStep / taps', 'number / number', '0 / 0', '新手引导阶段标记（99 表示已完成）与累计点击次数'],
            ['questIndex / liveBoosts', 'number / number', '0 / 0', '已完成并领奖的任务序号与累计开启直播次数'],
            ['buyMode', '"1" | "10" | "next"', '"1"', '玩家当前选中的批量升级档位'],
            ['repliedChats', 'Record<string, number>', '{}', '晚星手机已回复私信 ID 到所选分支下标（0 | 1）的映射'],
            ['likedMoments', 'string[]', '[]', '晚星手机已点赞的同城商圈动态 ID 数组'],
            ['clearedBattles / claimedClimaxes', 'number[] / number[]', '[] / []', '已打赢商业身价交锋的章节号列表与已领章末抉择奖励的章节号列表'],
        ],
        [38, 42, 20, CONTENT_W - 100],
        font_size=8.5,
    )

    pdf.write_h2('5.2 产业、合伙人、章节、店员与手机配置接口定义')
    pdf.write_code_block([
        'export interface StreetEventOption {',
        '  label: string; outcome: string; cashSec: number; minCash: number; roses: number; feverAdd: number;',
        '}',
        'export interface StreetEventDef {',
        '  id: string; minChapter: number; title: string; desc: string;',
        '  options: readonly [StreetEventOption, StreetEventOption];',
        '}',
        'export interface ChatThreadDef {',
        '  id: string; heroId: HeroId; minChapter?: number; minBond?: number;',
        '  preview: string; opening: readonly string[];',
        '  replies: readonly [{ text: string; heroReply: string; roses: number },',
        '                     { text: string; heroReply: string; roses: number }];',
        '}',
        'export interface MomentPostDef {',
        '  id: string; author: string; roleTag: string; minChapter: number;',
        '  heroId?: HeroId; minBond?: number; content: string; location: string;',
        '  comments: readonly { who: string; text: string }[];',
        '}',
    ], 'src/data/streetEvents.ts & phoneMessages.ts - 奇遇与手机交互配置接口')

    # ==================== 第六章：数据接口设计 ====================
    pdf.write_h1('六、数据接口设计')
    pdf.write_h2('6.1 纯函数经济计算与批量求值接口表')
    pdf.write_table(
        ['函数名 (src/sim/economy.ts)', '参数列表', '返回值与计算职责'],
        [
            ['computeSynergies', '(save: GameSave)', '返回 EmpireSynergies 16 维全局商业乘区汇总对象'],
            ['shopUpgradeCostIn', '(save, id, level, count)', '返回计入法务减免后的门店连升 count 级总花费'],
            ['resolveShopBuyCount', '(save, id, mode)', '解析 x1 / x10 / next / max 档位对应的实际购买级数'],
            ['shopIncomeIn', '(save, id, level)', '返回单家门店计入羁绊、城区团建、甜品店光环与帝国乘区后的实际秒产'],
            ['staffUpgradeCostN', '(id, level, count)', '返回店员含首次录用价与后续等比升级价在内的连升总花费'],
            ['staffIncomeIn', '(save, id, level)', '返回单名店员计入星级翻倍、咖啡馆/顾野光环与帝国乘区后的实际秒产'],
            ['baseIncomePerSec', '(save: GameSave)', '返回不含临时直播/狂热的帝国常态每秒总收益（全体门店 + 全体店员）'],
            ['incomePerSec', '(save, now)', '返回乘以当前直播与爆单狂热临时倍率后的实时每秒总收益'],
            ['tapValue', '(save, now, combo)', '返回单次点击的实际收益（含手艺值、秒产转化、全员录用翻倍与连击）'],
            ['bondRoseCost / bondUpgradeCost', '(heroId, level)', '返回升下一阶羁绊所需的心动玫瑰数与兜底礼盒现金价'],
        ],
        [44, 42, CONTENT_W - 86],
        font_size=8.8,
    )

    pdf.write_h2('6.2 存档状态变更事务接口表')
    pdf.write_table(
        ['函数名 (src/sim/actions.ts)', '参数列表', '状态变更与返回值说明'],
        [
            ['tapInteractive', '(save, now, combo, rand)', '执行交互点击，结算 3 倍暴击与爆单热度累加，返回 { amount, crit, feverTriggered }'],
            ['serveCustomerOrder', '(save, now)', '交付前景顾客点单气泡，增加现金与 10% 爆单热度，返回 { amount, feverTriggered }'],
            ['tick', '(save, dtSec, now)', '按帧累加挂机收益与江叙白后台自动点击收益，更新 lastActiveAt'],
            ['buyShop', '(save, id, count)', '开店或连升门店，发放跨里程碑玫瑰并触发合伙人初遇，返回 BuyShopResult | null'],
            ['upgradeStaff', '(save, id, mode)', '录用或连升店员，发放录用/升星玫瑰，返回 StaffUpgradeResult | null'],
            ['upgradeSkill', '(save, mode)', '按档位升级女主手艺等级，余额不足返回 false'],
            ['investBond', '(save, heroId)', '校验章节门禁后优先扣玫瑰（次选扣现金）提升合伙人羁绊 1 级'],
            ['resolveStreetEvent', '(save, event, idx, now)', '结算街头奇遇所选方案的现金、玫瑰与爆单热度'],
            ['clearChapterBattle', '(save, chapterId)', '校验章节身价门槛后标记商战通关并发放宿敌玫瑰奖励'],
            ['claimChapterClimax', '(save, chapterId, choice)', '记录章末高光二选一抉择并发放对应玫瑰奖励'],
            ['replyChat / likeMoment', '(save, id, ...)', '记录晚星手机私信回复或朋友圈点赞并发放心动玫瑰'],
            ['prestigeSeason', '(save, now)', '千亿通关后开启跨城新赛季，season + 1，重置门店并赠 15 朵玫瑰'],
        ],
        [42, 42, CONTENT_W - 84],
        font_size=8.8,
    )

    pdf.write_h2('6.3 门槛跨越检测与红点推导接口表')
    pdf.write_table(
        ['函数名 (src/sim/unlocks.ts)', '参数列表', '只读推导逻辑说明'],
        [
            ['crossedThresholds', '(before, after)', '对比身价变化前后新跨越的章节、商圈、门店与高定衣橱列表'],
            ['bondBlockReason', '(save, heroId)', '判定合伙人能否继续升羁绊，受阻时返回「开店后相遇」「主线第N章后解锁」等原因'],
            ['isVideoUnlocked', '(save, videoId)', '统一判定主线分篇、正面记忆卡、暗面传记卡、番外卡与终章结局卡是否已解锁'],
            ['pendingBattleChapter', '(save: GameSave)', '查找已达身价门槛但尚未完成商业交锋的最早主线章节，驱动顶栏迎战提示'],
            ['unreadChatCount / unlikedMomentCount', '(save: GameSave)', '统计当前已解锁但未回复的私信数与未点赞动态数，驱动微聊数字红点'],
        ],
        [52, 34, CONTENT_W - 86],
        font_size=8.8,
    )

    pdf.write_h2('6.4 平台适配与云同步白名单接口设计')
    pdf.write_body(
        'PlatformService 统一封装微信小游戏 wx.* 与浏览器兜底实现（含 getStorage / setStorage、vibrateShort、系统安全区探测）。'
        'CloudConfig.ts 与 CloudSyncManager.ts 预置了基于腾讯云 CloudBase HTTP 访问服务的云同步扩展框架: 通过 CLOUD_SYNC_ALLOWLIST = ["duanju_save"] 严格限定仅业务存档参与同步，将鉴权令牌（duanju_token）、匿名设备号（duanju_anon_id）与本地音量开关（duanju_audio）列入 CLOUD_SYNC_EXCLUDE_KEYS 排除表；当 BACKEND_ENABLED 设为 false 时自动运行于纯本地 cacheOnly 模式，启动零网络阻塞。'
    )

    # ==================== 第七章：出错处理与容错自愈设计 ====================
    pdf.write_h1('七、出错处理与容错自愈设计')
    pdf.write_h2('7.1 存档损坏、字段缺失与脏数值自愈机制')
    pdf.write_body(
        '针对移动端可能出现的存储中断、JSON 截断、版本升级缺字段或异常浮点数（NaN / Infinity / 负数），src/sim/save.ts 中的 normalizeSave(raw, now) 实施了严密的防御式清洗:'
    )
    pdf.write_code_block([
        'export function normalizeSave(raw: unknown, now = Date.now()): GameSave {',
        '  const base = createSave(now);',
        '  if (!raw || typeof raw !== "object") return base;',
        '  const r = raw as Partial<GameSave>;',
        '  if (r.version !== SAVE_VERSION) return base;',
        '  const buyMode: BuyMode = r.buyMode === "10" || r.buyMode === "next" ? r.buyMode : "1";',
        '  return {',
        '    ...base, ...r,',
        '    money: nonNegative(r.money),',
        '    netWorth: Math.max(nonNegative(r.netWorth), nonNegative(r.money)),',
        '    roses: Math.floor(nonNegative(r.roses)),',
        '    season: Math.max(1, Math.floor(nonNegative(r.season) || 1)),',
        '    skillLevel: Math.max(1, Math.floor(nonNegative(r.skillLevel) || 1)),',
        '    feverHeat: Math.min(1, nonNegative(r.feverHeat)),',
        '    buyMode,',
        '    watched: Array.isArray(r.watched) ? [...r.watched] : [],',
        '    clearedBattles: Array.isArray(r.clearedBattles) ? [...r.clearedBattles] : [],',
        '    lastActiveAt: nonNegative(r.lastActiveAt) || now,',
        '  };',
        '}',
    ], 'src/sim/save.ts - 读档容错清洗与不变量恢复')

    pdf.write_h2('7.2 业务越界与重复领奖幂等拦截')
    pdf.write_bullet('防重复发放幂等保护: clearChapterBattle 检查 save.clearedBattles.includes(id)，claimChapterClimax 检查 save.claimedClimaxes.includes(id)，replyChat 检查 save.repliedChats[id] !== undefined，likeMoment 检查 save.likedMoments.includes(id)，确保任何快速连点均不会刷取双份玫瑰。')
    pdf.write_bullet('未解锁点击友好反馈: 所有未达身价门槛的门店、衣橱、章节与未解锁人物卡片在点击时均不会抛出异常，而是播放轻柔拒绝音效并由 ToastManager 弹出具体差额提示。')

    pdf.write_h2('7.3 异步纹理回调与组件生命周期安全')
    pdf.write_body(
        '当玩家在二级面板间快速高频切换时，异步加载的高清立绘或九宫格切片可能在旧容器已销毁后才完成解码。'
        '为此，createNineSlice2x、makeStickerSprite 与 showFigure 在异步回调入口统一检查 if (target.destroyed) return；'
        '同时 Page._buildTop 与 StaffSheet._buildTop 在重建顶栏前先将复用的 _roseTxt 与 _moneyTxt 节点从旧父节点安全摘除（removeChild），再对旧装饰容器调用 destroy({ children: true })，彻底杜绝悬挂引用导致的空指针崩溃。'
    )

    # ==================== 第八章：性能优化设计 ====================
    pdf.write_h1('八、性能优化设计')
    pdf.write_h2('8.1 O(1) 闭合公式与定频节流策略')
    pdf.write_bullet('零循环批量计价: 门店、店员与手艺的 10 连升、质变连升及最大可买级数全部采用指数与对数闭合公式 O(1) 求值，即使连升数百级耗时亦低于 0.01ms。')
    pdf.write_bullet('HUD 0.2s 节流与二级页惰性更新: 主循环每帧（16.6ms）累加浮点数收益，但顶栏格式化字符串（formatMoney）每 0.2 秒仅执行一次；未打开的二级面板直接跳过 rebuild() 与 refreshAffordable()。')
    pdf.write_bullet('10 秒合并写盘与关键点即时存盘: 普通点击与挂机每 10 秒写一次 Storage，仅在领任务、打赢商战、回私信、跨城转生及小游戏退后台时立即调用 SaveManager.flush()。')

    pdf.write_h2('8.2 2.5x 视网膜字体、4px 渐变缓存池与舞台遮罩裁剪')
    pdf.write_bullet('视网膜超采样文字: Game.ts 启动时设定 PIXI.Text.defaultResolution = 2.5，消除逻辑画布缩放带来的文字锯齿与发虚。')
    pdf.write_bullet('渐变纹理缓存池: verticalGradientTexture 生成仅 4px 宽的 RGBA 内存缓冲纹理并以颜色键缓存于 gradCache Map 中，全屏背景与丝缎胶囊零重复分配显存。')
    pdf.write_bullet('精准遮罩与分包瘦身: 主界面女主舞台使用单矩形 _stageMask 沿香槟底栏弧顶裁剪；首包仅保留代码与 @2x UI 切片，高清立绘与场景图走 CDN 并发队列按需拉取并配合 LRU 空间回收。')

    # ==================== 第九章：结论 ====================
    pdf.write_h1('九、结论')
    pdf.write_body(
        f'{SOFTWARE_FULL_NAME}（{SOFTWARE_VERSION}）采用 TypeScript 与 PixiJS 7 独立设计与实现，以韩版手绘漫画美术与暖奶油香槟雕金 UI 为视觉特色，'
        '构建了涵盖手艺点击、十家跨商圈产业与协同光环、城市沙盘、九位商业合伙人羁绊与双面人物剧情卡片、韩版漫画分镜阅读器、二十位精英店员团建与四十张拍立得人物卡、九章商业身价交锋、晚星手机互动、千金衣橱换装及跨城新赛季的完整游戏体系。'
        '软件架构分层严谨，纯函数数值引擎与视图表现解耦清晰，全部玩法设计、配置表与算法均与源程序鉴别材料严格对应，符合计算机软件著作权登记规范。'
    )


def validate_pdf():
    from pypdf import PdfReader
    reader = PdfReader(str(OUTPUT))
    return len(reader.pages)


def main():
    pdf = DocPDF()
    pdf.add_font('Songti', '', SONGTI_PATH)
    write_document(pdf)
    pdf.output(str(OUTPUT))
    pages = validate_pdf()

    print('=' * 60)
    print('  翻盘女王软著文档鉴别材料 PDF 生成报告（源码级详尽版）')
    print('=' * 60)
    print(f'  软件名称:     {SOFTWARE_FULL_NAME} {SOFTWARE_VERSION}')
    print(f'  申请人:       {APPLICANT_NAME}')
    print(f'  项目路径:     {PROJECT_ROOT}')
    print(f'  文档类型:     设计说明书（完整游玩流程 + 源码级各玩法详细设计）')
    print(f'  生成页数:     {pages} 页')
    print(f'  输出文件:     {OUTPUT}')
    if pdf.missing_images:
        print(f'  待补截图:     {len(pdf.missing_images)} 张（PDF 中已预留标准占位框）')
    else:
        print('  截图检查:     已找到全部 15 张真机截图，无占位框')
    print('=' * 60)


if __name__ == '__main__':
    main()
