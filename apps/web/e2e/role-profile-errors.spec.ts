import {test,expect} from '@playwright/test';
const API='http://127.0.0.1:4173/api/v1';
const paths=[
 {page:'/customer/',endpoint:'/customers/me',create:'Create customer profile'},
 {page:'/provider/',endpoint:'/providers/me',create:'Create provider profile'},
 {page:'/agent/',endpoint:'/agents/me',create:'Create agent profile'},
] as const;
test.beforeEach(async({page})=>{await page.route(API+'/auth/workspaces',r=>r.fulfill({json:{customer:false,provider:false,agent:false,admin:false}}))});
for(const entry of paths){
 test(entry.page+' shows sign-in not a registration form on 401',async({page})=>{
  await page.route(API+entry.endpoint,r=>r.fulfill({status:401,json:{error:{message:'Invalid token'}}}));
  await page.goto(entry.page);
  await expect(page.getByRole('link',{name:'Sign in',exact:false}).first()).toBeVisible();
  await expect(page.getByRole('button',{name:entry.create})).toHaveCount(0);
 });
 test(entry.page+' shows registration only for a genuinely missing profile (404)',async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('sevamitra_token','uat-token'));
  await page.route(API+entry.endpoint,r=>r.fulfill({status:404,json:{error:{message:'Not found'}}}));
  await page.goto(entry.page);
  await expect(page.getByRole('button',{name:entry.create})).toBeVisible();
 });
 test(entry.page+' never offers registration on network/server outage',async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('sevamitra_token','uat-token'));
  await page.route(API+entry.endpoint,r=>r.fulfill({status:503,json:{error:{message:'Unavailable'}}}));
  await page.goto(entry.page);
  await expect(page.getByRole('button',{name:entry.create})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Retry'})).toBeVisible();
 });
}
