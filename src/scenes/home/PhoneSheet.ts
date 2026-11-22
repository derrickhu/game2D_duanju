/**
 * 晚星手机（v7 雕金丝缎私信卡片 + 高定朋友圈动态 · 零 Emoji 精修版）：
 * - 双栏切换采用丝缎胶囊标签 (`私聊消息` / `商圈动态`)；
 * - 消息行与朋友圈动态全部采用 @2x 双金线柔光雕花牌 (`v7_card_couture_plaque`) + 糖果珐琅玫瑰贴纸，字号清晰通透！
 */
import * as PIXI from 'pixi.js';
import { ICONS, UI_SLICES, heroPortraitPath } from '@/data/art';
import { CHAT_THREADS, type ChatThreadDef, type MomentPostDef } from '@/data/phoneMessages';
import { heroById, type HeroId } from '@/data/story';
import { AudioManager } from '@/core/AudioManager';
import { Game } from '@/core/Game';
import { ToastManager } from '@/core/ToastManager';
import { GameState } from '@/managers/GameState';
import { unlikedMomentCount, unlockedChats, unlockedMoments, unreadChatCount } from '@/sim/unlocks';
import { Button } from '@/ui/Button';
import { PAGE_PAD, Page } from '@/ui/Page';
import { ScrollView } from '@/ui/ScrollView';
import {
  COLORS,
  createNineSlice2x,
  drawCreamCard,
  makeCouturePlaque,
  makeStickerSprite,
  makeText,
  verticalGradientTexture,
} from '@/ui/theme';
import { showFigure } from '@/utils/assets';

type PhoneTab = 'chat' | 'moments';

export class PhoneSheet extends Page {
  private readonly _tabs = new PIXI.Container();
  private readonly _scroll = new ScrollView();
  private readonly _threadView = new PIXI.Container();
  private _tab: PhoneTab = 'chat';
  private _activeThreadId: string | null = null;

  constructor() {
    super('晚星手机');
    this.body.addChild(this._tabs, this._scroll, this._threadView);
  }

  openForHero(heroId: HeroId): void {
    const unlocked = unlockedChats(GameState.save).filter((c) => c.heroId === heroId);
    const unread = unlocked.find((c) => GameState.save.repliedChats[c.id] === undefined);
    this._tab = 'chat';
    this._activeThreadId = (unread ?? unlocked[unlocked.length - 1])?.id ?? null;
    this.open();
  }

  protected override onOpen(): void {
    if (!this._activeThreadId) {
      if (unreadChatCount(GameState.save) === 0 && unlikedMomentCount(GameState.save) > 0) {
        this._tab = 'moments';
      }
    }
  }

  protected override onBack(): void {
    if (this._activeThreadId) {
      AudioManager.play('ui_click');
      this._activeThreadId = null;
      this.setTitle('晚星手机');
      this.rebuild();
      return;
    }
    this.close();
  }

  protected layoutBody(top: number, bottom: number): void {
    const W = Game.logicWidth;
    for (const c of this._tabs.removeChildren()) c.destroy({ children: true });
    for (const c of this._scroll.content.removeChildren()) c.destroy({ children: true });
    for (const c of this._threadView.removeChildren()) c.destroy({ children: true });

    if (this._activeThreadId) {
      const thread = CHAT_THREADS.find((c) => c.id === this._activeThreadId);
      if (thread) {
        this._tabs.visible = false;
        this._scroll.visible = false;
        this._threadView.visible = true;
        this.setTitle(`与 ${heroById(thread.heroId).name} 私聊`);
        this._buildThreadDetail(thread, top, bottom);
        return;
      }
      this._activeThreadId = null;
    }

    this.setTitle('晚星手机');
    this._tabs.visible = true;
    this._scroll.visible = true;
    this._threadView.visible = false;

    const tabH = 54;
    this._buildTabs(top, tabH);
    const listTop = top + tabH + 18;
    this._scroll.position.set(0, listTop);
    this._scroll.setViewport(W, bottom - listTop);

    if (this._tab === 'chat') this._buildChatList(W - PAGE_PAD * 2);
    else this._buildMomentsList(W - PAGE_PAD * 2);
  }

  private _buildTabs(top: number, h: number): void {
    const W = Game.logicWidth;
    const save = GameState.save;
    const unread = unreadChatCount(save);
    const unliked = unlikedMomentCount(save);
    const tw = (W - PAGE_PAD * 2 - 16) / 2;
    const items: [PhoneTab, string, number][] = [
      ['chat', '私聊消息', unread],
      ['moments', '商圈动态', unliked],
    ];
    items.forEach(([id, label, badge], i) => {
      const active = this._tab === id;
      const item = new PIXI.Container();
      item.position.set(PAGE_PAD + i * (tw + 16), top);

      const spec = active
        ? { path: UI_SLICES.btnSmCoral, pad2x: 24, left2x: 88, top2x: 68, right2x: 88, bottom2x: 68 }
        : { path: UI_SLICES.btnMdCream, pad2x: 16, left2x: 102, top2x: 70, right2x: 102, bottom2x: 70 };
      item.addChild(createNineSlice2x(spec, tw, h, false));

      const txt = makeText(badge > 0 ? `${label} (${badge})` : label, 22, active ? 0xFFFFFF : COLORS.ink, true);
      if (active) {
        txt.style.stroke = 0x8C322B;
        txt.style.strokeThickness = 3.4;
        txt.style.lineJoin = 'round';
      }
      txt.anchor.set(0.5);
      txt.position.set(tw / 2, h / 2 - 0.5);
      item.addChild(txt);

      if (badge > 0 && !active) {
        item.addChild(new PIXI.Graphics().lineStyle(2, 0xFFFFFF).beginFill(0xF0554D).drawCircle(tw - 18, 14, 7).endFill());
      }
      item.eventMode = 'static';
      item.cursor = 'pointer';
      item.on('pointertap', () => {
        if (this._tab === id) return;
        AudioManager.play('ui_click');
        this._tab = id;
        this.rebuild();
      });
      this._tabs.addChild(item);
    });
  }

  private _buildChatList(w: number): void {
    const save = GameState.save;
    const list = unlockedChats(save);
    if (!list.length) {
      const plaque = makeCouturePlaque(w, 128, false, false);
      plaque.position.set(PAGE_PAD, 100);
      const empty = makeText('开甜品店邂逅第一位合伙男主后，将收到他的专属私信', 22, COLORS.inkSoft, true);
      empty.anchor.set(0.5);
      empty.position.set(Game.logicWidth / 2, 164);
      this._scroll.content.addChild(plaque, empty);
      this._scroll.setContentHeight(300);
      return;
    }

    const rowH = 128;
    const gap = 14;
    const sorted = [...list].sort((a, b) => {
      const ua = save.repliedChats[a.id] === undefined ? 0 : 1;
      const ub = save.repliedChats[b.id] === undefined ? 0 : 1;
      return ua - ub;
    });

    sorted.forEach((chat, i) => {
      const hero = heroById(chat.heroId);
      const unread = save.repliedChats[chat.id] === undefined;
      const row = new PIXI.Container();
      row.position.set(PAGE_PAD, i * (rowH + gap));
      row.addChild(makeCouturePlaque(w, rowH, unread, false));

      const r = 40;
      const cx = 64;
      const cy = rowH / 2;
      const ring = new PIXI.Graphics()
        .lineStyle(2.8, unread ? COLORS.rose : COLORS.borderGold)
        .beginFill(COLORS.cardBlush)
        .drawCircle(cx, cy, r)
        .endFill();
      const face = new PIXI.Sprite();
      face.anchor.set(0.5);
      face.position.set(cx, cy);
      const mask = new PIXI.Graphics().beginFill(0xffffff).drawCircle(cx, cy, r - 2.5).endFill();
      face.mask = mask;
      showFigure(face, heroPortraitPath(hero.id), r * 2, r * 2);
      row.addChild(ring, mask, face);

      const name = makeText(`${hero.name}  ·  ${hero.title}`, 25, COLORS.ink, true);
      name.position.set(122, 24);
      const prevStr = unread ? chat.preview : `我：${chat.replies[save.repliedChats[chat.id]].text}`;
      const prev = makeText(prevStr, 20, unread ? COLORS.roseDeep : COLORS.inkSoft, unread);
      if (prev.width > w - 256) prev.scale.set((w - 256) / prev.width);
      prev.position.set(122, 68);
      row.addChild(name, prev);

      if (unread) {
        const badgeW = 104;
        const badgeH = 34;
        const bx = w - 22 - badgeW;
        const by = 22;
        const badgeSkin = createNineSlice2x(
          { path: UI_SLICES.btnSmCoral, pad2x: 14, left2x: 88, top2x: 68, right2x: 88, bottom2x: 68 },
          badgeW,
          badgeH,
          false,
        );
        badgeSkin.position.set(bx, by);
        const roseIco = makeStickerSprite(ICONS.currencyRose, 24, 24, true);
        roseIco.position.set(bx + 22, by + badgeH / 2);
        const t = makeText('待回复', 16, 0xFFFFFF, true);
        t.style.stroke = 0x8C322B;
        t.style.strokeThickness = 3.0;
        t.style.lineJoin = 'round';
        t.anchor.set(0.5);
        t.position.set(bx + 64, by + badgeH / 2 - 0.5);
        row.addChild(badgeSkin, roseIco, t);
      } else {
        const done = makeText('已回复 ✓', 18, COLORS.goldDeep, true);
        done.anchor.set(1, 0);
        done.position.set(w - 24, 28);
        row.addChild(done);
      }

      row.eventMode = 'static';
      row.cursor = 'pointer';
      row.on('pointertap', () => {
        if (this._scroll.dragging) return;
        AudioManager.play('ui_click');
        this._activeThreadId = chat.id;
        this.rebuild();
      });
      this._scroll.content.addChild(row);
    });
    this._scroll.setContentHeight(sorted.length * (rowH + gap) + 20);
  }

  private _buildThreadDetail(chat: ChatThreadDef, top: number, bottom: number): void {
    const W = Game.logicWidth;
    const hero = heroById(chat.heroId);
    const repliedIdx = GameState.save.repliedChats[chat.id];
    let y = top + 12;

    const addBubble = (fromMe: boolean, text: string): void => {
      const maxW = W - 176;
      const msg = makeText(text, 23, fromMe ? COLORS.white : COLORS.ink, false);
      msg.style.wordWrap = true;
      msg.style.wordWrapWidth = maxW - 44;
      msg.style.breakWords = true;
      msg.style.lineHeight = 35;
      const bw = Math.min(maxW, Math.max(128, msg.width + 48));
      const bh = msg.height + 32;

      const row = new PIXI.Container();
      row.y = y;
      if (!fromMe) {
        const cx = PAGE_PAD + 32;
        const cy = 32;
        const ring = new PIXI.Graphics().lineStyle(2, COLORS.borderGold).beginFill(COLORS.cardWarm).drawCircle(cx, cy, 31.5).endFill();
        const face = new PIXI.Sprite();
        face.anchor.set(0.5);
        face.position.set(cx, cy);
        const mask = new PIXI.Graphics().beginFill(0xffffff).drawCircle(cx, cy, 29.5).endFill();
        face.mask = mask;
        showFigure(face, heroPortraitPath(hero.id), 60, 60);
        const bg = drawCreamCard(new PIXI.Graphics(), PAGE_PAD + 78, 0, bw, bh, 22, { fill: COLORS.card, borderColor: COLORS.borderGold });
        msg.position.set(PAGE_PAD + 102, 16);
        row.addChild(ring, mask, face, bg, msg);
      } else {
        const bx = W - PAGE_PAD - bw;
        const sp = new PIXI.Sprite(verticalGradientTexture(0xF38979, 0xE56E5E, 0xD45A4A, 48));
        sp.position.set(bx, 0);
        sp.width = bw;
        sp.height = bh;
        const m = new PIXI.Graphics().beginFill(0xffffff).drawRoundedRect(bx, 0, bw, bh, 22).endFill();
        sp.mask = m;
        const rim = new PIXI.Graphics().lineStyle(1.4, 0xFFF2EA, 0.82).drawRoundedRect(bx, 0, bw, bh, 22);
        msg.position.set(bx + 24, 16);
        row.addChild(sp, m, rim, msg);
      }
      this._threadView.addChild(row);
      y += bh + 20;
    };

    for (const line of chat.opening) addBubble(false, line);

    if (repliedIdx !== undefined) {
      const chosen = chat.replies[repliedIdx];
      addBubble(true, chosen.text);
      addBubble(false, chosen.heroReply);

      const backBtn = new Button({
        width: 300,
        height: 72,
        variant: 'cream',
        fontSize: 24,
        label: '返回消息列表',
        onTap: () => this.onBack(),
      });
      backBtn.position.set(W / 2, bottom - 50);
      this._threadView.addChild(backBtn);
      return;
    }

    const tip = makeText('✦ 选择你的回复 · 立即提升心动好感并获赠玫瑰', 19, COLORS.roseDeep, true);
    tip.anchor.set(0.5);
    tip.position.set(W / 2, bottom - 228);
    this._threadView.addChild(tip);

    chat.replies.forEach((rep, idx) => {
      const btn = new Button({
        width: W - PAGE_PAD * 2,
        height: 84,
        variant: idx === 0 ? 'rose' : 'gold',
        fontSize: 21,
        label: rep.text,
        sub: `发送回复 · 获赠心动玫瑰 +${rep.roses}`,
        onTap: () => {
          const got = GameState.replyChat(chat.id, idx as 0 | 1);
          AudioManager.play('bond_up');
          if (got > 0) ToastManager.show(`✦ ${hero.name}秒回了你！心动玫瑰 +${got}`, 'success');
          this.rebuild();
        },
      });
      btn.position.set(W / 2, bottom - 144 + idx * 96);
      this._threadView.addChild(btn);
    });
  }

  private _buildMomentsList(w: number): void {
    const save = GameState.save;
    const posts = [...unlockedMoments(save)].reverse();
    if (!posts.length) {
      const plaque = makeCouturePlaque(w, 128, false, false);
      plaque.position.set(PAGE_PAD, 100);
      const empty = makeText('身价达到 1 万解锁第 1 章后，将开启同城名媛商圈动态', 22, COLORS.inkSoft, true);
      empty.anchor.set(0.5);
      empty.position.set(Game.logicWidth / 2, 164);
      this._scroll.content.addChild(plaque, empty);
      this._scroll.setContentHeight(300);
      return;
    }

    let y = 0;
    posts.forEach((post: MomentPostDef) => {
      const liked = save.likedMoments.includes(post.id);
      const card = new PIXI.Container();
      card.position.set(PAGE_PAD, y);

      const author = makeText(post.author, 25, COLORS.ink, true);
      author.position.set(26, 22);
      const tag = makeText(post.roleTag, 17, COLORS.roseDeep, true);
      tag.position.set(author.x + author.width + 14, 28);

      const body = makeText(post.content, 22, COLORS.ink);
      body.style.wordWrap = true;
      body.style.wordWrapWidth = w - 52;
      body.style.breakWords = true;
      body.style.lineHeight = 34;
      body.position.set(26, 66);

      let cy = 66 + body.height + 16;
      const loc = makeText(`✦ ${post.location}`, 17, COLORS.inkSoft, true);
      loc.position.set(26, cy + 8);

      const likeBtn = new Button({
        width: 158,
        height: 44,
        variant: liked ? 'cream' : 'rose',
        fontSize: 18,
        label: liked ? '♥ 已赞' : '♡ 点赞 玫瑰+1',
        onTap: () => {
          if (this._scroll.dragging || liked) return;
          const got = GameState.likeMoment(post.id);
          if (got > 0) {
            AudioManager.play('coin_gain');
            ToastManager.show('✦ 点赞成功 · 心动玫瑰 +1', 'success');
            this.rebuild();
          }
        },
      });
      likeBtn.position.set(w - 105, cy + 18);
      cy += 52;

      const commentNodes: PIXI.DisplayObject[] = [];
      if (post.comments.length) {
        const cLines = post.comments.map((c) => `${c.who}：${c.text}`).join('\n');
        const cText = makeText(cLines, 19, COLORS.inkSoft);
        cText.style.wordWrap = true;
        cText.style.wordWrapWidth = w - 76;
        cText.style.breakWords = true;
        cText.style.lineHeight = 29;
        const cH = cText.height + 24;
        const cBg = new PIXI.Graphics()
          .lineStyle(1, 0xEAD7B9, 0.9)
          .beginFill(COLORS.cardWarm, 0.96)
          .drawRoundedRect(26, cy, w - 52, cH, 16)
          .endFill();
        cText.position.set(38, cy + 12);
        commentNodes.push(cBg, cText);
        cy += cH + 22;
      } else {
        cy += 16;
      }

      card.addChild(makeCouturePlaque(w, cy, !liked, false), author, tag, body, loc, likeBtn, ...commentNodes);
      this._scroll.content.addChild(card);
      y += cy + 16;
    });
    this._scroll.setContentHeight(y + 20);
  }
}
