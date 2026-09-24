import { NotFoundException } from '@nestjs/common';
import type { PermissionKey } from '@devloggers/api-contracts';
import { ApiQueryOptionsDto } from '../api/api-query-options.dto.js';
import { buildPrismaWhere, resolvePagination } from '../api/api-query.utils.js';
import type { FilterSchema } from '../api/filter-schema.js';
import type { ICrudService } from '../base/crud-service.js';
import type { AiTool } from './ai-tool.types.js';
import { AiIdDto, AiListQueryDto } from './ai-tool-dtos.js';
import { defineAiTool } from './define-ai-tool.js';
import { dtoInput, withId } from './dto-input.js';
import type { DtoClass } from './dto-json-schema.js';

export type CrudAiOp = 'list' | 'show' | 'create' | 'update' | 'delete';

export interface CrudAiToolsConfig<TResponse, TCreate extends object, TUpdate extends object> {
  /** Tool-name prefix, e.g. `units` → `units.list`. */
  readonly prefix: string;
  /** api-contracts resource key the tools act on. */
  readonly resource: string;
  readonly domain: string;
  /** Human noun for descriptions, e.g. "unit of measure". */
  readonly label: string;
  readonly service: ICrudService<TResponse, TCreate, TUpdate>;
  readonly createDto: DtoClass<TCreate>;
  readonly updateDto: DtoClass<TUpdate>;
  /** Same filter schema as the HTTP controller (search on localized fields needs it). */
  readonly filterSchema: FilterSchema;
  readonly searchFields: readonly string[];
  readonly permissions: {
    readonly view: PermissionKey;
    readonly create: PermissionKey;
    readonly update: PermissionKey;
    readonly delete?: PermissionKey;
  };
  /** Default `['list','show','create','update']`. `delete` is opt-in and becomes `destructive`. */
  readonly ops?: readonly CrudAiOp[];
  /** Narrows the tools to a subset of the resource (e.g. customers within parties). */
  readonly scope?: {
    readonly listWhere?: Record<string, unknown>;
    readonly createDefaults?: Partial<TCreate>;
    readonly omitInputFields?: readonly string[];
    readonly isInScope?: (item: TResponse) => boolean;
  };
}

const DEFAULT_OPS: readonly CrudAiOp[] = ['list', 'show', 'create', 'update'];
const DEFAULT_LIMIT = 20;

export function defineCrudAiTools<TResponse, TCreate extends object, TUpdate extends object>(
  config: CrudAiToolsConfig<TResponse, TCreate, TUpdate>,
): AiTool[] {
  const { prefix, resource, domain, label, service, permissions, scope = {} } = config;
  const ops = config.ops ?? DEFAULT_OPS;
  const omit = scope.omitInputFields ?? [];

  const findInScope = async (tenantId: string, id: string): Promise<TResponse> => {
    const item = await service.findById(tenantId, id);
    if (scope.isInScope && !scope.isInScope(item)) {
      throw new NotFoundException(`${label} with id '${id}' not found`);
    }
    return item;
  };

  const tools: AiTool[] = [];

  if (ops.includes('list')) {
    tools.push(
      defineAiTool({
        name: `${prefix}.list`,
        domain,
        resource,
        risk: 'read',
        permission: permissions.view,
        description:
          `List ${label} records, newest first. Optional free-text "search" matches ${config.searchFields.join(', ')}. ` +
          `Returns { items, total, page }; at most 50 items per page.`,
        input: dtoInput(AiListQueryDto),
        handler: async (ctx, input) => {
          const query = Object.assign(new ApiQueryOptionsDto(), {
            page: input.page ?? 1,
            limit: input.limit ?? DEFAULT_LIMIT,
            search: input.search,
            searchIn: input.search ? config.searchFields.join(',') : undefined,
          });
          const { skip, limit, page } = resolvePagination(query);
          const where = { ...buildPrismaWhere(query, config.filterSchema), ...scope.listWhere };
          const result = await service.list(ctx.tenantId, { skip, take: limit, where, orderBy: { createdAt: 'desc' } });
          return { items: result.data, total: result.total, page };
        },
      }),
    );
  }

  if (ops.includes('show')) {
    tools.push(
      defineAiTool({
        name: `${prefix}.show`,
        domain,
        resource,
        risk: 'read',
        permission: permissions.view,
        description: `Get one ${label} by its UUID.`,
        input: dtoInput(AiIdDto),
        handler: (ctx, input) => findInScope(ctx.tenantId, input.id),
      }),
    );
  }

  if (ops.includes('create')) {
    tools.push(
      defineAiTool({
        name: `${prefix}.create`,
        domain,
        resource,
        risk: 'write',
        permission: permissions.create,
        description: `Create a ${label}. The user must approve before it runs.`,
        input: dtoInput(config.createDto, { omit, defaults: scope.createDefaults }),
        handler: (ctx, input) => service.create(ctx.tenantId, input),
      }),
    );
  }

  if (ops.includes('update')) {
    tools.push(
      defineAiTool({
        name: `${prefix}.update`,
        domain,
        resource,
        risk: 'write',
        permission: permissions.update,
        description: `Update a ${label} by UUID. Send only the fields to change. The user must approve before it runs.`,
        input: withId(dtoInput(config.updateDto, { omit })),
        handler: async (ctx, input) => {
          await findInScope(ctx.tenantId, input.id);
          return service.update(ctx.tenantId, input.id, input.value);
        },
      }),
    );
  }

  if (ops.includes('delete')) {
    if (!permissions.delete) throw new Error(`${prefix}.delete requires permissions.delete`);
    const deletePermission = permissions.delete;
    tools.push(
      defineAiTool({
        name: `${prefix}.delete`,
        domain,
        resource,
        risk: 'destructive',
        permission: deletePermission,
        description: `Permanently delete a ${label} by UUID. The user must approve before it runs.`,
        input: dtoInput(AiIdDto),
        handler: async (ctx, input) => {
          await findInScope(ctx.tenantId, input.id);
          await service.delete(ctx.tenantId, input.id);
          return { id: input.id, deleted: true };
        },
      }),
    );
  }

  return tools;
}
