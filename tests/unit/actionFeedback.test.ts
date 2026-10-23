import { expect, it } from 'vitest';
import { initialHotel, type Receipt } from '../../src/core/model';
import { admit, clean } from '../../src/core/simulation';
import {
  commandFeedback,
  operationView,
  receiptTracker,
} from '../../src/ui/actionFeedback';
it('uses a locked order quote and true simulation progress without issuing income', () => {
  const state = initialHotel(),
    before = structuredClone(state);
  admit(state);
  expect(commandFeedback(before, state, 'checkin')).toContain('预计 ¥90');
  expect(state.cash).toBe(120);
  state.time = 1;
  state.rooms[0]!.remaining = 1;
  expect(operationView(state, 'checkin')).toMatchObject({
    busy: true,
    remaining: 1,
    progress: 0.5,
    expected: 90,
  });
  state.rooms[0]!.status = 'DIRTY';
  state.rooms[0]!.order = null;
  clean(state);
  expect(operationView(state, 'clean').busy).toBe(true);
});
it('batches all newly settled receipts once, including nonmonotonic order IDs', () => {
  const row = (orderId: number, revenue: number): Receipt => ({
    orderId,
    revenue,
    at: 20,
    guest: '客人',
  });
  const tracker = receiptTracker([row(2, 90)]);
  expect(tracker.consume([row(2, 90), row(1, 100), row(3, 120)])).toEqual({
    count: 2,
    amount: 220,
  });
  expect(tracker.consume([row(2, 90), row(1, 100), row(3, 120)])).toEqual({
    count: 0,
    amount: 0,
  });
});
