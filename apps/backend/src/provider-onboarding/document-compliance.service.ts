import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  NotificationChannel,
  NotificationStatus,
  OnboardingDocumentReviewStatus,
  OnboardingDocumentType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ReviewDocumentDto } from './dto/review-document.dto';

const DAY_MS = 86_400_000;
const UNRESOLVED_DOCUMENT_STATES = [
  OnboardingDocumentReviewStatus.REJECTED,
  OnboardingDocumentReviewStatus.EXPIRED,
] as const;

@Injectable()
export class DocumentComplianceService {
  constructor(private readonly prisma: PrismaService) {}

  async review(
    applicationId: string,
    documentId: string,
    reviewerId: string,
    dto: ReviewDocumentDto,
  ) {
    const document = await this.prisma.onboardingDocument.findFirst({
      where: { id: documentId, applicationId },
      include: {
        application: {
          select: { providerId: true, provider: { select: { userId: true } } },
        },
      },
    });
    if (!document) throw new NotFoundException('Provider document not found');

    const now = new Date();
    if (document.reviewStatus === OnboardingDocumentReviewStatus.SUPERSEDED) {
      throw new ConflictException('This document has been superseded by a renewal');
    }
    if (
      dto.decision === OnboardingDocumentReviewStatus.APPROVED &&
      (document.reviewStatus === OnboardingDocumentReviewStatus.EXPIRED ||
        (document.expiresAt && document.expiresAt.getTime() <= now.getTime()))
    ) {
      throw new ConflictException('Expired evidence cannot be approved; ask the provider to upload a renewal');
    }
    if (
      dto.decision === OnboardingDocumentReviewStatus.APPROVED &&
      document.reviewStatus === OnboardingDocumentReviewStatus.APPROVED
    ) {
      throw new ConflictException('This document is already approved');
    }
    if (document.reviewStatus === OnboardingDocumentReviewStatus.REJECTED) {
      throw new ConflictException('Upload corrected evidence as a new renewal instead of re-reviewing rejected evidence');
    }
    if (
      dto.decision === OnboardingDocumentReviewStatus.REJECTED &&
      document.reviewStatus === OnboardingDocumentReviewStatus.EXPIRED
    ) {
      throw new ConflictException('Expired evidence is already inactive; review the submitted renewal instead');
    }

    return this.prisma.$transaction(async (tx) => {
      const changed = await tx.onboardingDocument.updateMany({
        where: {
          id: documentId,
          applicationId,
          reviewStatus: document.reviewStatus,
        },
        data: {
          reviewStatus: dto.decision,
          reviewedAt: now,
          reviewedById: reviewerId,
          reviewNote: dto.reviewNote?.trim() || null,
        },
      });
      if (changed.count !== 1) {
        throw new ConflictException('Document review changed concurrently. Refresh the application.');
      }

      if (dto.decision === OnboardingDocumentReviewStatus.REJECTED) {
        const hasValidEquivalent = await this.hasValidEquivalent(
          tx,
          applicationId,
          document.id,
          document.type,
          document.categoryId,
          now,
        );
        if (!hasValidEquivalent) {
          await this.suspendForDocument(
            tx,
            document.application.providerId,
            document.categoryId,
            now,
            `Compliance document ${document.type} was rejected`,
          );
        }
      } else if (document.renewalOfId) {
        const superseded = await tx.onboardingDocument.updateMany({
          where: {
            id: document.renewalOfId,
            applicationId,
            reviewStatus: { not: OnboardingDocumentReviewStatus.SUPERSEDED },
          },
          data: { reviewStatus: OnboardingDocumentReviewStatus.SUPERSEDED },
        });
        if (superseded.count !== 1) {
          throw new ConflictException('Original document could not be superseded; refresh the renewal record');
        }
        await this.restoreEligibleOfferings(
          tx,
          applicationId,
          document.application.providerId,
          document.categoryId,
        );
      } else {
        await this.restoreEligibleOfferings(
          tx,
          applicationId,
          document.application.providerId,
          document.categoryId,
        );
      }

      const userId = document.application.provider.userId;
      await this.enqueue(
        tx,
        userId,
        `provider-document-review:${document.id}:${dto.decision}`,
        dto.decision === OnboardingDocumentReviewStatus.APPROVED
          ? 'Compliance document approved'
          : 'Compliance document needs attention',
        dto.decision === OnboardingDocumentReviewStatus.APPROVED
          ? `Your ${document.type.replaceAll('_', ' ').toLowerCase()} document was approved.`
          : `Your ${document.type.replaceAll('_', ' ').toLowerCase()} document was rejected. Review the note and upload corrected evidence.`,
        now,
      );
      return tx.onboardingDocument.findUniqueOrThrow({ where: { id: documentId } });
    });
  }

  /**
   * Expires approved documents, suspends only the affected category, and
   * queues unique reminders. It is safe for the five-minute cron to repeat.
   */
  async processDue(now = new Date()): Promise<{
    examined: number;
    expired: number;
    suspendedOfferings: number;
    remindersQueued: number;
    skipped: number;
  }> {
    const due = await this.prisma.onboardingDocument.findMany({
      where: {
        reviewStatus: OnboardingDocumentReviewStatus.APPROVED,
        expiresAt: { lte: now },
      },
      include: {
        application: {
          select: { providerId: true, provider: { select: { userId: true } } },
        },
      },
      orderBy: { expiresAt: 'asc' },
      take: 200,
    });
    let expired = 0;
    let suspendedOfferings = 0;
    let skipped = 0;

    for (const document of due) {
      const result = await this.prisma.$transaction(async (tx) => {
        const changed = await tx.onboardingDocument.updateMany({
          where: {
            id: document.id,
            reviewStatus: OnboardingDocumentReviewStatus.APPROVED,
            expiresAt: { lte: now },
          },
          data: {
            reviewStatus: OnboardingDocumentReviewStatus.EXPIRED,
            expiredAt: now,
          },
        });
        if (changed.count !== 1) return null;
        const hasValidEquivalent = await this.hasValidEquivalent(
          tx,
          document.applicationId,
          document.id,
          document.type,
          document.categoryId,
          now,
        );
        const suspended = hasValidEquivalent ? 0 : await this.suspendForDocument(
          tx,
          document.application.providerId,
          document.categoryId,
          now,
          `Compliance document ${document.type} expired`,
        );
        await this.enqueue(
          tx,
          document.application.provider.userId,
          `provider-document-expired:${document.id}`,
          'Provider document expired',
          `Your ${document.type.replaceAll('_', ' ').toLowerCase()} document has expired. Upload a renewal to restore affected services after review.`,
          now,
        );
        return suspended;
      });
      if (result === null) skipped++;
      else {
        expired++;
        suspendedOfferings += result;
      }
    }

    const expiring = await this.prisma.onboardingDocument.findMany({
      where: {
        reviewStatus: OnboardingDocumentReviewStatus.APPROVED,
        expiresAt: { gt: now, lte: new Date(now.getTime() + 30 * DAY_MS) },
      },
      include: {
        application: { select: { provider: { select: { userId: true } } } },
      },
      orderBy: { expiresAt: 'asc' },
    });
    const reminders = expiring.map((document) => {
      const expiresAt = document.expiresAt as Date;
      const remaining = expiresAt.getTime() - now.getTime();
      const stage = remaining <= DAY_MS ? '1d' : remaining <= 7 * DAY_MS ? '7d' : '30d';
      const days = Math.max(1, Math.ceil(remaining / DAY_MS));
      return {
        userId: document.application.provider.userId,
        channel: NotificationChannel.IN_APP,
        title: 'Provider document expiry reminder',
        body: `Your ${document.type.replaceAll('_', ' ').toLowerCase()} document expires in about ${days} day(s). Upload a renewal before expiry to avoid a service-category hold.`,
        status: NotificationStatus.PENDING,
        nextAttemptAt: now,
        deliveryKey: `provider-document-expiry:${document.id}:${stage}`,
      };
    });
    const reminderResult = reminders.length
      ? await this.prisma.notification.createMany({ data: reminders, skipDuplicates: true })
      : { count: 0 };

    return {
      examined: due.length,
      expired,
      suspendedOfferings,
      remindersQueued: reminderResult.count,
      skipped,
    };
  }

  private hasValidEquivalent(
    tx: Prisma.TransactionClient,
    applicationId: string,
    excludeDocumentId: string,
    type: OnboardingDocumentType,
    categoryId: string | null,
    now: Date,
  ) {
    return tx.onboardingDocument.findFirst({
      where: {
        applicationId,
        id: { not: excludeDocumentId },
        type,
        reviewStatus: OnboardingDocumentReviewStatus.APPROVED,
        AND: [
          categoryId
            ? { OR: [{ categoryId }, { categoryId: null }] }
            : { categoryId: null },
          { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
        ],
      },
      select: { id: true },
    });
  }

  private async suspendForDocument(
    tx: Prisma.TransactionClient,
    providerId: string,
    categoryId: string | null,
    now: Date,
    reason: string,
  ): Promise<number> {
    const offerings = await tx.providerOffering.findMany({
      where: {
        providerId,
        isActive: true,
        ...(categoryId ? { service: { is: { categoryId } } } : {}),
      },
      select: { id: true },
    });
    if (!offerings.length) return 0;
    const changed = await tx.providerOffering.updateMany({
      where: { id: { in: offerings.map((offering) => offering.id) }, isActive: true },
      data: {
        isActive: false,
        complianceSuspendedAt: now,
        complianceSuspensionReason: reason,
      },
    });
    return changed.count;
  }

  private async restoreEligibleOfferings(
    tx: Prisma.TransactionClient,
    applicationId: string,
    providerId: string,
    categoryId: string | null,
  ): Promise<number> {
    const [offerings, unresolved, validDocuments] = await Promise.all([
      tx.providerOffering.findMany({
        where: {
          providerId,
          complianceSuspendedAt: { not: null },
          ...(categoryId ? { service: { is: { categoryId } } } : {}),
        },
        include: { service: { select: { categoryId: true } } },
      }),
      tx.onboardingDocument.findMany({
        where: {
          applicationId,
          reviewStatus: { in: [...UNRESOLVED_DOCUMENT_STATES] },
        },
        select: { categoryId: true, type: true },
      }),
      tx.onboardingDocument.findMany({
        where: {
          applicationId,
          reviewStatus: OnboardingDocumentReviewStatus.APPROVED,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        select: { categoryId: true, type: true },
      }),
    ]);
    const blockers = unresolved.filter((item) => !validDocuments.some((valid) =>
      valid.type === item.type &&
      (item.categoryId === null
        ? valid.categoryId === null
        : valid.categoryId === null || valid.categoryId === item.categoryId),
    ));
    const eligibleIds = offerings
      .filter((offering) => !blockers.some((item) =>
        item.categoryId === null || item.categoryId === offering.service.categoryId,
      ))
      .map((offering) => offering.id);
    if (!eligibleIds.length) return 0;
    const restored = await tx.providerOffering.updateMany({
      where: {
        id: { in: eligibleIds },
        complianceSuspendedAt: { not: null },
      },
      data: {
        isActive: true,
        complianceSuspendedAt: null,
        complianceSuspensionReason: null,
      },
    });
    return restored.count;
  }

  private enqueue(
    tx: Prisma.TransactionClient,
    userId: string,
    deliveryKey: string,
    title: string,
    body: string,
    now: Date,
  ) {
    return tx.notification.createMany({
      data: [{
        userId,
        channel: NotificationChannel.IN_APP,
        title,
        body,
        status: NotificationStatus.PENDING,
        nextAttemptAt: now,
        deliveryKey,
      }],
      skipDuplicates: true,
    });
  }
}
