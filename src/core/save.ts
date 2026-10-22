import { assertHotel, ROOM_STATES, type Guest, type HotelState } from './model';

const numeric = (value: unknown): value is number =>
  typeof value === 'number' &&
  Number.isFinite(value) &&
  value >= 0 &&
  value <= Number.MAX_SAFE_INTEGER;
const integer = (value: unknown): value is number =>
  numeric(value) && Number.isInteger(value);
const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const guest = (value: unknown): value is Guest =>
  object(value) &&
  integer(value.id) &&
  typeof value.name === 'string' &&
  value.name.length <= 40 &&
  numeric(value.arrivedAt) &&
  typeof value.vip === 'boolean';

/** Deliberately rejects unknown schemas; wall clock is never used to award income. */
export function decodeSave(raw: string): HotelState {
  if (raw.length > 200_000) throw new Error('存档过大');
  const value: unknown = JSON.parse(raw);
  if (!object(value) || value.version !== 1) throw new Error('存档版本不兼容');
  for (const key of [
    'time',
    'cash',
    'revenue',
    'completed',
    'lost',
    'nextGuest',
    'nextOrder',
    'nextArrival',
    'seed',
    'eventId',
  ]) {
    if (!numeric(value[key])) throw new Error('存档数值损坏');
  }
  for (const key of [
    'completed',
    'lost',
    'nextGuest',
    'nextOrder',
    'seed',
    'eventId',
  ])
    if (!integer(value[key])) throw new Error('存档计数损坏');
  if (
    !object(value.levels) ||
    Object.values(value.levels).some((level) => !integer(level) || level > 100)
  )
    throw new Error('升级存档损坏');
  if (
    !Array.isArray(value.queue) ||
    value.queue.length > 12 ||
    !value.queue.every(guest)
  )
    throw new Error('客流存档损坏');
  if (!Array.isArray(value.rooms) || value.rooms.length !== 12)
    throw new Error('客房存档损坏');
  for (const [index, room] of value.rooms.entries()) {
    if (
      !object(room) ||
      room.id !== 101 + Math.floor(index / 4) * 100 + (index % 4) ||
      room.floor !== Math.floor(index / 4) + 1 ||
      room.slot !== index % 4 ||
      !ROOM_STATES.includes(room.status as never) ||
      !numeric(room.changedAt) ||
      !numeric(room.remaining)
    )
      throw new Error('房态存档损坏');
    if (
      room.order !== null &&
      (!object(room.order) ||
        !integer(room.order.id) ||
        !numeric(room.order.revenue) ||
        !guest(room.order.guest))
    )
      throw new Error('订单存档损坏');
  }
  if (
    !Array.isArray(value.receipts) ||
    value.receipts.length > 100 ||
    value.receipts.some(
      (receipt) =>
        !object(receipt) ||
        !integer(receipt.orderId) ||
        !numeric(receipt.revenue) ||
        !numeric(receipt.at) ||
        typeof receipt.guest !== 'string',
    )
  )
    throw new Error('账本存档损坏');
  if (
    typeof value.won !== 'boolean' ||
    (value.wonAt !== null && !numeric(value.wonAt))
  )
    throw new Error('进度存档损坏');
  const state = value as unknown as HotelState;
  const activeIds = state.rooms.flatMap((room) =>
    room.order ? [room.order.id] : [],
  );
  if (
    Math.max(0, ...activeIds, ...state.receipts.map((row) => row.orderId)) >=
    state.nextOrder
  )
    throw new Error('订单序号损坏');
  if (state.queue.some((item) => item.id >= state.nextGuest))
    throw new Error('客人序号损坏');
  assertHotel(state);
  return state;
}
export function encodeSave(state: HotelState): string {
  assertHotel(state);
  return JSON.stringify(state);
}
