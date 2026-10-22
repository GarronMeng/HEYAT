import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { initialHotel } from '../../src/core/model';
import { encodeSave } from '../../src/core/save';
test('four venues build into the real scene, save levels, and settle an actual service once', async ({
  page,
}, info) => {
  test.setTimeout(240000);
  const state = initialHotel();
  state.cash = 1e6;
  state.levels = { floor: 2, room: 11, brand: 2 };
  state.rooms.forEach((r) => (r.status = 'AVAILABLE'));
  state.nextArrival = 100;
  await page.addInitScript(
    (save) =>
      localStorage.getItem('heyat-save-v1') ??
      localStorage.setItem('heyat-save-v1', save),
    encodeSave(state),
  );
  await page.goto('/');
  await expect(page.locator('#boot-status')).toHaveText('WebGL 2 已就绪');
  if (!process.env.HEYAT_BASELINE) {
    await page.locator('#upgrades').click();
    await page.getByRole('button', { name: '设施', exact: true }).click();
    for (const id of ['breakfast', 'gym', 'lounge', 'rooftop'])
      await page.locator(`[data-action="buy"][data-value="${id}"]`).click();
    await page.getByRole('button', { name: '关闭面板' }).click();
    await expect(page.locator('#cash')).toHaveText('¥977,300');
  }
  await page.getByRole('button', { name: '打开设置' }).click();
  await page.getByRole('button', { name: '暂停营业', exact: true }).click();
  await page.getByRole('button', { name: '关闭面板' }).click();
  await page
    .locator('#scene')
    .evaluate(
      () =>
        new Promise((r) =>
          requestAnimationFrame(() => requestAnimationFrame(r)),
        ),
    );
  await page.screenshot({ path: info.outputPath('four-venues.png') });
  if (process.env.HEYAT_BASELINE) return;
  await page.getByRole('button', { name: '打开设置' }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出性能报告' }).click();
  const path = info.outputPath('venue-report.json');
  await (await pending).saveAs(path);
  const report = JSON.parse(await readFile(path, 'utf8'));
  expect(report.facilities).toEqual(['breakfast', 'gym', 'lounge', 'rooftop']);
  await page.reload();
  await expect(page.locator('#cash')).toHaveText('¥977,300');
  await page.locator('#checkin').click();
  await page.getByRole('button', { name: '打开设置' }).click();
  await page.getByLabel('试玩速度').selectOption('3');
  await page.getByRole('button', { name: '关闭面板' }).click();
  await expect(page.locator('#cash')).toHaveText('¥977,444', {
    timeout: 30000,
  });
  await page.waitForTimeout(1000);
  await expect(page.locator('#cash')).toHaveText('¥977,444');
  await page.getByRole('button', { name: '酒店概览', exact: true }).click();
  await expect(page.locator('[aria-label="设施运营"]')).toContainText('¥18');
  await page.screenshot({ path: info.outputPath('venue-operations.png') });
});
