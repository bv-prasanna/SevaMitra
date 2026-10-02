import { Injectable, NotFoundException } from '@nestjs/common';
import { AgentCompany } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAgentCompanyDto } from '../dto/create-agent-company.dto';
import { UpdateAgentCompanyDto } from '../dto/update-agent-company.dto';

@Injectable()
export class AgentCompanyService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateAgentCompanyDto): Promise<AgentCompany> {
    return this.prisma.agentCompany.create({
      data: { name: dto.name, registrationNumber: dto.registrationNumber },
    });
  }

  findAll(): Promise<AgentCompany[]> {
    return this.prisma.agentCompany.findMany({ orderBy: { name: 'asc' } });
  }

  async findOne(id: string): Promise<AgentCompany> {
    const company = await this.prisma.agentCompany.findUnique({
      where: { id },
    });
    if (!company) {
      throw new NotFoundException('Agent company not found');
    }
    return company;
  }

  async update(id: string, dto: UpdateAgentCompanyDto): Promise<AgentCompany> {
    await this.findOne(id);
    return this.prisma.agentCompany.update({
      where: { id },
      data: {
        name: dto.name,
        registrationNumber: dto.registrationNumber,
        isActive: dto.isActive,
      },
    });
  }

  /** Used by AgentService to validate agentCompanyId on create/update — must exist and be active. */
  async assertActiveOrThrow(id: string): Promise<void> {
    const company = await this.prisma.agentCompany.findUnique({
      where: { id },
    });
    if (!company || !company.isActive) {
      throw new NotFoundException('Agent company not found or inactive');
    }
  }
}
