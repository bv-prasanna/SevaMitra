
import {TaxAssessmentController} from './tax-assessment.controller';
import type {TaxAssessmentService} from './tax-assessment.service';
import {TaxReviewStatus} from '@prisma/client';
import type {AuthenticatedUser} from '../auth/token/jwt-payload.interface';

describe('Tax assessment controller approvals',()=>{
 const svc={findOne:jest.fn(),review:jest.fn()};
 const controller=new TaxAssessmentController(svc as unknown as TaxAssessmentService);
 const user={id:'finance-reviewer-1',phoneNumber:null,email:null} as AuthenticatedUser;
 beforeEach(()=>jest.resetAllMocks());
 it('queries the assessment for the selected booking',async()=>{
  await controller.find('booking-1');expect(svc.findOne).toHaveBeenCalledWith('booking-1');
 });
 it('attributes tax approval to the authenticated finance reviewer',async()=>{
  const dto={reviewStatus:TaxReviewStatus.APPROVED,basisNote:'Finance-verified GST classification'};
  await controller.review(user,'booking-1',dto);
  expect(svc.review).toHaveBeenCalledWith('booking-1','finance-reviewer-1',dto);
 });
});
