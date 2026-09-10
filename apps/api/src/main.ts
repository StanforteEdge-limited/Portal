import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import rateLimit from 'express-rate-limit';
import { resolve } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';
import { config as loadEnv } from 'dotenv';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from '$common/http/all-exceptions.filter';
import { ResponseEnvelopeInterceptor } from '$common/http/response-envelope.interceptor';

const envCandidates = [
  resolve(process.cwd(), '.env'),
  resolve(process.cwd(), 'apps/api/.env'),
  resolve(__dirname, '../.env'),
  resolve(__dirname, '../../.env')
];
for (const file of envCandidates) {
  if (existsSync(file)) {
    // Keep runtime-provided env values (PM2/systemd) as highest priority.
    loadEnv({ path: file, override: false });
  }
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const expressApp = app.getHttpAdapter().getInstance();

  // Behind nginx/reverse proxy, trust X-Forwarded-* headers for correct client IP.
  const trustProxyRaw = String(process.env.TRUST_PROXY ?? (process.env.NODE_ENV === 'production' ? '1' : '0'));
  if (trustProxyRaw === 'true' || trustProxyRaw === '1') {
    expressApp.set('trust proxy', 1);
  } else if (trustProxyRaw === 'false' || trustProxyRaw === '0') {
    expressApp.set('trust proxy', false);
  } else {
    expressApp.set('trust proxy', trustProxyRaw);
  }

  const corsOriginsFromEnv = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  const localDevCorsOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3001',
    'http://localhost:5173',
    'http://127.0.0.1:5173'
  ];
  const corsOrigins = Array.from(new Set([...corsOriginsFromEnv, ...localDevCorsOrigins]));
  app.enableCors({
    origin: corsOrigins,
    credentials: true
  });

  app.setGlobalPrefix('v1');
  const swaggerConfig = new DocumentBuilder()
    .setTitle('StanforteEdge Portal API')
    .setDescription('Backend API documentation')
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        in: 'header',
        description: 'Paste JWT access token'
      },
      'bearer'
    )
    .addSecurityRequirements('bearer')
    .build();
  const swaggerDoc = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDoc, {
    jsonDocumentUrl: 'docs-json',
    swaggerOptions: {
      persistAuthorization: true
    }
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true
    })
  );
  app.useGlobalInterceptors(new ResponseEnvelopeInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());

  const uploadsRoot = resolve(process.cwd(), 'uploads');
  if (!existsSync(uploadsRoot)) {
    mkdirSync(uploadsRoot, { recursive: true });
  }
  app.useStaticAssets(uploadsRoot, { prefix: '/uploads/' });

  const authWindowMs = Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000);
  const loginLimit = Number(process.env.AUTH_LOGIN_RATE_LIMIT_MAX || 10);
  const forgotLimit = Number(process.env.AUTH_FORGOT_RATE_LIMIT_MAX || 5);
  const inviteLimit = Number(process.env.AUTH_INVITE_ACCEPT_RATE_LIMIT_MAX || 10);
  // Global Rate Limiting using existing express-rate-limit
  app.use(rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
  }));

  app.use('/v1/auth/login', rateLimit({ windowMs: authWindowMs, max: loginLimit, standardHeaders: true, legacyHeaders: false }));
  app.use('/v1/auth/forgot-password', rateLimit({ windowMs: authWindowMs, max: forgotLimit, standardHeaders: true, legacyHeaders: false }));
  app.use('/v1/auth/accept-invite', rateLimit({ windowMs: authWindowMs, max: inviteLimit, standardHeaders: true, legacyHeaders: false }));

  const jwtSecret = process.env.JWT_SECRET || '';
  const refreshSecret = process.env.JWT_REFRESH_SECRET || '';
  if (process.env.NODE_ENV === 'production') {
    if (!jwtSecret || !refreshSecret || jwtSecret === 'change-me' || refreshSecret === 'change-me-too') {
      throw new Error('JWT secrets must be set to non-default values in production');
    }
  }

  // Permanent JSON-level BigInt handling for all API responses.
  expressApp.set('json replacer', (_key: string, value: unknown) =>
    typeof value === 'bigint' ? value.toString() : value
  );

  const port = Number(process.env.PORT) || 3000;
  await app.listen(port);
}

bootstrap();
