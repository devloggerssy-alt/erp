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
import { UnitsService } from './units.service';
import { CreateUnitDto, UpdateUnitDto } from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser, RequestUser } from '../auth/decorators';
import { ApiResponseBuilder } from '../../common/api/api-response-builder';
import { ApiStandardErrors } from '../../common/decorators/api-swagger.decorators';

@ApiTags('Units')
@Controller('units')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class UnitsController {
    constructor(private readonly unitsService: UnitsService) {}

    @Get()
    @ApiOperation({ summary: 'List all units of measure' })
    @ApiOkResponse({
        description: 'Units list retrieved',
        schema: {
            example: {
                message: 'Units list',
                data: [
                    { id: '00000000-0000-4000-a800-000000000001', name: 'Piece', abbreviation: 'pc' },
                    { id: '00000000-0000-4000-a800-000000000002', name: 'Box', abbreviation: 'box' },
                ],
            },
        },
    })
    @ApiStandardErrors()
    async findAll(@CurrentUser() user: RequestUser) {
        const result = await this.unitsService.findAll(user.tenantId);
        return ApiResponseBuilder.success(result.data, 'Units list');
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get unit by ID' })
    @ApiOkResponse({
        description: 'Unit details returned',
        schema: {
            example: {
                message: 'Unit details',
                data: { id: '00000000-0000-4000-a800-000000000001', name: 'Piece', abbreviation: 'pc' },
            },
        },
    })
    @ApiStandardErrors()
    async findOne(
        @CurrentUser() user: RequestUser,
        @Param('id') id: string,
    ) {
        const unit = await this.unitsService.findById(user.tenantId, id);
        return ApiResponseBuilder.success(unit, 'Unit details');
    }

    @Post()
    @ApiOperation({ summary: 'Create a new unit of measure' })
    @ApiCreatedResponse({
        description: 'Unit created',
        schema: {
            example: {
                message: 'Unit created',
                data: { id: '00000000-0000-4000-a800-000000000003', name: 'Kilogram', abbreviation: 'kg' },
            },
        },
    })
    @ApiStandardErrors()
    async create(@CurrentUser() user: RequestUser, @Body() dto: CreateUnitDto) {
        const created = await this.unitsService.create(user.tenantId, dto);
        return ApiResponseBuilder.success(created, 'Unit created');
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update a unit of measure' })
    @ApiOkResponse({
        description: 'Unit updated',
        schema: {
            example: {
                message: 'Unit updated',
                data: { id: '00000000-0000-4000-a800-000000000001', name: 'Piece (Updated)', abbreviation: 'pcs' },
            },
        },
    })
    @ApiStandardErrors()
    async update(
        @CurrentUser() user: RequestUser,
        @Param('id') id: string,
        @Body() dto: UpdateUnitDto,
    ) {
        const updated = await this.unitsService.update(user.tenantId, id, dto);
        return ApiResponseBuilder.success(updated, 'Unit updated');
    }
}
