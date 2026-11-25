import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { OnboardingDocumentReviewStatus } from '@prisma/client';
import { ReviewDocumentDto } from './dto/review-document.dto';

describe('ReviewDocumentDto', () => {
  it('accepts approval without a note', async () => {
    expect(await validate(plainToInstance(ReviewDocumentDto, {
      decision: OnboardingDocumentReviewStatus.APPROVED,
    }))).toHaveLength(0);
  });

  it('requires a reason for rejection', async () => {
    expect((await validate(plainToInstance(ReviewDocumentDto, {
      decision: OnboardingDocumentReviewStatus.REJECTED,
    }))).length).toBeGreaterThan(0);
    expect(await validate(plainToInstance(ReviewDocumentDto, {
      decision: OnboardingDocumentReviewStatus.REJECTED,
      reviewNote: 'Document is unreadable',
    }))).toHaveLength(0);
  });

  it('rejects states that reviewers cannot assign directly', async () => {
    expect((await validate(plainToInstance(ReviewDocumentDto, {
      decision: OnboardingDocumentReviewStatus.EXPIRED,
    }))).length).toBeGreaterThan(0);
  });
});
