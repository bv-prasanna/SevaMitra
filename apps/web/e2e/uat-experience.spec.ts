import {test,expect} from '@playwright/test';
const API='http://127.0.0.1:4173/api/v1';
test('homepage search carries both service name and PIN to discovery',async({page})=>{
 await page.route(API+'/geography/states',r=>r.fulfill({json:[]}));
 await page.goto('/');
 await page.getByRole('textbox',{name:'Service PIN code'}).fill('560072');
 await page.getByRole('textbox',{name:'Search services'}).fill('Plumber');
 await page.locator('.heroSearch').getByRole('button',{name:/Search/i}).click();
 await expect(page).toHaveURL(/marketplace\/?.*pin=560072.*query=Plumber/);
 await expect(page.getByRole('textbox',{name:'Service area PIN'})).toHaveValue('560072');
 await expect(page.getByRole('textbox',{name:'Search available services'})).toHaveValue('Plumber');
});
test('incomplete PIN is rejected by native form validation',async({page})=>{
 await page.goto('/');
 await page.getByRole('textbox',{name:'Service PIN code'}).fill('560');
 await page.locator('.heroSearch').getByRole('button',{name:/Search/i}).click();
 await expect(page).toHaveURL(/\/$/);
});
test('OTP rate limits show actionable errors instead of technical messages',async({page})=>{
 await page.route(API+'/auth/otp/request',r=>r.fulfill({status:429,json:{error:{message:'Redis rate limiter failed'}}}));
 await page.goto('/login/');
 await page.getByRole('textbox',{name:'Mobile number'}).fill('9876543210');
 await page.getByRole('button',{name:'Send OTP'}).click();
 await expect(page.locator('.authCard div[role=alert]')).toContainText('Too many requests');
 await expect(page.locator('.authCard div[role=alert]')).not.toContainText('Redis');
});
test('completed OTP login navigates even if workspace lookup is temporarily unavailable',async({page})=>{
 await page.route(API+'/auth/otp/request',r=>r.fulfill({status:200,json:{message:'requested'}}));
 await page.route(API+'/auth/otp/verify',r=>r.fulfill({status:200,json:{kind:'tokens',tokens:{accessToken:'uat-jwt',refreshToken:'uat-refresh',expiresIn:900}}}));
 await page.route(API+'/auth/workspaces',r=>r.fulfill({status:503,json:{error:{message:'internal db endpoint'}}}));
 await page.goto('/login/');
 await page.getByRole('textbox',{name:'Mobile number'}).fill('9876543210');
 await page.getByRole('button',{name:'Send OTP'}).click();
 await page.getByRole('textbox',{name:'OTP',exact:true}).fill('123456');
 await page.getByRole('button',{name:'Verify & continue'}).click();
 await expect(page).toHaveURL(/\/workspaces\/?$/);
 await expect.poll(()=>page.evaluate(()=>localStorage.getItem('sevamitra_token'))).toBe('uat-jwt');
 await expect(page.getByRole('status')).toContainText('temporarily unavailable');
});

test('guest can search a PIN through a single indexed lookup and cannot open provider details without login',async({page})=>{
 let calls=0;
 await page.route(API+'/geography/pincodes/560072/towns',r=>{calls++;return r.fulfill({json:[{id:'town-1',name:'Nagarbhavi',pincode:'560072'}]})});
 await page.route(API+'/discovery/available-services?townVillageId=town-1',r=>r.fulfill({json:[{id:'a1111111-1111-4111-8111-111111111111',name:'Plumbing',description:'Local plumbing services'}]}));
 await page.goto('/marketplace/');
 await page.getByRole('textbox',{name:'Service area PIN'}).fill('560072');
 await page.getByRole('button',{name:'Search',exact:true}).click();
 await expect(page.getByText('Found 1 live service near PIN 560072.')).toBeVisible();
 expect(calls).toBe(1);
 await expect(page.getByRole('button',{name:'Sign in to view providers'})).toBeVisible();
 await page.getByRole('button',{name:'Sign in to view providers'}).click();
 await expect(page).toHaveURL(/\/login\/?$/);
});
test('invalid PIN shows helpful feedback without requesting geography',async({page})=>{
 let calls=0;await page.route(API+'/geography/pincodes/*',r=>{calls++;return r.fulfill({json:[]})});
 await page.goto('/marketplace/');
 await page.getByRole('textbox',{name:'Service area PIN'}).fill('560');
 await page.getByRole('button',{name:'Search',exact:true}).click();
 await expect(page.getByRole('status')).toContainText('valid six-digit PIN code');
 expect(calls).toBe(0);
});
