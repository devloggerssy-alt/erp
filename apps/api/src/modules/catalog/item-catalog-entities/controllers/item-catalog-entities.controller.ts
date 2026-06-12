import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ItemCatalogEntitiesService } from '../services/item-catalog-entities.service';
import {
  CreateItemCatalogEntityDto,
  UpdateItemCatalogEntityDto,
  ItemCatalogEntityResponseDto,
} from '../dto';
import {
  createCrudController,
  type CrudOpenApi,
} from '@devloggers/backend-core';
import { JwtAuthGuard } from '@/modules/identity/auth/guards';

const ITEM_CATALOG_ENTITIES_CRUD_OPENAPI = {
  list: {
    operation: {
      summary: 'List item catalog entity links',
      description:
        'Returns a paginated, filterable list of links between items and catalog entities belonging to the authenticated tenant.',
    },
    responseDescription: 'Paginated list of item catalog entity links',
  },
  show: {
    operation: { summary: 'Get an item catalog entity link by ID' },
    responseDescription: 'Item catalog entity link details',
    idParam: { description: 'Item catalog entity link UUID' },
  },
  create: {
    operation: {
      summary: 'Create an item catalog entity link',
      description:
        'Links an item to a catalog entity. The pair must be unique within the tenant.',
    },
    responseDescription: 'Item catalog entity link created successfully',
  },
  update: {
    operation: {
      summary: 'Update an item catalog entity link',
      description: 'Junction records are immutable — there are no updatable fields.',
    },
    responseDescription: 'Updated item catalog entity link',
    idParam: { description: 'Item catalog entity link UUID' },
  },
  delete: {
    operation: {
      summary: 'Delete an item catalog entity link',
      description: 'Hard-deletes the link between the item and the catalog entity.',
    },
    noContentDescription: 'Item catalog entity link deleted successfully',
    idParam: { description: 'Item catalog entity link UUID' },
  },
} satisfies CrudOpenApi;

const ItemCatalogEntitiesCrudBase = createCrudController({
  responseDto: ItemCatalogEntityResponseDto,
  createDto: CreateItemCatalogEntityDto,
  updateDto: UpdateItemCatalogEntityDto,
  filterSchema: [
    { field: 'itemId', type: 'string' },
    { field: 'catalogEntityId', type: 'string' },
  ],
  openApi: ITEM_CATALOG_ENTITIES_CRUD_OPENAPI,
});

/**
 * Item catalog entities controller.
 *
 * Standard CRUD HTTP surface comes from {@link createCrudController}; this class
 * only pins the path, auth, and service wiring.
 */
@ApiTags('Catalog / Item Catalog Entities')
@Controller('item-catalog-entities')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ItemCatalogEntitiesController extends ItemCatalogEntitiesCrudBase {
  constructor(private readonly itemCatalogEntitiesService: ItemCatalogEntitiesService) {
    super(itemCatalogEntitiesService, 'Item catalog entity link');
  }
}
