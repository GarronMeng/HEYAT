import { guestMix } from './guestTypes';
import {
  floorCount,
  roomCount,
  transition,
  type CommandResult,
  type HotelState,
} from './model';

export interface Upgrade {
  id: string;
  branch: '收益' | '效率' | '规模';
  name: string;
  description: string;
  base: number;
  growth: number;
  max: number;
  requires: (state: HotelState) => string | null;
}
const level = (state: HotelState, id: string) => state.levels[id] ?? 0;
const none = () => null;
export const UPGRADES: readonly Upgrade[] = [
  {
    id: 'price',
    branch: '收益',
    name: '一夜好眠的定价',
    description: '每单房费提高 22%，不降低客流',
    base: 90,
    growth: 1.9,
    max: 6,
    requires: none,
  },
  {
    id: 'bed',
    branch: '收益',
    name: '云朵床垫',
    description: '每单增加 ¥30；客房换上更好的床具',
    base: 240,
    growth: 2.2,
    max: 3,
    requires: none,
  },
  {
    id: 'luxury',
    branch: '收益',
    name: '套房的体面',
    description: '每单增加 ¥100，停留周期缩短；升级客房软装',
    base: 1300,
    growth: 3,
    max: 3,
    requires: (s) => (level(s, 'bed') ? null : '先升级云朵床垫'),
  },
  {
    id: 'vip',
    branch: '收益',
    name: '「像回家一样」礼遇',
    description: '吸引环球客，提高其房费支付意愿；会员各有设施偏好',
    base: 4200,
    growth: 3,
    max: 2,
    requires: (s) =>
      level(s, 'brand') && level(s, 'luxury')
        ? null
        : '需要品牌等级 1 与套房改造',
  },
  {
    id: 'desk',
    branch: '效率',
    name: '少一句「请稍等」',
    description: '缩短办理入住时间，提高前台吞吐',
    base: 160,
    growth: 2,
    max: 4,
    requires: none,
  },
  {
    id: 'autodesk',
    branch: '效率',
    name: '自动入住机',
    description: '前台自动接待下一位客人，解放双手',
    base: 500,
    growth: 1,
    max: 1,
    requires: (s) =>
      s.completed >= 9 ? null : `再完成 ${Math.max(0, 9 - s.completed)} 单入住`,
  },
  {
    id: 'clean',
    branch: '效率',
    name: '客房管家的魔法',
    description: '缩短清洁周期，脏房更快变净房',
    base: 180,
    growth: 2,
    max: 4,
    requires: none,
  },
  {
    id: 'autoclean',
    branch: '效率',
    name: '自动客房服务',
    description: '退房后自动安排清洁，酒店开始连续运转',
    base: 2200,
    growth: 1,
    max: 1,
    requires: (s) => (level(s, 'autodesk') ? null : '先解锁自动入住机'),
  },
  {
    id: 'marketing',
    branch: '规模',
    name: '这家酒店有点东西',
    description: '增加到店需求；注意前台和净房瓶颈',
    base: 350,
    growth: 2.2,
    max: 4,
    requires: none,
  },
  {
    id: 'room',
    branch: '规模',
    name: '再亮起一扇窗',
    description: '开放当前楼层下一间客房，增加真实容量',
    base: 240,
    growth: 1.65,
    max: 11,
    requires: (s) =>
      s.rooms.some((r) => r.status === 'LOCKED' && r.floor <= floorCount(s))
        ? null
        : floorCount(s) < 3
          ? '当前楼层已满，请先扩建楼层'
          : '所有客房均已开放',
  },
  {
    id: 'floor',
    branch: '规模',
    name: '把梦想再盖高一层',
    description: '增加一层建筑，解锁四间可改造客房',
    base: 23000,
    growth: 3,
    max: 2,
    requires: (s) =>
      roomCount(s) >= floorCount(s) * 4 ? null : '先开放当前楼层的四间客房',
  },
  {
    id: 'brand',
    branch: '规模',
    name: '城市夜色中的名片',
    description: '提升品牌等级与房费，完成精品酒店里程碑',
    base: 2000,
    growth: 3.8,
    max: 3,
    requires: (s) =>
      roomCount(s) < 4
        ? '需要四间开放客房'
        : level(s, 'brand') >= floorCount(s)
          ? '请先扩建下一层'
          : null,
  },
];
export function upgradeCost(state: HotelState, id: string): number {
  const upgrade = UPGRADES.find((item) => item.id === id);
  return upgrade
    ? Math.ceil(upgrade.base * upgrade.growth ** level(state, id))
    : Infinity;
}
export function upgradeReason(state: HotelState, id: string): string | null {
  const upgrade = UPGRADES.find((item) => item.id === id);
  if (!upgrade) return '未知升级';
  if (level(state, id) >= upgrade.max) return '已升至满级';
  return upgrade.requires(state);
}
export function rates(state: HotelState) {
  return {
    price: Math.round(
      (90 * 1.22 ** level(state, 'price') +
        30 * level(state, 'bed') +
        100 * level(state, 'luxury')) *
        (1 + 0.2 * level(state, 'brand')),
    ),
    checkIn: 2 / (1 + 0.35 * level(state, 'desk')),
    clean: 5 / (1 + 0.3 * level(state, 'clean')),
    stay: 18 / (1 + 0.12 * level(state, 'luxury')),
    arrival: 6 / (1 + 0.3 * level(state, 'marketing')),
    autoDesk: !!level(state, 'autodesk'),
    autoClean: !!level(state, 'autoclean'),
    vipChance: guestMix(state).globalist,
  };
}
export function buyUpgrade(state: HotelState, id: string): CommandResult {
  const reason = upgradeReason(state, id);
  if (reason) return { ok: false, message: reason };
  const cost = upgradeCost(state, id);
  if (state.cash < cost)
    return {
      ok: false,
      message: `还差 ¥${Math.ceil(cost - state.cash).toLocaleString('zh-CN')}`,
    };
  state.cash -= cost;
  state.levels[id] = level(state, id) + 1;
  state.eventId++;
  if (id === 'room')
    transition(
      state.rooms.find(
        (room) => room.status === 'LOCKED' && room.floor <= floorCount(state),
      )!,
      'AVAILABLE',
      state,
    );
  return {
    ok: true,
    message: `${UPGRADES.find((item) => item.id === id)!.name} · 已升级`,
  };
}
export function currentGoal(state: HotelState): {
  title: string;
  detail: string;
  progress: number;
} {
  if (state.completed < 1)
    return {
      title: '迎接第一位客人',
      detail: '点击「接待入住」，等待客人退房后收取房费',
      progress: state.rooms.some((r) => r.status === 'OCCUPIED') ? 0.6 : 0.1,
    };
  if (!level(state, 'autodesk'))
    return {
      title: '让前台自己转起来',
      detail: `完成 9 单并购买自动入住机 · ${state.completed}/9 单`,
      progress: Math.min(1, state.completed / 9),
    };
  if (!level(state, 'autoclean'))
    return {
      title: '解锁自动客房服务',
      detail: '退房、清洁、再次入住，形成连续运转',
      progress: Math.min(1, state.cash / 2200),
    };
  if (floorCount(state) < 3)
    return {
      title: '向城市夜空生长',
      detail: `开放客房并扩建至三层 · 当前 ${floorCount(state)} 层 / ${roomCount(state)} 间`,
      progress: roomCount(state) / 12,
    };
  if (roomCount(state) < 12)
    return {
      title: '点亮最后一扇窗',
      detail: `开放全部 12 间客房 · ${roomCount(state)}/12`,
      progress: roomCount(state) / 12,
    };
  return {
    title: state.won ? '属于你的城市精品酒店' : '成为城市夜色中的名片',
    detail: `品牌 3 级 · 累计房费 ¥200,000 · 当前 ¥${state.revenue.toLocaleString('zh-CN')}`,
    progress: Math.min(1, state.revenue / 200000),
  };
}
export function recommendedUpgrade(state: HotelState): Upgrade | undefined {
  const order = [
    'autodesk',
    'autoclean',
    'room',
    'price',
    'clean',
    'bed',
    'floor',
    'luxury',
    'brand',
    'desk',
    'vip',
    'marketing',
  ];
  return order
    .map((id) => UPGRADES.find((item) => item.id === id)!)
    .find(
      (item) =>
        !upgradeReason(state, item.id) &&
        upgradeCost(state, item.id) <= state.cash,
    );
}
