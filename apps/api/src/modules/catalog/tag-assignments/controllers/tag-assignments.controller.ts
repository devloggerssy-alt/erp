import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiNoContentResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { TagAssignmentsService } from '../services/tag-assignments.service';
import { CreateTagAssignmentDto, TagAssignmentResponseDto } from '../dto';
import { JwtAuthGuard, PermissionsGuard } from '@/modules/identity/auth/guards';
import { CurrentUser, RequestUser, RequirePermission } from '@devloggers/backend-core';
import { ApiResponseBuilder } from '@/common/api/api-response-builder';
import {
  ApiCreatedResponseStandard,
  ApiOkResponseStandard,
} from '@/common/decorators/api-swagger.decorators';

@ApiTags('Catalog / Tag Assignments')
@Controller('tag-assignments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class TagAssignmentsController {
  constructor(private readonly tagAssignmentsService: TagAssignmentsService) {}

  @Get()
  @RequirePermission('tagAssignments.view')
  @ApiOperation({ summary: 'List tag assignments for an entity' })
  @ApiQuery({ name: 'entityType', required: true, example: 'item' })
  @ApiQuery({ name: 'entityId', required: true })
  @ApiOkResponseStandard(TagAssignmentResponseDto, { isArray: true, description: 'Tag assignments for the entity' })
  async list(
    @CurrentUser() user: RequestUser,
    @Query('entityType') entityType: string,
    @Query('entityId') entityId: string,
  ) {
    const assignments = await this.tagAssignmentsService.list(user.tenantId, entityType, entityId);
    return ApiResponseBuilder.success(assignments, 'Tag assignments');
  }

  @Post()
  @RequirePermission('tagAssignments.create')
  @ApiOperation({ summary: 'Assign a tag to an entity' })
  @ApiCreatedResponseStandard(TagAssignmentResponseDto, { description: 'Tag assigned' })
  async assign(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateTagAssignmentDto,
  ) {
    const assignment = await this.tagAssignmentsService.assign(user.tenantId, dto);
    return ApiResponseBuilder.success(assignment, 'Tag assigned');
  }

  @Delete(':id')
  @RequirePermission('tagAssignments.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a tag assignment' })
  @ApiNoContentResponse({ description: 'Assignment removed' })
  @ApiParam({ name: 'id', description: 'Assignment ID' })
  async unassign(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
  ) {
    await this.tagAssignmentsService.unassign(user.tenantId, id);
  }
}
