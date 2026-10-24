
import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller';
import type { PrismaService } from '../prisma/prisma.service';

describe('Health endpoints', () => {
  const prisma = {$queryRaw: jest.fn()};
  const controller = new HealthController(prisma as unknown as PrismaService);
  beforeEach(() => jest.resetAllMocks());
  it('returns healthy status for application liveness', () => {
    expect(controller.ok()).toEqual({status:'ok'});
  });
  it('returns healthy status after a successful database query', async () => {
    prisma.$queryRaw.mockResolvedValue([{ok:1}]);
    await expect(controller.db()).resolves.toEqual({status:'ok'});
  });
  it('returns HTTP 503 when PostgreSQL cannot be reached', async () => {
    prisma.$queryRaw.mockRejectedValue(new Error('connection refused'));
    await expect(controller.db()).rejects.toThrow(ServiceUnavailableException);
  });
});
