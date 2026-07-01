import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as cookieParser from 'cookie-parser';
import { join, resolve } from 'path';
import { writeFileSync } from 'fs';
import { execSync } from 'child_process';
import * as yaml from 'js-yaml';

// Paths are relative to apps/api/ (process.cwd() when running via nest start)
const SPEC_PATH = resolve(process.cwd(), 'openapi.yaml');
const TYPES_PATH = resolve(process.cwd(), '../../packages/api-contracts/types/index.ts');

const logger = new Logger('Bootstrap');

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') ?? 4040;

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Devloggers ERP API')
    .setDescription('ERP system API documentation')
    .setVersion('1.0.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', name: 'JWT', description: 'Enter JWT token', in: 'header' },
      'JWT-auth',
    )
    .addServer(`http://localhost:${port}`, 'Development server')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig, {
    operationIdFactory: (controllerKey: string, methodKey: string) =>
      `${controllerKey.replace('Controller', '')}.${methodKey}`,
  });

  SwaggerModule.setup('docs', app, document, {
    customSiteTitle: 'Devloggers ERP API',
    jsonDocumentUrl: 'swagger.json',
    yamlDocumentUrl: 'swagger.yaml',
    swaggerOptions: { persistAuthorization: true, displayRequestDuration: true, filter: true, docExpansion: 'none', tryItOutEnabled: true },
  });

  // In development: regenerate api-contracts types on every restart (watch mode keeps them live)
  if (process.env.NODE_ENV !== 'production') {
    generateTypes(document);
  }

  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });
  app.use(cookieParser.default());
  app.enableCors({ origin: true, credentials: true });
  app.set('query parser', 'extended');

  await app.listen(port);
  logger.log(`API running on http://localhost:${port}`);
  logger.log(`Swagger docs at http://localhost:${port}/docs`);
}

/**
 * Writes openapi.yaml (apps/api/) and regenerates api-contracts/types/index.ts.
 * The spec file can be committed — it is the machine-readable API contract.
 */
function generateTypes(document: object) {
  logger.log('Generating OpenAPI spec...');
  try {
    writeFileSync(SPEC_PATH, yaml.dump(document, { noRefs: true }));
    logger.log(`Spec written → ${SPEC_PATH}`);

    execSync(
      `node node_modules/openapi-typescript/bin/cli.js "${SPEC_PATH}" -o "${TYPES_PATH}"`,
      { stdio: 'pipe' },
    );
    logger.log(`Types generated → ${TYPES_PATH}`);
  } catch (err) {
    logger.error('Type generation failed', err instanceof Error ? err.message : String(err));
    logger.warn('Run "pnpm generate" manually to regenerate types');
  }
}

bootstrap().catch((err) => {
  logger.error('Error starting application', err);
  process.exit(1);
});
