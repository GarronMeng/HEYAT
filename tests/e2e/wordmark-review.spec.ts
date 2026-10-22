import { expect, test } from '@playwright/test';
import { initialHotel } from '../../src/core/model';
import { encodeSave } from '../../src/core/save';

test('architectural wordmarks and clothed people render from the front and an oblique view', async ({
  page,
}, info) => {
  test.setTimeout(180_000);
  await page.addInitScript(
    (save) => localStorage.setItem('heyat-save-v1', save),
    encodeSave(initialHotel()),
  );
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.locator('#boot-status')).toHaveText('WebGL 2 已就绪');
  await page.getByRole('button', { name: '打开设置' }).click();
  await page.getByRole('button', { name: '暂停营业', exact: true }).click();
  await page.getByLabel('画面质量').selectOption('high');
  await page.getByRole('button', { name: '关闭面板' }).click();
  // Resize clears a WebGL drawing buffer; wait for actual rendered frames.
  const pixel = await page
    .locator('#scene')
    .evaluate(async (canvas: HTMLCanvasElement) => {
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      const gl = canvas.getContext('webgl2')!,
        rgba = new Uint8Array(4);
      gl.readPixels(
        Math.floor(canvas.width / 2),
        Math.floor(canvas.height / 2),
        1,
        1,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        rgba,
      );
      return [...rgba];
    });
  expect(Math.max(...pixel.slice(0, 3))).toBeGreaterThan(20);
  await page.screenshot({ path: info.outputPath('default.png') });
  const box = (await page.locator('#scene').boundingBox())!;
  const x = box.x + box.width * 0.6,
    y = box.y + box.height * 0.5;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x - 65, y - 55, { steps: 16 });
  await page.mouse.up();
  await page.waitForTimeout(1000);
  await page.mouse.wheel(0, -900);
  await page.waitForTimeout(1000);
  await page.screenshot({ path: info.outputPath('oblique.png') });
  // Return to the standard view after checking a zoomed, lower oblique angle.
  await page.getByRole('button', { name: '重置视角' }).click();
  await expect(page.locator('#cash')).toHaveText('¥120');
  await page.getByRole('button', { name: '打开设置' }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出性能报告' }).click();
  await (await pending).saveAs(info.outputPath('render-report.json'));
  await page.getByRole('button', { name: '关闭面板' }).click();
  expect(errors).toEqual([]);
});
