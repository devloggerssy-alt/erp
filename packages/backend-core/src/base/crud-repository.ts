import { Injectable, NotFoundException } from '@nestjs/common';

// ── Entity contracts ─────────────────────────────────────────────────────────

export interface TenantEntity {
  id: string;
  tenantId: string;
}

// ── Query options ─────────────────────────────────────────────────────────────

export interface FindManyOptions {
  skip?: number;
  take?: number;
  where?: Record<string, any>;
  orderBy?: Record<string, any> | Record<string, any>[];
  include?: Record<string, any>;
}

export interface FindManyResult<T> {
  data: T[];
  total: number;
}

// ── Base CRUD repository ──────────────────────────────────────────────────────

/**
 * Generic tenant-scoped CRUD repository.
 *
 * Extend this class and inject the Prisma delegate for your model:
 * ```ts
 * @Injectable()
 * export class UnitsRepository extends CrudRepository<Unit> {
 *   constructor(private prisma: PrismaService) {
 *     super(prisma.unit);
 *   }
 * }
 * ```
 */
@Injectable()
export abstract class CrudRepository<T extends TenantEntity> {
  constructor(protected readonly model: any) {}

  /**
   * Find many records scoped to a tenant.
   * Automatically merges `tenantId` into the `where` clause.
   */
  async findMany(tenantId: string, options: FindManyOptions = {}): Promise<FindManyResult<T>> {
    const { skip = 0, take = 10, where = {}, include } = options;
    const orderBy = options.orderBy ?? { createdAt: 'desc' };
    const scopedWhere = { ...where, tenantId };

    const [data, total] = await Promise.all([
      this.model.findMany({
        skip,
        take,
        where: scopedWhere,
        orderBy,
        ...(include ? { include } : {}),
      }),
      this.model.count({ where: scopedWhere }),
    ]);

    return { data, total };
  }

  /**
   * Find a single record by id within a tenant.
   * Returns null if not found.
   */
  async findById(tenantId: string, id: string): Promise<T | null> {
    return this.model.findFirst({ where: { id, tenantId } });
  }

  /**
   * Find a single record by id within a tenant, throwing if missing.
   */
  async findByIdOrFail(tenantId: string, id: string, resourceName = 'Resource'): Promise<T> {
    const entity = await this.findById(tenantId, id);
    if (!entity) {
      throw new NotFoundException(`${resourceName} with id "${id}" not found`);
    }
    return entity;
  }

  /**
   * Create a new record. Caller is responsible for including `tenantId` in data.
   */
  async create(data: Record<string, any>): Promise<T> {
    return this.model.create({ data });
  }

  /**
   * Update a record by id.
   */
  async update(id: string, data: Record<string, any>): Promise<T> {
    return this.model.update({ where: { id }, data });
  }

  /**
   * Hard-delete a record by id.
   */
  async delete(id: string): Promise<T> {
    return this.model.delete({ where: { id } });
  }

  /**
   * Check whether a record matching `where` (scoped to tenant) exists.
   */
  async exists(tenantId: string, where: Record<string, any>): Promise<boolean> {
    const count = await this.model.count({ where: { ...where, tenantId } });
    return count > 0;
  }
}
