
import {GoneException} from '@nestjs/common';
import {OnboardingDocumentType} from '@prisma/client';
import {ApplicationController} from './application.controller';
import type {ApplicationService} from './application.service';
import type {PrivateDocumentStorage, UploadedDocument} from './private-document.storage';
import type {AuthenticatedUser} from '../auth/token/jwt-payload.interface';

describe('Provider document and onboarding HTTP contracts',()=>{
 const svc={submit:jest.fn(),findOwn:jest.fn(),addOwnDocument:jest.fn(),listOwnDocuments:jest.fn()};
 const storage={upload:jest.fn()};
 const controller=new ApplicationController(svc as unknown as ApplicationService,storage as unknown as PrivateDocumentStorage);
 const user={id:'provider-user',phoneNumber:null,email:null} as AuthenticatedUser;
 beforeEach(()=>jest.resetAllMocks());
 it('submits the provider\'s own application',async()=>{
  const dto={referredByAgentCode:'AGT001'};
  await controller.submit(user,dto);
  expect(svc.submit).toHaveBeenCalledWith('provider-user',dto);
 });
 it('only returns the authenticated provider application',async()=>{
  await controller.get(user);expect(svc.findOwn).toHaveBeenCalledWith('provider-user');
 });
 it('blocks the legacy untrusted external file URL API',()=>{
  expect(()=>controller.addDocument(user,{type:OnboardingDocumentType.IDENTITY,fileUrl:'https://external.test/fake.pdf'}))
  .toThrow(GoneException);
  expect(svc.addOwnDocument).not.toHaveBeenCalled();
 });
 it('uploads to private storage and persists only the returned storage key',async()=>{
  const file={buffer:Buffer.from('%PDF-1.7'),size:8,mimetype:'application/pdf',originalname:'id.pdf'} as UploadedDocument;
  svc.findOwn.mockResolvedValue({id:'app-1'});
  storage.upload.mockResolvedValue('r2://private/onboarding/app-1/evidence.pdf');
  await controller.uploadDocument(user,OnboardingDocumentType.IDENTITY,file);
  expect(storage.upload).toHaveBeenCalledWith('app-1',file);
  expect(svc.addOwnDocument).toHaveBeenCalledWith('provider-user',{
    type:OnboardingDocumentType.IDENTITY,fileUrl:'r2://private/onboarding/app-1/evidence.pdf',
  });
 });
 it('does not link any document when private storage fails',async()=>{
  svc.findOwn.mockResolvedValue({id:'app-1'});
  storage.upload.mockRejectedValue(new Error('R2 unavailable'));
  await expect(controller.uploadDocument(user,OnboardingDocumentType.IDENTITY,{} as UploadedDocument)).rejects.toThrow('R2 unavailable');
  expect(svc.addOwnDocument).not.toHaveBeenCalled();
 });
 it('lists only the authenticated provider\'s documents',async()=>{
  await controller.listDocuments(user);
  expect(svc.listOwnDocuments).toHaveBeenCalledWith('provider-user');
 });
});
