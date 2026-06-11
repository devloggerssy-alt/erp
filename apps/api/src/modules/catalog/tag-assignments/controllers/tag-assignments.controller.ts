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
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { TagAssignmentsService } from '../services/tag-assignments.service';
import { CreateTagAssignmentDto, TagAssignmentResponseDto } from '../dto';
import { JwtAuthGuard } from '@/modules/identity/auth/guards';
import { CurrentUser, RequestUser } from '@devloggers/backend-core';

@ApiTags('Catalog / Tag Assignments')
@Controller('tag-assignments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class TagAssignmentsController {
  constructor(private readonly tagAssignmentsService: TagAssignmentsService) {}

  @Get()
  @ApiOperation({ summary: 'List tag assignments for an entity' })
  @ApiQuery({ name: 'entityType', required: true, example: 'item' })
  @ApiQuery({ name: 'entityId', required: true })
  @ApiOkResponse({ type: [TagAssignmentResponseDto] })
  async list(
    @CurrentUser() user: RequestUser,
    @Query('entityType') entityType: string,
    @Query('entityId') entityId: string,
  ) {
    return this.tagAssignmentsService.list(user.tenantId, entityType, entityId);
  }

  @Post()
  @ApiOperation({ summary: 'Assign a tag to an entity' })
  @ApiCreatedResponse({ type: TagAssignmentResponseDto })
  async assign(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateTagAssignmentDto,
  ) {
    return this.tagAssignmentsService.assign(user.tenantId, dto);
  }

  @Delete(':id')
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
