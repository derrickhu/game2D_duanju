/**
 * 商业外勤差遣 & 门店驻店店长管理页（`DispatchSheet`）：
 * 1. 「商业悬赏差遣」：4 个实时商业外勤槽位，自动匹配空闲专长店员，冲击 100% 大成功暴击赢取现金/玫瑰/灵感/内幕券；
 * 2. 「门店驻店店长」：为 10 大产业自由委任金牌主理人，专长契合门店触发 ×1.35 共振增幅。
 */
import * as PIXI from 'pixi.js';
import { SHOP_ICONS, UI_SLICES } from '@/data/art';
import { SPECIALTY_META, STAFF, staffById, type StaffId } from '@/data/staff';
import { SHOPS, type ShopId } from '@/data/world';
import { EV } from '@/config/events';
import { AudioManager } from '@/core/AudioManager';
import { EventBus } from '@/core/EventBus';
import { Game } from '@/core/Game';
import { Platform } from '@/core/PlatformService';
import { ToastManager } from '@/core/ToastManager';
import { GameState } from '@/managers/GameState';
import {
  activeDispatchInSlot,
  calcDispatchGreatChance,
  getMissionOrFallback,
  isStaffOnDispatch,
  recommendDispatchTeam,
  shopManagerMultiplier,
} from '@/sim/dispatchSim';
import { baseIncomePerSec, computeSynergies, staffStar } from '@/sim/economy';
import { formatDuration, formatMoney } from '@/sim/format';
import { Button } from '@/ui/Button';
import { PAGE_PAD, Page } from '@/ui/Page';
import { ProgressBar } from '@/ui/ProgressBar';
import { ScrollView } from '@/ui/ScrollView';
import {
  COLORS,
  createNineSlice2x,
  drawCreamCard,
  makeCouturePlaque,
  makeDisplayText,
  makeNumText,
  makeStickerSprite,
  makeText,
} from '@/ui/theme';

type DispatchTab = 'missions' | 'managers';

export class DispatchSheet extends Page {
  private readonly _subBar = new PIXI.Container();
  private readonly _scroll = new ScrollView();
  private _tab: DispatchTab = 'missions';
  private _timerAcc = 0;

  private readonly _tickFn = (): void => {
    if (!this.isOpen || this._tab !== 'missions') return;
    this._timerAcc += Game.ticker.deltaMS / 1000;
    if (this._timerAcc >= 0.5) {
      this._timerAcc = 0;
      this.rebuild();
    }
  };

  constructor() {
    super('商业外勤');
    this.body.addChild(this._subBar, this._scroll);
    EventBus.on(EV.dispatchChanged, () => { if (this.isOpen) this.rebuild(); });
    EventBus.on(EV.staffChanged, () => { if (this.isOpen) this.rebuild(); });
  }

  openManagersTab(): void {
    this._tab = 'managers';
    this.open();
  }

  protected override onOpen(): void {
    Game.ticker.remove(this._tickFn);
    Game.ticker.add(this._tickFn);
  }

  protected override onClose(): void {
    Game.ticker.remove(this._tickFn);
  }

  protected layoutBody(top: number, bottom: number): void {
    this._buildSubBar(top);
    const listTop = top + 58;
    const fullW = Game.logicWidth - PAGE_PAD * 2;
    this._scroll.position.set(PAGE_PAD, listTop);
    this._scroll.setViewport(fullW, bottom - listTop);

    if (this._tab === 'missions') {
      this._buildMissionsList(fullW);
    } else {
      this._buildManagersList(fullW);
    }
  }

  private _buildSubBar(top: number): void {
    for (const c of this._subBar.removeChildren()) c.destroy({ children: true });
    const W = Game.logicWidth;
    const save = GameState.save;

    const tabs: [DispatchTab, string][] = [
      ['missions', '商业悬赏差遣'],
      ['managers', '门店驻店店长'],
    ];
    tabs.forEach(([key, label], i) => {
      const on = this._tab === key;
      const w = 184;
      const h = 44;
      const node = new PIXI.Container();
      node.position.set(PAGE_PAD + i * (w + 10), top);
      const spec = on
        ? { path: UI_SLICES.btnSmCoral, pad2x: 16, left2x: 88, top2x: 68, right2x: 88, bottom2x: 68 }
        : { path: UI_SLICES.btnMdCream, pad2x: 12, left2x: 102, top2x: 70, right2x: 102, bottom2x: 70 };
      node.addChild(createNineSlice2x(spec, w, h, false));
      const txt = on
        ? makeDisplayText(label, 18, 0xFFFFFF, 0x8C322B, 3.0)
        : makeText(label, 18, COLORS.ink, true);
      txt.anchor.set(0.5);
      txt.position.set(w / 2, h / 2 - 0.5);
      node.addChild(txt);
      node.eventMode = 'static';
      node.cursor = 'pointer';
      node.on('pointertap', () => {
        if (this._tab === key) return;
        AudioManager.play('ui_click');
        this._tab = key;
        this.rebuild();
      });
      this._subBar.addChild(node);
    });

    if (this._tab === 'missions') {
      const refBtn = new Button({
        width: 176,
        height: 42,
        variant: 'gold',
        fontSize: 17,
        label: '刷新待接商单',
        onTap: () => {
          GameState.refreshDispatchBoard();
          AudioManager.play('ui_click');
          ToastManager.show('已刷新最新商业悬赏情报');
        },
      });
      refBtn.position.set(W - PAGE_PAD - 88, top + 22);
      this._subBar.addChild(refBtn);
    } else {
      const hiredCount = STAFF.filter((s) => (save.staff[s.id] ?? 0) > 0).length;
      const info = makeText(`已录用精英 ${hiredCount}/20`, 18, COLORS.inkSoft, true);
      info.anchor.set(1, 0.5);
      info.position.set(W - PAGE_PAD - 6, top + 22);
      this._subBar.addChild(info);
    }
  }

  private _buildMissionsList(fullW: number): void {
    for (const c of this._scroll.content.removeChildren()) c.destroy({ children: true });
    const save = GameState.save;
    const now = Date.now();
    const syn = computeSynergies(save);
    const baseSec = baseIncomePerSec(save);

    let y = 0;
    const cardH = 212;

    for (let slotIdx = 0; slotIdx < 4; slotIdx++) {
      const active = activeDispatchInSlot(save, slotIdx);
      const missionId = active ? active.missionId : (save.dispatchBoard[slotIdx] ?? 'dp_osmanthus_pick');
      const mission = getMissionOrFallback(missionId);
      const done = Boolean(active && now >= active.endAt);

      const card = new PIXI.Container();
      card.position.set(0, y);
      card.addChild(makeCouturePlaque(fullW, cardH, done, false));

      // 标题 + 星级 + 需求专长徽章
      const starsStr = '★'.repeat(mission.stars);
      const title = makeText(`${starsStr} ${mission.title}`, 22, COLORS.ink, true);
      title.position.set(22, 16);
      card.addChild(title);

      let badgeX = fullW - 22;
      [...mission.requiredSpecialties].reverse().forEach((sp) => {
        const meta = SPECIALTY_META[sp];
        const bw = 68;
        const pill = new PIXI.Graphics()
          .beginFill(meta.bg, 1)
          .lineStyle(1.5, meta.color, 0.9)
          .drawRoundedRect(badgeX - bw, 16, bw, 28, 14)
          .endFill();
        const pTxt = makeText(meta.short, 15, meta.color, true);
        pTxt.anchor.set(0.5);
        pTxt.position.set(badgeX - bw / 2, 30);
        card.addChild(pill, pTxt);
        badgeX -= bw + 8;
      });

      const desc = makeText(mission.desc, 17, COLORS.inkSoft);
      desc.position.set(22, 52);
      if (desc.width > fullW - 44) desc.scale.set((fullW - 44) / desc.width);
      card.addChild(desc);

      const estCash = Math.max(mission.minCash, baseSec * mission.cashSec) * syn.rushMult;
      const rewParts = [`+¥${formatMoney(estCash)}`, `玫瑰+${mission.roses}`, `灵感+${mission.inspiration}`];
      if (mission.insiderTokens > 0) rewParts.push(`内幕券+${mission.insiderTokens}`);
      const rewTxt = makeNumText(`悬赏报酬：${rewParts.join(' · ')}`, 18, COLORS.goldDeep);
      rewTxt.position.set(22, 86);
      if (rewTxt.width > fullW - 44) rewTxt.scale.set((fullW - 44) / rewTxt.width);
      card.addChild(rewTxt);

      if (active) {
        const names = active.staffIds.map((id) => staffById(id).name).join('、');
        const greatPct = Math.round(calcDispatchGreatChance(save, mission, active.staffIds) * 100);

        if (done) {
          const readyTxt = makeText(`✦ 执行小队（${names}）已凯旋归来！大成功暴击率 ${greatPct}%`, 18, COLORS.roseDeep, true);
          readyTxt.position.set(22, 124);
          card.addChild(readyTxt);

          const claimBtn = new Button({
            width: 240,
            height: 52,
            variant: 'rose',
            fontSize: 20,
            label: '✦ 验收外勤战果',
            onTap: () => {
              if (this._scroll.dragging) return;
              const got = GameState.claimDispatch(slotIdx);
              if (!got) return;
              Platform.vibrateShort('medium');
              AudioManager.play(got.greatSuccess ? 'level_up' : 'coin_gain');
              const tag = got.greatSuccess ? '✦ 大成功暴击（2.3倍）！' : '✦ 外勤圆满完成！';
              ToastManager.show(
                `${tag} +¥${formatMoney(got.cash)} · 玫瑰+${got.roses} · 灵感+${got.inspiration}`,
                'success',
              );
            },
          });
          claimBtn.position.set(fullW - 142, cardH - 42);
          card.addChild(claimBtn);
        } else {
          const totalDur = Math.max(1, (active.endAt - active.startAt) / 1000);
          const leftSec = Math.max(0, (active.endAt - now) / 1000);
          const prog = 1 - leftSec / totalDur;

          const bar = new ProgressBar(fullW - 44, 24, COLORS.mint, 0xEAD9C3, 0.96);
          bar.progress = prog;
          bar.position.set(22, 126);
          const barLbl = makeDisplayText(
            `派遣中：${names} · 剩余 ${formatDuration(leftSec)}（大成功率 ${greatPct}%）`,
            15,
            0xFFFFFF,
            0x2C5E3E,
            3.0,
          );
          barLbl.anchor.set(0.5);
          barLbl.position.set(fullW / 2, 138);
          card.addChild(bar, barLbl);

          const tip = makeText('外勤期间不影响店员原本的门店每秒挂机收益', 15, COLORS.inkMuted);
          tip.position.set(22, 166);
          card.addChild(tip);
        }
      } else {
        const recTeam = recommendDispatchTeam(save, mission);
        const canSend = recTeam.length > 0;
        if (canSend) {
          const teamNames = recTeam.map((id) => `${staffById(id).name}[${SPECIALTY_META[staffById(id).specialty].short}]`).join(' + ');
          const greatPct = Math.round(calcDispatchGreatChance(save, mission, recTeam) * 100);
          const preview = makeText(
            `推荐小队：${teamNames} · 耗时 ${formatDuration(mission.durationSec)} · 暴击率 ${greatPct}%`,
            16,
            COLORS.mint,
            true,
          );
          preview.position.set(22, 124);
          if (preview.width > fullW - 246) preview.scale.set((fullW - 246) / preview.width);
          card.addChild(preview);
        } else {
          const empty = makeText('暂无空闲已录用店员（先去「店员」录用帅哥即可派遣）', 16, COLORS.inkMuted, true);
          empty.position.set(22, 128);
          card.addChild(empty);
        }

        const sendBtn = new Button({
          width: 210,
          height: 52,
          variant: 'gold',
          fontSize: 19,
          label: canSend ? '✦ 一键智能派遣' : '待录用空闲店员',
          onTap: () => {
            if (this._scroll.dragging) return;
            if (!canSend) {
              ToastManager.show('请先录用更多店员或等待外勤队伍归来！');
              return;
            }
            if (GameState.startDispatch(slotIdx, mission.id, recTeam)) {
              AudioManager.play('upgrade');
              ToastManager.show(`已派出小队执行「${mission.title}」！`, 'success');
            }
          },
        });
        sendBtn.setEnabled(canSend);
        sendBtn.position.set(fullW - 126, cardH - 42);
        card.addChild(sendBtn);
      }

      this._scroll.content.addChild(card);
      y += cardH + 14;
    }

    this._scroll.setContentHeight(y + 18);
  }

  private _buildManagersList(fullW: number): void {
    for (const c of this._scroll.content.removeChildren()) c.destroy({ children: true });
    const save = GameState.save;
    const hiredStaff = STAFF.filter((s) => (save.staff[s.id] ?? 0) > 0);

    let y = 0;
    const cardH = 128;

    SHOPS.forEach((shop) => {
      const opened = (save.shops[shop.id] ?? 0) > 0;
      const curMgrId = save.shopManagers[shop.id] ?? null;
      const curMgr = curMgrId ? staffById(curMgrId) : null;
      const prefMeta = SPECIALTY_META[shop.preferredSpecialty];
      const mult = shopManagerMultiplier(save, shop.id);

      const row = new PIXI.Container();
      row.position.set(0, y);
      row.addChild(makeCouturePlaque(fullW, cardH, Boolean(curMgr), false));

      const ico = makeStickerSprite(SHOP_ICONS[shop.id], 68, 68, true);
      ico.position.set(50, cardH / 2);
      row.addChild(ico);

      const nameTxt = makeText(`${shop.name}`, 23, opened ? COLORS.ink : COLORS.inkMuted, true);
      nameTxt.position.set(96, 18);
      row.addChild(nameTxt);

      const prefPill = new PIXI.Graphics()
        .beginFill(prefMeta.bg, 1)
        .lineStyle(1.4, prefMeta.color, 0.9)
        .drawRoundedRect(96 + nameTxt.width + 12, 18, 138, 28, 14)
        .endFill();
      const prefTxt = makeText(`契合：${prefMeta.label}`, 15, prefMeta.color, true);
      prefTxt.anchor.set(0.5);
      prefTxt.position.set(96 + nameTxt.width + 81, 32);
      row.addChild(prefPill, prefTxt);

      const statusStr = !opened
        ? '门店尚未开业'
        : curMgr
          ? `驻店店长：${curMgr.name}（★${staffStar(save.staff[curMgr.id] ?? 0)}·${SPECIALTY_META[curMgr.specialty].short}） → 本店产出 +${Math.round((mult - 1) * 100)}%`
          : '尚未委任驻店店长（委任契合专长店员享 ×1.35 共振）';
      const statusTxt = makeText(statusStr, 17, curMgr ? COLORS.mint : COLORS.inkSoft, true);
      statusTxt.position.set(96, 66);
      if (statusTxt.width > fullW - 290) statusTxt.scale.set((fullW - 290) / statusTxt.width);
      row.addChild(statusTxt);

      if (opened) {
        const btn = new Button({
          width: 168,
          height: 52,
          variant: curMgr ? 'gold' : 'rose',
          fontSize: 18,
          label: curMgr ? '轮换店长' : '委任主理',
          onTap: () => {
            if (this._scroll.dragging) return;
            this._cycleBestManager(shop.id, hiredStaff.map((s) => s.id));
          },
        });
        btn.setEnabled(hiredStaff.length > 0);
        btn.position.set(fullW - 102, cardH / 2);
        row.addChild(btn);
      }

      this._scroll.content.addChild(row);
      y += cardH + 12;
    });

    this._scroll.setContentHeight(y + 18);
  }

  private _cycleBestManager(shopId: ShopId, hiredIds: StaffId[]): void {
    if (!hiredIds.length) {
      ToastManager.show('请先录用店员后再委任驻店店长！');
      return;
    }
    const save = GameState.save;
    const shop = SHOPS.find((s) => s.id === shopId)!;
    // 优先排契合专长且星级高的店员
    const sorted = [...hiredIds].sort((a, b) => {
      const matchA = staffById(a).specialty === shop.preferredSpecialty ? 1000 : 0;
      const matchB = staffById(b).specialty === shop.preferredSpecialty ? 1000 : 0;
      return (matchB + (save.staff[b] ?? 0)) - (matchA + (save.staff[a] ?? 0));
    });

    const cur = save.shopManagers[shopId];
    const idx = cur ? sorted.indexOf(cur) : -1;
    const nextId = sorted[(idx + 1) % sorted.length];
    GameState.assignShopManager(shopId, nextId);
    AudioManager.play('upgrade');
    const st = staffById(nextId);
    const matched = st.specialty === shop.preferredSpecialty ? '（触发专长共振 ×1.35！）' : '';
    ToastManager.show(`已委任「${st.name}」驻守${shop.name}${matched}`, 'success');
  }
}
