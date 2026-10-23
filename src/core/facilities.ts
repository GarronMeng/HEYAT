import {
  roomCount,
  floorCount,
  type FacilityId,
  type FacilityVisit,
  type Guest,
  type HotelState,
  type Order,
} from './model';
import { guestProfile, FACILITY_LABELS } from './guestTypes';
export const FACILITIES = [
  {
    id: 'breakfast',
    cost: 900,
    fee: 18,
    duration: 3,
    rooms: 4,
    brand: 0,
    floor: 1,
    description: '早餐备餐与堂食，普通客户和会员均偏好',
  },
  {
    id: 'gym',
    cost: 1800,
    fee: 12,
    duration: 4,
    rooms: 4,
    brand: 0,
    floor: 1,
    description: '器械训练，服务探险家的运动需求',
  },
  {
    id: 'lounge',
    cost: 6000,
    fee: 45,
    duration: 3,
    rooms: 4,
    brand: 1,
    floor: 2,
    description: '行政接待与茶点，服务环球客礼遇需求',
  },
  {
    id: 'rooftop',
    cost: 14000,
    fee: 30,
    duration: 4,
    rooms: 8,
    brand: 2,
    floor: 3,
    description: '夜间酒吧服务，拓展环球客的天台体验',
  },
] as const;
export function facilityReason(state: HotelState, id: FacilityId) {
  const f = FACILITIES.find((f) => f.id === id)!;
  if (roomCount(state) < f.rooms) return `需要 ${f.rooms} 间开放客房`;
  if (floorCount(state) < f.floor) return `需要 ${f.floor} 层客房`;
  if ((state.levels.brand ?? 0) < f.brand) return `需要品牌 ${f.brand} 级`;
  return null;
}
export function facilityOffer(state: HotelState, id: FacilityId) {
  const f = FACILITIES.find((f) => f.id === id)!,
    level = Math.min(3, state.levels[id] ?? 0);
  return {
    capacity: level,
    fee: Math.ceil(f.fee * (1 + 0.3 * Math.max(0, level - 1))),
    duration: f.duration / (1 + 0.2 * Math.max(0, level - 1)),
  };
}
export function planFacilityVisits(
  state: HotelState,
  guest: Guest,
): FacilityVisit[] {
  return guestProfile(guest)
    .needs.filter((id) => (state.levels[id] ?? 0) > 0)
    .map((id) => {
      const offer = facilityOffer(state, id);
      return {
        id,
        fee: offer.fee,
        duration: offer.duration,
        remaining: offer.duration,
        status: 'queued' as const,
      };
    });
}
const stats = (state: HotelState, id: FacilityId) => {
  state.facilityStats ??= {};
  return (state.facilityStats[id] ??= { served: 0, missed: 0, revenue: 0 });
};
/** Shared staff capacity per venue; fees are locked at admission, earned only at checkout. */
export function serviceFacilityVisits(state: HotelState, delta: number) {
  for (const f of FACILITIES) {
    const jobs = state.rooms
      .filter((r) => r.status === 'OCCUPIED')
      .sort((a, b) => a.order!.id - b.order!.id)
      .flatMap((r) => (r.order?.visits ?? []).filter((v) => v.id === f.id));
    for (const job of jobs.filter((v) => v.status === 'serving')) {
      job.remaining = Math.max(
        0,
        Math.round((job.remaining - delta) * 1000) / 1000,
      );
      if (job.remaining === 0) {
        job.status = 'served';
        stats(state, f.id).served++;
        state.eventId++;
      }
    }
    let available =
      facilityOffer(state, f.id).capacity -
      jobs.filter((v) => v.status === 'serving').length;
    for (const job of jobs.filter((v) => v.status === 'queued')) {
      if (available-- <= 0) break;
      job.status = 'serving';
      state.eventId++;
    }
  }
}
export function facilityTotal(order: Order) {
  return (order.visits ?? [])
    .filter((v) => v.status === 'served')
    .reduce((n, v) => n + v.fee, 0);
}
export function settleFacilityVisits(state: HotelState, order: Order) {
  const breakdown: Partial<Record<FacilityId, number>> = {};
  for (const visit of order.visits ?? []) {
    if (visit.status === 'served') {
      stats(state, visit.id).revenue += visit.fee;
      breakdown[visit.id] = visit.fee;
    } else {
      stats(state, visit.id).missed++;
      visit.status = 'missed';
    }
  }
  return breakdown;
}
export function facilitySummary(state: HotelState, id: FacilityId) {
  const visits = state.rooms
    .flatMap((r) => r.order?.visits ?? [])
    .filter((v) => v.id === id);
  return {
    name: FACILITY_LABELS[id],
    level: state.levels[id] ?? 0,
    ...facilityOffer(state, id),
    serving: visits.filter((v) => v.status === 'serving').length,
    waiting: visits.filter((v) => v.status === 'queued').length,
    ...(state.facilityStats?.[id] ?? { served: 0, missed: 0, revenue: 0 }),
  };
}
