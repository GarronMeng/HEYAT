import { expect, test } from '@playwright/test';
import { initialHotel } from '../../src/core/model';
import { encodeSave } from '../../src/core/save';
import { writeFile } from 'node:fs/promises';

test('recommendation appearance, purchase and drawer resize keep the dock and camera stable', async ({
  page,
}, info) => {
  test.setTimeout(180_000);
  const state = initialHotel();
  state.cash = 30;
  state.rooms[0]!.status = 'OCCUPIED';
  state.rooms[0]!.remaining = 5;
  state.rooms[0]!.order = { id: 1, guest: state.queue.shift()!, revenue: 90 };
  state.nextOrder = 2;
  state.nextArrival = 100;
  await page.addInitScript(
    (save) => localStorage.setItem('heyat-save-v1', save),
    encodeSave(state),
  );
  await page.goto('/');
  await expect(page.locator('#boot-status')).toHaveText('WebGL 2 已就绪');
  const geometry = () =>
    page.evaluate(() =>
      Object.fromEntries(
        ['#viewport', '.action-dock', '#checkin', '#clean', '#upgrades'].map(
          (s) => {
            const r = document.querySelector(s)!.getBoundingClientRect();
            return [s, [r.x, r.y, r.width, r.height]];
          },
        ),
      ),
    );
  const before = await geometry();
  await page.screenshot({ path: info.outputPath('before-income.png') });
  await expect(page.locator('#cash')).toHaveText('¥120', { timeout: 20000 });
  const after = await geometry();
  await page.screenshot({ path: info.outputPath('after-income.png') });
  await writeFile(
    info.outputPath('geometry.json'),
    JSON.stringify({ before, after }, null, 2),
  );
  if (!process.env.HEYAT_BASELINE) expect(after).toEqual(before);
  if (process.env.HEYAT_BASELINE) return;
  await page.locator('#recommendation').click();
  await page.locator('[data-action="buy"][data-value="price"]').click();
  await page.getByRole('button', { name: '关闭面板' }).click();
  expect(await geometry()).toEqual(before);
  await expect(page.locator('#recommendation')).toBeDisabled();
  for (const size of [
    { width: 390, height: 844 },
    { width: 320, height: 568 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(size);
    const a = await geometry();
    // Pure DOM stress mirrors consecutive recommendation events without changing the economy.
    await page.locator('#recommendation').evaluate((el: HTMLButtonElement) => {
      el.disabled = false;
      el.textContent = '推荐 · 城市夜色中的名片  ¥28,880 ↗';
    });
    expect(await geometry()).toEqual(a);
    await page.locator('#recommendation').evaluate((el: HTMLButtonElement) => {
      el.disabled = true;
      el.textContent = '暂无可用升级 · 继续经营';
    });
    expect(await geometry()).toEqual(a);
  }
});
