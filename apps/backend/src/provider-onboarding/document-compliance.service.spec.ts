import { ConflictException, NotFoundException } from '@nestjs/common';
import {
  NotificationStatus,
  OnboardingDocumentReviewStatus,
  OnboardingDocumentType,
} from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import { DocumentComplianceService } from './document-compliance.service';

describe('DocumentComplianceService', () => {
  let prisma: {
    onboardingDocument: {
      findFirst: jest.Mock; findMany: jest.Mock; updateMany: jest.Mock; findUniqueOrThrow: jest.Mock;
    };
    providerOffering: { findMany: jest.Mock; updateMany: jest.Mock };
    notification: { createMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let service: DocumentComplianceService;
  const document = {
    id: 'doc-1',
    applicationId: 'app-1',
    type: OnboardingDocumentType.LICENSE,
    categoryId: 'category-a',
    expiresAt: null,
    renewalOfId: null,
    reviewStatus: OnboardingDocumentReviewStatus.PENDING,
    application: { providerId: 'provider-1', provider: { userId: 'provider-user-1' } },
  };

  beforeEach(() => {
    prisma = {
      onboardingDocument: {
        findFirst: jest.fn().mockResolvedValue(document),
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({ ...document, reviewStatus: OnboardingDocumentReviewStatus.APPROVED }),
      },
      providerOffering: {
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      notification: { createMany: jest.fn().mockResolvedValue({ count: 1 }) },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma));
    service = new DocumentComplianceService(prisma as unknown as PrismaService);
  });

  it('404s when a reviewer targets a document outside the application', async () => {
    prisma.onboardingDocument.findFirst.mockResolvedValue(null);
    await expect(service.review('app-1', 'foreign-doc', 'reviewer-1', {
      decision: OnboardingDocumentReviewStatus.APPROVED,
    })).rejects.toThrow(NotFoundException);
  });

  it('rejects approval of already expired evidence and asks for a renewal', async () => {
    prisma.onboardingDocument.findFirst.mockResolvedValue({
      ...document,
      reviewStatus: OnboardingDocumentReviewStatus.EXPIRED,
      expiresAt: new Date(Date.now() - 86_400_000),
    });
    await expect(service.review('app-1', 'doc-1', 'reviewer-1', {
      decision: OnboardingDocumentReviewStatus.APPROVED,
    })).rejects.toThrow(ConflictException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects only offerings in the document category and records a provider notice', async () => {
    prisma.providerOffering.findMany.mockResolvedValue([{ id: 'offer-a' }]);
    prisma.onboardingDocument.findFirst.mockResolvedValueOnce(document).mockResolvedValueOnce(null);
    await service.review('app-1', 'doc-1', 'reviewer-1', {
      decision: OnboardingDocumentReviewStatus.REJECTED,
      reviewNote: 'License image is unreadable',
    });
    expect(prisma.providerOffering.findMany).toHaveBeenCalledWith({
      where: {
        providerId: 'provider-1', isActive: true,
        service: { is: { categoryId: 'category-a' } },
      },
      select: { id: true },
    });
    expect(prisma.providerOffering.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['offer-a'] }, isActive: true },
      data: expect.objectContaining({
        isActive: false, complianceSuspendedAt: expect.any(Date),
        complianceSuspensionReason: 'Compliance document LICENSE was rejected',
      }),
    });
    expect(prisma.notification.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({
        userId: 'provider-user-1',
        deliveryKey: 'provider-document-review:doc-1:REJECTED',
        status: NotificationStatus.PENDING,
      })],
      skipDuplicates: true,
    });
  });

  it('does not suspend a category when equivalent current approved evidence still exists', async () => {
    prisma.onboardingDocument.findFirst
      .mockResolvedValueOnce(document)
      .mockResolvedValueOnce({ id: 'doc-valid' });
    await service.review('app-1', 'doc-1', 'reviewer-1', {
      decision: OnboardingDocumentReviewStatus.REJECTED,
      reviewNote: 'Duplicate document was unreadable',
    });
    expect(prisma.providerOffering.findMany).not.toHaveBeenCalled();
    expect(prisma.providerOffering.updateMany).not.toHaveBeenCalled();
  });

  it('supersedes the old document on approved renewal and restores only unblocked categories', async () => {
    prisma.onboardingDocument.findFirst.mockResolvedValue({
      ...document, renewalOfId: 'doc-old',
    });
    prisma.providerOffering.findMany.mockResolvedValue([
      { id: 'offer-a', service: { categoryId: 'category-a' } },
      { id: 'offer-b', service: { categoryId: 'category-b' } },
    ]);
    prisma.onboardingDocument.findMany
      .mockResolvedValueOnce([{ categoryId: 'category-b', type: OnboardingDocumentType.LICENSE }])
      .mockResolvedValueOnce([]);
    await service.review('app-1', 'doc-1', 'reviewer-1', {
      decision: OnboardingDocumentReviewStatus.APPROVED,
    });
    expect(prisma.onboardingDocument.updateMany).toHaveBeenNthCalledWith(2, {
      where: {
        applicationId: 'app-1', id: { not: 'doc-1' },
        type: OnboardingDocumentType.LICENSE, categoryId: 'category-a',
        reviewStatus: { not: OnboardingDocumentReviewStatus.SUPERSEDED },
      },
      data: { reviewStatus: OnboardingDocumentReviewStatus.SUPERSEDED },
    });
    expect(prisma.providerOffering.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['offer-a'] }, complianceSuspendedAt: { not: null } },
      data: { isActive: true, complianceSuspendedAt: null, complianceSuspensionReason: null },
    });
  });

  it('expires approved documents, applies scoped suspension and queues expiry notification', async () => {
    const expired = {
      ...document,
      reviewStatus: OnboardingDocumentReviewStatus.APPROVED,
      expiresAt: new Date('2026-11-24T18:29:59.999Z'),
    };
    prisma.onboardingDocument.findMany
      .mockResolvedValueOnce([expired])
      .mockResolvedValueOnce([]);
    prisma.onboardingDocument.findFirst.mockResolvedValue(null);
    prisma.providerOffering.findMany.mockResolvedValue([{ id: 'offer-a' }]);
    const result = await service.processDue(new Date('2026-11-25T06:00:00.000Z'));
    expect(result).toEqual({
      examined: 1, expired: 1, suspendedOfferings: 1, remindersQueued: 0, skipped: 0,
    });
    expect(prisma.onboardingDocument.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'doc-1',
        reviewStatus: OnboardingDocumentReviewStatus.APPROVED,
        expiresAt: { lte: new Date('2026-11-25T06:00:00.000Z') },
      },
      data: {
        reviewStatus: OnboardingDocumentReviewStatus.EXPIRED,
        expiredAt: new Date('2026-11-25T06:00:00.000Z'),
      },
    });
    expect(prisma.notification.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({
        deliveryKey: 'provider-document-expired:doc-1',
        status: NotificationStatus.PENDING,
      })],
      skipDuplicates: true,
    });
  });

  it('queues one deduplicated reminder for a document expiring within seven days', async () => {
    const now = new Date('2026-11-25T06:00:00.000Z');
    prisma.onboardingDocument.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{
        ...document,
        reviewStatus: OnboardingDocumentReviewStatus.APPROVED,
        expiresAt: new Date(now.getTime() + 5 * 86_400_000),
        application: { provider: { userId: 'provider-user-1' } },
      }]);
    const result = await service.processDue(now);
    expect(result.remindersQueued).toBe(1);
    expect(prisma.notification.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({
        userId: 'provider-user-1',
        deliveryKey: 'provider-document-expiry:doc-1:7d',
        status: NotificationStatus.PENDING,
      })],
      skipDuplicates: true,
    });
  });

  it('does not repeat expiry effects when another scheduler has already processed the document', async () => {
    const expired = {
      ...document,
      reviewStatus: OnboardingDocumentReviewStatus.APPROVED,
      expiresAt: new Date('2026-11-24T18:29:59.999Z'),
    };
    prisma.onboardingDocument.findMany
      .mockResolvedValueOnce([expired])
      .mockResolvedValueOnce([]);
    prisma.onboardingDocument.updateMany.mockResolvedValue({ count: 0 });
    const result = await service.processDue(new Date('2026-11-25T06:00:00.000Z'));
    expect(result).toEqual({
      examined: 1, expired: 0, suspendedOfferings: 0, remindersQueued: 0, skipped: 1,
    });
    expect(prisma.providerOffering.findMany).not.toHaveBeenCalled();
    expect(prisma.notification.createMany).not.toHaveBeenCalled();
  });
});
