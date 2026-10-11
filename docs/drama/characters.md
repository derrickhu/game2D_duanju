# 角色资产登记表

> 资产根目录：`game_assets/duanju/assets/`（下文路径相对它）。
> 锁定短语：同一造型出现的所有出图、视频提示词里原样粘贴，不改一个字。

## 苏晚

### 造型 A · 夜市（身价 0）

- 立绘：`raw/portrait_suwan_v3.png`
- 设定图：`turnaround/turnaround_suwan_a_v1.png`
- 单视图：`turnaround/views/suwan_a_{face,front,34,side,back}.png`
- 锁定短语：`plain white crew-neck T-shirt, cream canvas bib apron, light-blue straight-leg jeans, white canvas sneakers, long black hair in a loose side braid`

### 造型 B~E

待做（白衬衫店员、小香风、白西装、高定礼服，见策划案 §5）。

## 陆屿

v2 重新设计（2026-10-11）。v1 的灰卫衣在视频中景里剪影是一坨、没有记忆点，已废弃（文件保留在 `raw/portrait_luyu_v1.png`、`turnaround/turnaround_luyu_v1.png`）。

设计思路：造型跟着剧情走，第 1–3 章是夜市的“烟火痞帅”，第 4 章身世揭晓前后换成“落魄少爷”，换装本身就是一条反差线。三个方向的概念图在 `concept/luyu_concept_{a,b,c}_v1.png`。

- 定妆照：`raw/portrait_luyu_v2.png`
- 面部锁定（两套造型都要贴）：`sharp single-eyelid eyes, high straight nose, sharp jawline, soft rosy lips, a small dark beauty mark just under the outer corner of his left eye, one small silver hoop earring in his left ear, glossy black wolf-cut hair grown to the nape`
- 标志道具：纹章古董表，`an antique watch on his left wrist with a round case the color of an old brass coin, a black dial with a small engraved crest, and a worn dark brown leather strap`

### 造型 A · 烟火痞帅（第 1–3 章）

- 设定图：`turnaround/turnaround_luyu_a_v2.png`（侧面画成了右侧，耳环看不到，已接受）
- 单视图：`turnaround/views/luyu_a_{face,front,34,side,back}.png`
- 锁定短语：`folded black cloth bandana tied around his head pushing the front hair up and back with a few loose strands on the forehead; faded black denim work jacket worn open with sleeves shoved up to the elbows; white ribbed tank top tucked in; waist apron of dark brown waxed canvas, the color of strong black tea, tied low on the hips; loose black cargo trousers tucked into black lace-up leather work boots`
- 视频验证：`video/ch01_luyu_meet_s01_v5_q4_newlook.mp4`（首帧 `keyframe/ch01_luyu_meet_s01_v2.png`，q4 图生 8 秒 720p，152 积分）

### 造型 B · 落魄少爷（第 4 章起）

- 设定图：`turnaround/turnaround_luyu_b_v2.png`
- 单视图：`turnaround/views/luyu_b_{face,front,34,side,back}.png`（front 左下角混入的特写衣角已手工涂白）
- 锁定短语：`hair loosely swept back with a soft center part, two thin strands falling beside his eyes; loose shirt of deep navy linen, the color of fountain-pen ink, top two buttons open, sleeves neatly rolled to the forearms; high-waisted pleated charcoal wool trousers with a thin black leather belt, shirt tucked in; polished black leather loafers`
- 在甜品店帮工的镜头可以加一条纯黑帆布半身围裙。

## 其余男主（v2 定稿，2026-10-11）

原则：除了“中景认得出”，整个阵容也要互相区分。每人一个专属色、一个独有的记忆点，不和别人撞。概念图提示词 `docs/prompt/<id>_concept_{a,b}_prompt.txt`，设定图提示词 `docs/prompt/turnaround_<id>_{a,b}_prompt.txt`。

通用规则：
- 设定图：`turnaround/turnaround_<id>_<造型>_v*.png`（下文写明版本）；单视图：`turnaround/views/<id>_<造型>_{face,front,34,side,back}.png`。
- 出图、视频提示词里“面部锁定 + 造型锁定”两段都要原样贴；换造型只换后一段。
- B 造型的设定图是用 `ref/composite/<id>_b_ref.jpg`（左：A 设定图的头部特写；右：B 概念图的服装）锁脸出的，后续再加新造型照此办理。
- 沈砚、周以宁的 v1（`turnaround_{shenyan,zhouyining}_v1.png`、`views/{shenyan,zhouyining}_*.png`）已废弃，文件保留。

| 男主 | 专属色 | 记忆点 | 造型 |
|---|---|---|---|
| 江叙白 | 奶白 + 橄榄绿 / 松绿 | 奶茶色卷发、圆银框眼镜、虎牙 | A 咖啡馆、B 校园 |
| 顾野 | 红包红 | 蜂蜜色皮肤、寸头剃线、眉疤、酒窝 | 仅拳馆（原 A 阳光橙不用） |
| 沈砚 | 烤杏仁驼 + 金 / 黑白 | 金丝眼镜、背头一缕落发 | A 驼金、B 黑白 |
| 秦野 | 黑 + 消防车红 | 银发、右耳三枚耳骨夹 | 仅赛车（原 B 做旧皮衣不用） |
| 许知衡 | 白 + 天蓝 / 孔雀绿 | 红绳手链；A 低马尾、B 小黄鸭手术帽 | A 门诊、B 夜班 |
| 周以宁 | 银亮片 + 樱桃红 / 香芋紫 | 长刘海、左耳十字耳坠 | A 舞台、B 躲狗仔 |
| 霍霆琛 | 老玉墨绿 / 红酒红 | 下巴细疤、背头落发、金尾戒 | A 墨绿总裁、B 丝绒晚宴 |
| 傅景深 | 新银币浅灰 + 孔雀蓝 | 桃花眼、榛子色背头、订婚戒 | A 继承人；B 火葬场期 = 同一套西装淋湿，出关键帧时在 A 上改状态 |

### 江叙白

- 面部锁定：`round puppy-like eyes with double eyelids, soft youthful face, a small tiger tooth, soft curly permed hair the light brown color of milk tea, thin round silver-framed glasses`
- A 咖啡馆（`turnaround_jiangxubai_a_v2.png`）：`an oversized cable-knit cardigan the color of fresh whipped cream, worn over a white collared shirt; a barista apron of olive-green canvas, the green of fresh olives, tied at the waist with a bow at the back; loose light beige chinos; clean white sneakers; a pencil tucked behind his right ear`
- B 校园（`turnaround_jiangxubai_b_v2.png`）：`a cream baseball cap worn backwards; a varsity jacket with a forest-green body, the green of a pine tree, and cream leather sleeves, one plain embroidered coffee-bean patch on the left chest; a plain white T-shirt; light-wash straight jeans; cream high-top canvas sneakers; a small vintage film camera on a brown leather strap around his neck`

### 顾野

- 面部锁定：`skin with a light honey-tan glow, the warm color of wildflower honey, thick straight eyebrows, defined jaw, deep dimples, a small pale scar across his right eyebrow, a short black buzz cut with one thin shaved line above his left ear`
- 拳馆（`turnaround_guye_b_v2.png`，视图文件名沿用 `guye_b_*`）：`a heather-grey sleeveless sweatshirt with wide armholes; a thin silver dog-tag necklace; boxing hand wraps on both hands, the bright red of a Chinese red envelope; black loose training shorts; black high-top boxing shoes`

### 沈砚

- 面部锁定：`cool narrow eyes, high straight nose, thin lips, glossy black hair slicked back with one strand falling over his forehead, thin gold-rimmed glasses`
- A 驼金（`turnaround_shenyan_a_v2.png`）：`a fine gold eyeglass chain hanging from the temples of his glasses along his jaw; a long double-breasted overcoat the warm brown of a toasted almond, worn open; a charcoal three-piece suit with a fitted waistcoat; a crisp white shirt; a deep navy silk tie, the color of fountain-pen ink; black leather oxford shoes`
- B 黑白（`turnaround_shenyan_b_v2.png`）：`a long black wool overcoat worn draped over his shoulders like a cape, sleeves hanging empty; a fitted white turtleneck sweater, bright as fresh snow; black tailored trousers; black leather Chelsea boots; a single black leather glove on his left hand only`

### 秦野

- 面部锁定：`fox-like upturned eyes, sharp V-shaped jaw, short messy silver hair, the bright silver of a new steel spoon, with darker roots, three small silver ear cuffs climbing the rim of his right ear`
- 赛车（`turnaround_qinye_a_v2.png`）：`a vintage racing jacket in black and fire-truck red with white stripes down the sleeves and plain colored geometric patches; a plain white T-shirt; black slim jeans; black leather riding boots; black fingerless leather riding gloves`

### 许知衡

- 面部锁定：`gentle almond-shaped eyes, soft straight eyebrows, slender oval face, a warm faint smile, a thin red string bracelet on his left wrist`
- A 门诊（`turnaround_xuzhiheng_a_v2.png`）：`soft black hair grown to the shoulders, tied in a short low ponytail at the nape, a few soft strands framing his face; a crisp long white doctor's coat worn open; a pale grey fine-knit turtleneck; a stethoscope around his neck with tubing the pale blue of a clear spring sky; slim light grey trousers; white leather sneakers`
- B 夜班（`turnaround_xuzhiheng_b_v3.png`）：`his hair tucked fully under a deep teal surgical scrub cap printed with tiny yellow rubber ducks; a light blue surgical mask pulled down under his chin; surgical scrubs in deep teal, the color of a peacock feather; a long white doctor's coat worn open over the scrubs; white clogs`

### 周以宁

- 面部锁定：`delicate idol face, black hair with long bangs falling to his eyelashes, a small silver cross earring dangling from his left ear`
- A 舞台（`turnaround_zhouyining_a_v2.png`）：`red eyeliner smudged at the outer tails of his eyes, red like a ripe cherry; a cropped jacket fully covered in silver sequins, sparkling like a disco ball; a loose sheer white shirt open at the collar; a thin silver chain necklace; silver rings; slim black leather trousers; black heeled Chelsea boots`
- B 躲狗仔（`turnaround_zhouyining_b_v2.png`）：`bare face; a black baseball cap pulled low; a black face mask pulled down under his chin; an oversized puffer jacket the soft purple of taro milk tea, collar up to his jaw; black loose track pants; white chunky sneakers`

### 霍霆琛

- 面部锁定：`deep-set eyes, heavy straight eyebrows, chiseled jaw, a thin pale scar on his chin, glossy black hair slicked back with a single strand falling across his forehead, a gold signet ring on his left little finger`
- A 墨绿总裁（`turnaround_huotingchen_a_v2.png`）：`a three-piece suit in deep green, the dark green of an old jade bracelet, with a fitted waistcoat; a black shirt with the top button open, no tie; gold cufflinks; black polished oxford shoes`
- B 丝绒晚宴（`turnaround_huotingchen_b_v3.png`）：`a velvet dinner jacket the deep red of fine red wine with black satin lapels; a white dress shirt with the top button open; a loosened black silk bow tie hanging untied around the collar; black tailored trousers with a satin side stripe; black patent leather shoes`

### 傅景深

- 面部锁定：`delicate pretty face, peach-blossom eyes with a slight upward tilt, thin lips, hair the light ash brown of a hazelnut shell, slicked back neatly`
- A 继承人（`turnaround_fujingshen_a_v2.png`）：`a slim light grey three-piece suit, the pale grey of a new silver coin; a white shirt; a pale blue silk tie; a lapel pin with a deep blue sapphire, the blue of a peacock's neck; a platinum engagement ring on his left hand; light brown leather loafers`

## 待做

苏婉柔、苏父苏母、王姐、周房东。

---

# 场景

| 场景 | 空景 | 状态 |
|---|---|---|
| 雨夜夜市 | `scene/scene_nightmarket_v1.png` | 完成 |
| 订婚宴大厅、甜品店、咖啡馆、法院走廊、慈善晚宴、晚星大厦办公室、外婆老房子 | — | 待做 |
