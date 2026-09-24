export { JwtAuthGuard } from './jwt-auth.guard';
export { PermissionsGuard } from './permissions.guard';
// The ai-agent filters tools by the same resolved permissions the guard uses.
export { PermissionResolverService } from '../permissions/permission-resolver.service';
// Global in the app; imported explicitly by ai-agent so the domain boots in isolation too.
export { PermissionsModule } from '../permissions/permissions.module';
