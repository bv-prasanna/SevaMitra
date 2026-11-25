import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  IncidentSeverity,
  IncidentStatus,
  NotificationChannel,
  NotificationStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ChangeIncidentStatusDto, OpenIncidentDto } from './incident.dto';
import {
  CreateIncidentSlaHolidayDto,
  CreateIncidentSlaPolicyDto,
} from './incident-sla.dto';
import { addBusinessMinutes, type BusinessCalendarPolicy } from './sla-calendar';

const allowed: Partial<Record<IncidentStatus, readonly IncidentStatus[]>> = {
  [IncidentStatus.ACKNOWLEDGED]: [IncidentStatus.IN_PROGRESS],
  [IncidentStatus.IN_PROGRESS]: [IncidentStatus.RESOLVED],
  [IncidentStatus.RESOLVED]: [IncidentStatus.IN_PROGRESS, IncidentStatus.CLOSED],
};
const ACTIVE_INCIDENT_STATUSES = [
  IncidentStatus.OPEN,
  IncidentStatus.ACKNOWLEDGED,
  IncidentStatus.IN_PROGRESS,
] as const;

@Injectable()
export class IncidentService {
  constructor(private readonly prisma: PrismaService) {}

  /** A reporter may only create, view and track their own cases. */
  async open(reporterId: string, dto: OpenIncidentDto) {
    const severity = dto.severity ?? IncidentSeverity.P2;
    const policy = await this.findApprovedPolicy(severity, dto.category);
    const now = new Date();
    const deadlines = policy
      ? await this.deadlinesFrom(now, policy, policy.acknowledgeMinutes)
      : { acknowledgeDueAt: null, resolveDueAt: null, nextEscalationAt: null };

    return this.prisma.incidentCase.create({
      data: {
        reporterId,
        category: dto.category,
        title: dto.title,
        description: dto.description,
        severity,
        slaPolicyId: policy?.id ?? null,
        ...deadlines,
        activities: { create: { actorId: reporterId, action: 'OPENED' } },
      },
    });
  }

  mine(reporterId: string) {
    return this.prisma.incidentCase.findMany({
      where: { reporterId },
      select: {
        id: true, category: true, title: true, status: true, severity: true,
        level: true, acknowledgeDueAt: true, resolveDueAt: true,
        createdAt: true, updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async mineOne(reporterId: string, id: string) {
    const item = await this.prisma.incidentCase.findFirst({
      where: { id, reporterId },
      include: { activities: { orderBy: { createdAt: 'asc' } } },
    });
    if (!item) throw new NotFoundException('Incident not found');
    return item;
  }

  list(status?: IncidentStatus) {
    return this.prisma.incidentCase.findMany({
      where: { status },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async detail(id: string) {
    const row = await this.prisma.incidentCase.findUnique({
      where: { id },
      include: { activities: { orderBy: { createdAt: 'asc' } } },
    });
    if (!row) throw new NotFoundException('Incident not found');
    return row;
  }

  /** Conditional UPDATE and activity INSERT are atomic: no double-claim. */
  claim(id: string, actorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.incidentCase.findUnique({
        where: { id },
        include: { slaPolicy: true },
      });
      if (!current) throw new NotFoundException('Incident not found');
      const now = new Date();
      let deadlines: {
        acknowledgedAt: Date;
        acknowledgeDueAt: null;
        resolveDueAt: Date | null;
        nextEscalationAt: Date | null;
      } = {
        acknowledgedAt: now,
        acknowledgeDueAt: null,
        resolveDueAt: current.resolveDueAt,
        nextEscalationAt: null,
      };
      if (current.slaPolicy) {
        const holidays = await this.holidaySet(now, tx);
        deadlines = {
          acknowledgedAt: now,
          acknowledgeDueAt: null,
          resolveDueAt: addBusinessMinutes(
            now,
            current.slaPolicy.level1Minutes +
              current.slaPolicy.level2Minutes +
              current.slaPolicy.level3Minutes,
            current.slaPolicy,
            holidays,
          ),
          nextEscalationAt: addBusinessMinutes(
            now,
            current.slaPolicy.level1Minutes,
            current.slaPolicy,
            holidays,
          ),
        };
      }
      const changed = await tx.incidentCase.updateMany({
        where: { id, assignedToId: null, status: IncidentStatus.OPEN },
        data: {
          assignedToId: actorId,
          status: IncidentStatus.ACKNOWLEDGED,
          ...deadlines,
        },
      });
      if (changed.count !== 1) {
        throw new ConflictException('Incident unavailable or already claimed');
      }
      await tx.incidentCaseActivity.create({
        data: { incidentId: id, actorId, action: 'CLAIMED' },
      });
      return tx.incidentCase.findUniqueOrThrow({ where: { id } });
    });
  }

  /** Only assigned owner may move a case through legal state transitions. */
  changeStatus(id: string, actorId: string, dto: ChangeIncidentStatusDto) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.incidentCase.findUnique({ where: { id }, include: { slaPolicy: true } });
      if (!current) throw new NotFoundException('Incident not found');
      if (current.assignedToId !== actorId) {
        throw new ForbiddenException('Only assigned owner can change status');
      }
      if (!allowed[current.status]?.includes(dto.status)) {
        throw new ConflictException('Invalid incident transition');
      }
      let nextEscalationAt: Date | null | undefined;
      if (dto.status === IncidentStatus.RESOLVED || dto.status === IncidentStatus.CLOSED) {
        nextEscalationAt = null;
      } else if (current.status === IncidentStatus.RESOLVED && dto.status === IncidentStatus.IN_PROGRESS && current.slaPolicy) {
        const now = new Date();
        const holidays = await this.holidaySet(now, tx);
        const minutes = current.level === 1
          ? current.slaPolicy.level1Minutes
          : current.level === 2
            ? current.slaPolicy.level2Minutes
            : current.slaPolicy.level3Minutes;
        nextEscalationAt = addBusinessMinutes(now, minutes, current.slaPolicy, holidays);
      }
      const changed = await tx.incidentCase.updateMany({
        where: { id, status: current.status, assignedToId: actorId },
        data: {
          status: dto.status,
          closedAt: dto.status === IncidentStatus.CLOSED ? new Date() : null,
          ...(nextEscalationAt !== undefined ? { nextEscalationAt } : {}),
        },
      });
      if (changed.count !== 1) {
        throw new ConflictException('Incident changed concurrently');
      }
      await tx.incidentCaseActivity.create({
        data: {
          incidentId: id,
          actorId,
          action: 'STATUS_' + dto.status,
          note: dto.note,
        },
      });
      return tx.incidentCase.findUniqueOrThrow({ where: { id } });
    });
  }

  /** Explicit human escalation remains available and is always audited. */
  escalate(id: string, actorId: string, note: string) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.incidentCase.findUnique({ where: { id }, include: { slaPolicy: true } });
      if (!current) throw new NotFoundException('Incident not found');
      if (current.status === IncidentStatus.CLOSED || current.level >= 3) {
        throw new ConflictException('Incident already closed or at maximum escalation');
      }
      const nextLevel = current.level + 1;
      let nextEscalationAt: Date | undefined;
      if (current.slaPolicy) {
        const now = new Date();
        const holidays = await this.holidaySet(now, tx);
        const minutes = nextLevel === 2
          ? current.slaPolicy.level2Minutes
          : current.slaPolicy.level3Minutes;
        nextEscalationAt = addBusinessMinutes(now, minutes, current.slaPolicy, holidays);
      }
      const changed = await tx.incidentCase.updateMany({
        where: { id, status: current.status, level: current.level },
        data: { level: nextLevel, ...(nextEscalationAt ? { nextEscalationAt } : {}) },
      });
      if (changed.count !== 1) {
        throw new ConflictException('Incident changed concurrently');
      }
      await tx.incidentCaseActivity.create({
        data: {
          incidentId: id,
          actorId,
          action: 'ESCALATED_L' + nextLevel,
          note,
        },
      });
      return tx.incidentCase.findUniqueOrThrow({ where: { id } });
    });
  }

  listSlaPolicies() {
    return this.prisma.incidentSlaPolicy.findMany({
      orderBy: [{ severity: 'asc' }, { category: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async createSlaPolicy(actorId: string, dto: CreateIncidentSlaPolicyDto) {
    this.validateCalendar(dto);
    return this.prisma.incidentSlaPolicy.create({
      data: {
        ...dto,
        category: dto.category ?? null,
        enabled: false,
        approvedById: null,
        approvedAt: null,
        createdById: actorId,
        updatedById: actorId,
      },
    });
  }

  async approveSlaPolicy(id: string, actorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const policy = await tx.incidentSlaPolicy.findUnique({ where: { id } });
      if (!policy) throw new NotFoundException('SLA policy not found');
      await tx.incidentSlaPolicy.updateMany({
        where: {
          id: { not: id },
          severity: policy.severity,
          category: policy.category,
          enabled: true,
        },
        data: { enabled: false },
      });
      return tx.incidentSlaPolicy.update({
        where: { id },
        data: { enabled: true, approvedById: actorId, approvedAt: new Date(), updatedById: actorId },
      });
    });
  }

  listSlaHolidays() {
    return this.prisma.incidentSlaHoliday.findMany({
      where: { isActive: true },
      orderBy: { date: 'asc' },
    });
  }

  createSlaHoliday(actorId: string, dto: CreateIncidentSlaHolidayDto) {
    return this.prisma.incidentSlaHoliday.create({
      data: {
        date: new Date(dto.date + 'T00:00:00.000Z'),
        label: dto.label.trim(),
        createdById: actorId,
      },
    });
  }

  /**
   * Scheduler is safe to invoke repeatedly. A compare-and-set on the exact
   * due timestamp advances or clears the deadline in the same transaction
   * as the activity and durable notification outbox rows.
   */
  async processDueEscalations(now = new Date()): Promise<{
    examined: number;
    escalated: number;
    breached: number;
    skipped: number;
  }> {
    const due = await this.prisma.incidentCase.findMany({
      where: {
        nextEscalationAt: { lte: now },
        status: { in: [...ACTIVE_INCIDENT_STATUSES] },
      },
      include: { slaPolicy: true },
      orderBy: { nextEscalationAt: 'asc' },
      take: 100,
    });
    let escalated = 0;
    let breached = 0;
    let skipped = 0;
    const earliestDue = due.reduce((earliest, item) =>
      item.nextEscalationAt && item.nextEscalationAt < earliest ? item.nextEscalationAt : earliest,
      now,
    );
    const holidays = due.length ? await this.holidaySet(earliestDue) : new Set<string>();

    for (const incident of due) {
      const policy = incident.slaPolicy;
      if (!policy) {
        const cleared = await this.prisma.incidentCase.updateMany({
          where: {
            id: incident.id,
            level: incident.level,
            nextEscalationAt: incident.nextEscalationAt,
          },
          data: { nextEscalationAt: null },
        });
        if (cleared.count === 1) skipped++;
        continue;
      }

      const targetLevel = incident.level >= 3 ? 3 : incident.level + 1;
      const isBreach = targetLevel === 3 && incident.level >= 3;
      const nextEscalationAt = isBreach
        ? null
        : addBusinessMinutes(
            incident.nextEscalationAt ?? now,
            targetLevel === 2 ? policy.level2Minutes : policy.level3Minutes,
            policy,
            holidays,
          );
      const recipients = [...new Set(
        [incident.reporterId, incident.assignedToId].filter(
          (id): id is string => Boolean(id),
        ),
      )];

      const processed = await this.prisma.$transaction(async (tx) => {
        const changed = await tx.incidentCase.updateMany({
          where: {
            id: incident.id,
            level: incident.level,
            nextEscalationAt: incident.nextEscalationAt,
            status: { in: [...ACTIVE_INCIDENT_STATUSES] },
          },
          data: { level: targetLevel, nextEscalationAt },
        });
        if (changed.count !== 1) return false;

        const action = isBreach
          ? 'SYSTEM_SLA_BREACH_L3'
          : 'SYSTEM_SLA_ESCALATED_L' + targetLevel;
        await tx.incidentCaseActivity.create({
          data: {
            incidentId: incident.id,
            actorId: null,
            action,
            note: 'Automatically processed against the approved incident SLA policy.',
          },
        });
        const title = isBreach
          ? 'Incident SLA breach - L3'
          : 'Incident escalated to L' + targetLevel;
        const body = isBreach
          ? `Incident "${incident.title}" has reached the L3 SLA breach threshold and requires operations review.`
          : `Incident "${incident.title}" remains open and has been escalated to support level L${targetLevel}.`;
        if (recipients.length) {
          await tx.notification.createMany({
            data: recipients.map((userId) => ({
              userId,
              channel: NotificationChannel.IN_APP,
              title,
              body,
              status: NotificationStatus.PENDING,
              nextAttemptAt: now,
              deliveryKey: `incident-sla:${incident.id}:level:${targetLevel}:user:${userId}`,
            })),
            skipDuplicates: true,
          });
        }
        return true;
      });

      if (!processed) {
        skipped++;
      } else if (isBreach) {
        breached++;
      } else {
        escalated++;
      }
    }

    return { examined: due.length, escalated, breached, skipped };
  }

  private validateCalendar(dto: CreateIncidentSlaPolicyDto) {
    if (dto.businessStartMinute >= dto.businessEndMinute) {
      throw new BadRequestException('Business end must be later than business start');
    }
    if (!dto.workingDays.length) {
      throw new BadRequestException('At least one business day must be configured');
    }
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: dto.timezone }).format(new Date());
    } catch {
      throw new BadRequestException('Timezone must be a valid IANA timezone');
    }
  }

  private async findApprovedPolicy(severity: IncidentSeverity, category: string) {
    const base = { severity, enabled: true, approvedAt: { not: null } };
    const specific = await this.prisma.incidentSlaPolicy.findFirst({
      where: { ...base, category },
      orderBy: { approvedAt: 'desc' },
    });
    if (specific) return specific;
    return this.prisma.incidentSlaPolicy.findFirst({
      where: { ...base, category: null },
      orderBy: { approvedAt: 'desc' },
    });
  }

  private async deadlinesFrom(
    start: Date,
    policy: BusinessCalendarPolicy & {
      acknowledgeMinutes: number;
      level1Minutes: number;
      level2Minutes: number;
      level3Minutes: number;
    },
    acknowledgementMinutes: number,
  ) {
    const holidays = await this.holidaySet(start);
    const acknowledgeDueAt = addBusinessMinutes(start, acknowledgementMinutes, policy, holidays);
    return {
      acknowledgeDueAt,
      resolveDueAt: addBusinessMinutes(
        acknowledgeDueAt,
        policy.level1Minutes + policy.level2Minutes + policy.level3Minutes,
        policy,
        holidays,
      ),
      nextEscalationAt: acknowledgeDueAt,
    };
  }

  private async holidaySet(
    from: Date,
    client: Prisma.TransactionClient | PrismaService = this.prisma,
  ): Promise<Set<string>> {
    const fromDate = new Date(from.getTime() - 2 * 86_400_000);
    const toDate = new Date(from.getTime() + 3 * 366 * 86_400_000);
    const holidays = await client.incidentSlaHoliday.findMany({
      where: { isActive: true, date: { gte: fromDate, lte: toDate } },
      select: { date: true },
    });
    return new Set(holidays.map((holiday) => holiday.date.toISOString().slice(0, 10)));
  }
}
