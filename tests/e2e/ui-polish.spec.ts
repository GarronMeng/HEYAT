import { expect, test } from '@playwright/test';
test('single drawer restores focus and offers real upgrade comparisons', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('#boot-status')).toHaveText('WebGL 2 已就绪');
  await page.getByRole('button', { name: '开始营业' }).click();
  await page.locator('#upgrades').click();
  await expect(page.locator('.panel.open')).toHaveCount(1);
  await expect(page.locator('.effect').first()).toContainText('¥90 → ¥110');
  await page.getByRole('button', { name: '效率', exact: true }).click();
  await expect(
    page.getByRole('button', { name: '效率', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Escape');
  await expect(page.locator('#upgrades')).toBeFocused();
  await expect(page.locator('#upgrades')).toHaveAttribute(
    'aria-expanded',
    'false',
  );
  await expect(page.locator('#panel')).toHaveAttribute('inert', '');
  await page.getByRole('button', { name: '酒店概览', exact: true }).click();
  await expect(page.locator('.room-list')).toBeVisible();
  await page.getByRole('button', { name: '关闭面板' }).click();
  for (const size of [
    { width: 390, height: 844 },
    { width: 844, height: 390 },
    { width: 320, height: 568 },
  ]) {
    await page.setViewportSize(size);
    for (const id of ['#checkin', '#clean', '#upgrades', '.hotel-tab']) {
      const rect = await page.locator(id).boundingBox();
      expect(rect!.width).toBeGreaterThanOrEqual(44);
      expect(rect!.height).toBeGreaterThanOrEqual(44);
      expect(rect!.x).toBeGreaterThanOrEqual(0);
      expect(rect!.x + rect!.width).toBeLessThanOrEqual(size.width);
      expect(rect!.y + rect!.height).toBeLessThanOrEqual(size.height);
    }
    await page.locator('#upgrades').click();
    const panel = await page.locator('#panel').boundingBox();
    expect(panel!.y).toBeGreaterThanOrEqual(0);
    expect(panel!.y + panel!.height).toBeLessThanOrEqual(size.height);
    const close = await page
      .getByRole('button', { name: '关闭面板' })
      .boundingBox();
    expect(close!.y).toBeGreaterThanOrEqual(0);
    expect(close!.height).toBeGreaterThanOrEqual(44);
    await page.keyboard.press('Escape');
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});
