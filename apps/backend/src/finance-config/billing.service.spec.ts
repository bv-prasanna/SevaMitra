import {BadRequestException,ConflictException,NotFoundException} from '@nestjs/common';
import {BillingInvoiceStatus,BookingStatus,TaxReviewStatus} from '@prisma/client';
import type {PrismaService} from '../prisma/prisma.service';
import {FinanceBillingService} from './billing.service';
import {invoicePdf} from './invoice-pdf';
describe('FinanceBillingService',()=>{
 let db:any;let billing:FinanceBillingService;
 const snapshot={
  invoiceNumber:null,status:'PRO_FORMA',bookingId:'booking-1',issuedAt:null,
  service:'Fan repair',supplierName:'Provider',supplierAddress:'Bengaluru',
  supplierGstin:null,supplierStateCode:null,sacCode:null,authorizedSignatory:null,
  customerName:'Customer',customerAddress:'12 Main Road, 560040',placeOfSupply:'Bengaluru, Karnataka',
  currency:'INR',originalAmount:'100.00',serviceAmount:'100.00',visitFee:'0.00',
  taxableAmount:'100.00',taxTotal:'18.00',total:'118.00',
  taxes:[{component:'IGST',rateBps:1800,amount:'18.00'}],
 };
 const issuer={id:'issuer-1',providerId:'provider-1',issuerCode:'PR01',legalName:'Verified Provider',
  address:'A Business Street',stateCode:'29',gstin:'29ABCDE1234F1Z5',sacCode:'9987',
  authorizedSignatory:'Authorized Person',verified:true};
 const existing={id:'invoice-1',bookingId:'booking-1',status:BillingInvoiceStatus.PRO_FORMA,snapshot,
  booking:{status:BookingStatus.COMPLETED,offering:{providerId:'provider-1'},
   priceSnapshot:{taxTotal:18,totalAmount:118}}};
 beforeEach(()=>{
  db={
   billingInvoice:{findMany:jest.fn().mockResolvedValue([]),findFirst:jest.fn().mockResolvedValue(null),
    findUnique:jest.fn().mockResolvedValue(existing),create:jest.fn().mockResolvedValue(existing),
    update:jest.fn().mockResolvedValue({...existing,status:BillingInvoiceStatus.ISSUED})},
   billingInvoiceSequence:{upsert:jest.fn().mockResolvedValue({nextValue:1})},
   billingIssuer:{findMany:jest.fn().mockResolvedValue([]),findFirst:jest.fn().mockResolvedValue(issuer),
    create:jest.fn().mockResolvedValue(issuer),update:jest.fn().mockResolvedValue(issuer)},
   booking:{findFirst:jest.fn().mockResolvedValue(null)},
   taxAssessment:{findUnique:jest.fn().mockResolvedValue({reviewStatus:TaxReviewStatus.APPROVED,gstAmount:18,basisNote:'Finance approved SAC classification'})},
   providerProfile:{findUnique:jest.fn().mockResolvedValue({id:'provider-1'})},
   $transaction:jest.fn(),
  };
  db.$transaction.mockImplementation(async(fn:(tx:unknown)=>Promise<unknown>)=>fn(db));
  billing=new FinanceBillingService(db as PrismaService);
 });
 it('limits invoice listing to the user customer or provider',async()=>{
  await billing.listMine('user-a');
  expect(db.billingInvoice.findMany).toHaveBeenCalledWith(expect.objectContaining({
   where:{booking:{OR:[{customer:{userId:'user-a'}},{offering:{provider:{userId:'user-a'}}}]}},
  }));
 });
 it('returns Not Found on invoice belonging to another user',async()=>{
  await expect(billing.getMine('outsider','invoice-1')).rejects.toThrow(NotFoundException);
 });
 it('creates an offline-downloadable PDF from immutable snapshot',async()=>{
  db.billingInvoice.findFirst.mockResolvedValue(existing);
  const pdf=await billing.downloadMine('user-a','invoice-1');
  expect(pdf.subarray(0,8).toString()).toContain('%PDF-1.');
  expect(pdf.toString()).toContain('PRO FORMA');
  expect(invoicePdf({...snapshot,status:'ISSUED',invoiceNumber:'26-27/PR01/0001'}).toString()).toContain('TAX INVOICE');
 });
 it('refuses finance verification of incomplete supplier data',async()=>{
  await expect(billing.upsertIssuer('admin',{issuerCode:'PR01',legalName:'Provider',address:'Bengaluru',
   stateCode:'29',verified:true})).rejects.toThrow(BadRequestException);
 });
 it('rejects supplier GSTIN which contradicts supplier state',async()=>{
  await expect(billing.upsertIssuer('admin',{issuerCode:'PR01',legalName:'Provider',address:'Bengaluru',
   stateCode:'29',gstin:'27ABCDE1234F1Z5',sacCode:'9987',authorizedSignatory:'Signer',verified:true})).rejects.toThrow(BadRequestException);
 });
 it('uses provider-verified invoice numbering configuration',async()=>{
  db.billingIssuer.findFirst.mockResolvedValue(null);
  await billing.upsertIssuer('admin',{issuerCode:'PR01',providerId:'provider-1',legalName:'Provider',address:'Bengaluru',
   stateCode:'29',gstin:'29ABCDE1234F1Z5',sacCode:'9987',authorizedSignatory:'Signer',verified:true});
  expect(db.billingIssuer.create).toHaveBeenCalledWith({data:expect.objectContaining({
   issuerCode:'PR01',updatedBy:'admin',verified:true,providerId:'provider-1',
  })});
 });
 it('returns existing pro-forma without generating a new price on retry',async()=>{
  db.booking.findFirst.mockResolvedValue({id:'booking-1'});
  const result=await billing.proforma('user-a','booking-1');
  expect(result).toBe(existing);
  expect(db.billingInvoice.create).not.toHaveBeenCalled();
 });
 it('does not let outsiders create pro-forma for another account',async()=>{
  await expect(billing.proforma('outsider','booking-1')).rejects.toThrow(NotFoundException);
 });
 it('only issues when booking was completed',async()=>{
  db.billingInvoice.findUnique.mockResolvedValue({...existing,booking:{...existing.booking,status:BookingStatus.REQUESTED}});
  await expect(billing.issue('invoice-1','admin',{placeOfSupplyStateCode:'27',verificationNote:'Verified'})).rejects.toThrow(ConflictException);
 });
 it('only issues after a manually approved tax assessment',async()=>{
  db.taxAssessment.findUnique.mockResolvedValue(null);
  await expect(billing.issue('invoice-1','admin',{placeOfSupplyStateCode:'27',verificationNote:'Verified'})).rejects.toThrow(ConflictException);
 });
 it('refuses to issue when posted GST differs from booking quote',async()=>{
  db.taxAssessment.findUnique.mockResolvedValue({reviewStatus:TaxReviewStatus.APPROVED,gstAmount:17,basisNote:'Reviewed'});
  await expect(billing.issue('invoice-1','admin',{placeOfSupplyStateCode:'27',verificationNote:'Verified'})).rejects.toThrow(ConflictException);
 });
 it('checks intrastate vs interstate GST before issuance',async()=>{
  await expect(billing.issue('invoice-1','admin',{placeOfSupplyStateCode:'29',verificationNote:'Verified'})).rejects.toThrow(ConflictException);
 });
 it('refuses issuing from unverified supplier',async()=>{
  db.billingIssuer.findFirst.mockResolvedValue({...issuer,verified:false});
  await expect(billing.issue('invoice-1','admin',{placeOfSupplyStateCode:'27',verificationNote:'Verified'})).rejects.toThrow(ConflictException);
 });
 it('issues a unique FY serial and immutable tax invoice after validated review',async()=>{
  await billing.issue('invoice-1','admin',{placeOfSupplyStateCode:'27',verificationNote:'Verified'});
  expect(db.billingInvoiceSequence.upsert).toHaveBeenCalledWith(expect.objectContaining({
   where:{key:expect.stringMatching(/^PR01:/)},
  }));
  expect(db.billingInvoice.update).toHaveBeenCalledWith(expect.objectContaining({
   where:{id:'invoice-1',status:BillingInvoiceStatus.PRO_FORMA},
   data:expect.objectContaining({status:BillingInvoiceStatus.ISSUED,invoiceNumber:expect.stringMatching(/^\d{2}-\d{2}\/PR01\/\d{4}$/),issuedBy:'admin'}),
  }));
  expect(db.$transaction).toHaveBeenCalled();
 });
 it('cannot assign an invoice number twice',async()=>{
  db.billingInvoice.findUnique.mockResolvedValue({...existing,status:BillingInvoiceStatus.ISSUED});
  await expect(billing.issue('invoice-1','admin',{placeOfSupplyStateCode:'27',verificationNote:'Reviewed'})).rejects.toThrow(ConflictException);
  expect(db.billingInvoiceSequence.upsert).not.toHaveBeenCalled();
 });
});