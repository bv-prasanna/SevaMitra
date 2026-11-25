interface Env {
  SEVAMITRA_API_ORIGIN: string;
  NOTIFICATION_CRON_SECRET: string;
}

const JOBS = [
  {
    path: '/api/v1/internal/notifications/retry-due',
    message: 'SevaMitra.NotificationRetry.v1\nPOST\n/api/v1/internal/notifications/retry-due\n',
    label: 'Notification retry',
  },
  {
    path: '/api/v1/internal/provider-compliance/process-due',
    message: 'SevaMitra.ProviderCompliance.v1\nPOST\n/api/v1/internal/provider-compliance/process-due\n',
    label: 'Provider document compliance',
  },
] as const;

async function postSigned(env: Env, job: (typeof JOBS)[number]): Promise<void> {
  if (!env.NOTIFICATION_CRON_SECRET || env.NOTIFICATION_CRON_SECRET.length < 32) {
    throw new Error('Cron signing secret is missing');
  }
  const origin = new URL(env.SEVAMITRA_API_ORIGIN);
  if (origin.protocol !== 'https:' || origin.pathname !== '/' || origin.search || origin.hash) {
    throw new Error('SEVAMITRA_API_ORIGIN must be an HTTPS origin');
  }
  const timestamp = Date.now().toString();
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(env.NOTIFICATION_CRON_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const bytes = new Uint8Array(await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(job.message + timestamp),
  ));
  const signature = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  const response = await fetch(new URL(job.path, origin), {
    method: 'POST',
    headers: {
      'x-sevamitra-cron-timestamp': timestamp,
      'x-sevamitra-cron-signature': signature,
    },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(job.label + ' endpoint failed: HTTP ' + response.status);
}

async function deliver(env: Env): Promise<void> {
  await Promise.all(JOBS.map((job) => postSigned(env, job)));
}

export default {
  async scheduled(
    _controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    ctx.waitUntil(deliver(env));
  },
};
