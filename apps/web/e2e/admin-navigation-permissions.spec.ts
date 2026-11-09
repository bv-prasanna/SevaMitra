import {test,expect} from '@playwright/test';

const API='http://127.0.0.1:4173/api/v1';
test.beforeEach(async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('sevamitra_token','test-token'));
});

test('agent-only reviewer sees agent approvals and cannot load provider review queue',async({page})=>{
  let providerQueueCalls=0;
  await page.route(API+'/auth/workspaces',r=>r.fulfill({json:{
    customer:true,provider:false,agent:false,admin:true,
    adminPermissions:['agent.review'],
    canJoinProvider:true,canJoinAgent:true,providerStatus:null,agentStatus:null,
  }}));
  await page.route(API+'/provider-onboarding/applications',r=>{
    providerQueueCalls++;
    return r.fulfill({status:403,json:{message:'Forbidden'}});
  });
  await page.goto('/admin/');
  await expect(page.getByRole('link',{name:/Agent approvals/})).toBeVisible();
  await expect(page.getByRole('link',{name:/Roles & permissions/})).toHaveCount(0);
  await expect(page.getByRole('heading',{name:/Verification queue/})).toHaveCount(0);
  await expect(page.getByText('Unable to load applications')).toHaveCount(0);
  expect(providerQueueCalls).toBe(0);
});

test('catalogue manager sees only authorized catalogue tool',async({page})=>{
  await page.route(API+'/auth/workspaces',r=>r.fulfill({json:{
    customer:true,provider:false,agent:false,admin:true,
    adminPermissions:['catalogue.manage'],
    canJoinProvider:false,canJoinAgent:false,providerStatus:null,agentStatus:null,
  }}));
  await page.goto('/admin/');
  await expect(page.getByRole('link',{name:/Service catalogue/})).toBeVisible();
  await expect(page.getByRole('link',{name:/Agent approvals/})).toHaveCount(0);
  await expect(page.getByRole('heading',{name:/Verification queue/})).toHaveCount(0);
});

test('unauthorized account never receives administration controls',async({page})=>{
  await page.route(API+'/auth/workspaces',r=>r.fulfill({json:{
    customer:true,provider:false,agent:false,admin:false,
    adminPermissions:[],canJoinProvider:true,canJoinAgent:true,
    providerStatus:null,agentStatus:null,
  }}));
  await page.goto('/admin/');
  await expect(page.getByRole('alert')).toContainText('does not have permission');
  await expect(page.locator('.adminToolCard')).toHaveCount(0);
  await expect(page.getByRole('heading',{name:/Verification queue/})).toHaveCount(0);
});

test('platform super-admin sees permitted tools and provider queue',async({page})=>{
  await page.route(API+'/auth/workspaces',r=>r.fulfill({json:{
    customer:true,provider:false,agent:false,admin:true,
    adminPermissions:['*'],canJoinProvider:false,canJoinAgent:false,
    providerStatus:null,agentStatus:null,
  }}));
  await page.route(API+'/provider-onboarding/applications',r=>r.fulfill({json:[]}));
  await page.goto('/admin/');
  await expect(page.getByRole('heading',{name:/Verification queue/})).toBeVisible();
  await expect(page.locator('.adminToolCard')).toHaveCount(6);
});
