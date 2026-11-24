import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

// Prisma 7 config: connection URL for `prisma migrate`/`prisma db push` etc.
// The application itself connects via the @prisma/adapter-pg driver adapter
// (see src/prisma/prisma.service.ts) — this file only drives the CLI.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'ts-node -r tsconfig-paths/register prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
