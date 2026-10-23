import { expect, it } from 'vitest';
import { assertHotel, initialHotel, roomCount } from '../../src/core/model';
import {
  buyUpgrade,
  rates,
  UPGRADES,
  upgradeCost,
  upgradeReason,
} from '../../src/core/progression';
import { HotelSimulation } from '../../src/core/simulation';

it('preserves twelve base upgrades and adds four facilities and refuses unavailable or repeated purchases', () => {
  expect(new Set(UPGRADES.map((item) => item.id)).size).toBe(16);
  const state = initialHotel();
  expect(buyUpgrade(state, 'autodesk').ok).toBe(false);
  expect(buyUpgrade(state, 'room').ok).toBe(false);
  expect(state.cash).toBe(120);
  expect(buyUpgrade(state, 'price').ok).toBe(true);
  expect(state.cash).toBe(30);
  expect(rates(state).price).toBeGreaterThan(90);
  state.cash = 10000;
  state.completed = 10;
  expect(buyUpgrade(state, 'autodesk').ok).toBe(true);
  const cash = state.cash;
  expect(buyUpgrade(state, 'autodesk').ok).toBe(false);
  expect(state.cash).toBe(cash);
});

it('expansion changes real room capacity, with floor prerequisites', () => {
  const state = initialHotel();
  state.cash = 1e7;
  expect(buyUpgrade(state, 'floor').ok).toBe(false);
  for (let i = 0; i < 3; i++) expect(buyUpgrade(state, 'room').ok).toBe(true);
  expect(roomCount(state)).toBe(4);
  expect(buyUpgrade(state, 'room').ok).toBe(false);
  expect(buyUpgrade(state, 'floor').ok).toBe(true);
  expect(buyUpgrade(state, 'room').ok).toBe(true);
  expect(roomCount(state)).toBe(5);
});

it('automation operates the same simulator and saves price at order creation', () => {
  const state = initialHotel();
  state.levels = { autodesk: 1, autoclean: 1 };
  state.cash = 1e6;
  const sim = new HotelSimulation(state);
  sim.advance(0.1);
  sim.command({ type: 'BUY', id: 'price' });
  sim.advance(20);
  expect(sim.snapshot().receipts[0]!.revenue).toBe(90);
  sim.advance(60);
  expect(sim.snapshot().completed).toBeGreaterThan(2);
  assertHotel(sim.snapshot());
});

it('three buying policies reach the demo goal without deadlock', () => {
  const policies = [
    [
      'autodesk',
      'autoclean',
      'room',
      'price',
      'bed',
      'luxury',
      'floor',
      'brand',
      'desk',
      'clean',
      'marketing',
      'vip',
    ],
    [
      'autodesk',
      'autoclean',
      'price',
      'bed',
      'luxury',
      'room',
      'floor',
      'brand',
      'clean',
      'desk',
      'vip',
      'marketing',
    ],
    [
      'autodesk',
      'autoclean',
      'room',
      'floor',
      'brand',
      'clean',
      'price',
      'bed',
      'luxury',
      'desk',
      'marketing',
      'vip',
    ],
  ];
  for (const policy of policies) {
    const sim = new HotelSimulation();
    for (let second = 0; second < 1800 && !sim.snapshot().won; second++) {
      sim.command({ type: 'CHECK_IN' });
      sim.command({ type: 'CLEAN' });
      const state = sim.snapshot();
      const purchase = policy.find(
        (id) =>
          !upgradeReason(state, id) && upgradeCost(state, id) <= state.cash,
      );
      if (purchase) sim.command({ type: 'BUY', id: purchase });
      sim.advance(1);
      assertHotel(sim.snapshot());
    }
    const result = sim.snapshot();
    console.log(
      JSON.stringify({
        policy: policy[2],
        wonAt: result.wonAt,
        rooms: roomCount(result),
        revenue: result.revenue,
        levels: result.levels,
      }),
    );
    expect(result.won).toBe(true);
  }
});
