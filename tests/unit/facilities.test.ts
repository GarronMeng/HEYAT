import { expect, it } from 'vitest';
import { initialHotel, assertHotel } from '../../src/core/model';
import { buyUpgrade } from '../../src/core/progression';
import { HotelSimulation } from '../../src/core/simulation';
import { decodeSave, encodeSave } from '../../src/core/save';
import { facilityOffer } from '../../src/core/facilities';
const ready = () => {
  const s = initialHotel();
  s.cash = 1e6;
  s.levels = { floor: 2, room: 11, brand: 2 };
  s.rooms.forEach((r) => (r.status = 'AVAILABLE'));
  s.nextArrival = 100;
  return s;
};
it('builds and upgrades four venues with real costs, requirements and bounded capacity', () => {
  expect(buyUpgrade(initialHotel(), 'breakfast').ok).toBe(false);
  const s = ready();
  for (const id of ['breakfast', 'gym', 'lounge', 'rooftop'] as const) {
    const cash = s.cash;
    expect(buyUpgrade(s, id).ok).toBe(true);
    expect(s.cash).toBeLessThan(cash);
    expect(facilityOffer(s, id).capacity).toBe(1);
    buyUpgrade(s, id);
    buyUpgrade(s, id);
    expect(buyUpgrade(s, id).ok).toBe(false);
    expect(facilityOffer(s, id).capacity).toBe(3);
  }
});
it('locks a service quote, credits only served visits once at checkout, and survives reload mid-service', () => {
  const s = ready();
  s.levels.breakfast = 1;
  s.queue[0]!.kind = 'standard';
  const sim = new HotelSimulation(s);
  sim.command({ type: 'CHECK_IN' });
  sim.advance(3);
  const active = sim.snapshot();
  expect(active.rooms[0]!.order!.visits![0]!.status).toBe('serving');
  expect(active.cash).toBe(s.cash);
  const loaded = new HotelSimulation(decodeSave(encodeSave(active)));
  loaded.command({ type: 'BUY', id: 'breakfast' });
  loaded.advance(18);
  const after = loaded.snapshot();
  expect(after.receipts).toHaveLength(1);
  expect(after.receipts[0]!).toMatchObject({
    roomRevenue: 126,
    facilityRevenue: 18,
    revenue: 144,
  });
  expect(after.facilityStats!.breakfast!.revenue).toBe(18);
  loaded.advance(10);
  expect(loaded.snapshot().receipts).toHaveLength(1);
  assertHotel(after);
});
it('cannot exceed service capacity, bills no unfinished service, and rejects corrupted visit data', () => {
  const s = ready();
  s.levels.breakfast = 1;
  for (let i = 0; i < 2; i++) {
    s.rooms[i]!.status = 'OCCUPIED';
    s.rooms[i]!.remaining = 0.2;
    s.rooms[i]!.order = {
      id: i + 1,
      guest: {
        id: i + 1,
        name: '客人',
        vip: false,
        kind: 'standard',
        arrivedAt: 0,
      },
      revenue: 90,
      visits: [
        {
          id: 'breakfast',
          fee: 18,
          duration: 3,
          remaining: 3,
          status: 'queued',
        },
      ],
    };
  }
  s.queue = [];
  s.nextGuest = 3;
  s.nextOrder = 3;
  const sim = new HotelSimulation(s);
  sim.advance(0.1);
  expect(
    sim
      .snapshot()
      .rooms.flatMap((r) => r.order?.visits ?? [])
      .filter((v) => v.status === 'serving'),
  ).toHaveLength(1);
  sim.advance(0.2);
  expect(sim.snapshot().revenue).toBe(180);
  expect(sim.snapshot().facilityStats!.breakfast!.missed).toBe(2);
  const bad = JSON.parse(encodeSave(s));
  bad.rooms[0].order.visits[0].fee = -1;
  expect(() => decodeSave(JSON.stringify(bad))).toThrow();
});
