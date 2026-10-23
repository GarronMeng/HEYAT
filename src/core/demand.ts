import { GUEST_TYPES, guestProfile } from './guestTypes';
import type { GuestKind, HotelState, Order } from './model';
/** Channels are earned independently of room capacity. All rates are leads / game second. */
export const DEMAND_CONFIG = {
  walkIn: 1 / 6,
  bookingPerMarketing: 0.085,
  corporatePerBrand: 0.065,
  corporateLounge: 0.025,
  repeatAtFullLoyalty: 0.16,
  loyaltyGain: 0.01,
  priceSensitivity: 0.14,
} as const;
export function demandState(state: HotelState) {
  return (state.demand ??= {
    offered: 0,
    converted: 0,
    rejected: 0,
    queueLost: 0,
    patienceLost: 0,
    loyalty: 0,
    reputation: 0.5,
    utilisation: 0,
  });
}
export function demandChannels(state: HotelState) {
  return {
    walkIn: DEMAND_CONFIG.walkIn,
    bookings: DEMAND_CONFIG.bookingPerMarketing * (state.levels.marketing ?? 0),
    corporate:
      DEMAND_CONFIG.corporatePerBrand * (state.levels.brand ?? 0) +
      ((state.levels.lounge ?? 0) > 0 ? DEMAND_CONFIG.corporateLounge : 0),
    repeat: DEMAND_CONFIG.repeatAtFullLoyalty * (state.demand?.loyalty ?? 0),
  };
}
export function leadInterval(state: HotelState) {
  return 1 / Object.values(demandChannels(state)).reduce((a, b) => a + b, 0);
}
export function conversionChance(
  state: HotelState,
  kind: GuestKind,
  price: number,
) {
  const needs = GUEST_TYPES[kind].needs;
  const fit =
    needs.filter((id) => (state.levels[id] ?? 0) > 0).length / needs.length;
  const fairPrice =
    (90 + 30 * (state.levels.bed ?? 0) + 100 * (state.levels.luxury ?? 0)) *
    (1 + 0.2 * (state.levels.brand ?? 0));
  return Math.max(
    0.4,
    Math.min(
      0.97,
      0.82 +
        0.12 * fit +
        0.1 * (state.demand?.reputation ?? 0.5) -
        DEMAND_CONFIG.priceSensitivity * Math.max(0, price / fairPrice - 1.2),
    ),
  );
}
export function recordExperience(state: HotelState, order: Order) {
  const d = demandState(state);
  const needs = guestProfile(order.guest).needs;
  const fulfilled =
    needs.filter((id) =>
      order.visits?.some((v) => v.id === id && v.status === 'served'),
    ).length / needs.length;
  const quality = 0.65 + 0.35 * fulfilled;
  d.reputation += (quality - d.reputation) * 0.04;
  d.loyalty = Math.min(
    1,
    d.loyalty + DEMAND_CONFIG.loyaltyGain * (quality - 0.4),
  );
}
export function cleaningSlots(state: HotelState) {
  return 1 + Math.floor((state.levels.clean ?? 0) / 2);
}
export function demandDiagnosis(state: HotelState) {
  const open = state.rooms.filter((r) => r.status !== 'LOCKED').length;
  const dirty = state.rooms.filter((r) => r.status === 'DIRTY').length;
  const reserved = state.rooms.some((r) => r.status === 'RESERVED');
  if (dirty >= Math.max(1, open / 3))
    return '净房供应不足：升级清洁班组或安排清洁';
  if (state.queue.length >= 2 && reserved) return '前台积压：升级接待效率';
  if (
    open >= 4 &&
    state.queue.length < 2 &&
    (state.demand?.utilisation ?? 0) < 0.65
  )
    return '需求不足：拓展预订/企业渠道，完善偏好设施以积累回头客';
  return '供需运转中：扩建前观察净房、排队和渠道转化';
}
