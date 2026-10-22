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
  room.order = { id: state.nextOrder++, guest, revenue: baseRates.price };
  transition(room, 'RESERVED', state, baseRates.checkIn);
  return { ok: true, message: `${guest.name}正在办理 ${room.id} 房入住` };
}

export function clean(state: HotelState): CommandResult {
  if (state.rooms.some((room) => room.status === 'CLEANING'))
    return { ok: false, message: '客房管家正在清洁' };
  const room = state.rooms.find((room) => room.status === 'DIRTY');
  if (!room) return { ok: false, message: '所有开放客房都很整洁' };
  transition(room, 'CLEANING', state, baseRates.clean);
  return { ok: true, message: `已安排清洁 ${room.id} 房` };
}

export function tick(state: HotelState) {
  state.time = Math.round((state.time + STEP) * 10) / 10;
  for (const room of state.rooms) {
    if (!['RESERVED', 'OCCUPIED', 'CLEANING'].includes(room.status)) continue;
    room.remaining = Math.max(0, Math.round((room.remaining - STEP) * 10) / 10);
    if (room.remaining > 0) continue;
    if (room.status === 'RESERVED')
      transition(room, 'OCCUPIED', state, baseRates.stay);
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
  if (state.time >= state.nextArrival) {
    const names = ['周先生', '陈女士', 'Alex', '林女士', '许先生', 'Jamie'];
    const guest = {
      id: state.nextGuest++,
      name: names[Math.floor(random(state) * names.length)]!,
      arrivedAt: state.time,
      vip: false,
    };
    if (state.queue.length < 12) state.queue.push(guest);
    else state.lost++;
    state.nextArrival =
      state.time + baseRates.arrival * (0.85 + random(state) * 0.3);
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
    return { ok: false, message: '升级系统正在准备' };
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
