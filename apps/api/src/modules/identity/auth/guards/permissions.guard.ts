import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_METADATA_KEY, type RequestUser } from '@devloggers/backend-core';
import type { PermissionKey } from '@devloggers/api-contracts';
import { PermissionResolverService } from '../permissions/permission-resolver.service';

/**
 * Fail-closed authorization guard.
 *
 * Order matters: it must run after JwtAuthGuard so `request.user` exists:
 * `@UseGuards(JwtAuthGuard, PermissionsGuard)`.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissions: PermissionResolverService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<PermissionKey[] | undefined>(
      PERMISSION_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!required || required.length === 0) {
      throw new ForbiddenException('Missing permission metadata for this route');
    }

    const request = context.switchToHttp().getRequest<{ user?: RequestUser }>();
    const user = request.user;
    if (!user?.id || !user?.tenantId) {
      throw new ForbiddenException('Authenticated user is required for permission checks');
    }

    const granted = await this.permissions.resolve(user.id, user.tenantId);
    const missing = required.filter((permission) => !granted.has(permission));
    if (missing.length > 0) {
      throw new ForbiddenException(`Missing permission: ${missing.join(', ')}`);
    }

    return true;
  }
}
