import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { initialHotel } from '../../src/core/model';
import { encodeSave } from '../../src/core/save';

test('all shader tiers render without changing cash, room state or save', async ({
  page,
}) => {
  test.setTimeout(120_000);
  const saved = encodeSave(initialHotel());
  await page.addInitScript(
    (value) => localStorage.setItem('heyat-save-v1', value),
    saved,
  );
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('#boot-status')).toHaveText('WebGL 2 已就绪');
  await page.getByRole('button', { name: '打开设置' }).click();
  await page.getByRole('button', { name: '暂停营业', exact: true }).click();
  await page.getByRole('button', { name: '关闭面板' }).click();
  const before = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('heyat-save-v1')!),
  );

  for (const tier of ['low', 'medium', 'high', 'low'] as const) {
    await page.getByRole('button', { name: '打开设置' }).click();
    await page.getByLabel('画面质量').selectOption(tier);
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: '导出性能报告' }).click();
    const download = await downloadPromise;
    const report = JSON.parse(readFileSync((await download.path())!, 'utf8')) as {
      visualTier: {
        quality: string;
        shader: string;
        environmentReflection: boolean;
      };
    };
    expect(report.visualTier.quality).toBe(tier);
    expect(report.visualTier.shader).toBe(
      tier === 'low' ? 'Lambert' : 'Standard',
    );
    expect(report.visualTier.environmentReflection).toBe(tier === 'high');
    await page.getByRole('button', { name: '关闭面板' }).click();
    await expect(page.locator('#cash')).toHaveText('¥120');
    await expect(page.locator('#boot-status')).toHaveText('WebGL 2 已就绪');
    expect(errors).toEqual([]);
  }
  const after = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('heyat-save-v1')!),
  );
  expect(after.cash).toBe(before.cash);
  expect(after.revenue).toBe(before.revenue);
  expect(after.rooms).toEqual(before.rooms);
});
