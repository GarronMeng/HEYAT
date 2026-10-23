import type { Guest, GuestKind, HotelState } from './model';
/** Preferences and service economics are data, never decisions in the renderer. */
export const GUEST_TYPES = {
  standard: {
    name: '普通客户',
    roomFactor: 1,
    stayFactor: 1,
    patience: 35,
    needs: ['breakfast'],
    description: '重视房价与早餐，基础客流',
  },
  explorer: {
    name: '探险家',
    roomFactor: 1.12,
    stayFactor: 1.15,
    patience: 45,
    needs: ['breakfast', 'gym'],
    description: '愿为舒适和运动付费，停留稍长',
  },
  globalist: {
    name: '环球客',
    roomFactor: 1.45,
    stayFactor: 1.3,
    patience: 22,
    needs: ['breakfast', 'lounge', 'rooftop'],
    description: '看重行政礼遇和夜间体验，等待耐心较短',
  },
} as const;
export const FACILITY_LABELS: Record<string, string> = {
  breakfast: '早餐厅',
  gym: '健身房',
  lounge: '行政酒廊',
  rooftop: '天台酒吧',
};
export function guestKind(guest: Guest): GuestKind {
  return guest.kind ?? (guest.vip ? 'globalist' : 'standard');
}
export function guestProfile(guest: Guest) {
  return GUEST_TYPES[guestKind(guest)];
}
export function guestMix(state: HotelState) {
  const globalist =
    (state.levels.vip ?? 0) > 0
      ? Math.min(
          0.35,
          0.08 +
            0.06 * (state.levels.vip ?? 0) +
            0.015 * (state.levels.brand ?? 0),
        )
      : 0;
  const explorer = Math.min(
    0.5,
    0.15 +
      0.05 * (state.levels.marketing ?? 0) +
      0.025 * (state.levels.brand ?? 0),
  );
  return { globalist, explorer, standard: 1 - globalist - explorer };
}
export function chooseGuestKind(state: HotelState, roll: number): GuestKind {
  const { globalist, explorer } = guestMix(state);
  return roll < globalist
    ? 'globalist'
    : roll < globalist + explorer
      ? 'explorer'
      : 'standard';
}
export function guestRoomRevenue(
  price: number,
  vipLevel: number,
  guest: Guest,
) {
  // Already-issued orders stay frozen; old v1 VIP guests preserve the legacy quote formula.
  if (!guest.kind)
    return Math.round(price * (guest.vip ? 1 + 0.75 * vipLevel : 1));
  return Math.round(
    price *
      (guest.kind === 'globalist'
        ? GUEST_TYPES.globalist.roomFactor + 0.25 * vipLevel
        : GUEST_TYPES[guest.kind].roomFactor),
  );
}
