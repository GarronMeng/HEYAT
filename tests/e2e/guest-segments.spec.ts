import { expect, test } from '@playwright/test';
import { initialHotel } from '../../src/core/model';
import { encodeSave } from '../../src/core/save';
test('three guest segments and their different needs remain readable in the hotel overview', async ({
  page,
}, info) => {
  test.setTimeout(120000);
  const state = initialHotel();
  state.nextGuest = 4;
  state.nextArrival = 100;
  state.queue = ['standard', 'explorer', 'globalist'].map((kind, i) => ({
    id: i + 1,
    name: '住客',
    kind: kind as 'standard' | 'explorer' | 'globalist',
    vip: kind === 'globalist',
    arrivedAt: 0,
  }));
  await page.addInitScript(
    (save) => localStorage.setItem('heyat-save-v1', save),
    encodeSave(state),
  );
  await page.goto('/');
  await expect(page.locator('#boot-status')).toHaveText('WebGL 2 已就绪');
  await page.getByRole('button', { name: '打开设置' }).click();
  await page.getByRole('button', { name: '暂停营业', exact: true }).click();
  await page.getByRole('button', { name: '关闭面板' }).click();
  await page.getByRole('button', { name: '酒店概览', exact: true }).click();
  if (!process.env.HEYAT_BASELINE) {
    await expect(page.locator('.guest-segment')).toHaveCount(3);
    for (const name of ['普通客户', '探险家', '环球客'])
      await expect(page.locator('.guest-segments')).toContainText(name);
    await expect(page.locator('.guest-segments')).toContainText('行政酒廊');
  }
  await page.screenshot({ path: info.outputPath('guest-segments.png') });
});
