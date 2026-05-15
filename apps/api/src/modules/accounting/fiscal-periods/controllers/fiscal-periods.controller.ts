import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { FiscalPeriodsService } from '../services/fiscal-periods.service';
import { CreateFiscalPeriodDto, UpdateFiscalPeriodDto, FiscalPeriodResponseDto } from '../dto';
import { createStandardCrudControllerBase, type StandardCrudOpenApi } from '@devloggers/backend-core';
import { JwtAuthGuard } from '@/modules/identity/auth/guards';

const FISCAL_PERIODS_OPENAPI = {
    list: {
        operation: { summary: 'List fiscal periods' },
        responseDescription: 'Paginated list of fiscal periods',
    },
    show: {
        operation: { summary: 'Get a fiscal period by ID' },
        responseDescription: 'Fiscal period details',
        idParam: { description: 'Fiscal period UUID' },
    },
    create: {
        operation: { summary: 'Create a fiscal period', description: 'Start/end dates must not overlap with existing periods.' },
        responseDescription: 'Fiscal period created successfully',
    },
    update: {
        operation: { summary: 'Update a fiscal period', description: 'LOCKED periods cannot be modified.' },
        responseDescription: 'Updated fiscal period',
        idParam: { description: 'Fiscal period UUID' },
    },
    delete: {
        operation: { summary: 'Delete a fiscal period' },
        noContentDescription: 'Fiscal period deleted successfully',
        idParam: { description: 'Fiscal period UUID' },
    },
} satisfies StandardCrudOpenApi;

const FiscalPeriodsCrudBase = createStandardCrudControllerBase({
    responseDto: FiscalPeriodResponseDto,
    createDto: CreateFiscalPeriodDto,
    updateDto: UpdateFiscalPeriodDto,
    openApi: FISCAL_PERIODS_OPENAPI,
});

@ApiTags('Accounting / Fiscal Periods')
@Controller('fiscal-periods')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class FiscalPeriodsController extends FiscalPeriodsCrudBase {
    constructor(private readonly fiscalPeriodsService: FiscalPeriodsService) {
        super(fiscalPeriodsService, 'Fiscal Period');
    }
}
