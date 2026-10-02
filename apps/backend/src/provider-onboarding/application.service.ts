import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  OnboardingApplication,
  OnboardingChannel,
  OnboardingDocument,
  OnboardingStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProviderService } from '../provider/provider.service';
import { AgentService } from '../agent/agent.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { CreateDocumentDto } from './dto/create-document.dto';
import { ReviewApplicationDto } from './dto/review-application.dto';

const RESUBMITTABLE_STATUSES: OnboardingStatus[] = [OnboardingStatus.REJECTED];
const DECIDABLE_STATUSES: OnboardingStatus[] = [
  OnboardingStatus.SUBMITTED,
  OnboardingStatus.UNDER_REVIEW,
];

type ApplicationWithDocuments = OnboardingApplication & {
  documents: OnboardingDocument[];
};

@Injectable()
export class ApplicationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly providerService: ProviderService,
    private readonly agentService: AgentService,
  ) {}

  /** Submits a new application, or resubmits (resets in place) a previously REJECTED one. */
  async submit(
    userId: string,
    dto: CreateApplicationDto,
  ): Promise<OnboardingApplication> {
    const provider = await this.providerService.getActiveProfileOrThrow(userId);

    let referredByAgentId: string | null = null;
    if (dto.referredByAgentCode) {
      const agent = await this.agentService.getActiveByCode(
        dto.referredByAgentCode,
      );
      referredByAgentId = agent.id;
    }
    const channel = referredByAgentId
      ? OnboardingChannel.AGENT_REFERRED
      : OnboardingChannel.SELF;

    const existing = await this.prisma.onboardingApplication.findUnique({
      where: { providerId: provider.id },
    });

    if (existing) {
      if (!RESUBMITTABLE_STATUSES.includes(existing.status)) {
        throw new ConflictException(
          'An onboarding application already exists for this provider',
        );
      }
      return this.prisma.onboardingApplication.update({
        where: { id: existing.id },
        data: {
          channel,
          referredByAgentId,
          status: OnboardingStatus.SUBMITTED,
          reviewNote: null,
          reviewedBy: null,
          reviewedAt: null,
          submittedAt: new Date(),
        },
      });
    }

    return this.prisma.onboardingApplication.create({
      data: { providerId: provider.id, channel, referredByAgentId },
    });
  }

  async findOwn(userId: string): Promise<ApplicationWithDocuments> {
    const provider = await this.providerService.getActiveProfileOrThrow(userId);
    const application = await this.prisma.onboardingApplication.findUnique({
      where: { providerId: provider.id },
      include: { documents: true },
    });
    if (!application) {
      throw new NotFoundException(
        'No onboarding application found — submit one first (POST /provider-onboarding/applications/me)',
      );
    }
    return application;
  }

  async addOwnDocument(
    userId: string,
    dto: CreateDocumentDto,
  ): Promise<OnboardingDocument> {
    const application = await this.findOwn(userId);
    return this.prisma.onboardingDocument.create({
      data: {
        applicationId: application.id,
        type: dto.type,
        fileUrl: dto.fileUrl,
        label: dto.label,
      },
    });
  }

  async listOwnDocuments(userId: string): Promise<OnboardingDocument[]> {
    const application = await this.findOwn(userId);
    return this.prisma.onboardingDocument.findMany({
      where: { applicationId: application.id },
      orderBy: { createdAt: 'asc' },
    });
  }

  findAll(status?: OnboardingStatus): Promise<OnboardingApplication[]> {
    return this.prisma.onboardingApplication.findMany({
      where: status ? { status } : undefined,
      orderBy: { submittedAt: 'asc' },
    });
  }

  async findByIdOrThrow(id: string): Promise<ApplicationWithDocuments> {
    const application = await this.prisma.onboardingApplication.findUnique({
      where: { id },
      include: { documents: true },
    });
    if (!application) {
      throw new NotFoundException('Application not found');
    }
    return application;
  }

  async claim(id: string, reviewerId: string): Promise<OnboardingApplication> {
    const application = await this.findByIdOrThrow(id);
    if (application.status !== OnboardingStatus.SUBMITTED) {
      throw new ConflictException(
        'Only a SUBMITTED application can be claimed',
      );
    }

    return this.prisma.onboardingApplication.update({
      where: { id },
      data: { status: OnboardingStatus.UNDER_REVIEW, reviewedBy: reviewerId },
    });
  }

  async review(
    id: string,
    reviewerId: string,
    dto: ReviewApplicationDto,
  ): Promise<OnboardingApplication> {
    const application = await this.findByIdOrThrow(id);
    if (!DECIDABLE_STATUSES.includes(application.status)) {
      throw new ConflictException('This application has already been decided');
    }

    const updated = await this.prisma.onboardingApplication.update({
      where: { id },
      data: {
        status: dto.decision,
        reviewNote: dto.reviewNote,
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
      },
    });

    if (dto.decision === OnboardingStatus.APPROVED) {
      await this.providerService.markVerified(application.providerId);
    } else {
      await this.providerService.markRejected(application.providerId);
    }

    return updated;
  }
}
