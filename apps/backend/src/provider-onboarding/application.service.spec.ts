import { ConflictException, NotFoundException } from '@nestjs/common';
import { OnboardingChannel, OnboardingStatus } from '@prisma/client';
import { ApplicationService } from './application.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { ProviderService } from '../provider/provider.service';
import type { AgentService } from '../agent/agent.service';

describe('ApplicationService', () => {
  let prisma: {
    onboardingApplication: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      findMany: jest.Mock;
    };
    onboardingDocument: {
      create: jest.Mock;
      findMany: jest.Mock;
    };
  };
  let providerService: {
    getActiveProfileOrThrow: jest.Mock;
    markVerified: jest.Mock;
    markRejected: jest.Mock;
  };
  let agentService: { getActiveByCode: jest.Mock };
  let service: ApplicationService;

  const provider = { id: 'provider-1' };

  beforeEach(() => {
    prisma = {
      onboardingApplication: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
      onboardingDocument: { create: jest.fn(), findMany: jest.fn() },
    };
    providerService = {
      getActiveProfileOrThrow: jest.fn().mockResolvedValue(provider),
      markVerified: jest.fn(),
      markRejected: jest.fn(),
    };
    agentService = { getActiveByCode: jest.fn() };
    service = new ApplicationService(
      prisma as unknown as PrismaService,
      providerService as unknown as ProviderService,
      agentService as unknown as AgentService,
    );
  });

  describe('submit', () => {
    it('creates a SELF application when no referral code is given', async () => {
      prisma.onboardingApplication.findUnique.mockResolvedValue(null);
      prisma.onboardingApplication.create.mockResolvedValue({ id: 'app-1' });

      await service.submit('user-1', {});

      expect(agentService.getActiveByCode).not.toHaveBeenCalled();
      expect(prisma.onboardingApplication.create).toHaveBeenCalledWith({
        data: {
          providerId: 'provider-1',
          channel: OnboardingChannel.SELF,
          referredByAgentId: null,
        },
      });
    });

    it('resolves the referral code and creates an AGENT_REFERRED application', async () => {
      prisma.onboardingApplication.findUnique.mockResolvedValue(null);
      agentService.getActiveByCode.mockResolvedValue({ id: 'agent-1' });
      prisma.onboardingApplication.create.mockResolvedValue({ id: 'app-1' });

      await service.submit('user-1', { referredByAgentCode: 'A1B2C3D4' });

      expect(agentService.getActiveByCode).toHaveBeenCalledWith('A1B2C3D4');
      expect(prisma.onboardingApplication.create).toHaveBeenCalledWith({
        data: {
          providerId: 'provider-1',
          channel: OnboardingChannel.AGENT_REFERRED,
          referredByAgentId: 'agent-1',
        },
      });
    });

    it('blocks self-referral with the same authenticated user', async () => {
      agentService.getActiveByCode.mockResolvedValue({id:'agent-1',userId:'user-1'});
      await expect(service.submit('user-1',{referredByAgentCode:'OWNCODE'}))
        .rejects.toThrow(ConflictException);
      expect(prisma.onboardingApplication.create).not.toHaveBeenCalled();
    });

    it('rejects submission when a non-rejected application already exists', async () => {
      prisma.onboardingApplication.findUnique.mockResolvedValue({
        id: 'app-1',
        status: OnboardingStatus.SUBMITTED,
      });

      await expect(service.submit('user-1', {})).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.onboardingApplication.create).not.toHaveBeenCalled();
      expect(prisma.onboardingApplication.update).not.toHaveBeenCalled();
    });

    it('resets a REJECTED application in place instead of creating a new row', async () => {
      prisma.onboardingApplication.findUnique.mockResolvedValue({
        id: 'app-1',
        status: OnboardingStatus.REJECTED,
      });
      prisma.onboardingApplication.update.mockResolvedValue({ id: 'app-1' });

      await service.submit('user-1', {});

      expect(prisma.onboardingApplication.create).not.toHaveBeenCalled();
      expect(prisma.onboardingApplication.update).toHaveBeenCalledWith({
        where: { id: 'app-1' },
        data: expect.objectContaining({
          status: OnboardingStatus.SUBMITTED,
          reviewNote: null,
          reviewedBy: null,
          reviewedAt: null,
        }),
      });
    });
  });

  describe('findOwn', () => {
    it('throws NotFound when the provider has no application', async () => {
      prisma.onboardingApplication.findUnique.mockResolvedValue(null);

      await expect(service.findOwn('user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('claim', () => {
    it('rejects claiming a non-SUBMITTED application', async () => {
      prisma.onboardingApplication.findUnique.mockResolvedValue({
        id: 'app-1',
        status: OnboardingStatus.UNDER_REVIEW,
        documents: [],
      });

      await expect(service.claim('app-1', 'reviewer-1')).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.onboardingApplication.update).not.toHaveBeenCalled();
    });

    it('moves a SUBMITTED application to UNDER_REVIEW', async () => {
      prisma.onboardingApplication.findUnique.mockResolvedValue({
        id: 'app-1',
        status: OnboardingStatus.SUBMITTED,
        documents: [],
      });
      prisma.onboardingApplication.update.mockResolvedValue({});

      await service.claim('app-1', 'reviewer-1');

      expect(prisma.onboardingApplication.update).toHaveBeenCalledWith({
        where: { id: 'app-1' },
        data: {
          status: OnboardingStatus.UNDER_REVIEW,
          reviewedBy: 'reviewer-1',
        },
      });
    });
  });

  describe('review', () => {
    it('rejects reviewing an already-decided application', async () => {
      prisma.onboardingApplication.findUnique.mockResolvedValue({
        id: 'app-1',
        status: OnboardingStatus.APPROVED,
        documents: [],
      });

      await expect(
        service.review('app-1', 'reviewer-1', {
          decision: OnboardingStatus.APPROVED,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('marks the provider verified on approval', async () => {
      prisma.onboardingApplication.findUnique.mockResolvedValue({
        id: 'app-1',
        providerId: 'provider-1',
        status: OnboardingStatus.SUBMITTED,
        documents: [],
      });
      prisma.onboardingApplication.update.mockResolvedValue({});

      await service.review('app-1', 'reviewer-1', {
        decision: OnboardingStatus.APPROVED,
      });

      expect(providerService.markVerified).toHaveBeenCalledWith('provider-1');
      expect(providerService.markRejected).not.toHaveBeenCalled();
      expect(prisma.onboardingApplication.update).toHaveBeenCalledWith({
        where: { id: 'app-1' },
        data: expect.objectContaining({ status: OnboardingStatus.APPROVED }),
      });
    });

    it('marks the provider rejected on rejection', async () => {
      prisma.onboardingApplication.findUnique.mockResolvedValue({
        id: 'app-1',
        providerId: 'provider-1',
        status: OnboardingStatus.UNDER_REVIEW,
        documents: [],
      });
      prisma.onboardingApplication.update.mockResolvedValue({});

      await service.review('app-1', 'reviewer-1', {
        decision: OnboardingStatus.REJECTED,
        reviewNote: 'Blurry document',
      });

      expect(providerService.markRejected).toHaveBeenCalledWith('provider-1');
      expect(providerService.markVerified).not.toHaveBeenCalled();
    });
  });
});
