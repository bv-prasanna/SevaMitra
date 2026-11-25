import { createHmac, timingSafeEqual } from 'node:crypto';

// Keep this signed message synchronized with the Cloudflare incident cron worker.
export const INCIDENT_SLA_CRON_MESSAGE =
  'SevaMitra.IncidentSla.v1\nPOST\n/api/v1/internal/incidents/sla/process-due\n';

export function validIncidentSlaCronSignature(
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
    .update(INCIDENT_SLA_CRON_MESSAGE + timestamp).digest();
  return timingSafeEqual(expected, Buffer.from(signature, 'hex'));
}
