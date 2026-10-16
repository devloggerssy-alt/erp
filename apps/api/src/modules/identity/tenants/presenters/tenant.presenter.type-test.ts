import type { Tenant } from '@devloggers/db-prisma';
import { assertType, type Equal } from '@/common/types/type-assert';
import { TenantPresenter } from './tenant.presenter';

type Entity = Parameters<TenantPresenter['toResponse']>[0];

assertType<Equal<Entity, Tenant>>();
