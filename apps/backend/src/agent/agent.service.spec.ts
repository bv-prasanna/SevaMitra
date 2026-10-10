import { ConflictException, NotFoundException } from '@nestjs/common';
import { AgentStatus, Prisma } from '@prisma/client';
import { AgentService } from './agent.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { AgentCompanyService } from './company/agent-company.service';

function uniqueViolation() {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: '7.10.0',
  });
}

describe('AgentService', () => {
  let prisma: {
    agentProfile: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };
  let agentCompanyService: { assertActiveOrThrow: jest.Mock };
  let service: AgentService;

  beforeEach(() => {
    prisma = {
      agentProfile: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };
    agentCompanyService = {
      assertActiveOrThrow: jest.fn().mockResolvedValue(undefined),
    };
    service = new AgentService(
      prisma as unknown as PrismaService,
      agentCompanyService as unknown as AgentCompanyService,
    );
  });

  describe('create', () => {
    it('rejects when a profile already exists for this user', async () => {
      prisma.agentProfile.findUnique.mockResolvedValue({ id: 'profile-1' });

      await expect(
        service.create('user-1', { fullName: 'Suresh Gowda' }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.agentProfile.create).not.toHaveBeenCalled();
    });

    it('validates agentCompanyId against AgentCompanyService when provided', async () => {
      prisma.agentProfile.findUnique.mockResolvedValue(null);
      prisma.agentProfile.create.mockResolvedValue({ id: 'profile-1' });

      await service.create('user-1', {
        fullName: 'Suresh Gowda',
        agentCompanyId: 'company-1',
      });

      expect(agentCompanyService.assertActiveOrThrow).toHaveBeenCalledWith(
        'company-1',
      );
    });

    it('skips company validation when agentCompanyId is omitted', async () => {
      prisma.agentProfile.findUnique.mockResolvedValue(null);
      prisma.agentProfile.create.mockResolvedValue({ id: 'profile-1' });

      await service.create('user-1', { fullName: 'Suresh Gowda' });

      expect(agentCompanyService.assertActiveOrThrow).not.toHaveBeenCalled();
    });

    it('generates an 8-char hex agentCode', async () => {
      prisma.agentProfile.findUnique.mockResolvedValue(null);
      prisma.agentProfile.create.mockResolvedValue({ id: 'profile-1' });

      await service.create('user-1', { fullName: 'Suresh Gowda' });

      const createCall = prisma.agentProfile.create.mock.calls[0][0];
      expect(createCall.data.agentCode).toMatch(/^[0-9A-F]{8}$/);
    });

    it('retries agentCode generation on a unique-constraint collision', async () => {
      prisma.agentProfile.findUnique.mockResolvedValue(null);
      prisma.agentProfile.create
        .mockRejectedValueOnce(uniqueViolation())
        .mockResolvedValueOnce({ id: 'profile-1' });

      await service.create('user-1', { fullName: 'Suresh Gowda' });

      expect(prisma.agentProfile.create).toHaveBeenCalledTimes(2);
    });

    it('does not swallow non-collision errors from create', async () => {
      prisma.agentProfile.findUnique.mockResolvedValue(null);
      const otherError = new Error('connection lost');
      prisma.agentProfile.create.mockRejectedValue(otherError);

      await expect(
        service.create('user-1', { fullName: 'Suresh Gowda' }),
      ).rejects.toThrow(otherError);
      expect(prisma.agentProfile.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('update', () => {
    it('throws NotFound when no profile exists', async () => {
      prisma.agentProfile.findUnique.mockResolvedValue(null);

      await expect(
        service.update('user-1', { fullName: 'New name' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('validates a new agentCompanyId before updating', async () => {
      prisma.agentProfile.findUnique.mockResolvedValue({
        id: 'profile-1',
        status: AgentStatus.PENDING,
      });
      prisma.agentProfile.update.mockResolvedValue({});

      await service.update('user-1', { agentCompanyId: 'company-2' });

      expect(agentCompanyService.assertActiveOrThrow).toHaveBeenCalledWith(
        'company-2',
      );
    });

    it('passes null agentCompanyId straight through to clear the company', async () => {
      prisma.agentProfile.findUnique.mockResolvedValue({
        id: 'profile-1',
        status: AgentStatus.PENDING,
      });
      prisma.agentProfile.update.mockResolvedValue({});

      await service.update('user-1', { agentCompanyId: null });

      expect(agentCompanyService.assertActiveOrThrow).not.toHaveBeenCalled();
      expect(prisma.agentProfile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ agentCompanyId: null }),
        }),
      );
    });
  });

  describe('softDelete', () => {
    it('anonymizes the profile and clears the company affiliation', async () => {
      prisma.agentProfile.findUnique.mockResolvedValue({
        id: 'profile-1',
        status: AgentStatus.ACTIVE,
      });
      prisma.agentProfile.update.mockResolvedValue({});

      await service.softDelete('user-1');

      expect(prisma.agentProfile.update).toHaveBeenCalledWith({
        where: { id: 'profile-1' },
        data: expect.objectContaining({
          status: AgentStatus.DELETED,
          fullName: 'Deleted Agent',
          agentCompanyId: null,
          notificationOptIn: false,
        }),
      });
    });
  });

  describe('getActiveByCode', () => {
    it('throws NotFound when no agent has that code', async () => {
      prisma.agentProfile.findUnique.mockResolvedValue(null);

      await expect(service.getActiveByCode('MISSING1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFound for a soft-deleted agent', async () => {
      prisma.agentProfile.findUnique.mockResolvedValue({
        id: 'agent-1',
        status: AgentStatus.DELETED,
      });

      await expect(service.getActiveByCode('A1B2C3D4')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns a PENDING agent (not just ACTIVE — only DELETED is excluded)', async () => {
      const agent = { id: 'agent-1', status: AgentStatus.PENDING };
      prisma.agentProfile.findUnique.mockResolvedValue(agent);

      await expect(service.getActiveByCode('A1B2C3D4')).resolves.toBe(agent);
    });
  });
});
