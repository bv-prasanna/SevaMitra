import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { IncidentSeverity, IncidentStatus, NotificationStatus } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import { IncidentService } from './incident.service';

describe('IncidentService', () => {
  let prisma: {
    incidentCase: {
      create: jest.Mock; findMany: jest.Mock; findFirst: jest.Mock;
      findUnique: jest.Mock; findUniqueOrThrow: jest.Mock; updateMany: jest.Mock;
    };
    incidentCaseActivity: { create: jest.Mock };
    incidentSlaPolicy: {
      findFirst: jest.Mock; findMany: jest.Mock; create: jest.Mock;
      findUnique: jest.Mock; updateMany: jest.Mock; update: jest.Mock;
    };
    incidentSlaHoliday: { findMany: jest.Mock; create: jest.Mock };
    notification: { createMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let service: IncidentService;
  const current = {
    id: 'case-1', reporterId: 'reporter-1', assignedToId: 'reviewer-1',
    status: IncidentStatus.ACKNOWLEDGED, level: 1, slaPolicy: null,
    resolveDueAt: null,
  };
  const policy = {
    id: 'policy-1', severity: IncidentSeverity.P2, category: 'SERVICE_ISSUE',
    acknowledgeMinutes: 30, level1Minutes: 60, level2Minutes: 60, level3Minutes: 60,
    businessHoursOnly: false, businessStartMinute: 0, businessEndMinute: 1440,
    workingDays: [0, 1, 2, 3, 4, 5, 6], timezone: 'Asia/Kolkata',
  };

  beforeEach(() => {
    prisma = {
      incidentCase: {
        create: jest.fn().mockResolvedValue({ id: 'case-1' }),
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn().mockResolvedValue(current),
        findUniqueOrThrow: jest.fn().mockResolvedValue(current),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      incidentCaseActivity: { create: jest.fn().mockResolvedValue({ id: 'activity-1' }) },
      incidentSlaPolicy: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue({ id: 'policy-1', enabled: false }),
        findUnique: jest.fn().mockResolvedValue(policy),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn().mockResolvedValue({ ...policy, enabled: true }),
      },
      incidentSlaHoliday: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue({ id: 'holiday-1' }),
      },
      notification: { createMany: jest.fn().mockResolvedValue({ count: 1 }) },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma));
    service = new IncidentService(prisma as unknown as PrismaService);
  });

  it('creates an incident with no SLA deadlines until an approved policy exists', async () => {
    await service.open('reporter-1', {
      category: 'SERVICE_ISSUE', title: 'Missed appointment',
      description: 'The provider did not arrive',
    });
    expect(prisma.incidentSlaPolicy.findFirst).toHaveBeenCalledTimes(2);
    expect(prisma.incidentCase.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      reporterId: 'reporter-1', category: 'SERVICE_ISSUE',
      title: 'Missed appointment', description: 'The provider did not arrive',
      severity: IncidentSeverity.P2, slaPolicyId: null,
      acknowledgeDueAt: null, resolveDueAt: null, nextEscalationAt: null,
      activities: { create: { actorId: 'reporter-1', action: 'OPENED' } },
    }) });
  });

  it('uses the most specific approved category policy and calculates deadlines', async () => {
    prisma.incidentSlaPolicy.findFirst.mockResolvedValueOnce(policy);
    await service.open('reporter-1', {
      category: 'SERVICE_ISSUE', severity: IncidentSeverity.P1,
      title: 'Missed appointment', description: 'The provider did not arrive',
    });
    expect(prisma.incidentSlaPolicy.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ severity: IncidentSeverity.P1, category: 'SERVICE_ISSUE', enabled: true }),
    }));
    expect(prisma.incidentCase.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      severity: IncidentSeverity.P1, slaPolicyId: 'policy-1',
      acknowledgeDueAt: expect.any(Date), resolveDueAt: expect.any(Date),
      nextEscalationAt: expect.any(Date),
    }) });
  });

  it('only lists cases belonging to the authenticated reporter', async () => {
    await service.mine('reporter-1');
    expect(prisma.incidentCase.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { reporterId: 'reporter-1' }, take: 50,
    }));
  });

  it('hides other reporters cases as Not Found', async () => {
    prisma.incidentCase.findFirst.mockResolvedValue(null);
    await expect(service.mineOne('outsider', 'case-1')).rejects.toThrow(NotFoundException);
    expect(prisma.incidentCase.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'case-1', reporterId: 'outsider' },
    }));
  });

  it('lists only requested status for operational reviewer', async () => {
    await service.list(IncidentStatus.OPEN);
    expect(prisma.incidentCase.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { status: IncidentStatus.OPEN }, take: 100,
    }));
  });

  it('denies lookup for absent case', async () => {
    prisma.incidentCase.findUnique.mockResolvedValue(null);
    await expect(service.detail('missing')).rejects.toThrow(NotFoundException);
  });

  it('claims an incident once and stamps acknowledgement without inventing an SLA', async () => {
    await service.claim('case-1', 'reviewer-2');
    expect(prisma.incidentCase.updateMany).toHaveBeenCalledWith({
      where: { id: 'case-1', assignedToId: null, status: IncidentStatus.OPEN },
      data: expect.objectContaining({
        assignedToId: 'reviewer-2', status: IncidentStatus.ACKNOWLEDGED,
        acknowledgedAt: expect.any(Date), acknowledgeDueAt: null,
        nextEscalationAt: null,
      }),
    });
    expect(prisma.incidentCaseActivity.create).toHaveBeenCalledWith({
      data: { incidentId: 'case-1', actorId: 'reviewer-2', action: 'CLAIMED' },
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('continues the existing escalation tier when an overdue unclaimed case is acknowledged', async () => {
    const now = Date.now();
    const tieredPolicy = { ...policy, level1Minutes: 10, level2Minutes: 20, level3Minutes: 30 };
    prisma.incidentCase.findUnique.mockResolvedValue({
      ...current, status: IncidentStatus.OPEN, assignedToId: null, level: 2, slaPolicy: tieredPolicy,
    });
    await service.claim('case-1', 'reviewer-2');
    const data = prisma.incidentCase.updateMany.mock.calls[0][0].data;
    expect(data.nextEscalationAt.getTime()).toBeGreaterThanOrEqual(now + 20 * 60_000);
    expect(data.nextEscalationAt.getTime()).toBeLessThan(now + 20 * 60_000 + 2_000);
    expect(data.resolveDueAt.getTime()).toBeGreaterThanOrEqual(now + 50 * 60_000);
  });

  it('prevents concurrent double claim without creating an activity', async () => {
    prisma.incidentCase.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.claim('case-1', 'reviewer-2')).rejects.toThrow(ConflictException);
    expect(prisma.incidentCaseActivity.create).not.toHaveBeenCalled();
  });

  it('denies non-owner changing status', async () => {
    await expect(service.changeStatus('case-1', 'outsider', {
      status: IncidentStatus.IN_PROGRESS, note: 'Working',
    })).rejects.toThrow(ForbiddenException);
    expect(prisma.incidentCase.updateMany).not.toHaveBeenCalled();
  });

  it('rejects an out-of-order transition', async () => {
    await expect(service.changeStatus('case-1', 'reviewer-1', {
      status: IncidentStatus.CLOSED, note: 'No',
    })).rejects.toThrow(ConflictException);
    expect(prisma.incidentCaseActivity.create).not.toHaveBeenCalled();
  });

  it('moves acknowledged to in progress and emits an activity', async () => {
    await service.changeStatus('case-1', 'reviewer-1', {
      status: IncidentStatus.IN_PROGRESS, note: 'I contacted provider',
    });
    expect(prisma.incidentCase.updateMany).toHaveBeenCalledWith({
      where: { id: 'case-1', status: IncidentStatus.ACKNOWLEDGED, assignedToId: 'reviewer-1' },
      data: { status: IncidentStatus.IN_PROGRESS, closedAt: null },
    });
    expect(prisma.incidentCaseActivity.create).toHaveBeenCalledWith({
      data: {
        incidentId: 'case-1', actorId: 'reviewer-1',
        action: 'STATUS_IN_PROGRESS', note: 'I contacted provider',
      },
    });
  });

  it('clears future escalation when a resolved incident is closed', async () => {
    prisma.incidentCase.findUnique.mockResolvedValue({ ...current, status: IncidentStatus.RESOLVED });
    await service.changeStatus('case-1', 'reviewer-1', {
      status: IncidentStatus.CLOSED, note: 'Confirmed',
    });
    const arg = prisma.incidentCase.updateMany.mock.calls[0][0];
    expect(arg.data.status).toBe(IncidentStatus.CLOSED);
    expect(arg.data.closedAt).toBeInstanceOf(Date);
    expect(arg.data.nextEscalationAt).toBeNull();
  });

  it('detects a conflicting update without emitting an activity', async () => {
    prisma.incidentCase.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.changeStatus('case-1', 'reviewer-1', {
      status: IncidentStatus.IN_PROGRESS, note: 'Working',
    })).rejects.toThrow(ConflictException);
    expect(prisma.incidentCaseActivity.create).not.toHaveBeenCalled();
  });

  it('permits explicit, audited L1 to L2 escalation', async () => {
    await service.escalate('case-1', 'reviewer-2', 'No response from assigned owner');
    expect(prisma.incidentCase.updateMany).toHaveBeenCalledWith({
      where: { id: 'case-1', status: IncidentStatus.ACKNOWLEDGED, level: 1 },
      data: { level: 2 },
    });
    expect(prisma.incidentCaseActivity.create).toHaveBeenCalledWith({
      data: {
        incidentId: 'case-1', actorId: 'reviewer-2',
        action: 'ESCALATED_L2', note: 'No response from assigned owner',
      },
    });
  });

  it.each([IncidentStatus.CLOSED, IncidentStatus.OPEN])(
    'does not escalate invalid closed or L3 case %s',
    async (status) => {
      prisma.incidentCase.findUnique.mockResolvedValue({
        ...current, status, level: status === IncidentStatus.OPEN ? 3 : 1,
      });
      await expect(service.escalate('case-1', 'reviewer-2', 'Review')).rejects.toThrow(ConflictException);
    },
  );

  it('does not create an escalation activity if another reviewer already changed the level', async () => {
    prisma.incidentCase.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.escalate('case-1', 'reviewer-2', 'Review')).rejects.toThrow(ConflictException);
    expect(prisma.incidentCaseActivity.create).not.toHaveBeenCalled();
  });

  it('creates a disabled policy before explicit operations approval', async () => {
    const dto = {
      name: 'P2 weekday support', severity: IncidentSeverity.P2, category: 'SERVICE_ISSUE' as const,
      acknowledgeMinutes: 30, level1Minutes: 60, level2Minutes: 60, level3Minutes: 60,
      businessHoursOnly: true, businessStartMinute: 540, businessEndMinute: 1020,
      workingDays: [1, 2, 3, 4, 5], timezone: 'Asia/Kolkata',
    };
    await service.createSlaPolicy('ops-1', dto);
    expect(prisma.incidentSlaPolicy.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ ...dto, enabled: false, approvedAt: null, createdById: 'ops-1' }),
    });
  });

  it('rejects invalid business hour boundaries', async () => {
    await expect(service.createSlaPolicy('ops-1', {
      name: 'Invalid', severity: IncidentSeverity.P2, acknowledgeMinutes: 10,
      level1Minutes: 10, level2Minutes: 10, level3Minutes: 10,
      businessHoursOnly: true, businessStartMinute: 1020, businessEndMinute: 540,
      workingDays: [1, 2, 3, 4, 5], timezone: 'Asia/Kolkata',
    })).rejects.toThrow(BadRequestException);
  });

  it('approves a policy only after disabling the previous active policy for the same scope', async () => {
    await service.approveSlaPolicy('policy-2', 'ops-2');
    expect(prisma.incidentSlaPolicy.updateMany).toHaveBeenCalledWith({
      where: {
        id: { not: 'policy-2' }, severity: IncidentSeverity.P2,
        category: 'SERVICE_ISSUE', enabled: true,
      },
      data: { enabled: false },
    });
    expect(prisma.incidentSlaPolicy.update).toHaveBeenCalledWith({
      where: { id: 'policy-2' },
      data: expect.objectContaining({ enabled: true, approvedById: 'ops-2', approvedAt: expect.any(Date) }),
    });
  });

  it('automatically escalates a due incident and creates its outbox notice atomically', async () => {
    const dueAt = new Date('2026-11-25T08:00:00.000Z');
    prisma.incidentCase.findMany.mockResolvedValue([{
      id: 'case-1', reporterId: 'reporter-1', assignedToId: 'reviewer-1',
      title: 'Missed visit', level: 1, nextEscalationAt: dueAt, slaPolicy: policy,
    }]);
    const result = await service.processDueEscalations(new Date('2026-11-25T09:00:00.000Z'));
    expect(result).toEqual({ examined: 1, escalated: 1, breached: 0, skipped: 0 });
    expect(prisma.incidentCase.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: 'case-1', level: 1, nextEscalationAt: dueAt }),
      data: { level: 2, nextEscalationAt: expect.any(Date) },
    }));
    expect(prisma.incidentCaseActivity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        incidentId: 'case-1', actorId: null, action: 'SYSTEM_SLA_ESCALATED_L2',
      }),
    });
    expect(prisma.notification.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          userId: 'reporter-1', deliveryKey: 'incident-sla:case-1:level:2:user:reporter-1',
          status: NotificationStatus.PENDING,
        }),
        expect.objectContaining({ userId: 'reviewer-1' }),
      ]),
      skipDuplicates: true,
    });
  });

  it('does not duplicate activity or notification when a competing scheduler wins the compare-and-set', async () => {
    const dueAt = new Date('2026-11-25T08:00:00.000Z');
    prisma.incidentCase.findMany.mockResolvedValue([{
      id: 'case-1', reporterId: 'reporter-1', assignedToId: null,
      title: 'Missed visit', level: 1, nextEscalationAt: dueAt, slaPolicy: policy,
    }]);
    prisma.incidentCase.updateMany.mockResolvedValue({ count: 0 });
    const result = await service.processDueEscalations(new Date('2026-11-25T09:00:00.000Z'));
    expect(result).toEqual({ examined: 1, escalated: 0, breached: 0, skipped: 1 });
    expect(prisma.incidentCaseActivity.create).not.toHaveBeenCalled();
    expect(prisma.notification.createMany).not.toHaveBeenCalled();
  });

  it('records an L3 breach once and clears the scheduler deadline', async () => {
    const dueAt = new Date('2026-11-25T08:00:00.000Z');
    prisma.incidentCase.findMany.mockResolvedValue([{
      id: 'case-1', reporterId: 'reporter-1', assignedToId: null,
      title: 'Safety case', level: 3, nextEscalationAt: dueAt, slaPolicy: policy,
    }]);
    const result = await service.processDueEscalations(new Date('2026-11-25T09:00:00.000Z'));
    expect(result).toEqual({ examined: 1, escalated: 0, breached: 1, skipped: 0 });
    expect(prisma.incidentCase.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: { level: 3, nextEscalationAt: null },
    }));
    expect(prisma.incidentCaseActivity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: 'SYSTEM_SLA_BREACH_L3', actorId: null }),
    });
  });
});
