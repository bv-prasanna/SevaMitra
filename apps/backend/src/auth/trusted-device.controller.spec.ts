import {NotFoundException} from '@nestjs/common';
import {TrustedDeviceController} from './trusted-device.controller';
import type {PrismaService} from '../prisma/prisma.service';
import type {AuthenticatedUser} from './token/jwt-payload.interface';

describe('TrustedDeviceController',()=>{
 const db={
  trustedDevice:{findMany:jest.fn(),updateMany:jest.fn()},
  refreshToken:{updateMany:jest.fn()},
  $transaction:jest.fn(),
 };
 const api=new TrustedDeviceController(db as unknown as PrismaService);
 const user={id:'owner-1',phoneNumber:null,email:null} as AuthenticatedUser;
 beforeEach(()=>{
  jest.clearAllMocks();
  db.$transaction.mockImplementation(async fn=>fn(db));
 });
 it('lists only the authenticated account devices and no secrets',async()=>{
  db.trustedDevice.findMany.mockResolvedValue([]);
  await api.list(user);
  expect(db.trustedDevice.findMany).toHaveBeenCalledWith({
   where:{userId:'owner-1'},select:{
    id:true,platform:true,label:true,approvedAt:true,lastSeenAt:true,revokedAt:true,
   },orderBy:{lastSeenAt:'desc'},take:50,
  });
 });
 it('atomically revokes own device and every associated refresh session',async()=>{
  db.trustedDevice.updateMany.mockResolvedValue({count:1});
  await expect(api.revoke(user,'dev-1')).resolves.toEqual({revoked:true});
  expect(db.trustedDevice.updateMany).toHaveBeenCalledWith({
   where:{id:'dev-1',userId:'owner-1',revokedAt:null},data:{revokedAt:expect.any(Date)},
  });
  expect(db.refreshToken.updateMany).toHaveBeenCalledWith({
   where:{userId:'owner-1',deviceId:'dev-1',revokedAt:null},data:{revokedAt:expect.any(Date)},
  });
  expect(db.$transaction).toHaveBeenCalledTimes(1);
 });
 it('rejects attempts to revoke another user device',async()=>{
  db.trustedDevice.updateMany.mockResolvedValue({count:0});
  await expect(api.revoke(user,'someone-elses-device')).rejects.toThrow(NotFoundException);
  expect(db.refreshToken.updateMany).not.toHaveBeenCalled();
 });
 it('rejects already revoked devices idempotently without reactivating anything',async()=>{
  db.trustedDevice.updateMany.mockResolvedValue({count:0});
  await expect(api.revoke(user,'already-revoked')).rejects.toThrow('not found');
 });
});
