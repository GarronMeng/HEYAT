import { FACILITIES, facilitySummary } from '../core/facilities';
import {
  floorCount,
  roomCount,
  type HotelState,
  type RoomStatus,
} from '../core/model';
import {
  currentGoal,
  rates,
  recommendedUpgrade,
  UPGRADES,
  upgradeCost,
  upgradeReason,
} from '../core/progression';
import type { RenderStats } from '../render/perf';
import { upgradePreview } from './upgradePreview';
import { recommendationView } from './recommendation';
import { operationView } from './actionFeedback';
import {
  GUEST_TYPES,
  guestKind,
  guestProfile,
  FACILITY_LABELS,
} from '../core/guestTypes';

const money = (value: number) =>
  `¥${Math.floor(value).toLocaleString('zh-CN')}`;
const duration = (value: number) =>
  `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(Math.floor(value % 60)).padStart(2, '0')}`;
const labels: Record<RoomStatus, string> = {
  LOCKED: '待改造',
  AVAILABLE: '净房',
  RESERVED: '办理入住',
  OCCUPIED: '入住中',
  DIRTY: '待清洁',
  CLEANING: '清洁中',
};
export interface ViewActions {
  action(name: string, value?: string): void;
}
export function createGameView(root: HTMLElement, actions: ViewActions) {
  const get = <T extends HTMLElement = HTMLElement>(selector: string) =>
    root.querySelector<T>(selector)!;
  const panel = get('#panel');
  let opener: HTMLElement | null = null;
  get('#hud').innerHTML =
    `<div class="stat"><small>可用资金</small><strong id="cash">¥0</strong></div><div class="stat"><small>累计营收</small><strong id="revenue">¥0</strong></div><div class="stat"><small>入住 / 开放</small><strong id="occupancy">0 / 1</strong></div><div class="stat"><small>品牌等级</small><strong id="brand-level">—</strong></div>`;
  get('#queue-summary').innerHTML =
    '<span id="queue-wait"></span><small id="queue-status"></small>';
  const text = (selector: string, value: string) => {
    const node = get(selector);
    if (node.textContent !== value) node.textContent = value;
  };
  const syncOpen = () => {
    panel.classList.toggle('open', open);
    panel.inert = !open;
    root
      .querySelectorAll<HTMLElement>(
        '[data-action="settings"], #upgrades, .hotel-tab',
      )
      .forEach((el) => {
        el.setAttribute('aria-controls', 'panel');
        el.setAttribute(
          'aria-expanded',
          String(open && el.dataset.action === mode),
        );
      });
  };
  const close = () => {
    open = false;
    syncOpen();
    if (opener?.isConnected) opener.focus();
  };
  let mode = 'overview',
    branch = '收益',
    selected = 101,
    open = false;
  let state: HotelState,
    stats: RenderStats,
    signature = '',
    toastTimer = 0;
  let speed = 1,
    paused = false,
    quality = 'auto';
  const heading = (title: string, copy: string) =>
    `<div class="panel-head"><h2>${title}</h2><button data-action="close" aria-label="关闭面板">×</button></div><p class="panel-copy">${copy}</p>`;
  const drawPanel = () => {
    if (!state || !open) return;
    const key = JSON.stringify([
      mode,
      branch,
      selected,
      Math.floor(state.cash),
      state.eventId,
      mode === 'room'
        ? Math.ceil(state.rooms.find((r) => r.id === selected)?.remaining ?? 0)
        : 0,
      paused,
      speed,
      quality,
      mode === 'settings' ? Math.round(stats?.fps ?? 0) : 0,
    ]);
    // Keep focused controls and scrolled content stable between economic events.
    if (key === signature) return;
    signature = key;
    const scroll = panel.querySelector('.panel-body')?.scrollTop ?? 0;
    const focused = panel.contains(document.activeElement)
      ? (document.activeElement as HTMLElement)
      : null;
    const focusAction = focused?.dataset.action,
      focusValue = focused?.dataset.value,
      focusSetting = focused?.dataset.setting;
    if (mode === 'upgrades') {
      panel.innerHTML =
        heading('升级与扩建', '每次升级都改变酒店的收入、效率或容量。') +
        `<div class="tabs">${['收益', '效率', '规模', '设施'].map((item) => `<button data-action="branch" data-value="${item}" aria-pressed="${item === branch}" class="${item === branch ? 'active' : ''}">${item}</button>`).join('')}</div><div class="panel-body">${UPGRADES.filter(
          (u) => u.branch === branch,
        )
          .map((u) => {
            const cost = upgradeCost(state, u.id),
              reason = upgradeReason(state, u.id),
              level = state.levels[u.id] ?? 0;
            return `<article class="upgrade"><h3>${u.name}<small>LV ${level} / ${u.max}</small></h3><p>${u.description}</p>${level < u.max ? `<p class="effect">${upgradePreview(state, u.id)}</p>` : ''}<button data-action="buy" data-value="${u.id}" ${reason || state.cash < cost ? 'disabled' : ''}><span>${level === u.max ? '已完成' : money(cost)}</span><span>${level === u.max ? '✓' : '升级 ↗'}</span></button>${reason && level < u.max ? `<span class="reason">${reason}</span>` : !reason && state.cash < cost ? `<span class="reason">还差 ${money(cost - state.cash)}</span>` : ''}</article>`;
          })
          .join('')}</div>`;
    } else if (mode === 'settings') {
      // Settings are updated only when the user changes an option, keeping keyboard focus intact.
      if (
        panel.dataset.mode !== mode ||
        panel.dataset.options !== `${speed}:${paused}:${quality}`
      ) {
        panel.innerHTML =
          heading('营业设置', '离开页面会暂停营业；回到这里，从上次继续。') +
          `<div class="panel-body"><label class="setting">试玩速度<select data-setting="speed" aria-label="试玩速度"><option value="1" ${speed === 1 ? 'selected' : ''}>1× 标准</option><option value="3" ${speed === 3 ? 'selected' : ''}>3× 加速</option></select></label><label class="setting">画面质量<select data-setting="quality" aria-label="画面质量">${['auto', 'high', 'medium', 'low'].map((q, i) => `<option value="${q}" ${q === quality ? 'selected' : ''}>${['自动', '高', '中', '低'][i]}</option>`).join('')}</select></label><button class="wide" data-action="pause">${paused ? '继续营业' : '暂停营业'}</button><button class="wide" data-action="export">导出存档</button><button class="wide" data-action="report">导出性能报告</button><button class="wide" data-action="help">查看玩法</button><button class="wide" data-action="reset">重新开始</button><p class="perf" id="perf"></p><p class="muted">自动画质会在持续低帧率时降低分辨率与材质成本。<br>移动端性能尚未验收<br>MOBILE_PERF_UNVERIFIED</p></div>`;
        panel.dataset.options = `${speed}:${paused}:${quality}`;
      }
      const perf = panel.querySelector('#perf');
      if (perf && stats)
        perf.textContent = `${stats.fps.toFixed(0)} FPS · ${stats.quality}\np50 ${stats.p50.toFixed(1)} / p95 ${stats.p95.toFixed(1)} ms\n${stats.calls} draws · ${stats.triangles.toLocaleString()} triangles\n${stats.width} × ${stats.height}`;
    } else if (mode === 'room') {
      const room = state.rooms.find((r) => r.id === selected)!;
      panel.innerHTML =
        heading(
          `${room.id} 号客房`,
          `第 ${room.floor} 层 · ${room.status === 'LOCKED' ? '等待你的下一次扩建' : '每一扇亮着的窗，都是一段新的旅程'}`,
        ) +
        `<div class="panel-body"><div class="room-state">${labels[room.status]}</div><div class="hint">${room.remaining > 0 ? `还需 <strong>${room.remaining.toFixed(1)} 秒</strong><br>` : ''}${
          room.order
            ? `客群 <strong>${guestProfile(room.order.guest).name}</strong><br>偏好：${guestProfile(
                room.order.guest,
              )
                .needs.map((id) => FACILITY_LABELS[id])
                .join(
                  '、',
                )}<br>本次房费 <strong>${money(room.order.revenue)}</strong><br>退房时自动到账${room.order.visits?.length ? `<br>设施：${room.order.visits.map((v) => `${FACILITY_LABELS[v.id]} ${v.status === 'served' ? '已消费' : v.status === 'serving' ? '服务中' : '待服务'} ¥${v.fee}`).join(' · ')}<br>实际完成消费退房并账` : ''}`
            : room.status === 'DIRTY'
              ? '点击下方「安排清洁」，让客房再次迎客。'
              : room.status === 'LOCKED'
                ? '在「规模」升级中开放客房。'
                : '客房已准备好，等待下一位客人。'
        }</div><button class="wide" data-action="overview">查看全部客房</button><button class="wide gold" data-action="upgrades">升级与扩建 ↗</button></div>`;
    } else {
      const rate = rates(state),
        next = recommendedUpgrade(state);
      panel.innerHTML =
        heading('今晚的酒店', '从认真接待每一位客人开始。') +
        `<div class="panel-body"><div class="hint">标准房费 <strong>${money(rate.price)}</strong> / 单<br>已接待 <strong>${state.completed}</strong> 位客人<br>品牌等级 <strong>${state.levels.brand ?? 0} / 3</strong><br>自动入住 <strong>${rate.autoDesk ? '已启用' : '待解锁'}</strong> · 自动清洁 <strong>${rate.autoClean ? '已启用' : '待解锁'}</strong></div><section class="guest-segments" aria-label="客群需求">${Object.entries(
          GUEST_TYPES,
        )
          .map(
            ([kind, profile]) =>
              `<article class="guest-segment"><b>${profile.name}</b><span>${state.queue.filter((g) => guestKind(g) === kind).length} 位排队</span><p>${profile.description} · 偏好 ${profile.needs.map((id) => FACILITY_LABELS[id]).join('、')}</p></article>`,
          )
          .join(
            '',
          )}</section><section aria-label="设施运营">${FACILITIES.filter(
          (f) => (state.levels[f.id] ?? 0) > 0,
        )
          .map((f) => {
            const v = facilitySummary(state, f.id);
            return `<article class="facility-status"><b>${v.name} · LV${v.level}</b><p>${v.serving}/${v.capacity} 服务中 · ${v.waiting} 等待 · 已服务${v.served}次<br>设施已结算 ${money(v.revenue)} · 错过服务 ${v.missed}次</p></article>`;
          })
          .join(
            '',
          )}</section><p class="eyebrow">ROOM DIRECTORY</p><div class="room-list">${state.rooms
          .filter((r) => r.floor <= floorCount(state))
          .map(
            (r) =>
              `<button data-action="room" data-value="${r.id}"><b>${r.id}</b><span>${labels[r.status]}</span></button>`,
          )
          .join(
            '',
          )}</div><p class="muted">绿灯净房 · 金灯入住 · 橙灯待清洁 · 蓝灯清洁中</p>${next ? `<button class="wide gold" data-action="recommend" data-value="${next.id}">可升级：${next.name} ↗</button>` : ''}<p class="muted">接待 → 入住 → 退房收款 → 清洁<br>短短一夜，让酒店慢慢长大。</p></div>`;
    }
    panel.dataset.mode = mode;
    const body = panel.querySelector('.panel-body');
    if (body) body.scrollTop = scroll;
    if (focused) {
      const replacement = [
        ...panel.querySelectorAll<HTMLElement>('button,select'),
      ].find((el) =>
        focusSetting
          ? el.dataset.setting === focusSetting
          : el.dataset.action === focusAction &&
            el.dataset.value === focusValue,
      );
      (replacement && !(replacement as HTMLButtonElement).disabled
        ? replacement
        : panel
      ).focus({ preventScroll: true });
    }
  };
  const show = (next: string) => {
    if (!open) opener = document.activeElement as HTMLElement;
    mode = next;
    open = true;
    signature = '';
    syncOpen();
    drawPanel();
    panel.focus({ preventScroll: true });
  };
  const click = (event: Event) => {
    const target = (event.target as HTMLElement).closest<HTMLButtonElement>(
      '[data-action]',
    );
    if (!target || target.disabled) return;
    const action = target.dataset.action!,
      value = target.dataset.value;
    if (action === 'close') {
      close();
      return;
    }
    if (['settings', 'overview', 'upgrades'].includes(action)) {
      show(action);
      return;
    }
    if (action === 'room') {
      selected = Number(value);
      show('room');
      return;
    }
    if (action === 'branch') {
      branch = value!;
      signature = '';
      drawPanel();
      return;
    }
    if (action === 'recommend') {
      branch = UPGRADES.find((u) => u.id === value)!.branch;
      show('upgrades');
      return;
    }
    actions.action(action, value);
  };
  const change = (event: Event) => {
    const target = event.target as HTMLSelectElement;
    if (target.dataset.setting)
      actions.action(target.dataset.setting, target.value);
  };
  const keydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      close();
    }
  };
  root.addEventListener('keydown', keydown);
  root.addEventListener('click', click);
  root.addEventListener('change', change);
  syncOpen();
  return {
    update(
      next: HotelState,
      renderStats: RenderStats,
      options: { speed: number; paused: boolean; quality: string },
    ) {
      state = next;
      stats = renderStats;
      ({ speed, paused, quality } = options);
      const goal = currentGoal(state),
        occupied = state.rooms.filter((r) => r.status === 'OCCUPIED').length;
      text('#cash', money(state.cash));
      text('#revenue', money(state.revenue));
      text('#occupancy', `${occupied} / ${roomCount(state)}`);
      text('#brand-level', `${state.levels.brand ?? 0} / 3`);
      text('#goal-title', goal.title);
      text('#goal-detail', goal.detail);
      get('#goal-progress').style.width = `${goal.progress * 100}%`;
      get('#clock').textContent =
        `${paused ? '已暂停' : '营业'} ${duration(state.time)}${speed === 3 ? ' · 3×' : ''}`;
      text('#queue-wait', `${state.queue.length} 位等待入住`);
      text(
        '#queue-status',
        `${state.rooms.filter((r) => r.status === 'DIRTY').length} 间待清洁 · ${rates(state).autoDesk ? '自动接待' : '手动接待'}`,
      );
      get<HTMLButtonElement>('#checkin').disabled =
        paused ||
        !state.queue.length ||
        !state.rooms.some((r) => r.status === 'AVAILABLE') ||
        state.rooms.some((r) => r.status === 'RESERVED');
      get<HTMLButtonElement>('#clean').disabled =
        paused ||
        !state.rooms.some((r) => r.status === 'DIRTY') ||
        state.rooms.some((r) => r.status === 'CLEANING');
      const recommendation = recommendedUpgrade(state);
      get('#upgrade-dot').hidden = !recommendation;
      const rec = get<HTMLButtonElement>('#recommendation');
      const recommendationSlot = recommendationView(state);
      rec.disabled = recommendationSlot.disabled;
      rec.dataset.value = recommendationSlot.id;
      text('#recommendation', recommendationSlot.label);
      get<HTMLButtonElement>('#checkin').title = paused
        ? '营业已暂停'
        : !state.queue.length
          ? '等待下一位客人'
          : !state.rooms.some((r) => r.status === 'AVAILABLE')
            ? '暂无净房，请先安排清洁'
            : '接待下一位客人';
      get<HTMLButtonElement>('#clean').title = paused
        ? '营业已暂停'
        : !state.rooms.some((r) => r.status === 'DIRTY')
          ? '当前没有待清洁客房'
          : '安排一间客房清洁';
      for (const action of ['checkin', 'clean'] as const) {
        const operation = operationView(state, action);
        const button = get<HTMLButtonElement>(`#${action}`);
        text(
          `#${action}-meta`,
          operation.label +
            (operation.expected ? ` · 预计 ¥${operation.expected}` : ''),
        );
        button.style.setProperty(
          '--operation-progress',
          String(operation.progress),
        );
        button.setAttribute('aria-busy', String(operation.busy));
      }
      drawPanel();
    },
    selectRoom(id: number) {
      selected = id;
      show('room');
    },
    feedback(action: string, message: string, kind = 'action') {
      const layer = get('#feedback-layer');
      const button = get(`#${action === 'buy' ? 'upgrades' : action}`);
      const rect = button.getBoundingClientRect();
      const chip = document.createElement('span');
      chip.className = 'feedback-chip';
      chip.dataset.kind = kind;
      chip.textContent = message;
      chip.style.left = `${Math.max(8, Math.min(innerWidth - 288, rect.x))}px`;
      chip.style.top = `${Math.max(10, rect.y - 46 - layer.children.length * 34)}px`;
      while (layer.children.length >= 6) layer.firstElementChild!.remove();
      layer.append(chip);
      chip.addEventListener('animationend', () => chip.remove(), {
        once: true,
      });
    },
    toast(message: string) {
      const el = get('#toast');
      el.textContent = message;
      el.hidden = false;
      clearTimeout(toastTimer);
      toastTimer = window.setTimeout(() => (el.hidden = true), 3200);
    },
    saveStatus(message: string) {
      get('#save-status').textContent = message;
    },
    setOpen(value: boolean) {
      open = value;
      syncOpen();
    },
    dispose() {
      root.removeEventListener('keydown', keydown);
      root.removeEventListener('click', click);
      root.removeEventListener('change', change);
      clearTimeout(toastTimer);
    },
  };
}
