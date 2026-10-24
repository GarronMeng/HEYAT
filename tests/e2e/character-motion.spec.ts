import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { initialHotel } from '../../src/core/model';
import { encodeSave } from '../../src/core/save';

interface MotionReport {
  clock: number;
  frames: number;
  pool: number;
  maxStep: number;
  maxAllowedStep: number;
  poses: { x: number; y: number; z: number; distance?: number }[];
  samples: unknown[];
}
async function report(page: Page, path: string) {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出性能报告' }).click();
  await (await pending).saveAs(path);
  return JSON.parse(await readFile(path, 'utf8'));
}
test('persistent characters survive 3x, pause, LOD and context restoration', async ({
  page,
}, info) => {
  test.setTimeout(240000);
  const state = initialHotel();
  state.cash = 1000000;
  state.levels = {
    floor: 2,
    room: 11,
    brand: 2,
    breakfast: 1,
    gym: 1,
    lounge: 1,
    rooftop: 1,
  };
  state.rooms.forEach((r) => (r.status = 'AVAILABLE'));
  state.rooms[4]!.status = 'CLEANING';
  state.rooms[4]!.remaining = 200;
  const occupied = state.rooms[8]!;
  occupied.status = 'OCCUPIED';
  occupied.remaining = 200;
  occupied.order = { id: 1, guest: state.queue[0]!, revenue: 90 };
  state.queue = [];
  state.nextOrder = 2;
  state.nextArrival = 1000;
  await page.addInitScript(
    (save) => localStorage.setItem('heyat-save-v1', save),
    encodeSave(state),
  );
  await page.goto('/');
  await expect(page.locator('#boot-status')).toHaveText('WebGL 2 已就绪');
  await page.getByRole('button', { name: '打开设置' }).click();
  await page.getByLabel('画面质量').selectOption('low');
  await page.getByLabel('试玩速度').selectOption('3');
  await page.getByRole('button', { name: '关闭面板' }).click();
  await page.waitForTimeout(7000);
  await page.getByRole('button', { name: '打开设置' }).click();
  await page.getByRole('button', { name: '暂停营业', exact: true }).click();
  const first = await report(page, info.outputPath('motion-report.json'));
  await page.getByRole('button', { name: '关闭面板' }).click();
  await page.screenshot({ path: info.outputPath('characters-desktop.png') });
  if (process.env.HEYAT_BASELINE) return;

  const motion = first.characters.motion as MotionReport;
  expect(motion.pool).toBe(6);
  expect(motion.frames).toBeGreaterThan(2);
  expect(motion.samples.length).toBeGreaterThan(1);
  expect(motion.maxStep).toBeLessThanOrEqual(motion.maxAllowedStep + 1e-8);
  await page.getByRole('button', { name: '打开设置' }).click();
  const paused = await report(page, info.outputPath('paused-report.json'));
  expect(paused.characters.motion).toEqual(first.characters.motion);
  await page.getByRole('button', { name: '关闭面板' }).click();

  // Exercise both zoom thresholds while frozen; positions and resources persist.
  const canvas = page.locator('#scene');
  const bounds = await canvas.boundingBox();
  await page.mouse.move(bounds!.x + bounds!.width / 2, bounds!.y + 200);
  await page.mouse.wheel(0, 2000);
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: '打开设置' }).click();
  const distant = await report(page, info.outputPath('distant-report.json'));
  expect(distant.camera.zoom).toBeLessThan(0.7);
  expect(distant.characters.simplified).toBe(true);
  expect(distant.characters.identities).toEqual(first.characters.identities);
  expect(distant.characters.motion).toEqual(first.characters.motion);
  await page.getByRole('button', { name: '关闭面板' }).click();
  await page.mouse.move(bounds!.x + bounds!.width / 2, bounds!.y + 200);
  await page.mouse.wheel(0, -2000);
  await page.waitForTimeout(500);
  const extension = await canvas.evaluateHandle((el: HTMLCanvasElement) =>
    el.getContext('webgl2')!.getExtension('WEBGL_lose_context')!,
  );
  await extension.evaluate((ext) => ext.loseContext());
  await expect(page.locator('#boot-detail')).toContainText('图形连接已中断');
  await extension.evaluate((ext) => ext.restoreContext());
  await extension.dispose();
  await expect(page.locator('#boot-status')).toHaveText('WebGL 2 已就绪');
  await page.getByRole('button', { name: '打开设置' }).click();
  const restored = await report(page, info.outputPath('restored-report.json'));
  expect(restored.characters.motion).toEqual(first.characters.motion);
  expect(restored.resources.geometries).toBe(first.resources.geometries);
  // Context restoration releases obsolete tier textures; it must not grow them.
  expect(restored.resources.textures).toBeGreaterThan(0);
  expect(restored.resources.textures).toBeLessThanOrEqual(
    first.resources.textures,
  );
  expect(restored.characters.identities).toEqual(first.characters.identities);
  expect(restored.camera.zoom).toBeGreaterThan(0.85);
  expect(restored.characters.simplified).toBe(false);
  await page.getByRole('button', { name: '关闭面板' }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: '重置视角' }).click();
  await page.screenshot({
    path: info.outputPath('characters-phone-layout.png'),
  });
  console.log(
    'N06_MEASURED',
    JSON.stringify({
      device: first.device,
      gpu: first.gpu,
      viewport: first.viewport,
      resources: first.resources,
      sample: first.samples.at(-1),
      maxStep: motion.maxStep,
      maxAllowedStep: motion.maxAllowedStep,
      frames: motion.frames,
    }),
  );
});
