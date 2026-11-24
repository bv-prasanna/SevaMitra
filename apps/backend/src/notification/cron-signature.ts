import { createHmac, timingSafeEqual } from 'node:crypto';

// Keep this exact signed string synchronized with infra/cloudflare/notification-cron/worker.ts.
export const NOTIFICATION_CRON_MESSAGE =
  'SevaMitra.NotificationRetry.v1\nPOST\n/api/v1/internal/notifications/retry-due\n';

export function validNotificationCronSignature(
  secret: string | undefined,
  timestamp: string | undefined,
  signature: string | undefined,
  now = Date.now(),
): boolean {
  if (
    !secret || secret.length < 32 ||
    !timestamp || !/^\d{13}$/.test(timestamp) ||
    !signature || !/^[a-fA-F0-9]{64}$/.test(signature)
  ) return false;
  const requestTime = Number(timestamp);
  if (!Number.isSafeInteger(requestTime) || Math.abs(now - requestTime) > 90_000) return false;
  const expected = createHmac('sha256', secret)
    .update(NOTIFICATION_CRON_MESSAGE + timestamp).digest();
  return timingSafeEqual(expected, Buffer.from(signature, 'hex'));
}
