import type { Type } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { Test, type TestingModule, type TestingModuleBuilder } from '@nestjs/testing';
import { I18nModule } from '@devloggers/i18n/nest';
import { PrismaModule, PrismaService } from '@devloggers/db-prisma/nest';
import { AuditModule } from '../../modules/audit/audit.module';
import { PermissionsGuard } from '../../modules/identity/auth/guards';

/**
 * Phase 8.3 — boots a domain module subtree without AppModule. Only global
 * infrastructure is added here; anything a domain needs at runtime must
 * travel in its own `imports`, which is exactly what these tests pin.
 */
export function applyIsolationTestEnv(): void {
    process.env.NODE_ENV ??= 'test';
    process.env.DATABASE_URL ??= 'postgresql://isolated:isolated@localhost:5432/isolated';
    process.env.JWT_ACCESS_SECRET ??= 'isolation-test-secret';
}

/** Compile-time placeholder — no delegate is called during `compile()`. */
export const fakePrismaService = {} as unknown as PrismaService;

export async function compileIsolated(
    imports: Type<unknown>[],
    configure?: (builder: TestingModuleBuilder) => TestingModuleBuilder,
): Promise<TestingModule> {
    applyIsolationTestEnv();

    const builder = Test.createTestingModule({
        imports: [
            ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
            EventEmitterModule.forRoot({ wildcard: true, delimiter: '.', global: true }),
            I18nModule,
            PrismaModule,
            AuditModule,
            ...imports,
        ],
    })
        .overrideProvider(PrismaService)
        .useValue(fakePrismaService)
        // Authorization is enforced by PermissionsGuard in the full app; isolation
        // tests pin module composition, so the guard is stubbed here.
        .overrideGuard(PermissionsGuard)
        .useValue({ canActivate: () => true });

    return (configure ? configure(builder) : builder).compile();
}
