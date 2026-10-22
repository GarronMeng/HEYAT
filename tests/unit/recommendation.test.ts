import { expect, it } from 'vitest';
import { initialHotel } from '../../src/core/model';
import { recommendationView } from '../../src/ui/recommendation';
it('keeps an inert labelled recommendation slot while cash crosses affordability', () => {
  const state = initialHotel();
  state.cash = 30;
  const before = JSON.stringify(state);
  expect(recommendationView(state)).toMatchObject({ id: '', disabled: true });
  expect(recommendationView(state).label.length).toBeGreaterThan(0);
  expect(JSON.stringify(state)).toBe(before);
  state.cash = 120;
  expect(recommendationView(state)).toMatchObject({
    id: 'price',
    disabled: false,
  });
  state.cash = 0;
  expect(recommendationView(state).disabled).toBe(true);
});
