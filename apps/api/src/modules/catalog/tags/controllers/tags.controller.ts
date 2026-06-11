import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { createCrudController, type CrudOpenApi } from '@devloggers/backend-core';
import { TagsService } from '../services/tags.service';
import { CreateTagDto, UpdateTagDto, TagResponseDto } from '../dto';
import { JwtAuthGuard } from '@/modules/identity/auth/guards';

const TAGS_CRUD_OPENAPI = {
  list: {
    operation: {
      summary: 'List tags',
      description: 'Returns a paginated list of tags for the tenant, filterable by module.',
    },
    responseDescription: 'Paginated list of tags',
  },
  show: {
    operation: { summary: 'Get a tag by ID' },
    responseDescription: 'Tag details',
    idParam: { description: 'Tag UUID' },
  },
  create: {
    operation: {
      summary: 'Create a tag',
      description: 'Creates a new tag. Name must be unique within the module.',
    },
    responseDescription: 'Tag created',
  },
  update: {
    operation: {
      summary: 'Update a tag',
      description: 'Partial update — name and color only. Module is immutable.',
    },
    responseDescription: 'Updated tag',
    idParam: { description: 'Tag UUID' },
  },
  delete: {
    operation: {
      summary: 'Delete a tag',
      description: 'Hard-deletes the tag and all its assignments.',
    },
    noContentDescription: 'Tag deleted',
    idParam: { description: 'Tag UUID' },
  },
} satisfies CrudOpenApi;

const TagsCrudBase = createCrudController({
  responseDto: TagResponseDto,
  createDto: CreateTagDto,
  updateDto: UpdateTagDto,
  openApi: TAGS_CRUD_OPENAPI,
});

/**
 * Tags controller.
 *
 * Standard CRUD HTTP surface comes from {@link createCrudController}; this class
 * only pins the path, auth, and service wiring.
 */
@ApiTags('Catalog / Tags')
@Controller('tags')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class TagsController extends TagsCrudBase {
  constructor(private readonly tagsService: TagsService) {
    super(tagsService, 'Tag');
  }
}
