import {BadRequestException,ConflictException,Injectable,NotFoundException} from '@nestjs/common';
import {BillingInvoiceStatus,BookingStatus,Prisma,TaxReviewStatus} from '@prisma/client';
import {PrismaService} from '../prisma/prisma.service';
import {IssueInvoiceDto,UpsertIssuerDto} from './billing.dto';
import {invoicePdf,InvoicePrintData} from './invoice-pdf';

type Snapshot=InvoicePrintData;
@Injectable()
export class FinanceBillingService{
 constructor(private readonly prisma:PrismaService){}
 private readonly ownedBooking={};
 private ownership(userId:string){
  return {OR:[{customer:{userId}},{offering:{provider:{userId}}}]};
 }
 async listMine(userId:string){
  return this.prisma.billingInvoice.findMany({where:{booking:this.ownership(userId)},
   select:{id:true,bookingId:true,invoiceNumber:true,status:true,issuedAt:true,createdAt:true},orderBy:{createdAt:'desc'},take:200});
 }
 async getMine(userId:string,id:string){
  const invoice=await this.prisma.billingInvoice.findFirst({where:{id,booking:this.ownership(userId)}});
  if(!invoice)throw new NotFoundException('Invoice not found');
  return invoice;
 }
 async downloadMine(userId:string,id:string):Promise<Buffer>{
  const row=await this.getMine(userId,id);
  return invoicePdf(row.snapshot as unknown as Snapshot);
 }
 issuers(){return this.prisma.billingIssuer.findMany({orderBy:{updatedAt:'desc'},take:300})}
 listAll(){return this.prisma.billingInvoice.findMany({
  select:{id:true,bookingId:true,invoiceNumber:true,status:true,createdAt:true,issuedAt:true},
  take:200,orderBy:{createdAt:'desc'},
 })}
 async upsertIssuer(actorId:string,dto:UpsertIssuerDto){
  if(dto.verified&&(!dto.gstin||!dto.sacCode||!dto.authorizedSignatory))
   throw new BadRequestException('Verified issuer requires GSTIN, SAC and authorized signatory');
  if(dto.gstin&&dto.gstin.slice(0,2)!==dto.stateCode)
   throw new BadRequestException('Supplier GSTIN state code does not match supplied state');
  if(dto.providerId){
   const provider=await this.prisma.providerProfile.findUnique({where:{id:dto.providerId}});
   if(!provider)throw new NotFoundException('Provider not found');
  }
  const existing=await this.prisma.billingIssuer.findFirst({where:{providerId:dto.providerId??null}});
  const data={issuerCode:dto.issuerCode,providerId:dto.providerId??null,legalName:dto.legalName.trim(),
   address:dto.address.trim(),stateCode:dto.stateCode,gstin:dto.gstin??null,sacCode:dto.sacCode??null,
   authorizedSignatory:dto.authorizedSignatory??null,verified:dto.verified,updatedBy:actorId};
  if(existing)return this.prisma.billingIssuer.update({where:{id:existing.id},data});
  return this.prisma.billingIssuer.create({data});
 }
 async proforma(userId:string,bookingId:string){
  const booking=await this.prisma.booking.findFirst({
   where:{id:bookingId,...this.ownership(userId)},
   include:{
    customer:{include:{addresses:{where:{isDefault:true},take:1}}},
    offering:{include:{provider:true,service:true}},
    townVillage:{include:{taluk:{include:{district:{include:{state:true}}}}}},
    priceSnapshot:true,
   },
  });
  if(!booking)throw new NotFoundException('Booking not found');
  const existing=await this.prisma.billingInvoice.findUnique({where:{bookingId}});
  if(existing)return existing;
  const issuer=await this.prisma.billingIssuer.findFirst({where:{providerId:booking.offering.providerId}});
  const address=booking.customer.addresses[0];
  const price=booking.priceSnapshot;
  const fmt=(v:unknown)=>Number(v??0).toFixed(2);
  const taxes=(price?.taxBreakdown??[]) as unknown as {component:string;rateBps:number;amountCents:number}[];
  const snap:Snapshot={
   invoiceNumber:null,status:BillingInvoiceStatus.PRO_FORMA,bookingId:booking.id,issuedAt:null,
   service:booking.offering.service.name,
   supplierName:issuer?.legalName??booking.offering.provider.businessName??booking.offering.provider.fullName,
   supplierAddress:issuer?.address??'Not configured',supplierGstin:issuer?.gstin??null,
   supplierStateCode:issuer?.stateCode??null,sacCode:issuer?.sacCode??null,
   authorizedSignatory:issuer?.authorizedSignatory??null,
   customerName:booking.customer.fullName,
   customerAddress:address?
    [address.line1,address.line2,address.town,address.district,address.state,address.pincode].filter(Boolean).join(', '):
    'Not configured',
   placeOfSupply:booking.townVillage.name+', '+booking.townVillage.taluk.district.state.name,
   currency:booking.currency,originalAmount:fmt(price?.originalAmount??booking.amount),
   serviceAmount:fmt(price?.serviceAmount??booking.amount),visitFee:fmt(price?.visitFee??booking.visitFee),
   taxableAmount:fmt(price?.taxableAmount??(Number(booking.amount??0)+Number(booking.visitFee??0))),
   taxTotal:fmt(price?.taxTotal),total:fmt(price?.totalAmount??(Number(booking.amount??0)+Number(booking.visitFee??0))),
   taxes:taxes.map(x=>({component:x.component,rateBps:x.rateBps,amount:fmt(x.amountCents/100)})),
  };
  try{return await this.prisma.billingInvoice.create({data:{bookingId,snapshot:snap as unknown as Prisma.InputJsonValue}})}
  catch(e){
   if(e instanceof Prisma.PrismaClientKnownRequestError&&e.code==='P2002'){
    const winner=await this.prisma.billingInvoice.findUnique({where:{bookingId}});
    if(winner)return winner;
   }
   throw e;
  }
 }
 /** Once issued, the invoice and its original price/tax snapshots never change. */
 async issue(id:string,actorId:string,dto:IssueInvoiceDto){
  return this.prisma.$transaction(async tx=>{
   const invoice=await tx.billingInvoice.findUnique({
    where:{id},include:{booking:{include:{offering:true,priceSnapshot:true}}},
   });
   if(!invoice)throw new NotFoundException('Invoice not found');
   if(invoice.status!==BillingInvoiceStatus.PRO_FORMA)throw new ConflictException('Invoice was already issued or voided');
   if(invoice.booking.status!==BookingStatus.COMPLETED)
    throw new ConflictException('Only completed services can be invoiced');
   if(!invoice.booking.priceSnapshot)
    throw new ConflictException('Historical booking needs a reviewed billing snapshot before issuing');
   const assessment=await tx.taxAssessment.findUnique({where:{bookingId:invoice.bookingId}});
   if(!assessment||assessment.reviewStatus!==TaxReviewStatus.APPROVED)
    throw new ConflictException('Finance must approve the tax assessment before issuance');
   const issuer=await tx.billingIssuer.findFirst({where:{providerId:invoice.booking.offering.providerId}});
   if(!issuer?.verified||!issuer.gstin||!issuer.sacCode||!issuer.authorizedSignatory)
    throw new ConflictException('Supplier GST profile is not verified');
   const old=invoice.snapshot as unknown as Snapshot;
   if(old.customerAddress==='Not configured')throw new ConflictException('Recipient address is required for invoice');
   const reviewed=Math.round(Number(assessment.gstAmount??0)*100);
   const calculated=Math.round(Number(invoice.booking.priceSnapshot.taxTotal)*100);
   if(reviewed!==calculated)
    throw new ConflictException('Final GST assessment and booking quote tax differ; resolve before issuing');
   if(!assessment.basisNote)
    throw new ConflictException('Statutory tax classification basis is required');
   const comps=new Set(old.taxes.filter(x=>Number(x.amount)>0).map(x=>x.component));
   if(comps.has('CESS'))throw new ConflictException('Cess invoicing requires additional finance review');
   const intrastate=issuer.stateCode===dto.placeOfSupplyStateCode;
   if(reviewed>0&&intrastate&&!(comps.has('CGST')&&comps.has('SGST'))||
      reviewed>0&&!intrastate&&!comps.has('IGST'))
    throw new ConflictException('Tax component classification conflicts with place of supply');
   const now=new Date();const fy=now.getUTCFullYear()-(now.getUTCMonth()<3?1:0);
   const key=issuer.issuerCode+':'+fy;
   const seq=await tx.billingInvoiceSequence.upsert({
    where:{key},create:{key,nextValue:1},update:{nextValue:{increment:1}},
   });
   if(seq.nextValue>9999)throw new ConflictException('Invoice series exhausted; create a new authorized series');
   const num=String(fy%100).padStart(2,'0')+'-'+String((fy+1)%100).padStart(2,'0')+
    '/'+issuer.issuerCode+'/'+String(seq.nextValue).padStart(4,'0');
   if(num.length>16)throw new ConflictException('Invoice number exceeds statutory length');
   const finalSnapshot:Snapshot={...old,status:BillingInvoiceStatus.ISSUED,invoiceNumber:num,
    issuedAt:now.toISOString(),supplierName:issuer.legalName,supplierAddress:issuer.address,
    supplierGstin:issuer.gstin,supplierStateCode:issuer.stateCode,sacCode:issuer.sacCode,
    authorizedSignatory:issuer.authorizedSignatory,placeOfSupply:old.placeOfSupply+
      ' (GST state '+dto.placeOfSupplyStateCode+')'};
   return tx.billingInvoice.update({
    where:{id,status:BillingInvoiceStatus.PRO_FORMA},
    data:{status:BillingInvoiceStatus.ISSUED,invoiceNumber:num,
     snapshot:finalSnapshot as unknown as Prisma.InputJsonValue,issuedAt:now,issuedBy:actorId},
   });
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
 }
}
