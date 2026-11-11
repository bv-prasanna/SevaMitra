import { ConflictException, NotFoundException } from '@nestjs/common';
import { OnboardingChannel, OnboardingStatus, ProviderStatus, VerificationStatus } from '@prisma/client';
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
      updateMany: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      findMany: jest.Mock;
    };
    providerProfile: { updateMany: jest.Mock };
    $transaction: jest.Mock;
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
        updateMany: jest.fn().mockResolvedValue({count:1}),
        findUniqueOrThrow: jest.fn().mockResolvedValue({id:'app-1',status:OnboardingStatus.APPROVED}),
        findMany: jest.fn(),
      },
      providerProfile: {updateMany: jest.fn().mockResolvedValue({count:1})},
      $transaction: jest.fn(),
      onboardingDocument: { create: jest.fn(), findMany: jest.fn() },
    };
    prisma.$transaction.mockImplementation(async (run:(tx:unknown)=>Promise<unknown>)=>run(prisma));
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
      expect(prisma.onboardingApplication.updateMany).not.toHaveBeenCalled();
    });

    it('moves a SUBMITTED application to UNDER_REVIEW', async () => {
      prisma.onboardingApplication.findUnique.mockResolvedValue({
        id: 'app-1',
        status: OnboardingStatus.SUBMITTED,
        documents: [],
      });
      await service.claim('app-1', 'reviewer-1');

      expect(prisma.onboardingApplication.updateMany).toHaveBeenCalledWith({
        where: { id: 'app-1', status: OnboardingStatus.SUBMITTED },
        data: {
          status: OnboardingStatus.UNDER_REVIEW,
          reviewedBy: 'reviewer-1',
        },
      });
    });

    it('losing a simultaneous claim fails closed',async()=>{
      prisma.onboardingApplication.findUnique.mockResolvedValue({
        id:'app-1',status:OnboardingStatus.SUBMITTED,documents:[],
      });
      prisma.onboardingApplication.updateMany.mockResolvedValue({count:0});
      await expect(service.claim('app-1','reviewer-2')).rejects.toThrow(ConflictException);
      expect(prisma.onboardingApplication.findUniqueOrThrow).not.toHaveBeenCalled();
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
      await service.review('app-1', 'reviewer-1', {
        decision: OnboardingStatus.APPROVED,
      });

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.onboardingApplication.updateMany).toHaveBeenCalledWith({
        where: { id: 'app-1', status: OnboardingStatus.SUBMITTED },
        data: expect.objectContaining({ status: OnboardingStatus.APPROVED }),
      });
      expect(prisma.providerProfile.updateMany).toHaveBeenCalledWith({
        where: {id:'provider-1',status:{not:ProviderStatus.DELETED}},
        data:{status:ProviderStatus.ACTIVE,verificationStatus:VerificationStatus.VERIFIED},
      });
    });

    it('marks the provider rejected on rejection', async () => {
      prisma.onboardingApplication.findUnique.mockResolvedValue({
        id: 'app-1',
        providerId: 'provider-1',
        status: OnboardingStatus.UNDER_REVIEW,
        documents: [],
      });
      await service.review('app-1', 'reviewer-1', {
        decision: OnboardingStatus.REJECTED,
        reviewNote: 'Blurry document',
      });

      expect(prisma.providerProfile.updateMany).toHaveBeenCalledWith({
        where:{id:'provider-1',status:{not:ProviderStatus.DELETED}},
        data:{verificationStatus:VerificationStatus.REJECTED},
      });
    });
    it('rejects a decision when another reviewer owns an under-review case',async()=>{
      prisma.onboardingApplication.findUnique.mockResolvedValue({
        id:'app-1',providerId:'provider-1',status:OnboardingStatus.UNDER_REVIEW,reviewedBy:'reviewer-other',documents:[],
      });
      await expect(service.review('app-1','reviewer-1',{decision:OnboardingStatus.APPROVED})).rejects.toThrow(ConflictException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('does not update provider profile when concurrent decision wins',async()=>{
      prisma.onboardingApplication.findUnique.mockResolvedValue({
        id:'app-1',providerId:'provider-1',status:OnboardingStatus.SUBMITTED,documents:[],
      });
      prisma.onboardingApplication.updateMany.mockResolvedValue({count:0});
      await expect(service.review('app-1','reviewer-1',{decision:OnboardingStatus.APPROVED})).rejects.toThrow(ConflictException);
      expect(prisma.providerProfile.updateMany).not.toHaveBeenCalled();
    });

    it('rejects removed providers instead of approving orphaned applications',async()=>{
      prisma.onboardingApplication.findUnique.mockResolvedValue({
        id:'app-1',providerId:'provider-1',status:OnboardingStatus.SUBMITTED,documents:[],
      });
      prisma.providerProfile.updateMany.mockResolvedValue({count:0});
      await expect(service.review('app-1','reviewer-1',{decision:OnboardingStatus.APPROVED})).rejects.toThrow(ConflictException);
    });
  });
});
