import {INestApplication,ValidationPipe,VersioningType} from '@nestjs/common';
import {Test} from '@nestjs/testing';
import request from 'supertest';
import {AuthController} from '../src/auth/auth.controller';
import {AuthService} from '../src/auth/auth.service';
import {HealthController} from '../src/health/health.controller';
import {PrismaService} from '../src/prisma/prisma.service';

/** Real HTTP routing, body validation and health status smoke tests. */
describe('HTTP pilot smoke (e2e)',()=>{
 let app:INestApplication;
 const auth={requestOtp:jest.fn(),verifyOtp:jest.fn(),loginWithPassword:jest.fn(),
  refresh:jest.fn(),logout:jest.fn(),setPassword:jest.fn(),resetPassword:jest.fn(),
  loginWithGoogle:jest.fn(),loginWithApple:jest.fn()};
 const db={$queryRaw:jest.fn()};
 beforeAll(async()=>{
  const mod=await Test.createTestingModule({
   controllers:[HealthController,AuthController],
   providers:[{provide:AuthService,useValue:auth},{provide:PrismaService,useValue:db}],
  }).compile();
  app=mod.createNestApplication();
  app.setGlobalPrefix('api');
  app.enableVersioning({type:VersioningType.URI,defaultVersion:'1'});
  app.useGlobalPipes(new ValidationPipe({whitelist:true,forbidNonWhitelisted:true,transform:true}));
  await app.init();
 });
 afterAll(async()=>{if(app)await app.close()});
 beforeEach(()=>jest.clearAllMocks());
 it('/api/health (GET) reports liveness',async()=>{
  await request(app.getHttpServer()).get('/api/health').expect(200).expect({status:'ok'});
 });
 it('/api/health/db (GET) verifies DB and returns healthy',async()=>{
  db.$queryRaw.mockResolvedValue([{value:1}]);
  await request(app.getHttpServer()).get('/api/health/db').expect(200).expect({status:'ok'});
 });
 it('/api/health/db reports 503 if DB fails',async()=>{
  db.$queryRaw.mockRejectedValue(new Error('connection refused'));
  await request(app.getHttpServer()).get('/api/health/db').expect(503);
 });
 it('accepts validated OTP request over HTTP with version prefix',async()=>{
  auth.requestOtp.mockResolvedValue({expiresInSeconds:300,challengeId:'challenge-1'});
  await request(app.getHttpServer()).post('/api/v1/auth/otp/request')
   .send({phoneNumber:'+919876543210',purpose:'LOGIN'})
   .expect(200);
  expect(auth.requestOtp).toHaveBeenCalledWith(expect.objectContaining({phoneNumber:'+919876543210',purpose:'LOGIN'}));
 });
 it('rejects invalid OTP phone and never invokes service',async()=>{
  await request(app.getHttpServer()).post('/api/v1/auth/otp/request')
   .send({phoneNumber:'123',purpose:'LOGIN'}).expect(400);
  expect(auth.requestOtp).not.toHaveBeenCalled();
 });
 it('rejects unrecognized request properties',async()=>{
  await request(app.getHttpServer()).post('/api/v1/auth/otp/request')
   .send({phoneNumber:'+919876543210',purpose:'LOGIN',userId:'admin'}).expect(400);
  expect(auth.requestOtp).not.toHaveBeenCalled();
 });
 it('rejects unsupported OTP purpose',async()=>{
  await request(app.getHttpServer()).post('/api/v1/auth/otp/request')
   .send({phoneNumber:'+919876543210',purpose:'SUPER_ADMIN'}).expect(400);
  expect(auth.requestOtp).not.toHaveBeenCalled();
 });
});
