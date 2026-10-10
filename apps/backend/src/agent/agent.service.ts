import { randomBytes } from 'crypto';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AgentProfile, AgentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AgentCompanyService } from './company/agent-company.service';
import { CreateAgentProfileDto } from './dto/create-agent-profile.dto';
import { UpdateAgentProfileDto } from './dto/update-agent-profile.dto';

const ANONYMIZED_NAME = 'Deleted Agent';
const AGENT_CODE_ATTEMPTS = 5;

@Injectable()
export class AgentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly agentCompanyService: AgentCompanyService,
  ) {}

  async create(
    userId: string,
    dto: CreateAgentProfileDto,
  ): Promise<AgentProfile> {
    const existing = await this.prisma.agentProfile.findUnique({
      where: { userId },
    });
    if (existing) {
      throw new ConflictException('Agent profile already exists');
    }
    if (dto.agentCompanyId) {
      await this.agentCompanyService.assertActiveOrThrow(dto.agentCompanyId);
    }

    return this.createWithGeneratedCode({
      userId,
      agentCompanyId: dto.agentCompanyId,
      fullName: dto.fullName,
      geographyNote: dto.geographyNote,
      preferredLanguage: dto.preferredLanguage,
      notificationOptIn: dto.notificationOptIn,
    });
  }

  async findByUserId(userId: string): Promise<AgentProfile> {
    return this.getActiveProfileOrThrow(userId);
  }

  async update(
    userId: string,
    dto: UpdateAgentProfileDto,
  ): Promise<AgentProfile> {
    const profile = await this.getActiveProfileOrThrow(userId);
    if (dto.agentCompanyId) {
      await this.agentCompanyService.assertActiveOrThrow(dto.agentCompanyId);
    }

    return this.prisma.agentProfile.update({
      where: { id: profile.id },
      data: {
        fullName: dto.fullName,
        agentCompanyId: dto.agentCompanyId,
        geographyNote: dto.geographyNote,
        preferredLanguage: dto.preferredLanguage,
        notificationOptIn: dto.notificationOptIn,
      },
    });
  }

  /** BRD §14.4: account deletion anonymizes PII rather than deleting the row. */
  async softDelete(userId: string): Promise<void> {
    const profile = await this.getActiveProfileOrThrow(userId);

    await this.prisma.agentProfile.update({
      where: { id: profile.id },
      data: {
        status: AgentStatus.DELETED,
        deletedAt: new Date(),
        fullName: ANONYMIZED_NAME,
        agentCompanyId: null,
        geographyNote: null,
        preferredLanguage: 'kn',
        notificationOptIn: false,
      },
    });
  }

  /** Internal — for future modules (Onboarding) to resolve the owning profile. Treats a soft-deleted profile as not found. */
  async getActiveProfileOrThrow(userId: string): Promise<AgentProfile> {
    const profile = await this.prisma.agentProfile.findUnique({
      where: { userId },
    });
    if (!profile || profile.status === AgentStatus.DELETED) {
      throw new NotFoundException(
        'Agent profile not found — create one first (POST /agents/me)',
      );
    }
    return profile;
  }

  /**
   * Resolves a provider-supplied referral code to the referring agent —
   * used by Provider Onboarding to attribute a submission (see
   * docs/modules/AGENT_IMPLEMENTATION.md §7). Deliberately does not
   * require status=ACTIVE: nothing transitions an agent off PENDING yet
   * (§8), so requiring ACTIVE here would make referral codes unusable by
   * every agent that exists today. Revisit once agent verification exists.
   */
  async getActiveByCode(agentCode: string): Promise<AgentProfile> {
    const agent = await this.prisma.agentProfile.findUnique({
      where: { agentCode },
    });
    if (!agent || agent.status === AgentStatus.DELETED) {
      throw new NotFoundException('Agent code not recognized');
    }
    return agent;
  }

  /**
   * agentCode is an 8-char hex handle, generated server-side (never
   * client-supplied — see AGENT_IMPLEMENTATION.md §5). Collisions are
   * astronomically unlikely (32 bits of entropy) but the unique
   * constraint is real, so a bounded retry loop handles the case rather
   * than assuming it can never happen.
   */
  private async createWithGeneratedCode(
    data: Omit<Prisma.AgentProfileUncheckedCreateInput, 'agentCode'>,
  ): Promise<AgentProfile> {
    for (let attempt = 0; attempt < AGENT_CODE_ATTEMPTS; attempt++) {
      try {
        return await this.prisma.agentProfile.create({
          data: { ...data, agentCode: this.generateAgentCode() },
        });
      } catch (err) {
        const isUniqueViolation =
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002';
        if (!isUniqueViolation || attempt === AGENT_CODE_ATTEMPTS - 1) {
          throw err;
        }
      }
    }
    /* istanbul ignore next — unreachable, loop always returns or throws */
    throw new Error('Failed to generate a unique agent code');
  }

  private generateAgentCode(): string {
    return randomBytes(4).toString('hex').toUpperCase();
  }
}
