import { expect, test } from '@playwright/test';
import { initialHotel } from '../../src/core/model';
import { encodeSave } from '../../src/core/save';
test('channels and service bottlenecks are visible and marketing buys actual booking demand', async ({
  page,
}, info) => {
  test.setTimeout(180000);
  const s = initialHotel();
  s.cash = 10000;
  s.levels = { room: 3 };
  s.rooms.slice(0, 4).forEach((r) => (r.status = 'AVAILABLE'));
  s.nextArrival = 100;
  await page.addInitScript(
    (save) => localStorage.setItem('heyat-save-v1', save),
    encodeSave(s),
  );
  await page.goto('/');
  await expect(page.locator('#boot-status')).toHaveText('WebGL 2 已就绪');
  await page.getByRole('button', { name: '打开设置' }).click();
  await page.getByRole('button', { name: '暂停营业', exact: true }).click();
  await page.getByRole('button', { name: '关闭面板' }).click();
  await page.getByRole('button', { name: '酒店概览', exact: true }).click();
  if (!process.env.HEYAT_BASELINE) {
    const diagnosis = page.locator('[aria-label="供需诊断"]');
    await expect(diagnosis).toContainText('需求不足');
    await expect(diagnosis).toContainText('预订 0.0');
    await page.getByRole('button', { name: '关闭面板' }).click();
    await page.getByRole('button', { name: '打开设置' }).click();
    await page.getByRole('button', { name: '继续营业', exact: true }).click();
    await page.getByRole('button', { name: '关闭面板' }).click();
    await page.locator('#upgrades').click();
    await page.getByRole('button', { name: '规模', exact: true }).click();
    await page.locator('[data-action="buy"][data-value="marketing"]').click();
    await expect(page.locator('#cash')).toHaveText('¥9,650');
    await page.getByRole('button', { name: '关闭面板' }).click();
    await page.getByRole('button', { name: '打开设置' }).click();
    await page.getByRole('button', { name: '暂停营业', exact: true }).click();
    await page.getByRole('button', { name: '关闭面板' }).click();
    await page.getByRole('button', { name: '酒店概览', exact: true }).click();
    await expect(diagnosis).toContainText('预订 5.1');
    await expect(diagnosis).toContainText('清洁班组 1');
  }
  await page.screenshot({ path: info.outputPath('demand.png') });
  await page.getByRole('button', { name: '关闭面板' }).click();
  await page.getByRole('button', { name: '打开设置' }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出性能报告' }).click();
  await (await pending).saveAs(info.outputPath('performance.json'));
});
