import { expect, test } from '@playwright/test';
import { initialHotel } from '../../src/core/model';
import { admit, clean } from '../../src/core/simulation';
import { encodeSave } from '../../src/core/save';

test('six hotel representatives render service and waiting actions in an operating hotel', async ({
  page,
}, info) => {
  test.setTimeout(180_000);
  const state = initialHotel();
  state.rooms[1]!.status = 'DIRTY';
  state.levels.room = 1;
  admit(state);
  clean(state);
  await page.addInitScript(
    (save) => localStorage.setItem('heyat-save-v1', save),
    encodeSave(state),
  );
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.locator('#boot-status')).toHaveText('WebGL 2 已就绪');
  await page.getByRole('button', { name: '打开设置' }).click();
  await page.getByRole('button', { name: '暂停营业', exact: true }).click();
  await page.getByLabel('画面质量').selectOption('high');
  await page.getByRole('button', { name: '关闭面板' }).click();
  await page
    .locator('#scene')
    .evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
  await page.screenshot({ path: info.outputPath('service-default.png') });
  // A real camera orbit/zoom, using the same inputs available to the player.
  const box = (await page.locator('#scene').boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(
    box.x + box.width * 0.6 - 65,
    box.y + box.height * 0.5 - 55,
    { steps: 8 },
  );
  await page.mouse.up();
  await page.mouse.wheel(0, -550);
  await page.waitForTimeout(1000);
  for (let i = 0; i < (process.env.CI ? 2 : 6); i++) {
    await page.waitForTimeout(350);
    await page.screenshot({ path: info.outputPath(`service-motion-${i}.png`) });
  }
  await page.getByRole('button', { name: '打开设置' }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出性能报告' }).click();
  await (await pending).saveAs(info.outputPath('render-report.json'));
  expect(errors).toEqual([]);
});
