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
  await expect(page.locator('.adminHub [role="alert"]').filter({hasText:'does not have permission'})).toBeVisible();
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
  await expect(page.locator('.adminToolCard')).toHaveCount(8);
  await expect(page.getByRole('link',{name:/Tax, pricing & billing/})).toBeVisible();
});

test('runtime flag viewer sees the emergency controls but cannot change them',async({page})=>{
  await page.route(API+'/auth/workspaces',r=>r.fulfill({json:{
    customer:true,provider:false,agent:false,admin:true,
    adminPermissions:['runtime-flags.view'],
    canJoinProvider:false,canJoinAgent:false,providerStatus:null,agentStatus:null,
  }}));
  await page.route(API+'/runtime-flags',r=>r.fulfill({json:[
    {key:'bookings.enabled',enabled:false,reason:'Planned maintenance',updatedBy:'ops-1',updatedAt:'2026-11-23T10:00:00.000Z'},
  ]}));
  await page.goto('/admin/');
  await expect(page.getByRole('link',{name:/Emergency controls/})).toBeVisible();
  await page.goto('/admin/runtime-flags/');
  await expect(page.getByRole('heading',{name:/Pilot and emergency controls/})).toBeVisible();
  await expect(page.getByRole('status')).toContainText('Read-only access');
  await expect(page.locator('#flag-key')).toHaveCount(0);
  await expect(page.getByRole('button',{name:/Prepare opposite value/})).toHaveCount(0);
});

test('runtime flag manager receives the change form',async({page})=>{
  await page.route(API+'/auth/workspaces',r=>r.fulfill({json:{
    customer:true,provider:false,agent:false,admin:true,
    adminPermissions:['runtime-flags.view','runtime-flags.manage'],
    canJoinProvider:false,canJoinAgent:false,providerStatus:null,agentStatus:null,
  }}));
  await page.route(API+'/runtime-flags',r=>r.fulfill({json:[]}));
  await page.goto('/admin/runtime-flags/');
  await expect(page.locator('#flag-key')).toBeVisible();
  await expect(page.getByRole('button',{name:/Review runtime flag change/})).toBeVisible();
});

test('incident manager sees the support workspace without provider review access',async({page})=>{
  await page.route(API+'/auth/workspaces',r=>r.fulfill({json:{
    customer:true,provider:false,agent:false,admin:true,
    adminPermissions:['incident.manage'],
    canJoinProvider:false,canJoinAgent:false,providerStatus:null,agentStatus:null,
  }}));
  await page.route(API+'/incidents/admin',r=>r.fulfill({json:[{
    id:'case-1',category:'SERVICE_ISSUE',title:'Provider missed appointment',
    severity:'P2',status:'OPEN',level:1,reporterId:'customer-1',
    assignedToId:null,createdAt:'2026-11-25T08:00:00.000Z',
  }]}));
  await page.route(API+'/incidents/admin/sla-policies',r=>r.fulfill({json:[]}));
  await page.route(API+'/incidents/admin/sla-holidays',r=>r.fulfill({json:[]}));
  await page.goto('/admin/');
  await expect(page.getByRole('link',{name:/Incident management/})).toBeVisible();
  await expect(page.getByRole('heading',{name:/Verification queue/})).toHaveCount(0);
  await page.goto('/admin/incidents/');
  await expect(page.getByRole('heading',{name:'Incident management'})).toBeVisible();
  await expect(page.getByText('Provider missed appointment')).toBeVisible();
  await expect(page.getByText(/No SLA policies configured/)).toBeVisible();
});
