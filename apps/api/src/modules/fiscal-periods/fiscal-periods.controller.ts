import {
    Controller,
    Get,
    Post,
    Patch,
    Body,
    Param,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { FiscalPeriodsService } from './fiscal-periods.service';
import { CreateFiscalPeriodDto, UpdateFiscalPeriodDto } from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser, RequestUser } from '../auth/decorators';
import { ApiResponseBuilder } from '../../common/api/api-response-builder';

@ApiTags('Fiscal Periods')
@Controller('fiscal-periods')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class FiscalPeriodsController {
    constructor(private readonly fiscalPeriodsService: FiscalPeriodsService) {}

    @Get()
    async findAll(@CurrentUser() user: RequestUser) {
        const periods = await this.fiscalPeriodsService.findAll(user.tenantId);
        return ApiResponseBuilder.success(periods, 'Fiscal periods list');
    }

    @Post()
    async create(@CurrentUser() user: RequestUser, @Body() dto: CreateFiscalPeriodDto) {
        const period = await this.fiscalPeriodsService.create(user.tenantId, dto);
        return ApiResponseBuilder.success(period, 'Fiscal period created');
    }

    @Patch(':id')
    async update(
        @CurrentUser() user: RequestUser,
        @Param('id') id: string,
        @Body() dto: UpdateFiscalPeriodDto,
    ) {
        const period = await this.fiscalPeriodsService.update(user.tenantId, id, dto);
        return ApiResponseBuilder.success(period, 'Fiscal period updated');
    }
}
