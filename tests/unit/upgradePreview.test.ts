import { expect, it } from 'vitest';
import { initialHotel } from '../../src/core/model';
import { buyUpgrade, rates, UPGRADES } from '../../src/core/progression';
import { upgradePreview } from '../../src/ui/upgradePreview';
it('previews use the same rates as a real purchase without editing the save', () => {
  const state = initialHotel();
  state.cash = 1e6;
  const before = JSON.stringify(state),
    preview = upgradePreview(state, 'price');
  expect(JSON.stringify(state)).toBe(before);
  expect(buyUpgrade(state, 'price').ok).toBe(true);
  expect(preview).toContain(`¥${rates(state).price}`);
  for (const upgrade of UPGRADES)
    expect(upgradePreview(state, upgrade.id).length).toBeGreaterThan(8);
});
