import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CommissionScopeType,
  Prisma,
  RefundPolicy,
  RefundReason,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CategoryService } from '../../catalogue/category/category.service';
import { ServiceService } from '../../catalogue/service/service.service';
import { ProviderService } from '../../provider/provider.service';
import { TownVillageService } from '../../geography/town-village/town-village.service';
import { CreateRefundPolicyDto } from './dto/create-refund-policy.dto';
import { UpdateRefundPolicyDto } from './dto/update-refund-policy.dto';

type ScopedEntityField =
  'categoryId' | 'serviceId' | 'providerId' | 'townVillageId';

const SCOPE_ENTITY_FIELD: Record<
  CommissionScopeType,
  ScopedEntityField | null
> = {
  [CommissionScopeType.PLATFORM]: null,
  [CommissionScopeType.CATEGORY]: 'categoryId',
  [CommissionScopeType.SERVICE]: 'serviceId',
  [CommissionScopeType.PROVIDER]: 'providerId',
  [CommissionScopeType.GEOGRAPHY]: 'townVillageId',
};

@Injectable()
export class RefundPolicyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly categoryService: CategoryService,
    private readonly serviceService: ServiceService,
    private readonly providerService: ProviderService,
    private readonly townVillageService: TownVillageService,
  ) {}

  async create(dto: CreateRefundPolicyDto): Promise<RefundPolicy> {
    await this.assertReferencedEntityExists(dto.scopeType, dto);
    await this.assertNoActivePolicyAtScope(dto.scopeType, dto.reason, dto);

    return this.prisma.refundPolicy.create({
      data: {
        scopeType: dto.scopeType,
        categoryId: dto.categoryId,
        serviceId: dto.serviceId,
        providerId: dto.providerId,
        townVillageId: dto.townVillageId,
        reason: dto.reason,
        refundPercentage: dto.refundPercentage,
      },
    });
  }

  list(
    scopeType?: CommissionScopeType,
    reason?: RefundReason,
  ): Promise<RefundPolicy[]> {
    return this.prisma.refundPolicy.findMany({
      where: { scopeType, reason },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string): Promise<RefundPolicy> {
    const policy = await this.prisma.refundPolicy.findUnique({ where: { id } });
    if (!policy) {
      throw new NotFoundException('Refund policy not found');
    }
    return policy;
  }

  async update(id: string, dto: UpdateRefundPolicyDto): Promise<RefundPolicy> {
    const policy = await this.findOne(id);

    if (dto.isActive === true && !policy.isActive) {
      await this.assertNoActivePolicyAtScope(
        policy.scopeType,
        policy.reason,
        policy,
        id,
      );
    }

    const data: Prisma.RefundPolicyUncheckedUpdateInput = {
      refundPercentage: dto.refundPercentage,
      isActive: dto.isActive,
    };
    return this.prisma.refundPolicy.update({ where: { id }, data });
  }

  private async assertReferencedEntityExists(
    scopeType: CommissionScopeType,
    dto: CreateRefundPolicyDto,
  ): Promise<void> {
    switch (scopeType) {
      case CommissionScopeType.CATEGORY:
        await this.categoryService.assertExistsOrThrow(dto.categoryId!);
        return;
      case CommissionScopeType.SERVICE:
        await this.serviceService.assertExistsOrThrow(dto.serviceId!);
        return;
      case CommissionScopeType.PROVIDER:
        await this.providerService.findById(dto.providerId!);
        return;
      case CommissionScopeType.GEOGRAPHY:
        await this.townVillageService.findByIdOrThrow(dto.townVillageId!);
        return;
      case CommissionScopeType.PLATFORM:
        return;
    }
  }

  private async assertNoActivePolicyAtScope(
    scopeType: CommissionScopeType,
    reason: RefundReason,
    scoped: Partial<Record<ScopedEntityField, string | null | undefined>>,
    excludeId?: string,
  ): Promise<void> {
    const entityField = SCOPE_ENTITY_FIELD[scopeType];
    const existing = await this.prisma.refundPolicy.findFirst({
      where: {
        scopeType,
        reason,
        isActive: true,
        id: excludeId ? { not: excludeId } : undefined,
        ...(entityField ? { [entityField]: scoped[entityField] } : {}),
      },
    });
    if (existing) {
      throw new ConflictException(
        `An active refund policy already exists for ${reason} at this ${scopeType.toLowerCase()} scope`,
      );
    }
  }
}
