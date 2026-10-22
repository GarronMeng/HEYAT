export const STEP = 0.1;
export const SAVE_VERSION = 1;
export const ROOM_STATES = [
  'LOCKED',
  'AVAILABLE',
  'RESERVED',
  'OCCUPIED',
  'DIRTY',
  'CLEANING',
] as const;
export type RoomStatus = (typeof ROOM_STATES)[number];
export const GUEST_KINDS = ['standard', 'explorer', 'globalist'] as const;
export type GuestKind = (typeof GUEST_KINDS)[number];
export interface Guest {
  kind?: GuestKind;
  id: number;
  name: string;
  arrivedAt: number;
  vip: boolean;
}
export interface Order {
  id: number;
  guest: Guest;
  revenue: number;
}
export interface Room {
  id: number;
  floor: number;
  slot: number;
  status: RoomStatus;
  changedAt: number;
  remaining: number;
  order: Order | null;
}
export interface Receipt {
  orderId: number;
  revenue: number;
  at: number;
  guest: string;
}
export interface HotelState {
  version: 1;
  time: number;
  seed: number;
  cash: number;
  revenue: number;
  completed: number;
  lost: number;
  nextGuest: number;
  nextOrder: number;
  nextArrival: number;
  rooms: Room[];
  queue: Guest[];
  levels: Record<string, number>;
  receipts: Receipt[];
  eventId: number;
  won: boolean;
  wonAt: number | null;
}
export type Command =
  { type: 'CHECK_IN' } | { type: 'CLEAN' } | { type: 'BUY'; id: string };
export interface CommandResult {
  ok: boolean;
  message: string;
}

export function initialHotel(seed = 1731): HotelState {
  return {
    version: SAVE_VERSION,
    time: 0,
    seed: seed >>> 0 || 1,
    cash: 120,
    revenue: 0,
    completed: 0,
    lost: 0,
    nextGuest: 2,
    nextOrder: 1,
    nextArrival: 6,
    rooms: Array.from({ length: 12 }, (_, index) => ({
      id: 101 + Math.floor(index / 4) * 100 + (index % 4),
      floor: Math.floor(index / 4) + 1,
      slot: index % 4,
      status: index === 0 ? 'AVAILABLE' : 'LOCKED',
      changedAt: 0,
      remaining: 0,
      order: null,
    })),
    queue: [{ id: 1, name: '林女士', arrivedAt: 0, vip: false }],
    levels: {},
    receipts: [],
    eventId: 0,
    won: false,
    wonAt: null,
  };
}

export function random(state: HotelState): number {
  let x = state.seed;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  state.seed = x >>> 0;
  return state.seed / 4294967296;
}

export function roomCount(state: HotelState): number {
  return state.rooms.filter((room) => room.status !== 'LOCKED').length;
}
export function floorCount(state: HotelState): number {
  return 1 + (state.levels.floor ?? 0);
}
export function transition(
  room: Room,
  status: RoomStatus,
  state: HotelState,
  remaining = 0,
) {
  room.status = status;
  room.changedAt = state.time;
  room.remaining = remaining;
  state.eventId++;
}

export function assertHotel(state: HotelState): void {
  const finite = [
    state.time,
    state.cash,
    state.revenue,
    state.completed,
    state.nextArrival,
  ];
  if (finite.some((value) => !Number.isFinite(value) || value < 0))
    throw new Error('经营数值无效');
  if (
    state.rooms.length !== 12 ||
    new Set(state.rooms.map((room) => room.id)).size !== 12
  )
    throw new Error('房间编号不唯一');
  const guestsToValidate = [
    ...state.queue,
    ...state.rooms.flatMap((r) => (r.order ? [r.order.guest] : [])),
  ];
  if (
    guestsToValidate.some(
      (g) => g.kind !== undefined && !GUEST_KINDS.includes(g.kind),
    )
  )
    throw new Error('客群类型无效');
  if (state.queue.length > 12) throw new Error('队列超限');
  const orders = state.rooms.flatMap((room) =>
    room.order ? [room.order.id] : [],
  );
  if (new Set(orders).size !== orders.length) throw new Error('订单重复占房');
  const guests = [
    ...state.queue.map((guest) => guest.id),
    ...state.rooms.flatMap((room) => (room.order ? [room.order.guest.id] : [])),
  ];
  if (new Set(guests).size !== guests.length)
    throw new Error('同一客人被重复分配');
  for (const room of state.rooms) {
    if (
      !ROOM_STATES.includes(room.status) ||
      !Number.isFinite(room.remaining) ||
      room.remaining < 0
    )
      throw new Error('房态无效');
    if (
      (room.status === 'RESERVED' || room.status === 'OCCUPIED') !==
      (room.order !== null)
    )
      throw new Error('房态与订单不一致');
  }
  const receipts = state.receipts.map((receipt) => receipt.orderId);
  if (new Set(receipts).size !== receipts.length) throw new Error('重复结算');
  if (orders.some((id) => receipts.includes(id)))
    throw new Error('已结算订单仍占房');
}
