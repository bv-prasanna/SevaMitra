// Worker entrypoint for running the existing Dockerfile image as a
// Cloudflare Container (docs/ARCHITECTURE.md's EC2/ECR deploy is the real
// staging path — this is a separate, additive Cloudflare-hosted deployment).
// Single fixed container instance ("primary") — mirrors the single-EC2-box
// deploy model, not a multi-instance load-balanced setup.
import { Container, getContainer } from '@cloudflare/containers';

export interface Env {
  SEVAMITRA_CONTAINER: DurableObjectNamespace<SevamitraContainer>;
  DATABASE_URL: string;
  JWT_ACCESS_SECRET: string;
  JWT_REFRESH_SECRET: string;
  JWT_RESET_SECRET: string;
}

export class SevamitraContainer extends Container<Env> {
  defaultPort = 3000;
  sleepAfter = '10m';

  constructor(ctx: ConstructorParameters<typeof Container<Env>>[0], env: Env) {
    super(ctx, env);
    // Durable Objects share the Worker's bindings/secrets via `env`, so
    // secrets set with `wrangler secret put` land here without ever being
    // written to wrangler.jsonc or the repo.
    this.envVars = {
      NODE_ENV: 'production',
      PORT: '3000',
      DATABASE_URL: env.DATABASE_URL,
      JWT_ACCESS_SECRET: env.JWT_ACCESS_SECRET,
      JWT_REFRESH_SECRET: env.JWT_REFRESH_SECRET,
      JWT_RESET_SECRET: env.JWT_RESET_SECRET,
      JWT_ACCESS_TTL: '15m',
      JWT_REFRESH_TTL: '30d',
      JWT_RESET_TTL: '10m',
      OTP_LENGTH: '6',
      OTP_TTL_SECONDS: '300',
      OTP_MAX_ATTEMPTS: '5',
      OTP_REQUEST_COOLDOWN_SECONDS: '60',
      NOTIFICATION_PROVIDER: 'console',
    };
  }

  override onStart() {
    console.log('SevamitraContainer instance started');
  }

  override onStop() {
    console.log('SevamitraContainer instance stopped');
  }

  override onError(error: unknown) {
    console.error('SevamitraContainer error', error);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const container = getContainer(env.SEVAMITRA_CONTAINER, 'primary');
    return container.fetch(request);
  },
};
