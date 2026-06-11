import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { createCrudController, type CrudOpenApi } from '@devloggers/backend-core';
import { ItemRelationsService } from '../services/item-relations.service';
import { CreateItemRelationDto, UpdateItemRelationDto, ItemRelationResponseDto } from '../dto';
import { JwtAuthGuard } from '@/modules/identity/auth/guards';

const ITEM_RELATIONS_CRUD_OPENAPI = {
  list: {
    operation: {
      summary: 'List item relations',
      description:
        'Returns relations for items. Filter by itemId to get relations for a specific item.',
    },
    responseDescription: 'Paginated list of item relations',
  },
  show: {
    operation: { summary: 'Get an item relation by ID' },
    responseDescription: 'Item relation details',
    idParam: { description: 'Relation UUID' },
  },
  create: {
    operation: {
      summary: 'Create an item relation',
      description: 'Creates a directional relation between two items.',
    },
    responseDescription: 'Relation created',
  },
  update: {
    operation: {
      summary: 'Update an item relation',
      description: 'Updates relation type or notes.',
    },
    responseDescription: 'Updated relation',
    idParam: { description: 'Relation UUID' },
  },
  delete: {
    operation: { summary: 'Delete an item relation' },
    noContentDescription: 'Relation deleted',
    idParam: { description: 'Relation UUID' },
  },
} satisfies CrudOpenApi;

const ItemRelationsCrudBase = createCrudController({
  responseDto: ItemRelationResponseDto,
  createDto: CreateItemRelationDto,
  updateDto: UpdateItemRelationDto,
  openApi: ITEM_RELATIONS_CRUD_OPENAPI,
  filterSchema: [
    { field: 'itemId', type: 'string' },
    { field: 'relatedItemId', type: 'string' },
    { field: 'relationType', type: 'string' },
  ],
});

/**
 * Item relations controller.
 *
 * Standard CRUD HTTP surface comes from {@link createCrudController}; this class
 * only pins the path, auth, and service wiring.
 */
@ApiTags('Catalog / Item Relations')
@Controller('item-relations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ItemRelationsController extends ItemRelationsCrudBase {
  constructor(private readonly itemRelationsService: ItemRelationsService) {
    super(itemRelationsService, 'Item Relation');
  }
}
