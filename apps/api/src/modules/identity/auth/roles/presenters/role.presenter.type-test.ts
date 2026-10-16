import type { Prisma, Role } from '@devloggers/db-prisma';
import { assertType, type Equal } from '@/common/types/type-assert';
import { RolePresenter } from './role.presenter';

type Entity = Parameters<RolePresenter['toResponse']>[0];
type LoadedRole = Prisma.RoleGetPayload<{ include: { rolePermissions: { include: { permission: true } } } }>;

assertType<Equal<Entity, Role | LoadedRole>>();
