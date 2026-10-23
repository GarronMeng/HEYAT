import { expect, it } from 'vitest';
import {
  cleaningSlots,
  conversionChance,
  demandChannels,
  demandState,
  recordExperience,
} from '../../src/core/demand';
import { initialHotel, type HotelState } from '../../src/core/model';
import { rates } from '../../src/core/progression';
import { HotelSimulation } from '../../src/core/simulation';
import { decodeSave, encodeSave } from '../../src/core/save';
function expanded(seed = 1731): HotelState {
  const s = initialHotel(seed);
  s.rooms.forEach((r) => (r.status = 'AVAILABLE'));
  s.levels = {
    floor: 2,
    room: 11,
    desk: 4,
    clean: 4,
    marketing: 4,
    brand: 3,
    bed: 3,
    luxury: 3,
    vip: 2,
    price: 6,
    autodesk: 1,
    autoclean: 1,
  };
  return s;
}
it('does not invent demand from room count, separates earned channels and price/value conversion', () => {
  const s = initialHotel();
  const before = demandChannels(s);
  s.rooms.forEach((r) => (r.status = 'AVAILABLE'));
  s.levels.floor = 2;
  expect(demandChannels(s)).toEqual(before);
  s.levels.marketing = 2;
  s.levels.brand = 1;
  expect(demandChannels(s).bookings).toBeGreaterThan(0);
  expect(demandChannels(s).corporate).toBeGreaterThan(0);
  expect(demandChannels(s).repeat).toBe(0);
  const chance = conversionChance(s, 'standard', rates(s).price);
  expect(conversionChance(s, 'standard', rates(s).price * 5)).toBeLessThan(
    chance,
  );
  s.levels.breakfast = 1;
  expect(conversionChance(s, 'standard', rates(s).price)).toBeGreaterThan(
    chance,
  );
});
it('earns repeat demand from completed service and resumes optional telemetry without granting cash', () => {
  const s = initialHotel();
  const cash = s.cash;
  const order = { id: 1, guest: s.queue[0]!, revenue: 90 };
  recordExperience(s, order);
  const basic = demandState(s).loyalty;
  const full = initialHotel();
  recordExperience(full, {
    ...order,
    visits: [
      { id: 'breakfast', fee: 18, duration: 3, remaining: 0, status: 'served' },
    ],
  });
  expect(demandState(full).loyalty).toBeGreaterThan(basic);
  expect(s.cash).toBe(cash);
  expect(decodeSave(encodeSave(s))).toEqual(s);
  expect(decodeSave(encodeSave(initialHotel())).demand).toBeUndefined();
  s.demand!.offered = 5;
  expect(() => decodeSave(JSON.stringify(s))).toThrow('需求统计');
});
it('runs unlocked cleaning teams concurrently without reselling a dirty room', () => {
  const s = expanded();
  s.rooms.forEach((r) => (r.status = 'DIRTY'));
  s.levels.autoclean = 0;
  s.levels.autodesk = 0;
  expect(cleaningSlots(s)).toBe(3);
  const sim = new HotelSimulation(s);
  for (let i = 0; i < 3; i++)
    expect(sim.command({ type: 'CLEAN' }).ok).toBe(true);
  expect(sim.command({ type: 'CLEAN' }).ok).toBe(false);
  expect(sim.command({ type: 'CHECK_IN' }).ok).toBe(false);
  sim.advance(2.3);
  expect(
    sim.snapshot().rooms.filter((r) => r.status === 'AVAILABLE'),
  ).toHaveLength(3);
});
it('replays three seeds at twelve rooms with conserved lead counts and stable mature occupancy', () => {
  for (const seed of [42, 1731, 818]) {
    const sim = new HotelSimulation(expanded(seed));
    let occupied = 0;
    for (let t = 0; t < 1800; t++) {
      sim.advance(1);
      if (t >= 600)
        occupied += sim
          .snapshot()
          .rooms.filter((r) => r.status === 'OCCUPIED').length;
    }
    const s = sim.snapshot(),
      d = s.demand!;
    expect(occupied / (1200 * 12)).toBeGreaterThan(0.65);
    expect(d.offered).toBe(d.converted + d.rejected);
    expect(s.lost).toBe(d.queueLost + d.patienceLost);
    expect(s.revenue).toBeGreaterThan(0);
    expect(new Set(s.receipts.map((r) => r.orderId)).size).toBe(
      s.receipts.length,
    );
  }
});
