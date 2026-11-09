import {test,expect} from '@playwright/test';

const routes = [
  '/admin/', '/admin/agents/', '/admin/catalogue/', '/admin/organizations/',
  '/admin/roles/', '/admin/runtime-flags/', '/admin/operations/',
  '/agent/', '/customer/', '/provider/', '/provider/manage/',
  '/workspaces/', '/marketplace/', '/marketplace/discover/',
];

test.describe('one shared navigation across role-specific web pages', () => {
  for (const path of routes) {
    test(path + ' never duplicates the account header', async ({page}) => {
      await page.goto(path);
      await expect(page.locator('header.accountBar')).toHaveCount(1);
      await expect(page.locator('header.nav')).toHaveCount(0);
      await expect(page.getByRole('navigation', {name: 'Account navigation'})).toHaveCount(1);
      await expect(page.locator('.accountBrand img')).toHaveAttribute('src', '/sevamitra-logo.png');
    });
  }

  test('home renders exactly one public header', async ({page}) => {
    await page.goto('/');
    await expect(page.locator('header.siteHeader')).toHaveCount(1);
    await expect(page.locator('header.accountBar')).toHaveCount(0);
  });

  test('provider management link is preserved in its workspace', async ({page}) => {
    await page.goto('/provider/');
    await expect(page.getByRole('link', {name: 'Manage services & coverage'}))
      .toHaveAttribute('href', '/provider/manage/');
  });

  test('mobile account navigation exposes one accessible menu', async ({page}) => {
    await page.setViewportSize({width: 390, height: 844});
    await page.goto('/customer/');
    const menu = page.getByRole('button', {name: 'Open account menu'});
    await expect(menu).toHaveCount(1);
    await menu.click();
    await expect(page.getByRole('navigation', {name: 'Account navigation'}))
      .toHaveClass(/isOpen/);
    await expect(page.locator('header.nav')).toHaveCount(0);
  });
});
