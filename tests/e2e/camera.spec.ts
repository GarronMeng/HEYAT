import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { initialHotel } from '../../src/core/model';
import { encodeSave } from '../../src/core/save';

type Camera = {
  position: number[];
  target: number[];
  zoom: number;
  fullOrbit: boolean;
  pan: boolean;
};
async function cameraReport(page: Page): Promise<Camera> {
  await page.getByRole('button', { name: '打开设置' }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出性能报告' }).click();
  const file = await download;
  const camera = JSON.parse(readFileSync((await file.path())!, 'utf8'))
    .camera as Camera;
  await page.getByRole('button', { name: '关闭面板' }).click();
  return camera;
}
test('camera rotates beyond the old cone, pans, zooms and resets without editing the save', async ({
  page,
}, info) => {
  await page.addInitScript(
    (save) => localStorage.setItem('heyat-save-v1', save),
    encodeSave(initialHotel()),
  );
  await page.goto('/');
  await expect(page.locator('#boot-status')).toHaveText('WebGL 2 已就绪');
  await page.getByRole('button', { name: '打开设置' }).click();
  await page.getByRole('button', { name: '暂停营业', exact: true }).click();
  await page.getByLabel('画面质量').selectOption('low');
  await page.getByRole('button', { name: '关闭面板' }).click();
  const before = await page.evaluate(() =>
    localStorage.getItem('heyat-save-v1'),
  );
  const initial = await cameraReport(page);
  expect(initial.pan).toBe(true);
  expect(initial.fullOrbit).toBe(true);
  const canvas = await page.locator('#scene').boundingBox();
  const x = canvas!.x + canvas!.width * 0.25,
    y = canvas!.y + canvas!.height * 0.55;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + canvas!.width * 0.45, y, { steps: 24 });
  await page.mouse.up();
  await page.waitForTimeout(700);
  const rotated = await cameraReport(page);
  const angle = Math.atan2(
    rotated.position[0]! - rotated.target[0]!,
    rotated.position[2]! - rotated.target[2]!,
  );
  expect(Math.abs(angle)).toBeGreaterThan(1);
  await page.mouse.move(x, y);
  await page.mouse.down({ button: 'right' });
  await page.mouse.move(x + 70, y + 35, { steps: 10 });
  await page.mouse.up({ button: 'right' });
  await page.waitForTimeout(700);
  const panned = await cameraReport(page);
  expect(
    Math.hypot(...panned.target.map((v, i) => v - initial.target[i]!)),
  ).toBeGreaterThan(0.2);
  await expect(page.locator('#panel')).not.toBeVisible();
  await page.mouse.move(x, y);
  await page.mouse.wheel(0, -600);
  await page.waitForTimeout(700);
  expect((await cameraReport(page)).zoom).toBeGreaterThan(initial.zoom);
  await page.getByRole('button', { name: '重置视角' }).click();
  await page.waitForTimeout(400);
  const reset = await cameraReport(page);
  expect(reset.zoom).toBe(1);
  reset.position.forEach((v, i) =>
    expect(v).toBeCloseTo(initial.position[i]!, 3),
  );
  reset.target.forEach((v, i) => expect(v).toBeCloseTo(initial.target[i]!, 3));
  expect(await page.evaluate(() => localStorage.getItem('heyat-save-v1'))).toBe(
    before,
  );
  await page.screenshot({ path: info.outputPath('camera-reset.png') });
});
