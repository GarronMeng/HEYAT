import { writeFileSync } from 'node:fs';
import { HotelSimulation } from '../src/core/simulation.ts';
import { initialHotel, roomCount } from '../src/core/model.ts';
import { rates, upgradeCost, upgradeReason } from '../src/core/progression.ts';
const configurations = [];
for (const rooms of [1, 4, 8, 12])
  for (const upgraded of [false, true]) {
    const state = initialHotel(1731);
    state.queue = [];
    state.nextArrival = 0;
    state.levels = {
      floor: Math.ceil(rooms / 4) - 1,
      room: rooms - 1,
      autodesk: 1,
      autoclean: 1,
      ...(upgraded
        ? {
            marketing: 4,
            desk: 4,
            clean: 4,
            luxury: 3,
            price: 6,
            bed: 3,
            brand: 3,
            vip: 2,
          }
        : {}),
    };
    state.rooms.forEach(
      (r, i) => (r.status = i < rooms ? 'AVAILABLE' : 'LOCKED'),
    );
    const sim = new HotelSimulation(state);
    let occupied = 0,
      dirty = 0,
      queue = 0;
    for (let i = 0; i < 36000; i++) {
      sim.advance(0.1);
      if (i >= 1200) {
        const s = sim.snapshot();
        occupied += s.rooms.filter((r) => r.status === 'OCCUPIED').length;
        dirty += s.rooms.filter((r) => r.status === 'DIRTY').length;
        queue += s.queue.length;
      }
    }
    const result = sim.snapshot();
    const rate = rates(result);
    configurations.push({
      rooms,
      upgraded,
      rates: rate,
      occupancy: occupied / (34800 * rooms),
      meanDirty: dirty / 34800,
      meanQueue: queue / 34800,
      completed: result.completed,
      lost: result.lost,
      arrivalOccupancyUpperBound: (rate.stay * 1.3) / (rate.arrival * rooms),
      cleaningOccupancyUpperBound:
        (rate.stay * 1.3 * (rate.cleanSlots ?? 1)) / (rate.clean * rooms),
      demand: result.demand,
    });
  }
const policies = {
  capacity: [
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
  revenue: [
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
  service: [
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
};
const progression = [];
for (const [policy, priority] of Object.entries(policies)) {
  const sim = new HotelSimulation();
  const snapshots = [],
    purchases = [];
  let lastRevenue = 0;
  for (let t = 0; t < 1800; t++) {
    sim.command({ type: 'CHECK_IN' });
    sim.command({ type: 'CLEAN' });
    const s = sim.snapshot();
    const id = priority.find(
      (id) => !upgradeReason(s, id) && upgradeCost(s, id) <= s.cash,
    );
    if (id) {
      sim.command({ type: 'BUY', id });
      purchases.push({ time: t, id });
    }
    sim.advance(1);
    if (t % 60 === 59) {
      const s = sim.snapshot();
      snapshots.push({
        time: s.time,
        rooms: roomCount(s),
        occupied: s.rooms.filter((r) => r.status === 'OCCUPIED').length,
        revenuePerMinute: s.revenue - lastRevenue,
        arrival: rates(s).arrival,
        queue: s.queue.length,
      });
      lastRevenue = s.revenue;
    }
  }
  progression.push({ policy, purchases, snapshots });
}
const report = {
  baseline: process.env.HEYAT_AUDIT_LABEL ?? 'working-tree-N03',
  seed: 1731,
  scenarioSeconds: 3600,
  warmupSeconds: 120,
  configurations,
  progression,
};
writeFileSync(
  process.env.HEYAT_AUDIT_OUTPUT ?? '/tmp/heyat-economy-audit.json',
  JSON.stringify(report, null, 2) + '\n',
);
console.log(
  JSON.stringify(
    configurations.map((row) => ({ ...row, rates: undefined })),
    null,
    2,
  ),
);
