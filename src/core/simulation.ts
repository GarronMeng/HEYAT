import {
  assertHotel,
  initialHotel,
  random,
  STEP,
  transition,
  type Command,
  type CommandResult,
  type HotelState,
} from './model';
import { buyUpgrade, rates } from './progression';
import { chooseGuestKind, guestProfile, guestRoomRevenue } from './guestTypes';

export const baseRates = {
  stay: 18,
  checkIn: 2,
  clean: 5,
  arrival: 6,
  price: 90,
};

export function admit(state: HotelState): CommandResult {
  if (!state.queue.length) return { ok: false, message: '客人正在路上' };
  if (state.rooms.some((room) => room.status === 'RESERVED'))
    return { ok: false, message: '前台正在办理入住' };
  const room = state.rooms.find((room) => room.status === 'AVAILABLE');
  if (!room) return { ok: false, message: '暂无净房，请先安排清洁' };
  const guest = state.queue.shift()!;
  room.order = {
    id: state.nextOrder++,
    guest,
    revenue: guestRoomRevenue(rates(state).price, state.levels.vip ?? 0, guest),
  };
  transition(room, 'RESERVED', state, rates(state).checkIn);
  return { ok: true, message: `${guest.name}正在办理 ${room.id} 房入住` };
}

export function clean(state: HotelState): CommandResult {
  if (state.rooms.some((room) => room.status === 'CLEANING'))
    return { ok: false, message: '客房管家正在清洁' };
  const room = state.rooms.find((room) => room.status === 'DIRTY');
  if (!room) return { ok: false, message: '所有开放客房都很整洁' };
  transition(room, 'CLEANING', state, rates(state).clean);
  return { ok: true, message: `已安排清洁 ${room.id} 房` };
}

export function tick(state: HotelState) {
  state.time = Math.round((state.time + STEP) * 10) / 10;
  for (const room of state.rooms) {
    if (!['RESERVED', 'OCCUPIED', 'CLEANING'].includes(room.status)) continue;
    room.remaining = Math.max(0, Math.round((room.remaining - STEP) * 10) / 10);
    if (room.remaining > 0) continue;
    if (room.status === 'RESERVED')
      transition(
        room,
        'OCCUPIED',
        state,
        rates(state).stay *
          (room.order!.guest.kind
            ? guestProfile(room.order!.guest).stayFactor
            : 1),
      );
    else if (room.status === 'OCCUPIED') {
      const order = room.order!;
      state.cash += order.revenue;
      state.revenue += order.revenue;
      state.completed++;
      state.receipts.push({
        orderId: order.id,
        revenue: order.revenue,
        at: state.time,
        guest: order.guest.name,
      });
      state.receipts = state.receipts.slice(-100);
      room.order = null;
      transition(room, 'DIRTY', state);
    } else transition(room, 'AVAILABLE', state);
  }
  const patient = state.queue.filter(
    (g) => !g.kind || state.time - g.arrivedAt <= guestProfile(g).patience,
  );
  if (state.queue.length !== patient.length) state.eventId++;
  state.lost += state.queue.length - patient.length;
  state.queue = patient;
  if (state.time >= state.nextArrival) {
    const names = ['周先生', '陈女士', 'Alex', '林女士', '许先生', 'Jamie'];
    const kind = chooseGuestKind(state, random(state));
    const guest = {
      kind,
      id: state.nextGuest++,
      name: names[Math.floor(random(state) * names.length)]!,
      arrivedAt: state.time,
      vip: kind === 'globalist',
    };
    state.eventId++;
    if (state.queue.length < 12) state.queue.push(guest);
    else state.lost++;
    state.nextArrival =
      state.time + rates(state).arrival * (0.85 + random(state) * 0.3);
  }
  if (rates(state).autoClean) clean(state);
  if (rates(state).autoDesk) admit(state);
  if (
    !state.won &&
    state.rooms.every((room) => room.status !== 'LOCKED') &&
    (state.levels.brand ?? 0) === 3 &&
    state.revenue >= 200000
  ) {
    state.won = true;
    state.wonAt = state.time;
    state.eventId++;
  }
}

export class HotelSimulation {
  private state: HotelState;
  private accumulator = 0;
  constructor(state: HotelState = initialHotel()) {
    assertHotel(state);
    this.state = structuredClone(state);
  }
  snapshot(): HotelState {
    return structuredClone(this.state);
  }
  command(command: Command): CommandResult {
    if (command.type === 'CHECK_IN') return admit(this.state);
    if (command.type === 'CLEAN') return clean(this.state);
    return buyUpgrade(this.state, command.id);
  }
  advance(seconds: number): void {
    if (!Number.isFinite(seconds) || seconds < 0 || seconds > 3600)
      throw new Error('时间步无效');
    this.accumulator += seconds;
    while (this.accumulator >= STEP - 1e-9) {
      tick(this.state);
      this.accumulator -= STEP;
    }
  }
}
