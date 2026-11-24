/**
 * Generates openapi.json straight from the NestJS controller/DTO
 * decorators — the actual API contract (docs/ARCHITECTURE.md §8), not a
 * hand-maintained copy that can drift from the code.
 *
 * PrismaService is stubbed out so this can run without a live database
 * (e.g. in CI, or on a machine without Docker) — we only need route/DTO
 * metadata, never real data, to build the spec.
 *
 * Usage: npm run docs:openapi
 */
import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

async function main() {
  const prismaStub: Partial<PrismaService> = {
    onModuleInit: async () => undefined,
    onModuleDestroy: async () => undefined,
    $queryRaw: (() => Promise.resolve([{ '?column?': 1 }])) as never,
  };

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(PrismaService)
    .useValue(prismaStub)
    .compile();

  const app = moduleRef.createNestApplication();
  // Mirror src/main.ts so the generated paths match what actually deploys.
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  await app.init();

  const config = new DocumentBuilder()
    .setTitle('SevaMitra API')
    .setDescription('SevaMitra backend API — see docs/ARCHITECTURE.md')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  const outPath = resolve(__dirname, '../docs/api/openapi.json');
  writeFileSync(outPath, JSON.stringify(document, null, 2));

  // eslint-disable-next-line no-console
  console.log(`Wrote ${outPath}`);

  await app.close();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
