import {expect,test} from '@playwright/test';
const API='http://127.0.0.1:4173/api/v1';
const access={customer:true,provider:false,agent:false,admin:true,canJoinProvider:true,canJoinAgent:true,providerStatus:null,agentStatus:null};
test.beforeEach(async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('sevamitra_token','test-access-token'));
 await page.route(API+'/auth/workspaces',r=>r.fulfill({json:access}));
});
test('mobile admin navigation uses one accessible expandable shell, not duplicate headers',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.route(API+'/agents/admin',r=>r.fulfill({json:[]}));
 await page.goto('/admin/agents/');
 await expect(page.getByRole('button',{name:'Open account menu'})).toBeVisible();
 await expect(page.getByRole('navigation',{name:'Account navigation'})).toBeHidden();
 await page.getByRole('button',{name:'Open account menu'}).click();
 await expect(page.getByRole('navigation',{name:'Account navigation'})).toBeVisible();
 await expect(page.getByRole('link',{name:'Admin console'})).toBeVisible();
 await expect(page.getByRole('link',{name:'My profile'})).toBeVisible();
 await expect(page.locator('main > header.nav')).toBeHidden();
 await page.getByRole('button',{name:'Close account menu'}).click();
 await expect(page.getByRole('navigation',{name:'Account navigation'})).toBeHidden();
});
test('agent permission denied shows a clear error without stale privileged records',async({page})=>{
 await page.route(API+'/agents/admin',r=>r.fulfill({status:403,json:{error:{message:'Forbidden'}}}));
 await page.goto('/admin/agents/');
 await expect(page.getByRole('alert')).toContainText('does not have the agent.review permission');
 await expect(page.getByRole('button',{name:'Review and approve'})).toHaveCount(0);
});
test('agent approval requires a visible confirmation and reports success only on server success',async({page})=>{
 let agentStatus='PENDING';let patches=0;
 await page.route(API+'/agents/admin',async r=>{
  if(r.request().method()==='GET')return r.fulfill({json:[{id:'agent-1',fullName:'Test Agent',agentCode:'UAT123',status:agentStatus,createdAt:'2026-11-01T00:00:00Z'}]});
  patches++;agentStatus='ACTIVE';return r.fulfill({json:{status:agentStatus}});
 });
 await page.goto('/admin/agents/');
 await page.getByRole('button',{name:'Review and approve'}).click();
 await expect(page.getByRole('alertdialog',{name:'Approve this agent?'})).toBeVisible();
 await page.getByRole('button',{name:'Cancel',exact:true}).click();
 expect(patches).toBe(0);
 await page.getByRole('button',{name:'Review and approve'}).click();
 await page.getByRole('button',{name:'Approve agent'}).click();
 await expect(page.getByRole('status')).toContainText('now an approved agent');
 expect(patches).toBe(1);
 await expect(page.getByText('active',{exact:true})).toBeVisible();
});
test('catalogue creation validates fields and saves real server results',async({page})=>{
 let categories:Array<{id:string;name:string;isActive:boolean}>=[];
 let services:Array<{id:string;name:string;isActive:boolean;categoryId:string}>=[];
 await page.route(API+'/catalogue/categories',r=>{
  if(r.request().method()==='POST'){
   const {name}=r.request().postDataJSON();categories=[...categories,{id:'category-1',name,isActive:true}];
   return r.fulfill({status:201,json:categories[0]});
  }
  return r.fulfill({json:categories});
 });
 await page.route(API+'/catalogue/services',r=>{
  if(r.request().method()==='POST'){
   const {categoryId,name}=r.request().postDataJSON();services=[...services,{id:'service-1',categoryId,name,isActive:true}];
   return r.fulfill({status:201,json:services[0]});
  }
  return r.fulfill({json:services});
 });
 await page.goto('/admin/catalogue/');
 await expect(page.getByRole('button',{name:'Create service'})).toBeDisabled();
 await page.getByLabel('Category name').fill('Home maintenance');
 await page.getByRole('button',{name:'Create category'}).click();
 await expect(page.getByRole('status')).toContainText('Category created');
 await page.getByLabel('Service category').selectOption('category-1');
 await page.getByLabel('Service name').fill('Fan repair');
 await page.getByRole('button',{name:'Create service'}).click();
 await expect(page.getByRole('status')).toContainText('Service created');
 await expect(page.getByRole('heading',{name:'Fan repair'})).toBeVisible();
 await page.getByLabel('Search', {exact:true}).fill('Not listed');
 await expect(page.getByText('No matching services')).toBeVisible();
});
