import { Global, Module } from '@nestjs/common';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { AuditWriter } from './audit-writer.service';

/** Global: GL services across accounting modules inject AuditWriter without importing this module. */
@Global()
@Module({
    controllers: [AuditController],
    providers: [AuditService, AuditWriter],
    exports: [AuditService, AuditWriter],
})
export class AuditModule {}
