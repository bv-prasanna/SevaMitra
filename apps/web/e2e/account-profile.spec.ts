import {test,expect} from '@playwright/test';
const API='http://127.0.0.1:4173/api/v1';
test.beforeEach(async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('sevamitra_token','uat-test-token'));
 await page.route(API+'/auth/workspaces',r=>r.fulfill({json:{customer:true,provider:false,agent:false,admin:false,canJoinProvider:true,canJoinAgent:true,providerStatus:null,agentStatus:null}}));
 await page.route(API+'/auth/me',r=>r.fulfill({json:{id:'user-1',phoneNumber:'+919876543210',email:null}}));
});
test('profile page displays authenticated identity without allowing phone edits',async({page})=>{
 await page.route(API+'/customers/me',r=>r.fulfill({json:{fullName:'Ananya',preferredLanguage:'kn',notificationOptIn:true,status:'ACTIVE'}}));
 await page.goto('/profile/');
 await expect(page.getByRole('heading',{name:'My profile'})).toBeVisible();
 await expect(page.getByText('+919876543210')).toBeVisible();
 await expect(page.getByLabel('Full name')).toHaveValue('Ananya');
 await expect(page.getByLabel('Preferred language')).toHaveValue('kn');
 await expect(page.getByLabel('Receive optional service notifications')).toBeChecked();
 await expect(page.getByRole('textbox',{name:'Mobile number'})).toHaveCount(0);
});
test('profile save confirms only after API success and preserves selected preferences',async({page})=>{
 let sent=null;
 await page.route(API+'/customers/me',r=>{
  if(r.request().method()==='PATCH'){
   sent=r.request().postDataJSON();
   return r.fulfill({json:{fullName:'Updated Name',preferredLanguage:'en',notificationOptIn:false,status:'ACTIVE'}});
  }
  return r.fulfill({json:{fullName:'Ananya',preferredLanguage:'kn',notificationOptIn:true,status:'ACTIVE'}});
 });
 await page.goto('/profile/');
 await page.getByLabel('Full name').fill('Updated Name');
 await page.getByLabel('Preferred language').selectOption('en');
 await page.getByLabel('Receive optional service notifications').uncheck();
 await page.getByRole('button',{name:'Save changes'}).click();
 await expect(page.getByRole('status')).toContainText('Profile preferences saved');
 expect(sent).toEqual({fullName:'Updated Name',preferredLanguage:'en',notificationOptIn:false});
});
test('rejected profile update never claims successful save',async({page})=>{
 await page.route(API+'/customers/me',r=>r.request().method()==='PATCH'?r.fulfill({status:403,json:{error:{message:'Forbidden'}}}):r.fulfill({json:{fullName:'Ananya',preferredLanguage:'kn',notificationOptIn:true,status:'ACTIVE'}}));
 await page.goto('/profile/');
 await page.getByLabel('Full name').fill('Another Name');
 await page.getByRole('button',{name:'Save changes'}).click();
 await expect(page.locator('.accountProfile [role=alert]')).toContainText('do not have permission');
 await expect(page.locator('.accountProfile [role=status]')).toHaveCount(0);
});
test('anonymous visitors are asked to sign in and cannot see cached identity',async({page})=>{
 await page.addInitScript(()=>localStorage.removeItem('sevamitra_token'));
 await page.goto('/profile/');
 await expect(page.getByText('Please sign in to view your profile.')).toBeVisible();
 await expect(page.getByText('+919876543210')).toHaveCount(0);
});
