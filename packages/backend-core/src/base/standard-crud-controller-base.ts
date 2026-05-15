import {
  Body,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Type,
  UsePipes,
} from '@nestjs/common';
import { ApiBody } from '@nestjs/swagger';
import { ApiQueryOptionsDto } from '../api/api-query-options.dto.js';
import { ApiResponseBuilder } from '../api/api-response-builder.js';
import { resolvePagination, buildPrismaWhere, buildPrismaOrderBy } from '../api/api-query.utils.js';
import {
  CrudCreate,
  CrudDelete,
  CrudList,
  CrudShow,
  CrudUpdate,
  type CrudIdParamDoc,
  type CrudOperationDoc,
} from '../decorators/crud-swagger.decorators.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { RequestUser } from '../auth/request-user.js';
import type { ICrudService } from './crud-controller.js';
import { createClassDtoBodyPipe } from './class-dto-body.pipe.js';

/** OpenAPI fragments for each verb; nested under `openApi` in {@link CreateStandardCrudControllerBaseConfig}. */
export type StandardCrudOpenApi = {
  list: {
    operation: CrudOperationDoc;
    responseDescription?: string;
  };
  show: {
    operation: CrudOperationDoc;
    responseDescription?: string;
    idParam?: CrudIdParamDoc;
  };
  create: {
    operation: CrudOperationDoc;
    responseDescription?: string;
  };
  update: {
    operation: CrudOperationDoc;
    responseDescription?: string;
    idParam?: CrudIdParamDoc;
  };
  delete: {
    operation: CrudOperationDoc;
    noContentDescription?: string;
    idParam?: CrudIdParamDoc;
  };
};

/** @deprecated Use {@link StandardCrudOpenApi} */
export type StandardCrudHttpOpenApi = StandardCrudOpenApi;

export type CreateStandardCrudControllerBaseConfig<TResponse, TCreateDto, TUpdateDto> = {
  responseDto: Type<TResponse>;
  createDto: Type<TCreateDto>;
  updateDto: Type<TUpdateDto>;
  openApi: StandardCrudOpenApi;
};

/**
 * Returns a Nest controller base class with standard CRUD routes, Swagger, tenant-scoped
 * service calls, pagination/filter/sort list options, and {@link ApiResponseBuilder} envelopes.
 *
 * Concrete resources extend the returned class and supply `@Controller`, guards, and
 * `super(service, resourceLabel)`.
 *
 * Override protected hooks for HTTP-level customization; keep domain rules on the service.
 */
export function createStandardCrudControllerBase<TResponse, TCreateDto, TUpdateDto>(
  config: CreateStandardCrudControllerBaseConfig<TResponse, TCreateDto, TUpdateDto>,
): new (
  service: ICrudService<TResponse, TCreateDto, TUpdateDto>,
  resourceLabel: string,
) => object {
  const { responseDto, createDto, updateDto, openApi } = config;

  class StandardCrudControllerBase {
    constructor(
      protected readonly service: ICrudService<TResponse, TCreateDto, TUpdateDto>,
      protected readonly resourceLabel: string,
    ) {}

    /** Options object passed to {@link ICrudService.list} (pagination, where, orderBy). */
    protected buildListOptions(_user: RequestUser, query: ApiQueryOptionsDto): Record<string, any> {
      const { skip, limit } = resolvePagination(query);
      return {
        skip,
        take: limit,
        where: buildPrismaWhere(query),
        orderBy: buildPrismaOrderBy(query),
      };
    }

    protected async beforeCreate(_user: RequestUser, _dto: TCreateDto): Promise<void> {}

    protected async beforeUpdate(
      _user: RequestUser,
      _id: string,
      _dto: TUpdateDto,
    ): Promise<void> {}

    protected async beforeDelete(_user: RequestUser, _id: string): Promise<void> {}

    protected async afterCreate(_user: RequestUser, _item: TResponse): Promise<void> {}

    protected async afterUpdate(_user: RequestUser, _item: TResponse): Promise<void> {}

    @Get()
    @CrudList(responseDto, openApi.list)
    async list(@CurrentUser() user: RequestUser, @Query() query: ApiQueryOptionsDto) {
      const options = this.buildListOptions(user, query);
      const result = await this.service.list(user.tenantId, options);
      const meta = ApiResponseBuilder.buildPaginationMeta(query, result.total);
      return ApiResponseBuilder.success(result.data, `${this.resourceLabel} list`, meta);
    }

    @Get(':id')
    @CrudShow(responseDto, openApi.show)
    async show(@CurrentUser() user: RequestUser, @Param('id') id: string) {
      const item = await this.service.findById(user.tenantId, id);
      return ApiResponseBuilder.success(item, `${this.resourceLabel} details`);
    }

    @Post()
    @CrudCreate(responseDto, openApi.create)
    @ApiBody({ type: createDto, required: true })
    @UsePipes(createClassDtoBodyPipe(createDto as new (...args: unknown[]) => unknown))
    async create(@CurrentUser() user: RequestUser, @Body() dto: TCreateDto) {
      await this.beforeCreate(user, dto);
      const created = await this.service.create(user.tenantId, dto);
      await this.afterCreate(user, created);
      return ApiResponseBuilder.success(created, `${this.resourceLabel} created`);
    }

    @Patch(':id')
    @CrudUpdate(responseDto, openApi.update)
    @ApiBody({ type: updateDto, required: true })
    @UsePipes(createClassDtoBodyPipe(updateDto as new (...args: unknown[]) => unknown))
    async update(
      @CurrentUser() user: RequestUser,
      @Param('id') id: string,
      @Body() dto: TUpdateDto,
    ) {
      await this.beforeUpdate(user, id, dto);
      const updated = await this.service.update(user.tenantId, id, dto);
      await this.afterUpdate(user, updated);
      return ApiResponseBuilder.success(updated, `${this.resourceLabel} updated`);
    }

    @Delete(':id')
    @CrudDelete(openApi.delete)
    async delete(@CurrentUser() user: RequestUser, @Param('id') id: string): Promise<void> {
      await this.beforeDelete(user, id);
      await this.service.delete(user.tenantId, id);
    }
  }

  return StandardCrudControllerBase as new (
    service: ICrudService<TResponse, TCreateDto, TUpdateDto>,
    resourceLabel: string,
  ) => object;
}
