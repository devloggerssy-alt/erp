import type { Prisma } from '@devloggers/db-prisma';
import { assertType, type Equal } from '@/common/types/type-assert';
import { UserPresenter } from './user.presenter';

type Entity = Parameters<UserPresenter['toResponse']>[0];
type LoadedUser = Prisma.AppUserGetPayload<{
  select: {
    id: true;
    email: true;
    fullName: true;
    phone: true;
    isActive: true;
    lastLoginAt: true;
    createdAt: true;
    userRoles: { select: { role: { select: { id: true; name: true } } } };
  };
}>;

assertType<Equal<Entity, LoadedUser>>();
