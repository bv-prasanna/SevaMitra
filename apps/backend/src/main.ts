import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { allowedBrowserOrigins } from './common/config/cors-origins';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  const origins = allowedBrowserOrigins(
    config.get<string>('CORS_ALLOWED_ORIGINS'),
    config.get<string>('NODE_ENV') ?? 'development',
  );
  app.enableCors({
    origin: origins,
    credentials: false,
    methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
    allowedHeaders: ['Content-Type','Authorization','Idempotency-Key'],
  });
  app.use((_req: unknown, res: {setHeader:(name:string,value:string)=>void}, next:()=>void)=>{
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('X-Frame-Options','DENY');
    res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
    res.setHeader('Cache-Control','no-store');
    next();
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Published for the (separately built) frontend team per
  // docs/ARCHITECTURE.md §8 — the OpenAPI spec is the contract.
  const swaggerConfig = new DocumentBuilder()
    .setTitle('SevaMitra API')
    .setDescription('SevaMitra backend API — see docs/ARCHITECTURE.md')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  if (config.get<string>('NODE_ENV') !== 'production' ||
      config.get<string>('ENABLE_API_DOCS') === 'true') {
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = config.get<number>('PORT') ?? 3000;
  await app.listen(port);
  Logger.log(`SevaMitra API listening on port ${port}`, 'Bootstrap');
}

void bootstrap();
