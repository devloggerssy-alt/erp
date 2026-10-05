import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { BrandsService } from '../services/brands.service';
import { CreateBrandDto, UpdateBrandDto, BrandResponseDto } from '../dto';
import {
  createCrudController,
  type CrudOpenApi,
  type FilterSchema,
} from '@devloggers/backend-core';
import { JwtAuthGuard, PermissionsGuard } from '@/modules/identity/auth/guards';

const BRANDS_CRUD_OPENAPI = {
  list: {
    operation: {
      summary: 'List brands',
      description: 'Returns a paginated, filterable list of brands belonging to the authenticated tenant.',
    },
    responseDescription: 'Paginated list of brands',
  },
  show: {
    operation: { summary: 'Get a brand by ID' },
    responseDescription: 'Brand details',
    idParam: { description: 'Brand UUID' },
  },
  create: {
    operation: {
      summary: 'Create a brand',
      description: 'Creates a new brand. Name must be unique within the tenant.',
    },
    responseDescription: 'Brand created successfully',
  },
  update: {
    operation: {
      summary: 'Update a brand',
      description: 'Partial update — only provided fields are changed.',
    },
    responseDescription: 'Updated brand',
    idParam: { description: 'Brand UUID' },
  },
  delete: {
    operation: {
      summary: 'Delete a brand',
      description: 'Hard-deletes the brand.',
    },
    noContentDescription: 'Brand deleted successfully',
    idParam: { description: 'Brand UUID' },
  },
} satisfies CrudOpenApi;

export const BRANDS_FILTER_SCHEMA: FilterSchema = [
  { field: 'name', type: 'string' },
  { field: 'isActive', type: 'boolean' },
  { field: 'createdAt', type: 'date' },
];

const BrandsCrudBase = createCrudController({
  responseDto: BrandResponseDto,
  createDto: CreateBrandDto,
  updateDto: UpdateBrandDto,
  filterSchema: BRANDS_FILTER_SCHEMA,
  permissions: {
    view: 'brands.view',
    create: 'brands.create',
    update: 'brands.update',
    delete: 'brands.delete',
  },
  openApi: BRANDS_CRUD_OPENAPI,
});

@ApiTags('Catalog / Brands')
@Controller('brands')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class BrandsController extends BrandsCrudBase {
  constructor(private readonly brandsService: BrandsService) {
    super(brandsService, 'Brand');
  }
}
