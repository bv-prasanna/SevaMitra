import { Injectable } from '@nestjs/common';
import { AuditLog } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const LIST_LIMIT = 100;

export interface RecordAuditEntryInput {
  actorUserId: string;
  httpMethod: string;
  routePath: string;
  entityId: string | null;
  statusCode: number;
  ipAddress: string | null;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  record(entry: RecordAuditEntryInput): Promise<AuditLog> {
    return this.prisma.auditLog.create({ data: entry });
  }

  list(actorUserId?: string): Promise<AuditLog[]> {
    return this.prisma.auditLog.findMany({
      where: { actorUserId },
      orderBy: { createdAt: 'desc' },
      take: LIST_LIMIT,
    });
  }
}
