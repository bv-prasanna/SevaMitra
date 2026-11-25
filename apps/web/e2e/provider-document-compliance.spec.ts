import { expect, test } from '@playwright/test';
const API='http://127.0.0.1:4173/api/v1';

test('provider can submit expiry, category and renewal metadata with a private document upload',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('sevamitra_token','test-provider-token'));
 const documents=[{
  id:'doc-old',type:'LICENSE',createdAt:'2026-01-01T00:00:00Z',
  categoryId:'category-1',expiresAt:'2026-11-24T18:29:59.999Z',
  reviewStatus:'EXPIRED',reviewNote:null,renewalOfId:null,
 }];
 let uploadedBody='';
 await page.route(API+'/providers/me',r=>r.fulfill({json:{
  id:'provider-1',fullName:'Test Provider',status:'ACTIVE',verificationStatus:'VERIFIED',
 }}));
 await page.route(API+'/bookings/provider/me',r=>r.fulfill({json:[]}));
 await page.route(API+'/provider-onboarding/applications/me',r=>r.fulfill({json:{
  id:'app-1',status:'APPROVED',documents,
 }}));
 await page.route(API+'/catalogue/categories',r=>r.fulfill({json:[
  {id:'category-1',name:'Home repairs',isActive:true},
  {id:'category-2',name:'Cleaning',isActive:true},
 ]}));
 await page.route(API+'/provider-onboarding/applications/me/documents/upload',async r=>{
  uploadedBody=r.request().postDataBuffer()?.toString('latin1')||'';
  documents.push({
   id:'doc-new',type:'LICENSE',createdAt:'2026-11-25T08:00:00Z',
   categoryId:'category-1',expiresAt:'2027-11-30T18:29:59.999Z',
   reviewStatus:'PENDING',renewalOfId:'doc-old',
  });
  return r.fulfill({status:201,json:{id:'doc-new',reviewStatus:'PENDING'}});
 });
 await page.goto('/provider/');
 await page.getByLabel('Document type').selectOption('LICENSE');
 await page.getByLabel('Service category scope').selectOption('category-1');
 await page.getByLabel('Expiry date (optional)').fill('2027-11-30');
 await page.getByLabel('Document being renewed (optional)').selectOption('doc-old');
 await page.locator('input[type=file]').setInputFiles({
  name:'renewed-license.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4 test'),
 });
 await page.getByRole('button',{name:'Upload securely'}).click();
 await expect(page.getByRole('status')).toContainText('uploaded privately');
 expect(uploadedBody).toContain('expiresAt');
 expect(uploadedBody).toContain('2027-11-30');
 expect(uploadedBody).toContain('categoryId');
 expect(uploadedBody).toContain('category-1');
 expect(uploadedBody).toContain('renewalOfId');
 expect(uploadedBody).toContain('doc-old');
 await expect(page.getByText('Status: PENDING')).toBeVisible();
});
