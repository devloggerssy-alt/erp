import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CatalogEntitiesService } from '../services/catalog-entities.service';
import {
  CreateCatalogEntityDto,
  UpdateCatalogEntityDto,
  CatalogEntityResponseDto,
} from '../dto';
import {
  createCrudController,
  type CrudOpenApi,
} from '@devloggers/backend-core';
import { JwtAuthGuard } from '@/modules/identity/auth/guards';

const CATALOG_ENTITIES_CRUD_OPENAPI = {
  list: {
    operation: {
      summary: 'List catalog entities',
      description:
        'Returns a paginated, filterable list of catalog entities (brands, models, generations, variants, years) belonging to the authenticated tenant.',
    },
    responseDescription: 'Paginated list of catalog entities',
  },
  show: {
    operation: { summary: 'Get a catalog entity by ID' },
    responseDescription: 'Catalog entity details',
    idParam: { description: 'Catalog entity UUID' },
  },
  create: {
    operation: {
      summary: 'Create a catalog entity',
      description:
        'Creates a new catalog entity. Name must be unique for the given kind under the same parent within the tenant.',
    },
    responseDescription: 'Catalog entity created successfully',
  },
  update: {
    operation: {
      summary: 'Update a catalog entity',
      description: 'Partial update — only provided fields are changed.',
    },
    responseDescription: 'Updated catalog entity',
    idParam: { description: 'Catalog entity UUID' },
  },
  delete: {
    operation: {
      summary: 'Delete a catalog entity',
      description:
        'Hard-deletes the catalog entity. Will fail if the entity has child entities.',
    },
    noContentDescription: 'Catalog entity deleted successfully',
    idParam: { description: 'Catalog entity UUID' },
  },
} satisfies CrudOpenApi;

const CatalogEntitiesCrudBase = createCrudController({
  responseDto: CatalogEntityResponseDto,
  createDto: CreateCatalogEntityDto,
  updateDto: UpdateCatalogEntityDto,
  filterSchema: [
    { field: 'name', type: 'string' },
    { field: 'kind', type: 'string' },
    { field: 'parentId', type: 'string' },
    { field: 'isActive', type: 'boolean' },
    { field: 'createdAt', type: 'date' },
  ],
  openApi: CATALOG_ENTITIES_CRUD_OPENAPI,
});

/**
 * Catalog entities controller.
 *
 * Standard CRUD HTTP surface comes from {@link createCrudController}; this class
 * only pins the path, auth, and service wiring.
 */
@ApiTags('Catalog / Catalog Entities')
@Controller('catalog-entities')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class CatalogEntitiesController extends CatalogEntitiesCrudBase {
  constructor(private readonly catalogEntitiesService: CatalogEntitiesService) {
    super(catalogEntitiesService, 'Catalog entity');
  }
}
