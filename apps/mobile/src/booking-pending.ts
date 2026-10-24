/** Stable per-attempt request IDs are retry tokens, not authentication secrets.
 * Use platform CSPRNG when available; fallback combines time with randomness
 * solely for collision avoidance on JS runtimes without crypto.randomUUID.
 */
export function newBookingRequestId(): string {
  const cryptoApi = (globalThis as {crypto?: {randomUUID?: () => string}}).crypto;
  if (cryptoApi?.randomUUID) return cryptoApi.randomUUID();
  let seed = Date.now();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const r = (Math.random() * 16 + seed) % 16 | 0;
    seed = Math.floor(seed / 16);
    return (char === 'x' ? r : (r & 3) | 8).toString(16);
  });
}

export type PendingBookingDraft = {
  payload: {
    offeringId: string;
    townVillageId: string;
    scheduledDate: string;
    scheduledStartTime: string;
    scheduledEndTime: string;
    notes?: string;
    clientRequestId: string;
  };
  savedAt: number;
};

export function isPendingBookingDraft(value: unknown): value is PendingBookingDraft {
  const x = value as Partial<PendingBookingDraft> | null;
  const p = x?.payload;
  return typeof x?.savedAt === 'number' && !!p &&
    typeof p.clientRequestId === 'string' &&
    /^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i.test(p.clientRequestId) &&
    typeof p.offeringId === 'string' && typeof p.townVillageId === 'string' &&
    typeof p.scheduledDate === 'string' &&
    typeof p.scheduledStartTime === 'string' && typeof p.scheduledEndTime === 'string';
}
