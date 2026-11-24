import {test,expect} from '@playwright/test';

const API = 'http://127.0.0.1:4173/api/v1/auth/workspaces';

test('signed-in workspace has one logout action and no redundant login', async ({page}) => {
  await page.addInitScript(() => localStorage.setItem('sevamitra_token', 'test-token'));
  await page.route(API, route => route.fulfill({
    status: 200,
    json: {customer:true,provider:false,agent:false,admin:false,
      canJoinProvider:true,canJoinAgent:true,providerStatus:null,agentStatus:null},
  }));
  await page.goto('/workspaces/');
  await expect(page.getByRole('button', {name:'Sign out',exact:true})).toHaveCount(1);
  await expect(page.getByRole('button', {name:'Sign out / Switch account'})).toHaveCount(0);
  await expect(page.getByRole('link', {name:'Sign in / Register'})).toHaveCount(0);
});

test('visitor workspace uses only the shared sign-in link', async ({page}) => {
  await page.goto('/workspaces/');
  await expect(page.getByRole('link', {name:'Sign in / Register'})).toHaveCount(1);
  await expect(page.getByRole('button', {name:'Sign out',exact:true})).toHaveCount(0);
  await expect(page.getByRole('link', {name:'Sign in',exact:true})).toHaveCount(0);
});

test('temporary workspace API outage preserves account logout without inventing extra sign-ins', async ({page}) => {
  await page.addInitScript(() => localStorage.setItem('sevamitra_token', 'test-token'));
  await page.route(API, route => route.fulfill({status:503,json:{message:'Unavailable'}}));
  await page.goto('/workspaces/');
  await expect(page.getByRole('button', {name:'Sign out',exact:true})).toHaveCount(1);
  await expect(page.getByRole('link', {name:'Sign in / Register'})).toHaveCount(0);
  await expect(page.getByRole('button', {name:'Refresh permissions'})).toHaveCount(1);
});
