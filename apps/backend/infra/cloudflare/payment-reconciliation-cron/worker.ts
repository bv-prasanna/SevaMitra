interface Env {
  SEVAMITRA_API_ORIGIN: string;
  PAYMENT_RECONCILIATION_CRON_SECRET: string;
}

const PATH = '/api/v1/internal/payments/reconcile';
const PREFIX = 'SevaMitra.PaymentReconciliation.v1\nPOST\n' + PATH + '\n';

async function reconcile(env: Env): Promise<void> {
  if (!env.PAYMENT_RECONCILIATION_CRON_SECRET ||
      env.PAYMENT_RECONCILIATION_CRON_SECRET.length < 32) {
    throw new Error('Payment reconciliation signing secret is missing or too short');
  }
  const origin = new URL(env.SEVAMITRA_API_ORIGIN);
  if (origin.protocol !== 'https:' || origin.pathname !== '/' || origin.search || origin.hash) {
    throw new Error('SEVAMITRA_API_ORIGIN must be an HTTPS origin');
  }
  const timestamp = Date.now().toString();
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(env.PAYMENT_RECONCILIATION_CRON_SECRET),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const bytes = new Uint8Array(await crypto.subtle.sign(
    'HMAC', key, new TextEncoder().encode(PREFIX + timestamp),
  ));
  const signature = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  const response = await fetch(new URL(PATH, origin), {
    method: 'POST',
    headers: {
      'x-sevamitra-cron-timestamp': timestamp,
      'x-sevamitra-cron-signature': signature,
    },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    throw new Error('Payment reconciliation endpoint failed: HTTP ' + response.status);
  }
  const summary = await response.json();
  console.log(JSON.stringify({ event: 'payment_reconciliation_completed', summary }));
}

export default {
  async scheduled(
    _controller: ScheduledController, env: Env, ctx: ExecutionContext,
  ): Promise<void> {
    ctx.waitUntil(reconcile(env));
  },
};
