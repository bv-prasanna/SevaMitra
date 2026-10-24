/**
 * Explicit production browser allowlist. Native clients do not depend on CORS.
 * Reject wildcard origins in shared environments.
 */
export function allowedBrowserOrigins(raw: string | undefined, deployment: string): string[] {
  const origins = (raw ?? '').split(',').map(v => v.trim()).filter(Boolean);
  if (!['production','staging'].includes(deployment)) {
    return origins.length ? origins : ['http://localhost:3000','http://localhost:3001','http://localhost:5173'];
  }
  if (!origins.length) throw new Error('CORS_ALLOWED_ORIGINS must be set for staging/production');
  for (const origin of origins) {
    let url: URL;
    try { url = new URL(origin); }
    catch { throw new Error('CORS_ALLOWED_ORIGINS contains an invalid origin'); }
    if (url.protocol !== 'https:' || url.origin !== origin || origin.includes('*') ||
        url.username || url.password) {
      throw new Error('CORS_ALLOWED_ORIGINS must list HTTPS origins without paths/wildcards');
    }
  }
  return [...new Set(origins)];
}
