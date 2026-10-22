import { expect, test } from '@playwright/test';
import { initialHotel } from '../../src/core/model';
import { encodeSave } from '../../src/core/save';
test('click feedback quotes a locked order, progresses in place and credits only checkout', async ({
  page,
}, info) => {
  test.setTimeout(120000);
  const state = initialHotel();
  state.nextArrival = 100;
  await page.addInitScript(
    (save) => localStorage.setItem('heyat-save-v1', save),
    encodeSave(state),
  );
  await page.goto('/');
  await expect(page.locator('#boot-status')).toHaveText('WebGL 2 已就绪');
  const box = await page.locator('.action-dock').boundingBox();
  await page.locator('#checkin').click();
  await expect(page.locator('#checkin')).toHaveAttribute('aria-busy', 'true');
  await expect(page.locator('#checkin-meta')).toContainText('预计 ¥90');
  await expect(page.locator('#cash')).toHaveText('¥120');
  await page.screenshot({ path: info.outputPath('checkin-progress.png') });
  await page.getByRole('button', { name: '打开设置' }).click();
  await page.getByLabel('试玩速度').selectOption('3');
  await page.getByRole('button', { name: '关闭面板' }).click();
  await expect(page.locator('#cash')).toHaveText('¥210', { timeout: 25000 });
  await expect(
    page.locator('.feedback-chip[data-kind="income"]'),
  ).toContainText('+¥90');
  expect(await page.locator('.action-dock').boundingBox()).toEqual(box);
  await page.locator('#clean').click();
  await expect(page.locator('#clean')).toHaveAttribute('aria-busy', 'true');
  await page.screenshot({ path: info.outputPath('clean-progress.png') });
  await page.waitForTimeout(2500);
  await expect(page.locator('#cash')).toHaveText('¥210');
});
