import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

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

// ── Prisma error → HTTP exception mapper ─────────────────────────────────────

function mapPrismaError(error: unknown): never {
  // Structural check — works for PrismaClientKnownRequestError and driver adapter wrappers alike
  if (error != null && typeof error === 'object' && 'code' in error) {
    const e = error as { code: string; meta?: { target?: unknown; field_name?: string; constraint?: string } };
    if (e.code === 'P2003') {
      throw new ConflictException(
        'Cannot complete operation: this record is referenced by another record and cannot be modified or deleted.',
      );
    }
    if (e.code === 'P2002') {
      const target = e.meta?.target;
      const field = Array.isArray(target) ? target.join(', ') : String(target ?? 'field');
      throw new ConflictException(`A record with this ${field} already exists.`);
    }
  }
  // Fallback: driver adapter FK errors that bubble up without a P-code
  if (
    error instanceof Error &&
    (error.message.includes('ForeignKeyConstraintViolation') ||
      error.message.toLowerCase().includes('foreign key constraint'))
  ) {
    throw new ConflictException(
      'Cannot complete operation: this record is referenced by another record and cannot be modified or deleted.',
    );
  }
  throw error;
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
    try {
      return await this.model.create({ data });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  /**
   * Update a record by id.
   */
  async update(id: string, data: Record<string, any>): Promise<T> {
    try {
      return await this.model.update({ where: { id }, data });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  /**
   * Hard-delete a record by id.
   */
  async delete(id: string): Promise<T> {
    try {
      return await this.model.delete({ where: { id } });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  /**
   * Check whether a record matching `where` (scoped to tenant) exists.
   */
  async exists(tenantId: string, where: Record<string, any>): Promise<boolean> {
    const count = await this.model.count({ where: { ...where, tenantId } });
    return count > 0;
  }
}
