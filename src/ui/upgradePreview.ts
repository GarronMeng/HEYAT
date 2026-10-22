import { FACILITIES, facilityOffer } from '../core/facilities';
import type { HotelState } from '../core/model';
import { floorCount, roomCount } from '../core/model';
import { rates } from '../core/progression';
/** A hypothetical snapshot, never a purchase or mutation of the actual save. */
export function upgradePreview(state: HotelState, id: string): string {
  const next = {
    ...state,
    levels: { ...state.levels, [id]: (state.levels[id] ?? 0) + 1 },
  };
  const before = rates(state),
    after = rates(next);
  if (FACILITIES.some((f) => f.id === id)) {
    const key = id as 'breakfast' | 'gym' | 'lounge' | 'rooftop';
    const a = facilityOffer(state, key),
      b = facilityOffer(next, key);
    return `服务位 ${a.capacity} → ${b.capacity} · 单次 ¥${b.fee} · ${b.duration.toFixed(1)} 秒`;
  }
  if (['price', 'bed', 'luxury', 'brand'].includes(id))
    return `标准房费 ¥${before.price} → ¥${after.price} / 单`;
  if (id === 'desk')
    return `办理入住 ${before.checkIn.toFixed(1)} → ${after.checkIn.toFixed(1)} 秒`;
  if (id === 'clean')
    return `清洁周期 ${before.clean.toFixed(1)} → ${after.clean.toFixed(1)} 秒`;
  if (id === 'marketing')
    return `到店间隔 ${before.arrival.toFixed(1)} → ${after.arrival.toFixed(1)} 秒`;
  if (id === 'autodesk') return '手动接待 → 自动接待';
  if (id === 'autoclean') return '手动清洁 → 自动清洁';
  if (id === 'room')
    return `开放客房 ${roomCount(state)} → ${roomCount(state) + 1} 间`;
  if (id === 'floor')
    return `客房楼层 ${floorCount(state)} → ${floorCount(state) + 1} 层`;
  return `环球客房费倍率 ${(1.45 + 0.25 * (state.levels.vip ?? 0)).toFixed(2)} → ${(1.45 + 0.25 * (next.levels.vip ?? 0)).toFixed(2)}`;
}
