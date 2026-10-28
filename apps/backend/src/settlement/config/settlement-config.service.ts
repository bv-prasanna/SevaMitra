import {
  ConflictException,
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CommissionScopeType, Prisma, SettlementConfig } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CategoryService } from '../../catalogue/category/category.service';
import { ServiceService } from '../../catalogue/service/service.service';
import { ProviderService } from '../../provider/provider.service';
import { TownVillageService } from '../../geography/town-village/town-village.service';
import { CreateSettlementConfigDto } from './dto/create-settlement-config.dto';
import { UpdateSettlementConfigDto } from './dto/update-settlement-config.dto';

type ScopedEntityField =
  'categoryId' | 'serviceId' | 'providerId' | 'townVillageId' | 'stateId' | 'providerCompanyId' | 'providerGroupId';

const SCOPE_ENTITY_FIELD: Record<
  CommissionScopeType,
  ScopedEntityField | null
> = {
  [CommissionScopeType.PLATFORM]: null,
  [CommissionScopeType.CATEGORY]: 'categoryId',
  [CommissionScopeType.SERVICE]: 'serviceId',
  [CommissionScopeType.PROVIDER]: 'providerId',
  [CommissionScopeType.GEOGRAPHY]: 'townVillageId',
  [CommissionScopeType.STATE]: 'stateId',
  [CommissionScopeType.PROVIDER_COMPANY]: 'providerCompanyId',
  [CommissionScopeType.PROVIDER_GROUP]: 'providerGroupId',
};

@Injectable()
export class SettlementConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly categoryService: CategoryService,
    private readonly serviceService: ServiceService,
    private readonly providerService: ProviderService,
    private readonly townVillageService: TownVillageService,
  ) {}

  async create(dto: CreateSettlementConfigDto): Promise<SettlementConfig> {
    const effectiveFrom = dto.effectiveFrom ? new Date(dto.effectiveFrom) : new Date();
    const effectiveTo = dto.effectiveTo ? new Date(dto.effectiveTo) : null;
    if(effectiveTo && effectiveTo <= effectiveFrom){
      throw new BadRequestException('effectiveTo must follow effectiveFrom');
    }
    await this.assertReferencedEntityExists(dto.scopeType, dto);
    await this.assertNoActiveConfigAtScope(dto.scopeType, dto);

    return this.prisma.settlementConfig.create({
      data: {
        scopeType: dto.scopeType,
        categoryId: dto.categoryId,
        serviceId: dto.serviceId,
        providerId: dto.providerId,
        townVillageId: dto.townVillageId,
        stateId: dto.stateId,
        providerCompanyId: dto.providerCompanyId,
        providerGroupId: dto.providerGroupId,
        effectiveFrom,
        effectiveTo,
        cycleDays: dto.cycleDays,
      },
    });
  }

  list(scopeType?: CommissionScopeType): Promise<SettlementConfig[]> {
    return this.prisma.settlementConfig.findMany({
      where: { scopeType },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string): Promise<SettlementConfig> {
    const config = await this.prisma.settlementConfig.findUnique({
      where: { id },
    });
    if (!config) {
      throw new NotFoundException('Settlement config not found');
    }
    return config;
  }

  async update(
    id: string,
    dto: UpdateSettlementConfigDto,
  ): Promise<SettlementConfig> {
    const config = await this.findOne(id);

    if (dto.isActive === true && !config.isActive) {
      await this.assertNoActiveConfigAtScope(config.scopeType, config, id);
    }

    const data: Prisma.SettlementConfigUncheckedUpdateInput = {
      cycleDays: dto.cycleDays,
      isActive: dto.isActive,
    };
    return this.prisma.settlementConfig.update({ where: { id }, data });
  }

  private async assertReferencedEntityExists(
    scopeType: CommissionScopeType,
    dto: CreateSettlementConfigDto,
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
      case CommissionScopeType.STATE: {
        const state=await this.prisma.state.findUnique({where:{id:dto.stateId!}});
        if(!state)throw new BadRequestException('State scope is not recognized');
        return;
      }
      case CommissionScopeType.PROVIDER_COMPANY: {
        const company=await this.prisma.providerCompany.findUnique({where:{id:dto.providerCompanyId!}});
        if(!company)throw new BadRequestException('Company scope is not recognized');
        return;
      }
      case CommissionScopeType.PROVIDER_GROUP: {
        const group=await this.prisma.providerGroup.findUnique({where:{id:dto.providerGroupId!}});
        if(!group)throw new BadRequestException('Group scope is not recognized');
        return;
      }
      case CommissionScopeType.PLATFORM:
        return;
    }
  }

  private async assertNoActiveConfigAtScope(
    scopeType: CommissionScopeType,
    scoped: Partial<Record<ScopedEntityField, string | null | undefined>>,
    excludeId?: string,
  ): Promise<void> {
    const entityField = SCOPE_ENTITY_FIELD[scopeType];
    const existing = await this.prisma.settlementConfig.findFirst({
      where: {
        scopeType,
        isActive: true,
        id: excludeId ? { not: excludeId } : undefined,
        ...(entityField ? { [entityField]: scoped[entityField] } : {}),
      },
    });
    if (existing) {
      throw new ConflictException(
        `An active settlement config already exists for this ${scopeType.toLowerCase()} scope`,
      );
    }
  }
}
