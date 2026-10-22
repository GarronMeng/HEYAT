import { expect, test } from '@playwright/test';
import { initialHotel } from '../../src/core/model';
import { encodeSave } from '../../src/core/save';

test('stage one repeatable art frame and render budget', async ({
  page,
}, info) => {
  test.setTimeout(180_000);
  const state = initialHotel();
  state.rooms[1]!.status = 'AVAILABLE';
  state.levels.room = 1;
  await page.addInitScript(
    (save) => localStorage.setItem('heyat-save-v1', save),
    encodeSave(state),
  );
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('#boot-status')).toHaveText('WebGL 2 已就绪');
  await page.getByRole('button', { name: '打开设置' }).click();
  await page.getByRole('button', { name: '暂停营业', exact: true }).click();
  await page.getByLabel('画面质量').selectOption('high');
  await page.getByRole('button', { name: '关闭面板' }).click();
  await page
    .locator('canvas')
    .evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
  await page.screenshot({ path: info.outputPath('hotel-desktop.png') });
  await page
    .locator('canvas')
    .screenshot({ path: info.outputPath('hotel-scene.png') });
  if (process.env.ART_MOTION) {
    for (let i = 0; i < 8; i++) {
      await page.waitForTimeout(300);
      await page
        .locator('canvas')
        .screenshot({ path: info.outputPath(`motion-${i}.png`) });
    }
  }
  if (process.env.ART_SAMPLE_MS)
    await page.waitForTimeout(Number(process.env.ART_SAMPLE_MS));
  await page.getByRole('button', { name: '打开设置' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出性能报告' }).click();
  await (await downloadPromise).saveAs(info.outputPath('render-report.json'));
  await page.getByRole('button', { name: '关闭面板' }).click();
  expect(errors).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .locator('canvas')
    .evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
  await page.screenshot({ path: info.outputPath('hotel-portrait.png') });
});
