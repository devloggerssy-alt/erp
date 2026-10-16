import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { AuditWriter } from './audit-writer.service';
import { AuditInterceptor } from './audit.interceptor';
import { AuditLogPresenter } from './presenters/audit-log.presenter';
import { AuditLogRepository } from './repositories/audit-log.repository';

/** Global: GL services across accounting modules inject AuditWriter without importing this module. */
@Global()
@Module({
    controllers: [AuditController],
    providers: [AuditService, AuditLogRepository, AuditLogPresenter, AuditWriter, { provide: APP_INTERCEPTOR, useClass: AuditInterceptor }],
    exports: [AuditService, AuditWriter],
})
export class AuditModule {}
