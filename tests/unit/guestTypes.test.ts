import { expect, it } from 'vitest';
import { initialHotel } from '../../src/core/model';
import {
  GUEST_TYPES,
  guestMix,
  guestRoomRevenue,
  guestKind,
} from '../../src/core/guestTypes';
import { decodeSave, encodeSave } from '../../src/core/save';
import { HotelSimulation } from '../../src/core/simulation';
it('differentiates payment, patience and needs while preserving legacy VIP pricing', () => {
  const g = initialHotel().queue[0]!;
  expect(guestRoomRevenue(100, 2, { ...g, kind: 'standard' })).toBe(100);
  expect(guestRoomRevenue(100, 2, { ...g, kind: 'explorer' })).toBe(112);
  expect(guestRoomRevenue(100, 2, { ...g, kind: 'globalist' })).toBe(195);
  expect(guestRoomRevenue(100, 2, { ...g, vip: true })).toBe(250);
  expect(guestKind({ ...g, vip: true })).toBe('globalist');
  expect(GUEST_TYPES.globalist.patience).toBeLessThan(
    GUEST_TYPES.explorer.patience,
  );
  expect(GUEST_TYPES.globalist.needs).toContain('lounge');
  const state = initialHotel();
  state.levels = { marketing: 4, brand: 3, vip: 2 };
  const mix = guestMix(state);
  expect(mix.standard + mix.explorer + mix.globalist).toBeCloseTo(1);
});
it('expires only newly typed waiting guests, without revenue or premature settlement', () => {
  const state = initialHotel();
  state.queue = [{ ...state.queue[0]!, kind: 'globalist' }];
  state.nextArrival = 100;
  const sim = new HotelSimulation(state);
  sim.advance(23);
  expect(sim.snapshot().queue).toHaveLength(0);
  expect(sim.snapshot().lost).toBe(1);
  expect(sim.snapshot().cash).toBe(120);
  const legacy = initialHotel();
  legacy.nextArrival = 100;
  const old = new HotelSimulation(legacy);
  old.advance(40);
  expect(old.snapshot().queue).toHaveLength(1);
});
it('round-trips both v1 guest shapes and refuses unknown types without changing issued orders', () => {
  const state = initialHotel();
  expect(decodeSave(encodeSave(state)).queue[0]!.kind).toBeUndefined();
  state.queue[0]!.kind = 'explorer';
  const sim = new HotelSimulation(decodeSave(encodeSave(state)));
  sim.command({ type: 'CHECK_IN' });
  const locked = sim.snapshot().rooms[0]!.order!.revenue;
  sim.command({ type: 'BUY', id: 'price' });
  expect(sim.snapshot().rooms[0]!.order!.revenue).toBe(locked);
  const bad = JSON.parse(encodeSave(state));
  bad.queue[0].kind = 'unknown';
  expect(() => decodeSave(JSON.stringify(bad))).toThrow();
});
