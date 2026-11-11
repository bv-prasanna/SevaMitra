import { NotFoundException } from '@nestjs/common';
import { AgentCompanyService } from './agent-company.service';
import type { PrismaService } from '../../prisma/prisma.service';

describe('AgentCompanyService', () => {
  let prisma: {
    agentCompany: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };
  let service: AgentCompanyService;

  beforeEach(() => {
    prisma = {
      agentCompany: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    service = new AgentCompanyService(prisma as unknown as PrismaService);
  });

  describe('findOne', () => {
    it('throws NotFound for a missing company', async () => {
      prisma.agentCompany.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns an existing company', async () => {
      const company = { id: 'company-1' };
      prisma.agentCompany.findUnique.mockResolvedValue(company);

      await expect(service.findOne('company-1')).resolves.toBe(company);
    });
  });

  describe('assertActiveOrThrow', () => {
    it('throws NotFound for a missing company', async () => {
      prisma.agentCompany.findUnique.mockResolvedValue(null);

      await expect(service.assertActiveOrThrow('missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFound for an inactive company', async () => {
      prisma.agentCompany.findUnique.mockResolvedValue({
        id: 'company-1',
        isActive: false,
      });

      await expect(service.assertActiveOrThrow('company-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('resolves for an active company', async () => {
      prisma.agentCompany.findUnique.mockResolvedValue({
        id: 'company-1',
        isActive: true,
      });

      await expect(
        service.assertActiveOrThrow('company-1'),
      ).resolves.toBeUndefined();
    });
  });

  describe('update', () => {
    it('throws NotFound before attempting the update when missing', async () => {
      prisma.agentCompany.findUnique.mockResolvedValue(null);

      await expect(
        service.update('missing', { name: 'New name' }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.agentCompany.update).not.toHaveBeenCalled();
    });
  });
});
