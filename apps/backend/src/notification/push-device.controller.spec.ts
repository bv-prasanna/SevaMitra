
import { ConflictException } from '@nestjs/common';
import { PushDeviceController } from './push-device.controller';
import type { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/token/jwt-payload.interface';

describe('Push device ownership and revocation', () => {
  const prisma = {
    pushDevice: {
      findUnique: jest.fn(), upsert: jest.fn(),
      findMany: jest.fn(), updateMany: jest.fn(),
    },
  };
  const controller = new PushDeviceController(prisma as unknown as PrismaService);
  const user = { id: 'user-a', phoneNumber: null, email: null } as AuthenticatedUser;
  const dto = { token: 'ExpoPushToken[unit-test-12345]', platform: 'android' as const };
  beforeEach(() => jest.resetAllMocks());

  it('registers only to the authenticated account', async () => {
    prisma.pushDevice.findUnique.mockResolvedValue(null);
    prisma.pushDevice.upsert.mockResolvedValue({ id: 'device-1', userId:'user-a' });
    await controller.register(user,dto);
    expect(prisma.pushDevice.upsert).toHaveBeenCalledWith({
      where:{expoToken:dto.token},
      update:{userId:'user-a',platform:'android',isActive:true},
      create:{userId:'user-a',expoToken:dto.token,platform:'android'},
    });
  });
  it('rejects attempted hijack of another user\'s notification token', async () => {
    prisma.pushDevice.findUnique.mockResolvedValue({ userId: 'someone-else' });
    await expect(controller.register(user,dto)).rejects.toThrow(ConflictException);
    expect(prisma.pushDevice.upsert).not.toHaveBeenCalled();
  });
  it('permits re-registering a token for its same existing owner', async () => {
    prisma.pushDevice.findUnique.mockResolvedValue({ userId: 'user-a' });
    prisma.pushDevice.upsert.mockResolvedValue({ id:'device-1' });
    await expect(controller.register(user,dto)).resolves.toEqual({id:'device-1'});
  });
  it('lists only the current user\'s devices with no token returned', async () => {
    prisma.pushDevice.findMany.mockResolvedValue([]);
    await controller.list(user);
    expect(prisma.pushDevice.findMany).toHaveBeenCalledWith({
      where:{userId:'user-a'},select:{id:true,platform:true,isActive:true,updatedAt:true},
    });
  });
  it('revokes a device only when the authenticated user owns it', async () => {
    await controller.unregister(user,'device-1');
    expect(prisma.pushDevice.updateMany).toHaveBeenCalledWith({
      where:{id:'device-1',userId:'user-a'},data:{isActive:false},
    });
  });
});
