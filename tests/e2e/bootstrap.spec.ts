import { expect, test } from '@playwright/test';

test('production build renders a real WebGL 2 frame without external requests', async ({
  page,
}, testInfo) => {
  const external: string[] = [];
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    if (!request.url().startsWith('http://127.0.0.1:4173/'))
      external.push(request.url());
  });
  await page.goto('/');
  await expect(page.locator('#boot-status')).toHaveText('WebGL 2 已就绪');
  const pixels = await page
    .locator('canvas')
    .evaluate((canvas: HTMLCanvasElement) => {
      const gl = canvas.getContext('webgl2')!;
      const result = new Uint8Array(4);
      // Read immediately after an actual frame, rather than an already-cleared buffer.
      return new Promise<number[]>((resolve) =>
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            gl.readPixels(
              canvas.width / 2,
              canvas.height / 2,
              1,
              1,
              gl.RGBA,
              gl.UNSIGNED_BYTE,
              result,
            );
            resolve(Array.from(result));
          });
        }),
      );
    });
  expect(pixels[3]).toBe(255);
  expect(pixels.slice(0, 3).some((value) => value > 30)).toBe(true);
  expect(external).toEqual([]);
  expect(errors).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath('bootstrap-desktop.png'),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('canvas')).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath('bootstrap-portrait.png'),
    fullPage: true,
  });
});

test('WebGL 2 unavailable shows an explanation and retry recovers', async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('block-webgl') === 'done') return;
    sessionStorage.setItem('block-webgl', 'done');
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      ...args: unknown[]
    ) {
      if (type === 'webgl2') return null;
      return Reflect.apply(original, this, [type, ...args]);
    } as typeof original;
  });
  await page.goto('/');
  await expect(page.locator('#boot-detail')).toContainText('无法创建 WebGL 2');
  await expect(page.locator('canvas')).toBeHidden();
  await page.screenshot({
    path: testInfo.outputPath('webgl-unavailable.png'),
    fullPage: true,
  });
  await page.getByRole('button', { name: '重新加载' }).click();
  await expect(page.locator('#boot-status')).toHaveText('WebGL 2 已就绪');
});

test('entry script network failure leaves static fallback and reload action', async ({
  page,
}) => {
  await page.route('**/assets/index-*.js', (route) => route.abort());
  await page.goto('/');
  await expect(page.locator('#boot-status')).toHaveText('页面加载失败');
  await expect(page.getByRole('button', { name: '重新加载' })).toBeVisible();
  await page.unrouteAll();
  await page.getByRole('button', { name: '重新加载' }).click();
  await expect(page.locator('#boot-status')).toHaveText('WebGL 2 已就绪');
});

test('dynamic bootstrap chunk failure is actionable', async ({ page }) => {
  await page.route('**/assets/bootstrap-*.js', (route) => route.abort());
  await page.goto('/');
  await expect(page.locator('#boot-status')).toHaveText('页面加载失败');
  await expect(page.getByRole('button', { name: '重新加载' })).toBeVisible();
});

test('context loss stops rendering and offers reload', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#boot-status')).toHaveText('WebGL 2 已就绪');
  await page.locator('canvas').evaluate((canvas: HTMLCanvasElement) => {
    canvas
      .getContext('webgl2')!
      .getExtension('WEBGL_lose_context')!
      .loseContext();
  });
  await expect(page.locator('#boot-detail')).toContainText('图形连接已中断');
  await expect(page.getByRole('button', { name: '重新加载' })).toBeVisible();
});
