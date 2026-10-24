import {test,expect} from '@playwright/test';
const API='http://127.0.0.1:4173/api/v1';
const blank={customer:true,provider:false,agent:false,admin:false,canJoinProvider:true,canJoinAgent:true,providerStatus:null,agentStatus:null};
const approved={...blank,provider:true,agent:true,admin:true,canJoinProvider:false,canJoinAgent:false,providerStatus:'ACTIVE',agentStatus:'ACTIVE'};

test.beforeEach(async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('sevamitra_token','browser-test-access-token'));
});
test('customer sees only permitted workspace and optional enrollment links',async({page})=>{
 await page.route(API+'/auth/workspaces',r=>r.fulfill({json:blank}));
 await page.goto('/workspaces/');
 await expect(page.getByRole('heading',{name:'Customer'})).toBeVisible();
 await expect(page.getByRole('heading',{name:'Admin'})).toHaveCount(0);
 await expect(page.getByRole('heading',{name:'Provider'})).toHaveCount(0);
 await expect(page.getByRole('heading',{name:'Agent'})).toHaveCount(0);
 await expect(page.getByRole('link',{name:/Apply as a provider/})).toBeVisible();
 await expect(page.getByRole('link',{name:/Apply as an agent/})).toBeVisible();
});
test('multi-role users see customer, provider, agent and admin workspaces',async({page})=>{
 await page.route(API+'/auth/workspaces',r=>r.fulfill({json:approved}));
 await page.goto('/workspaces/');
 for(const role of ['Customer','Provider','Agent','Admin']){
  await expect(page.getByRole('heading',{name:role,exact:true})).toBeVisible();
 }
 await expect(page.getByRole('link',{name:/Apply as a provider/})).toHaveCount(0);
});
test('denied/expired token never displays privileged workspaces',async({page})=>{
 await page.route(API+'/auth/workspaces',r=>r.fulfill({status:403,json:{message:'Forbidden'}}));
 await page.goto('/workspaces/');
 await expect(page.getByRole('heading',{name:'Admin',exact:true})).toHaveCount(0);
 await expect(page.getByRole('heading',{name:'Provider',exact:true})).toHaveCount(0);
 await expect(page.getByRole('link',{name:'Sign in'})).toBeVisible();
});
test('admin creates role with specific View and Edit rights, not bundled Manage',async({page})=>{
 let roles=[] as any[],sent:any=null;
 const permissions=[
  {key:'iam.role.view',description:'View roles'},
  {key:'iam.role.add',description:'Add roles'},
  {key:'iam.role.edit',description:'Edit roles'},
  {key:'iam.role.delete',description:'Delete roles'},
  {key:'iam.role.manage',description:'Legacy bundled admin permission'},
 ];
 await page.route(API+'/iam/permissions',r=>r.fulfill({json:permissions}));
 await page.route(API+'/iam/roles',async r=>{
  if(r.request().method()==='GET')return r.fulfill({json:roles});
  sent=r.request().postDataJSON();
  const created={id:'role-1',...sent,isSystem:false};
  roles=[created];
  return r.fulfill({status:201,json:created});
 });
 await page.goto('/admin/roles/');
 await expect(page.getByRole('heading',{name:'Roles & permissions matrix'})).toBeVisible();
 await page.getByLabel('Role name').fill('Limited Ops Reviewer');
 await page.getByRole('checkbox',{name:'iam.role.view'}).check();
 await page.getByRole('checkbox',{name:'iam.role.edit'}).check();
 await page.getByRole('button',{name:'Create role'}).last().click();
 await expect.poll(()=>sent?.permissionKeys).toEqual(['iam.role.edit','iam.role.view']);
 expect(sent.permissionKeys).not.toContain('iam.role.manage');
});
test('system roles are immutable in the matrix editor',async({page})=>{
 await page.route(API+'/iam/permissions',r=>r.fulfill({json:[{key:'iam.role.view',description:'View'}]}));
 await page.route(API+'/iam/roles',r=>r.fulfill({json:[{
  id:'system-1',name:'SUPER_ADMIN',isSystem:true,description:'Root',permissionKeys:['iam.role.view'],
 }]}));
 await page.goto('/admin/roles/');
 await page.getByLabel('Role to configure').selectOption('system-1');
 await expect(page.getByLabel('Role name')).toBeDisabled();
 await expect(page.getByRole('button',{name:'Save role & permissions'})).toBeDisabled();
 await expect(page.getByRole('button',{name:'Delete role'})).toHaveCount(0);
});
