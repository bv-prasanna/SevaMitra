import {BadRequestException,ConflictException,NotFoundException} from '@nestjs/common';
import {TaxReviewStatus} from '@prisma/client';
import {TaxAssessmentService} from './tax-assessment.service';
import type {PrismaService} from '../prisma/prisma.service';
describe('TaxAssessmentService',()=>{
 let tx:{taxAssessment:{findUnique:jest.Mock;create:jest.Mock};booking:{findUnique:jest.Mock};taxLedgerEntry:{createMany:jest.Mock}};
 let prisma:{taxAssessment:{findUnique:jest.Mock};$transaction:jest.Mock};
 let svc:TaxAssessmentService;
 beforeEach(()=>{
  tx={taxAssessment:{findUnique:jest.fn().mockResolvedValue(null),create:jest.fn().mockResolvedValue({id:'tax-1'})},booking:{findUnique:jest.fn().mockResolvedValue({offering:{providerId:'provider-1'},currency:'INR'})},taxLedgerEntry:{createMany:jest.fn()}};
  prisma={taxAssessment:{findUnique:jest.fn()},$transaction:jest.fn(async(fn:(x:typeof tx)=>unknown)=>fn(tx))};
  svc=new TaxAssessmentService(prisma as unknown as PrismaService);
 });
 it('refuses provisional status as an approval',async()=>{await expect(svc.review('booking-1','admin-1',{reviewStatus:TaxReviewStatus.REVIEW_REQUIRED,basisNote:'pending'})).rejects.toThrow(BadRequestException)});
 it('requires statutory basis',async()=>{await expect(svc.review('booking-1','admin-1',{reviewStatus:TaxReviewStatus.APPROVED,basisNote:' '})).rejects.toThrow(BadRequestException)});
 it('does not post monetary entries for an exempt transaction',async()=>{await svc.review('booking-1','admin-1',{reviewStatus:TaxReviewStatus.EXEMPT,basisNote:'Finance classification'});expect(tx.taxLedgerEntry.createMany).not.toHaveBeenCalled()});
 it('rejects exempt assessment with positive TDS',async()=>{await expect(svc.review('booking-1','admin-1',{reviewStatus:TaxReviewStatus.EXEMPT,basisNote:'exempt',tdsAmount:100})).rejects.toThrow(BadRequestException)});
 it('treats an approved assessment as immutable',async()=>{tx.taxAssessment.findUnique.mockResolvedValue({id:'old'});await expect(svc.review('booking-1','admin-1',{reviewStatus:TaxReviewStatus.APPROVED,basisNote:'review'})).rejects.toThrow(ConflictException)});
 it('cannot assess unknown bookings',async()=>{tx.booking.findUnique.mockResolvedValue(null);await expect(svc.review('missing','admin-1',{reviewStatus:TaxReviewStatus.APPROVED,basisNote:'review'})).rejects.toThrow(NotFoundException)});
 it('posts separate tax ledger types only for nonzero approved values',async()=>{await svc.review('booking-1','admin-1',{reviewStatus:TaxReviewStatus.APPROVED,basisNote:'CA approved',gstAmount:18,tdsAmount:1,tcsAmount:0});expect(tx.taxLedgerEntry.createMany).toHaveBeenCalledWith({data:expect.arrayContaining([expect.objectContaining({type:'GST_OUTPUT'}),expect.objectContaining({type:'INCOME_TDS_194O'})])});expect(tx.taxLedgerEntry.createMany.mock.calls[0][0].data).toHaveLength(2)});
});
