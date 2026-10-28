import {BadRequestException,ConflictException,Injectable,NotFoundException} from '@nestjs/common';
import {Prisma,TaxEntryType,TaxReviewStatus} from '@prisma/client';
import {PrismaService} from '../prisma/prisma.service';
import {ReviewTaxDto} from './review-tax.dto';

@Injectable()
export class TaxAssessmentService {
 constructor(private readonly prisma:PrismaService){}
 async findOne(bookingId:string){
  return this.prisma.taxAssessment.findUnique({where:{bookingId},include:{ledgerEntries:true}});
 }
 async review(bookingId:string,reviewerId:string,dto:ReviewTaxDto){
  if(dto.reviewStatus!==TaxReviewStatus.APPROVED&&dto.reviewStatus!==TaxReviewStatus.EXEMPT)
   throw new BadRequestException('Only APPROVED or EXEMPT are final tax decisions');
  if(!dto.basisNote?.trim())throw new BadRequestException('Tax classification and statutory basis are required');
  if(dto.reviewStatus===TaxReviewStatus.EXEMPT&&(dto.gstAmount||dto.tcsAmount||dto.tdsAmount))
   throw new BadRequestException('Exempt assessment cannot post withholding entries');
  const amounts=[dto.gstAmount??0,dto.tcsAmount??0,dto.tdsAmount??0];
  if(amounts.some(x=>!Number.isFinite(x)||x<0))throw new BadRequestException('Invalid tax amount');
  return this.prisma.$transaction(async(tx)=>{
   const existing=await tx.taxAssessment.findUnique({where:{bookingId}});
   if(existing)throw new ConflictException('Tax assessment already exists and is immutable');
   const booking=await tx.booking.findUnique({where:{id:bookingId},include:{offering:true}});
   if(!booking)throw new NotFoundException('Booking not found');
   // A bookable transaction is reviewed by Finance: no automatic GST/TCS/TDS assumptions.
   const assessment=await tx.taxAssessment.create({data:{
    bookingId,providerId:booking.offering.providerId,
    reviewStatus:dto.reviewStatus, taxableBase:dto.taxableBase,
    gstAmount:dto.gstAmount,tcsAmount:dto.tcsAmount,tdsAmount:dto.tdsAmount,
    basisNote:dto.basisNote.trim(),assessedBy:reviewerId,assessedAt:new Date(),
   }});
   const entries=[
    {type:TaxEntryType.GST_OUTPUT,amount:dto.gstAmount??0},
    {type:TaxEntryType.GST_TCS,amount:dto.tcsAmount??0},
    {type:TaxEntryType.INCOME_TDS_194O,amount:dto.tdsAmount??0},
   ].filter(x=>x.amount>0);
   if(entries.length){
    await tx.taxLedgerEntry.createMany({data:entries.map(e=>({
     assessmentId:assessment.id,type:e.type,amount:new Prisma.Decimal(e.amount),currency:booking.currency,
    }))});
   }
   return assessment;
  });
 }
}
