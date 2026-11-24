import {test,expect} from '@playwright/test';

const API='http://127.0.0.1:4173/api/v1';

test.beforeEach(async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('sevamitra_token','test-token'));
});

test('finance manager can review UNKNOWN refunds and payouts with evidence notes',async({page})=>{
  let refundStatus='UNKNOWN';
  let payoutStatus='UNKNOWN';
  let refundResolveBody:unknown;
  let payoutResolveBody:unknown;

  await page.route(API+'/finance/config/taxes',r=>r.fulfill({json:[]}));
  await page.route(API+'/finance/config/pricing',r=>r.fulfill({json:[]}));
  await page.route(API+'/billing/admin/invoices',r=>r.fulfill({json:[]}));
  await page.route(API+'/billing/admin/issuers',r=>r.fulfill({json:[]}));
  await page.route(API+'/refund',r=>r.fulfill({json:[{
    id:'refund-1',bookingId:'booking-1',refundAmount:'250.00',currency:'INR',
    status:refundStatus,failureReason:'Provider response timed out',updatedAt:'2026-11-25T10:00:00.000Z',
  }]}));
  await page.route(API+'/settlement',r=>r.fulfill({json:[{
    id:'settlement-1',providerId:'provider-1',totalAmount:'800.00',currency:'INR',
    status:payoutStatus,failureReason:'Payout outcome is uncertain',updatedAt:'2026-11-25T10:00:00.000Z',
  }]}));
  await page.route(API+'/refund/refund-1/resolve',async route=>{
    refundResolveBody=route.request().postDataJSON();
    refundStatus=refundResolveBody&&typeof refundResolveBody==='object'&&'outcome'in refundResolveBody
      ?String((refundResolveBody as {outcome:string}).outcome):'UNKNOWN';
    await route.fulfill({json:{id:'refund-1',status:refundStatus}});
  });
  await page.route(API+'/settlement/settlement-1/resolve',async route=>{
    payoutResolveBody=route.request().postDataJSON();
    payoutStatus=payoutResolveBody&&typeof payoutResolveBody==='object'&&'outcome'in payoutResolveBody
      ?String((payoutResolveBody as {outcome:string}).outcome):'UNKNOWN';
    await route.fulfill({json:{id:'settlement-1',status:payoutStatus}});
  });

  await page.goto('/admin/finance/');
  await expect(page.getByRole('heading',{name:/Refund exceptions \(1\)/})).toBeVisible();
  await expect(page.getByRole('heading',{name:/Payout exceptions \(1\)/})).toBeVisible();

  page.once('dialog',dialog=>dialog.accept('Gateway dashboard and bank statement independently checked'));
  await page.getByRole('button',{name:'Confirm refunded'}).click();
  await expect(page.getByText('Refund exception resolved and audited')).toBeVisible();
  expect(refundResolveBody).toMatchObject({
    outcome:'REFUNDED',
    note:'Gateway dashboard and bank statement independently checked',
  });

  page.once('dialog',dialog=>dialog.accept('Provider bank transfer record independently checked'));
  await page.getByRole('button',{name:'Confirm paid'}).click();
  await expect(page.getByText('Payout exception resolved and audited')).toBeVisible();
  expect(payoutResolveBody).toMatchObject({
    outcome:'PAID',
    note:'Provider bank transfer record independently checked',
  });
});
