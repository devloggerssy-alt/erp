import { Module } from '@nestjs/common';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { TenantsRepository } from './repositories/tenants.repository';
import { TenantPresenter } from './presenters/tenant.presenter';

@Module({
    controllers: [TenantsController],
    providers: [TenantsService, TenantsRepository, TenantPresenter],
    exports: [TenantsService],
})
export class TenantsModule {}
