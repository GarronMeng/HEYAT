import { expect, test } from '@playwright/test';

for (const failAssets of [false, true]) {
  test(`Blender material maps ${failAssets ? 'fall back on failure' : 'load locally'}`, async ({
    page,
  }, info) => {
    test.setTimeout(120_000);
    if (failAssets)
      await page.route('**/assets/blender/*.png', (route) => route.abort());
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/');
    await expect(page.locator('#boot-status')).toHaveText('WebGL 2 已就绪');
    await page.getByRole('button', { name: '开始营业 →' }).click();
    await page.getByRole('button', { name: '打开设置' }).click();
    await page.getByRole('button', { name: '暂停营业', exact: true }).click();
    await page.getByLabel('画面质量').selectOption('high');
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: '导出性能报告' }).click();
    const path = info.outputPath('material-report.json');
    await (await pending).saveAs(path);
    const { readFile } = await import('node:fs/promises');
    const report = JSON.parse(await readFile(path, 'utf8'));
    expect(report.surfaceBakes.authoring).toBe('Blender 4.5 Cycles');
    expect(report.surfaceBakes.loaded).toBe(failAssets ? 0 : 11);
    expect(report.surfaceBakes.fallbacks).toBe(failAssets ? 11 : 0);
    await page.getByRole('button', { name: '关闭面板' }).click();
    await page
      .locator('#scene')
      .evaluate(
        () =>
          new Promise((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(resolve)),
          ),
      );
    await page.screenshot({ path: info.outputPath('material-game.png') });
    await expect(page.locator('#cash')).toHaveText('¥120');
    expect(errors).toEqual([]);
  });
}
