/**
 * CI / manual equivalent of the watch-mode generation in main.ts.
 * Bootstraps NestJS without starting the HTTP server.
 *
 * Usage (from repo root): pnpm generate
 * Usage (from apps/api):  pnpm generate:spec
 */
// Must be set before AppModule is imported so PrismaService skips $connect()
process.env.GENERATE_SPEC = 'true';

import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { execSync } from 'child_process';
import * as yaml from 'js-yaml';
import { AppModule } from '../src/app.module';

const SPEC_PATH = resolve(process.cwd(), 'openapi.yaml');
const TYPES_PATH = resolve(process.cwd(), '../../packages/api-contracts/types/index.ts');

async function run() {
    const app = await NestFactory.create(AppModule, { logger: false });

    const config = new DocumentBuilder()
        .setTitle('Devloggers ERP API')
        .setDescription('ERP system API documentation')
        .setVersion('1.0.0')
        .addBearerAuth(
            { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', name: 'JWT', in: 'header' },
            'JWT-auth',
        )
        .build();

    const document = SwaggerModule.createDocument(app, config, {
        operationIdFactory: (controllerKey: string, methodKey: string) =>
            `${controllerKey.replace('Controller', '')}.${methodKey}`,
    });

    await app.close();

    writeFileSync(SPEC_PATH, yaml.dump(document, { noRefs: true }));
    console.log(`✅  Spec written → ${SPEC_PATH}`);

    execSync(`node node_modules/openapi-typescript/bin/cli.js "${SPEC_PATH}" -o "${TYPES_PATH}"`, { stdio: 'inherit' });
    console.log(`✅  Types written → ${TYPES_PATH}`);
}

run().catch((err) => {
    console.error(err);
    process.exit(1);
});
