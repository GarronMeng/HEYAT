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
  // SwiftShader can discard the WebGL drawing buffer between animation frames.
  // Capture the composited canvas itself, which is the pixels the player sees.
  // A blank/unrendered 1440×776 surface compresses much smaller than the hotel.
  const screenshot = await page.locator('canvas').screenshot();
  expect(screenshot.byteLength).toBeGreaterThan(12_000);
  expect(external).toEqual([]);
  expect(errors).toEqual([]);
  await page.getByRole('button', { name: '开始营业' }).click();
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
