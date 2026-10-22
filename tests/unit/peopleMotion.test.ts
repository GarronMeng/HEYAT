import { expect, it } from 'vitest';
import { initialHotel } from '../../src/core/model';
import {
  LIFT,
  MAX_VISUAL_DELTA,
  PeopleMotion,
  WALK_SPEED,
} from '../../src/render/peopleMotion';

function fixture() {
  const state = initialHotel();
  state.levels = { floor: 2, room: 11 };
  state.rooms.forEach((r) => (r.status = 'AVAILABLE'));
  const room = state.rooms[8]!;
  room.status = 'OCCUPIED';
  room.order = { id: 1, guest: state.queue[0]!, revenue: 90 };
  state.queue = [];
  return state;
}
it('keeps every visible step bounded despite lag, task changes and floor rebuilds', () => {
  const state = fixture();
  const motion = new PeopleMotion(state);
  let previous = motion.report().poses;
  let rides = 0,
    roomVisits = 0;
  const before = JSON.stringify(state);
  for (let frame = 0; frame < 5000; frame++) {
    const next = motion.update(state, frame % 30 === 0 ? 5 : 0.05);
    for (let i = 0; i < 6; i++) {
      const p = next[i]!,
        old = previous[i]!;
      const step = Math.hypot(p.x - old.x, p.y - old.y, p.z - old.z);
      expect(step).toBeLessThanOrEqual(WALK_SPEED * MAX_VISUAL_DELTA + 1e-8);
      if (Math.abs(p.y - old.y) > 1e-7) {
        expect(p.x).toBeCloseTo(LIFT.x);
        expect(p.z).toBeCloseTo(LIFT.z);
        expect(p.action).toBe('wait');
        expect(p.distance ?? 0).toBeCloseTo(old.distance ?? 0);
        rides++;
      }
    }
    if (next[4]!.y > 7 && next[4]!.x < -3) roomVisits++;
    previous = next;
  }
  expect(rides).toBeGreaterThan(100);
  expect(roomVisits).toBeGreaterThan(0);
  expect(JSON.stringify(state)).toBe(before);
  expect(motion.report().pool).toBe(6);
  expect(motion.report().activeJourneys).toBe(0);
  expect(motion.report().samples.length).toBeLessThanOrEqual(120);
});
it('does not retarget an in-flight guest when the first active order changes', () => {
  const state = fixture();
  const motion = new PeopleMotion(state);
  motion.update(state, 0.1);
  state.rooms[8]!.order = null;
  state.rooms[8]!.status = 'DIRTY';
  state.rooms[3]!.status = 'OCCUPIED';
  state.rooms[3]!.order = {
    id: 2,
    guest: { id: 2, name: '住客', vip: false, arrivedAt: 0 },
    revenue: 90,
  };
  let firstFloor = 0;
  for (let i = 0; i < 1500; i++) {
    const p = motion.update(state, 0.05)[4]!;
    if (p.x < -3 && p.y > 7) firstFloor++;
  }
  expect(firstFloor).toBeGreaterThan(0);
  expect(motion.report().history).toBeGreaterThanOrEqual(1);
});
it('uses real travel distance at 1x and 3x and freezes mid-stride on pause', () => {
  const a = fixture(),
    b = fixture();
  const normal = new PeopleMotion(a),
    fast = new PeopleMotion(b);
  for (let i = 0; i < 100; i++) {
    a.time += 0.1;
    b.time += 0.3;
    expect(normal.update(a, 0.1)).toEqual(fast.update(b, 0.1));
  }
  const before = fast.report();
  for (let i = 0; i < 100; i++) fast.update(b, 0.1, false);
  expect(fast.report()).toEqual(before);
});
it('keeps parallel cleaning tasks sticky and identity history bounded', () => {
  const state = fixture();
  state.rooms[8]!.status = 'AVAILABLE';
  state.rooms[8]!.order = null;
  const cleaner = state.rooms[4]!;
  cleaner.status = 'CLEANING';
  const motion = new PeopleMotion(state);
  let sweeps = 0;
  for (let i = 0; i < 2000; i++) {
    state.rooms[5]!.status = i % 2 ? 'CLEANING' : 'DIRTY';
    state.rooms[5]!.changedAt = i;
    const p = motion.update(state, 0.05)[3]!;
    if (p.action === 'clean') {
      expect(p.y).toBeCloseTo(4.89);
      sweeps++;
    }
  }
  expect(sweeps).toBeGreaterThan(0);
  expect(motion.report().history).toBeLessThanOrEqual(128);
});
