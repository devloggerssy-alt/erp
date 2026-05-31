import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UnitsService } from '../services/units.service';
import { CreateUnitDto, UpdateUnitDto, UnitResponseDto } from '../dto';
import {
  createCrudController,
  type CrudOpenApi,
} from '@devloggers/backend-core';
import { JwtAuthGuard } from '@/modules/identity/auth/guards';

const UNITS_CRUD_OPENAPI = {
  list: {
    operation: {
      summary: 'List units of measure',
      description:
        'Returns a paginated, filterable list of units belonging to the authenticated tenant.',
    },
    responseDescription: 'Paginated list of units',
  },
  show: {
    operation: { summary: 'Get a unit by ID' },
    responseDescription: 'Unit details',
    idParam: { description: 'Unit UUID' },
  },
  create: {
    operation: {
      summary: 'Create a unit of measure',
      description: 'Creates a new unit. Name must be unique within the tenant.',
    },
    responseDescription: 'Unit created successfully',
  },
  update: {
    operation: {
      summary: 'Update a unit of measure',
      description: 'Partial update — only provided fields are changed.',
    },
    responseDescription: 'Updated unit',
    idParam: { description: 'Unit UUID' },
  },
  delete: {
    operation: {
      summary: 'Delete a unit of measure',
      description:
        'Hard-deletes the unit. Will fail if the unit is referenced by active items or invoice lines.',
    },
    noContentDescription: 'Unit deleted successfully',
    idParam: { description: 'Unit UUID' },
  },
} satisfies CrudOpenApi;

const UnitsCrudBase = createCrudController({
  responseDto: UnitResponseDto,
  createDto: CreateUnitDto,
  updateDto: UpdateUnitDto,
  filterSchema: [
    { field: 'name', type: 'string' },
    { field: 'abbreviation', type: 'string' },
    { field: 'isActive', type: 'boolean' },
    { field: 'createdAt', type: 'date' },
  ],
  openApi: UNITS_CRUD_OPENAPI,
});

/**
 * Units of measure controller.
 *
 * Standard CRUD HTTP surface comes from {@link createCrudController}; this class
 * only pins the path, auth, and service wiring.
 */
@ApiTags('Catalog / Units')
@Controller('units')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class UnitsController extends UnitsCrudBase {
  constructor(private readonly unitsService: UnitsService) {
    super(unitsService, 'Unit');
  }
}
