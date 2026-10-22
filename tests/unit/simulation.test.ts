import { describe, expect, it } from 'vitest';
import { assertHotel, initialHotel } from '../../src/core/model';
import { HotelSimulation } from '../../src/core/simulation';
import { decodeSave, encodeSave } from '../../src/core/save';

describe('room and order lifecycle', () => {
  it('reserves atomically, settles once, and requires cleaning before resale', () => {
    const sim = new HotelSimulation();
    expect(sim.command({ type: 'CHECK_IN' }).ok).toBe(true);
    expect(sim.command({ type: 'CHECK_IN' }).ok).toBe(false);
    sim.advance(20);
    expect(sim.snapshot()).toMatchObject({ completed: 1, cash: 210 });
    expect(sim.snapshot().rooms[0]!.status).toBe('DIRTY');
    expect(sim.command({ type: 'CHECK_IN' }).ok).toBe(false);
    sim.advance(3);
    expect(sim.snapshot().cash).toBe(210);
    expect(sim.command({ type: 'CLEAN' }).ok).toBe(true);
    expect(sim.command({ type: 'CLEAN' }).ok).toBe(false);
    sim.advance(5);
    expect(sim.snapshot().rooms[0]!.status).toBe('AVAILABLE');
    expect(sim.command({ type: 'CHECK_IN' }).ok).toBe(true);
  });
  it('does not expose writable state and is independent of render frame grouping', () => {
    const a = new HotelSimulation(),
      b = new HotelSimulation();
    a.command({ type: 'CHECK_IN' });
    b.command({ type: 'CHECK_IN' });
    a.advance(30);
    for (let i = 0; i < 300; i++) b.advance(0.1);
    expect(a.snapshot()).toEqual(b.snapshot());
    const copy = a.snapshot();
    copy.cash = -100;
    expect(a.snapshot().cash).toBeGreaterThan(0);
  });
  it('keeps invariants under 100,000 fixed ticks and bounded demand', () => {
    const sim = new HotelSimulation(initialHotel(42));
    for (let i = 0; i < 10000; i++) {
      sim.command({ type: 'CHECK_IN' });
      sim.command({ type: 'CLEAN' });
      sim.advance(1);
      assertHotel(sim.snapshot());
    }
    expect(sim.snapshot().queue.length).toBeLessThanOrEqual(12);
    expect(sim.snapshot().lost).toBeGreaterThan(0);
    expect(sim.snapshot().receipts.length).toBeLessThanOrEqual(100);
  });
  it('rejects invalid elapsed time', () => {
    const sim = new HotelSimulation();
    for (const value of [NaN, Infinity, -1, 3601])
      expect(() => sim.advance(value)).toThrow();
  });
});

describe('save boundaries', () => {
  it('round-trips an active order without offline income or double settlement', () => {
    const first = new HotelSimulation();
    first.command({ type: 'CHECK_IN' });
    first.advance(10);
    const restored = new HotelSimulation(
      decodeSave(encodeSave(first.snapshot())),
    );
    expect(restored.snapshot()).toEqual(first.snapshot());
    restored.advance(10);
    expect(restored.snapshot().completed).toBe(1);
    const second = new HotelSimulation(
      decodeSave(encodeSave(restored.snapshot())),
    );
    second.advance(50);
    expect(second.snapshot().completed).toBe(1);
  });
  it('rejects corrupt schema, numeric values, duplicate orders and IDs', () => {
    for (const raw of [
      '{}',
      'invalid',
      JSON.stringify({ ...initialHotel(), version: 9 }),
      JSON.stringify({ ...initialHotel(), cash: -1 }),
    ])
      expect(() => decodeSave(raw)).toThrow();
    const broken = initialHotel();
    broken.rooms[1]!.id = 101;
    expect(() => decodeSave(JSON.stringify(broken))).toThrow();
    const active = new HotelSimulation();
    active.command({ type: 'CHECK_IN' });
    const data = active.snapshot();
    data.nextOrder = 1;
    expect(() => decodeSave(JSON.stringify(data))).toThrow();
  });
});
