import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CommissionRule,
  CommissionScopeType,
  CommissionType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CategoryService } from '../../catalogue/category/category.service';
import { ServiceService } from '../../catalogue/service/service.service';
import { ProviderService } from '../../provider/provider.service';
import { TownVillageService } from '../../geography/town-village/town-village.service';
import { CreateCommissionRuleDto } from './dto/create-commission-rule.dto';
import { UpdateCommissionRuleDto } from './dto/update-commission-rule.dto';

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
export class CommissionRuleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly categoryService: CategoryService,
    private readonly serviceService: ServiceService,
    private readonly providerService: ProviderService,
    private readonly townVillageService: TownVillageService,
  ) {}

  async create(dto: CreateCommissionRuleDto): Promise<CommissionRule> {
    await this.assertReferencedEntityExists(dto.scopeType, dto);
    await this.assertNoActiveRuleAtScope(dto.scopeType, dto);

    return this.prisma.commissionRule.create({
      data: {
        scopeType: dto.scopeType,
        categoryId: dto.categoryId,
        serviceId: dto.serviceId,
        providerId: dto.providerId,
        townVillageId: dto.townVillageId,
        commissionType: dto.commissionType,
        percentage: dto.percentage,
        fixedAmount: dto.fixedAmount,
      },
    });
  }

  list(scopeType?: CommissionScopeType): Promise<CommissionRule[]> {
    return this.prisma.commissionRule.findMany({
      where: { scopeType },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string): Promise<CommissionRule> {
    const rule = await this.prisma.commissionRule.findUnique({ where: { id } });
    if (!rule) {
      throw new NotFoundException('Commission rule not found');
    }
    return rule;
  }

  async update(
    id: string,
    dto: UpdateCommissionRuleDto,
  ): Promise<CommissionRule> {
    const rule = await this.findOne(id);

    if (
      dto.percentage !== undefined &&
      rule.commissionType !== CommissionType.PERCENTAGE
    ) {
      throw new ConflictException('This rule is not a PERCENTAGE rule');
    }
    if (
      dto.fixedAmount !== undefined &&
      rule.commissionType !== CommissionType.FIXED_AMOUNT
    ) {
      throw new ConflictException('This rule is not a FIXED_AMOUNT rule');
    }

    if (dto.isActive === true && !rule.isActive) {
      await this.assertNoActiveRuleAtScope(rule.scopeType, rule, id);
    }

    const data: Prisma.CommissionRuleUncheckedUpdateInput = {
      percentage: dto.percentage,
      fixedAmount: dto.fixedAmount,
      isActive: dto.isActive,
    };
    return this.prisma.commissionRule.update({ where: { id }, data });
  }

  private async assertReferencedEntityExists(
    scopeType: CommissionScopeType,
    dto: CreateCommissionRuleDto,
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

  private async assertNoActiveRuleAtScope(
    scopeType: CommissionScopeType,
    scoped: Partial<Record<ScopedEntityField, string | null | undefined>>,
    excludeId?: string,
  ): Promise<void> {
    const entityField = SCOPE_ENTITY_FIELD[scopeType];
    const existing = await this.prisma.commissionRule.findFirst({
      where: {
        scopeType,
        isActive: true,
        id: excludeId ? { not: excludeId } : undefined,
        ...(entityField ? { [entityField]: scoped[entityField] } : {}),
      },
    });
    if (existing) {
      throw new ConflictException(
        `An active commission rule already exists for this ${scopeType.toLowerCase()} scope`,
      );
    }
  }
}
