import { expect, test } from '@playwright/test';
import { initialHotel } from '../../src/core/model';
import { HotelSimulation } from '../../src/core/simulation';
import { encodeSave } from '../../src/core/save';

const start = async (page: import('@playwright/test').Page) => {
  await page.goto('/');
  await expect(page.locator('#boot-status')).toHaveText('WebGL 2 已就绪');
  await page.getByRole('button', { name: '开始营业' }).click();
};

test('first guest, checkout, clean, purchase and reload preserve actual economy', async ({
  page,
}, info) => {
  test.setTimeout(60_000); // Includes real-time checkout and software WebGL screenshots.
  await start(page);
  await page.getByRole('button', { name: '打开设置' }).click();
  await page.getByLabel('试玩速度').selectOption('3');
  await page.getByRole('button', { name: '关闭面板' }).click();
  await page.locator('#checkin').click();
  await expect(page.locator('#toast')).toContainText('101 房入住');
  await expect(page.locator('#cash')).toHaveText('¥210', { timeout: 15000 });
  await expect(page.locator('#clean')).toBeEnabled();
  await page.locator('#clean').click();
  await expect(page.locator('#checkin')).toBeEnabled();
  await page.locator('#upgrades').click();
  await page.locator('[data-action="buy"][data-value="price"]').click();
  await expect(page.locator('#cash')).toHaveText('¥120');
  await page.reload();
  await expect(page.locator('#cash')).toHaveText('¥120');
  await expect(page.locator('#revenue')).toHaveText('¥90');
  await expect(page.locator('#welcome')).not.toBeVisible();
  await page.getByRole('button', { name: '打开设置' }).click();
  await page.getByLabel('画面质量').selectOption('low');
  await expect(page.locator('#cash')).toHaveText('¥120');
  await page.getByRole('button', { name: '关闭面板' }).click();
  await expect(page.locator('#panel')).not.toBeVisible();
  await page.screenshot({ path: info.outputPath('first-night-desktop.png') });
});

test('portrait controls and upgrade drawer stay within viewport', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await start(page);
  await page.screenshot({ path: info.outputPath('first-night-mobile.png') });
  await page.locator('#upgrades').click();
  await expect(page.locator('#panel')).toBeVisible();
  await page.getByRole('button', { name: '规模', exact: true }).click();
  await expect(
    page.locator('[data-action="buy"][data-value="room"]'),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: info.outputPath('mobile-upgrades.png') });
  await page.getByRole('button', { name: '关闭面板' }).click();
  await page.setViewportSize({ width: 844, height: 390 });
  const dock = await page.locator('.action-dock').boundingBox();
  expect(dock!.y + dock!.height).toBeLessThanOrEqual(390);
  await page.locator('#upgrades').click();
  const panel = await page.locator('#panel').boundingBox();
  expect(panel!.y + panel!.height).toBeLessThanOrEqual(390);
  await page.screenshot({ path: info.outputPath('mobile-landscape.png') });
});

test('context restoration resumes one clock without losing the save', async ({
  page,
}) => {
  await start(page);
  await page.locator('#checkin').click();
  const extension = await page
    .locator('canvas')
    .evaluateHandle((canvas: HTMLCanvasElement) => {
      return canvas.getContext('webgl2')!.getExtension('WEBGL_lose_context')!;
    });
  await extension.evaluate((extension) => extension.loseContext());
  await expect(page.locator('#boot-detail')).toContainText('图形连接已中断');
  await extension.evaluate((extension) => extension.restoreContext());
  await extension.dispose();
  await expect(page.locator('#boot-status')).toHaveText('WebGL 2 已就绪');
  await expect(page.locator('#cash')).toHaveText('¥120');
  await expect
    .poll(() =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem('heyat-save-v1')!).time,
      ),
    )
    .toBeGreaterThan(0);
});

test('corrupt save is retained until explicit reset', async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('heyat-save-v1', 'broken-save'),
  );
  await page.goto('/');
  await expect(page.locator('#toast')).toContainText('原文件已保留');
  expect(await page.evaluate(() => localStorage.getItem('heyat-save-v1'))).toBe(
    'broken-save',
  );
  await page.getByRole('button', { name: '打开设置' }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出存档', exact: true }).click();
  expect((await download).suggestedFilename()).toBe('heyat-save.json');
  page.on('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: '重新开始', exact: true }).click();
  await expect(page.locator('#cash')).toHaveText('¥120');
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('heyat-save-v1')!).version,
    ),
  ).toBe(1);
});

test('expanded hotel and finite ending follow simulation state', async ({
  page,
}, info) => {
  const state = initialHotel();
  state.rooms.forEach((room) => (room.status = 'AVAILABLE'));
  state.levels = {
    floor: 2,
    room: 11,
    brand: 3,
    bed: 3,
    luxury: 3,
    autodesk: 1,
    autoclean: 1,
  };
  state.revenue = 200000;
  state.cash = 50000;
  const sim = new HotelSimulation(state);
  sim.advance(0.1);
  const completed = sim.snapshot();
  // A save immediately before the goal transition exercises the real ending trigger.
  completed.won = false;
  completed.wonAt = null;
  await page.addInitScript(
    (save) => localStorage.setItem('heyat-save-v1', save),
    encodeSave(completed),
  );
  await page.goto('/');
  await expect(page.locator('#ending')).toBeVisible();
  await page.getByRole('button', { name: '继续看看酒店' }).click();
  await page.getByRole('button', { name: '打开设置' }).click();
  await page.getByRole('button', { name: '暂停营业', exact: true }).click();
  await page.getByRole('button', { name: '关闭面板' }).click();
  await page.screenshot({ path: info.outputPath('expanded-hotel.png') });
});
