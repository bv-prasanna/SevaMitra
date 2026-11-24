/** Keep CORS allowlist in sync with the shared API client's consented
 * event-location headers. Do not use a wildcard with authenticated requests.
 */
export const CORS_ALLOWED_REQUEST_HEADERS = [
  'Content-Type',
  'Authorization',
  'Idempotency-Key',
  'X-Event-Latitude',
  'X-Event-Longitude',
  'X-Event-Accuracy-Meters',
  'X-Event-Captured-At',
] as const;
