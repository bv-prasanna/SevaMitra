import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRoleDto } from '../dto/create-role.dto';
import { UpdateRoleDto } from '../dto/update-role.dto';
import type { RoleDto } from '../dto/responses/role.dto';

const roleWithPermissions = {
  rolePermissions: { include: { permission: true } },
} as const;

@Injectable()
export class RoleService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateRoleDto): Promise<RoleDto> {
    const permissionIds = await this.resolvePermissionIds(dto.permissionKeys);

    const role = await this.prisma.role.create({
      data: {
        name: dto.name,
        description: dto.description,
        rolePermissions: {
          create: permissionIds.map((permissionId) => ({ permissionId })),
        },
      },
      include: roleWithPermissions,
    });

    return this.toDto(role);
  }

  async findAll(): Promise<RoleDto[]> {
    const roles = await this.prisma.role.findMany({
      include: roleWithPermissions,
      orderBy: { name: 'asc' },
    });
    return roles.map((role) => this.toDto(role));
  }

  async findOne(id: string): Promise<RoleDto> {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: roleWithPermissions,
    });
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    return this.toDto(role);
  }

  async update(id: string, dto: UpdateRoleDto): Promise<RoleDto> {
    const existing = await this.prisma.role.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Role not found');
    }
    if (existing.isSystem) {
      throw new ConflictException('System roles cannot be modified');
    }

    if (dto.permissionKeys !== undefined) {
      const permissionIds = await this.resolvePermissionIds(dto.permissionKeys);
      await this.prisma.$transaction([
        this.prisma.rolePermission.deleteMany({ where: { roleId: id } }),
        this.prisma.rolePermission.createMany({
          data: permissionIds.map((permissionId) => ({
            roleId: id,
            permissionId,
          })),
        }),
      ]);
    }

    const role = await this.prisma.role.update({
      where: { id },
      data: { name: dto.name, description: dto.description },
      include: roleWithPermissions,
    });

    return this.toDto(role);
  }

  async remove(id: string): Promise<void> {
    const existing = await this.prisma.role.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Role not found');
    }
    if (existing.isSystem) {
      throw new ConflictException('System roles cannot be deleted');
    }

    const activeAssignments = await this.prisma.userRoleAssignment.count({
      where: { roleId: id, revokedAt: null },
    });
    if (activeAssignments > 0) {
      throw new ConflictException(
        'Role has active user assignments — revoke them first',
      );
    }

    await this.prisma.role.delete({ where: { id } });
  }

  private async resolvePermissionIds(
    keys: string[] | undefined,
  ): Promise<string[]> {
    if (!keys || keys.length === 0) {
      return [];
    }

    const permissions = await this.prisma.permission.findMany({
      where: { key: { in: keys } },
    });

    if (permissions.length !== new Set(keys).size) {
      const found = new Set(permissions.map((p) => p.key));
      const missing = keys.filter((key) => !found.has(key));
      throw new BadRequestException(
        `Unknown permission key(s): ${missing.join(', ')}`,
      );
    }

    return permissions.map((p) => p.id);
  }

  private toDto(role: {
    id: string;
    name: string;
    description: string | null;
    isSystem: boolean;
    createdAt: Date;
    updatedAt: Date;
    rolePermissions: { permission: { key: string } }[];
  }): RoleDto {
    return {
      id: role.id,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      permissionKeys: role.rolePermissions.map((rp) => rp.permission.key),
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };
  }
}
