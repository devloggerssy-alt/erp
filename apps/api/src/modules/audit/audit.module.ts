import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { AuditWriter } from './audit-writer.service';
import { AuditInterceptor } from './audit.interceptor';

/** Global: GL services across accounting modules inject AuditWriter without importing this module. */
@Global()
@Module({
    controllers: [AuditController],
    providers: [AuditService, AuditWriter, { provide: APP_INTERCEPTOR, useClass: AuditInterceptor }],
    exports: [AuditService, AuditWriter],
})
export class AuditModule {}
