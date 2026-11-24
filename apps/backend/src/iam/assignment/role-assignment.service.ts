import { Injectable, NotFoundException } from '@nestjs/common';
import { ScopeType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AssignRoleDto } from '../dto/assign-role.dto';
import type { RoleAssignmentDto } from '../dto/responses/role-assignment.dto';

const assignmentWithRole = { role: true } as const;

@Injectable()
export class RoleAssignmentService {
  constructor(private readonly prisma: PrismaService) {}

  async assign(
    dto: AssignRoleDto,
    assignedBy: string | null,
  ): Promise<RoleAssignmentDto> {
    const [user, role] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: dto.userId } }),
      this.prisma.role.findUnique({ where: { id: dto.roleId } }),
    ]);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    const scopeId = dto.scopeType === ScopeType.PLATFORM ? null : dto.scopeId;

    const existing = await this.prisma.userRoleAssignment.findFirst({
      where: {
        userId: dto.userId,
        roleId: dto.roleId,
        scopeType: dto.scopeType,
        scopeId,
        revokedAt: null,
      },
      include: assignmentWithRole,
    });
    if (existing) {
      return this.toDto(existing);
    }

    const created = await this.prisma.userRoleAssignment.create({
      data: {
        userId: dto.userId,
        roleId: dto.roleId,
        scopeType: dto.scopeType,
        scopeId,
        assignedBy,
      },
      include: assignmentWithRole,
    });

    return this.toDto(created);
  }

  async revoke(id: string): Promise<void> {
    const assignment = await this.prisma.userRoleAssignment.findUnique({
      where: { id },
    });
    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }
    if (assignment.revokedAt) {
      return;
    }

    await this.prisma.userRoleAssignment.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  async listForUser(userId: string): Promise<RoleAssignmentDto[]> {
    const assignments = await this.prisma.userRoleAssignment.findMany({
      where: { userId },
      include: assignmentWithRole,
      orderBy: { assignedAt: 'desc' },
    });
    return assignments.map((a) => this.toDto(a));
  }

  private toDto(assignment: {
    id: string;
    userId: string;
    roleId: string;
    role: { name: string };
    scopeType: ScopeType;
    scopeId: string | null;
    assignedBy: string | null;
    assignedAt: Date;
    revokedAt: Date | null;
  }): RoleAssignmentDto {
    return {
      id: assignment.id,
      userId: assignment.userId,
      roleId: assignment.roleId,
      roleName: assignment.role.name,
      scopeType: assignment.scopeType,
      scopeId: assignment.scopeId,
      assignedBy: assignment.assignedBy,
      assignedAt: assignment.assignedAt,
      revokedAt: assignment.revokedAt,
    };
  }
}
