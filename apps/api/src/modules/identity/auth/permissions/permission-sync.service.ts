import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import {
  DEFAULT_ROLE_DEFINITIONS,
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSION_CATALOG,
  permissionGroup,
  type DefaultRoleName,
  type PermissionKey,
} from '@devloggers/api-contracts';

/**
 * Syncs the static permission catalog into the DB and (re)grants the
 * default permission sets to every tenant's system roles.
 *
 * Idempotent: safe on every boot and for multiple API instances.
 * Skipped when GENERATE_SPEC=1 (Swagger generation must not touch the DB).
 */
@Injectable()
export class PermissionSyncService implements OnModuleInit {
  private readonly logger = new Logger(PermissionSyncService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    if (process.env.GENERATE_SPEC) return;
    try {
      await this.syncCatalog();
      await this.syncDefaultRoleGrants();
    } catch (error) {
      // Fail closed: a missing catalog denies access rather than allowing it.
      this.logger.error(
        'Permission sync failed — all permission checks will deny until this succeeds',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  async syncCatalog(): Promise<void> {
    for (const [resource, actions] of Object.entries(PERMISSION_CATALOG)) {
      for (const action of actions) {
        const key = `${resource}.${action}`;
        await this.prisma.permission.upsert({
          where: { key },
          create: { key, resource, action, group: permissionGroup(key as PermissionKey) },
          update: { resource, action, group: permissionGroup(key as PermissionKey) },
        });
      }
    }
  }

  async syncDefaultRoleGrants(): Promise<void> {
    const permissions = await this.prisma.permission.findMany({
      select: { id: true, key: true },
    });
    if (permissions.length === 0) return;

    const permissionIdByKey = new Map(permissions.map((permission) => [permission.key, permission.id]));
    const tenants = await this.prisma.tenant.findMany({ select: { id: true } });

    for (const tenant of tenants) {
      const roles = await this.prisma.role.findMany({
        where: { tenantId: tenant.id, isSystem: true },
        select: { id: true, name: true },
      });

      for (const roleName of Object.keys(DEFAULT_ROLE_DEFINITIONS) as DefaultRoleName[]) {
        let role = roles.find((candidate) => this.resolveRoleName(candidate.name) === roleName);

        if (!role) {
          const arName = DEFAULT_ROLE_DEFINITIONS[roleName].name.ar;
          // The DB's uniqueness index on (tenantId, name->>'ar') covers every role in the
          // tenant, not just system ones — a tenant-created custom role can already hold this
          // name (e.g. created before this default role existed). Check the same scope the
          // constraint enforces before creating, or `role.create` throws below.
          const nameTaken = await this.prisma.role.count({
            where: { tenantId: tenant.id, name: { path: ['ar'], equals: arName } },
          });
          if (nameTaken > 0) {
            this.logger.warn(
              `Skipping default role "${roleName}" for tenant ${tenant.id} — an existing role already uses the name "${arName}"`,
            );
            continue;
          }

          const created = await this.prisma.role.create({
            data: {
              tenantId: tenant.id,
              name: DEFAULT_ROLE_DEFINITIONS[roleName].name,
              description: DEFAULT_ROLE_DEFINITIONS[roleName].description,
              isSystem: true,
            },
            select: { id: true, name: true },
          });
          roles.push(created);
          role = created;
        }

        const grantData = DEFAULT_ROLE_PERMISSIONS[roleName]
          .map((key) => permissionIdByKey.get(key))
          .filter((permissionId): permissionId is string => Boolean(permissionId))
          .map((permissionId) => ({ roleId: role.id, permissionId }));

        if (grantData.length > 0) {
          await this.prisma.rolePermission.createMany({ data: grantData, skipDuplicates: true });
        }
      }
    }
  }

  private resolveRoleName(name: unknown): string | undefined {
    if (typeof name === 'string') return name;
    const localized = name as { ar?: string; en?: string };
    return localized.en ?? localized.ar;
  }
}
