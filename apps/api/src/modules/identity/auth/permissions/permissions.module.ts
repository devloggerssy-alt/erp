import { Global, Module } from '@nestjs/common';
import { PermissionsGuard } from '../guards/permissions.guard';
import { PermissionResolverService } from './permission-resolver.service';
import { PermissionSyncService } from './permission-sync.service';

@Global()
@Module({
  providers: [PermissionResolverService, PermissionSyncService, PermissionsGuard],
  exports: [PermissionResolverService, PermissionSyncService, PermissionsGuard],
})
export class PermissionsModule {}
