import { Injectable } from '@nestjs/common';
import { Permission } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/** Read-only — the permission catalog is seeded (permission-catalog.ts), never admin-created. */
@Injectable()
export class PermissionService {
  constructor(private readonly prisma: PrismaService) {}

  list(): Promise<Permission[]> {
    return this.prisma.permission.findMany({ orderBy: { key: 'asc' } });
  }
}
