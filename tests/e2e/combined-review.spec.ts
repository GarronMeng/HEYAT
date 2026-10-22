import { expect, test } from '@playwright/test';

// Review-branch integration check: the default PR A camera with PR B's canvas inset.
test('combined camera picks the visible first room through the UI layout', async ({
  page,
}, info) => {
  await page.goto('/');
  await expect(page.locator('#boot-status')).toHaveText('WebGL 2 已就绪');
  await page.getByRole('button', { name: '开始营业' }).click();
  // A visible bed in the fixed 1440x900 review view, identified from the real frame.
  await page.locator('#scene').click({ position: { x: 500, y: 228 } });
  await expect(page.locator('.panel-head h2')).toHaveText('101 号客房');
  await expect(page.locator('.room-state')).toHaveText('净房');
  await expect(page.locator('#cash')).toHaveText('¥120');
  await page.screenshot({ path: info.outputPath('selected-room.png') });
  await page.getByRole('button', { name: '关闭面板' }).click();
  await expect(page.locator('#panel')).not.toBeVisible();
});
