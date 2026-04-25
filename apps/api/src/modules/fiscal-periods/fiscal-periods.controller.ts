import {
    Controller,
    Get,
    Post,
    Patch,
    Body,
    Param,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiOkResponse, ApiCreatedResponse } from '@nestjs/swagger';
import { FiscalPeriodsService } from './fiscal-periods.service';
import { CreateFiscalPeriodDto, UpdateFiscalPeriodDto } from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser, RequestUser } from '../auth/decorators';
import { ApiResponseBuilder } from '../../common/api/api-response-builder';
import { ApiStandardErrors } from '../../common/decorators/api-swagger.decorators';

@ApiTags('Fiscal Periods')
@Controller('fiscal-periods')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class FiscalPeriodsController {
    constructor(private readonly fiscalPeriodsService: FiscalPeriodsService) {}

    @Get()
    @ApiOperation({ summary: 'List all fiscal periods' })
    @ApiOkResponse({
        description: 'Fiscal periods list retrieved',
        schema: {
            example: {
                message: 'Fiscal periods list',
                data: [
                    { id: '00000000-0000-4000-a400-000000000001', name: '2026', startDate: '2026-01-01', endDate: '2026-12-31', isClosed: false },
                ],
            },
        },
    })
    @ApiStandardErrors()
    async findAll(@CurrentUser() user: RequestUser) {
        const periods = await this.fiscalPeriodsService.findAll(user.tenantId);
        return ApiResponseBuilder.success(periods, 'Fiscal periods list');
    }

    @Post()
    @ApiOperation({ summary: 'Create a new fiscal period' })
    @ApiCreatedResponse({
        description: 'Fiscal period created',
        schema: {
            example: {
                message: 'Fiscal period created',
                data: { id: '00000000-0000-4000-a400-000000000002', name: '2027', startDate: '2027-01-01', endDate: '2027-12-31', isClosed: false },
            },
        },
    })
    @ApiStandardErrors()
    async create(@CurrentUser() user: RequestUser, @Body() dto: CreateFiscalPeriodDto) {
        const period = await this.fiscalPeriodsService.create(user.tenantId, dto);
        return ApiResponseBuilder.success(period, 'Fiscal period created');
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update a fiscal period' })
    @ApiOkResponse({
        description: 'Fiscal period updated',
        schema: {
            example: {
                message: 'Fiscal period updated',
                data: { id: '00000000-0000-4000-a400-000000000001', name: '2026 (Updated)', isClosed: false },
            },
        },
    })
    @ApiStandardErrors()
    async update(
        @CurrentUser() user: RequestUser,
        @Param('id') id: string,
        @Body() dto: UpdateFiscalPeriodDto,
    ) {
        const period = await this.fiscalPeriodsService.update(user.tenantId, id, dto);
        return ApiResponseBuilder.success(period, 'Fiscal period updated');
    }
}
