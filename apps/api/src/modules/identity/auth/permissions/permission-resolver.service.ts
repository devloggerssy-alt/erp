import { Injectable } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';

const CACHE_TTL_MS = 30_000;
const CACHE_MAX_ENTRIES = 10_000;

type CacheEntry = { permissions: Set<string>; expiresAt: number };

/**
 * Resolves the effective permission keys for a user from the DB.
 * Short-lived in-memory cache (30s) — revocations propagate within one TTL.
 * The JWT is never trusted for permissions.
 */
@Injectable()
export class PermissionResolverService {
  private readonly cache = new Map<string, CacheEntry>();

  constructor(private readonly prisma: PrismaService) {}

  async resolve(userId: string, tenantId: string): Promise<Set<string>> {
    const cacheKey = `${tenantId}:${userId}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.permissions;

    const user = await this.prisma.appUser.findFirst({
      where: { id: userId, tenantId, isActive: true },
      select: {
        userRoles: {
          select: {
            role: {
              select: {
                rolePermissions: {
                  select: { permission: { select: { key: true } } },
                },
              },
            },
          },
        },
      },
    });

    const permissions = new Set<string>(
      user?.userRoles.flatMap((userRole) =>
        userRole.role.rolePermissions.map((rolePermission) => rolePermission.permission.key),
      ) ?? [],
    );

    if (this.cache.size >= CACHE_MAX_ENTRIES) this.cache.clear();
    this.cache.set(cacheKey, { permissions, expiresAt: Date.now() + CACHE_TTL_MS });
    return permissions;
  }

  invalidateUser(userId: string): void {
    for (const key of this.cache.keys()) {
      if (key.endsWith(`:${userId}`)) this.cache.delete(key);
    }
  }

  invalidateTenant(tenantId: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${tenantId}:`)) this.cache.delete(key);
    }
  }
}
