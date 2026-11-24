import type { PrismaService } from '../prisma/prisma.service';
import { AdminOperationsController } from './admin-operations.controller';

describe('AdminOperationsController reports', () => {
  let db: {
    booking: { findMany: jest.Mock; groupBy: jest.Mock; count: jest.Mock };
    agentProfile: { findMany: jest.Mock; groupBy: jest.Mock; count: jest.Mock };
    providerProfile: { findMany: jest.Mock };
    onboardingApplication: { groupBy: jest.Mock; count: jest.Mock };
    serviceCategory: { count: jest.Mock };
    service: { count: jest.Mock };
  };
  let controller: AdminOperationsController;

  beforeEach(() => {
    db = {
      booking: { findMany: jest.fn().mockResolvedValue([]), groupBy: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
      agentProfile: { findMany: jest.fn().mockResolvedValue([]), groupBy: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
      providerProfile: { findMany: jest.fn().mockResolvedValue([]) },
      onboardingApplication: { groupBy: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
      serviceCategory: { count: jest.fn().mockResolvedValue(0) },
      service: { count: jest.fn().mockResolvedValue(0) },
    };
    controller = new AdminOperationsController(db as unknown as PrismaService);
  });

  it('returns 30 UTC daily buckets by default and aggregates only dated activities', async () => {
    const today = new Date(); today.setUTCHours(12, 0, 0, 0);
    const yesterday = new Date(today); yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const old = new Date(today); old.setUTCDate(old.getUTCDate() - 95);
    db.booking.findMany.mockResolvedValue([{createdAt:today},{createdAt:yesterday},{createdAt:old}]);
    db.agentProfile.findMany.mockResolvedValue([{createdAt:today}]);
    db.providerProfile.findMany.mockResolvedValue([{createdAt:today},{createdAt:today}]);
    db.booking.groupBy.mockResolvedValue([{status:'REQUESTED',_count:{_all:2}}]);
    db.agentProfile.groupBy.mockResolvedValue([{status:'PENDING',_count:{_all:1}}]);
    db.onboardingApplication.groupBy.mockResolvedValue([{status:'SUBMITTED',_count:{_all:3}}]);
    const out = await controller.reports({});
    expect(out.days).toBe(30);
    expect(out.series).toHaveLength(30);
    expect(out.series.at(-1)).toMatchObject({date:today.toISOString().slice(0,10), bookings:1, agents:1, providers:2});
    expect(out.series.at(-2)).toMatchObject({date:yesterday.toISOString().slice(0,10), bookings:1, agents:0, providers:0});
    expect(out.bookingStatuses).toEqual([{name:'REQUESTED',value:2}]);
    expect(out.agentStatuses).toEqual([{name:'PENDING',value:1}]);
    expect(out.providerStatuses).toEqual([{name:'SUBMITTED',value:3}]);
    expect(out.limited).toBe(false);
    expect(db.booking.findMany).toHaveBeenCalledWith(expect.objectContaining({take:10000, select:{createdAt:true}}));
  });

  it.each(['7','90'] as const)('supports the %s day report range', async days => {
    const result = await controller.reports({days});
    expect(result.series).toHaveLength(Number(days));
    expect(result.limited).toBe(false);
  });

  it.each(['booking','agentProfile','providerProfile'] as const)('flags potentially truncated %s events', async name => {
    db[name].findMany.mockResolvedValue(Array(10000).fill({createdAt:new Date()}));
    const result = await controller.reports({days:'7'});
    expect(result.limited).toBe(true);
  });

  it('returns zeros and empty status distributions for a new pilot', async () => {
    const result = await controller.reports({days:'7'});
    expect(result.series.every(x=>x.bookings===0&&x.agents===0&&x.providers===0)).toBe(true);
    expect(result.bookingStatuses).toEqual([]);
    expect(result.agentStatuses).toEqual([]);
    expect(result.providerStatuses).toEqual([]);
  });

  it('provides summary counts without exposing PII', async () => {
    db.agentProfile.count.mockResolvedValueOnce(3).mockResolvedValueOnce(4);
    db.onboardingApplication.count.mockResolvedValueOnce(5).mockResolvedValueOnce(6);
    db.booking.count.mockResolvedValueOnce(7).mockResolvedValueOnce(8).mockResolvedValueOnce(9);
    db.serviceCategory.count.mockResolvedValue(10);
    db.service.count.mockResolvedValue(11);
    const out = await controller.summary();
    expect(out).toMatchObject({agentsPending:3,agentsActive:4,providersPending:5,providersApproved:6,bookingsTotal:7,bookingsRequested:8,bookingsCompleted:9,serviceCategories:10,servicesActive:11});
    expect(out).not.toHaveProperty('phoneNumber');
    expect(out.generatedAt).toEqual(expect.any(String));
  });
});
