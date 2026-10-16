import { IsString, IsIn, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTagAssignmentDto {
  @ApiProperty({ example: '018e1234-abcd-7000-a001-000000000001', description: 'Tag ID' })
  @IsString()
  @IsUUID()
  tagId: string = '';

  @ApiProperty({
    example: 'item',
    description: 'Entity type',
    enum: ['item', 'party', 'invoice', 'warehouse'],
  })
  @IsString()
  @IsIn(['item', 'party', 'invoice', 'warehouse'])
  entityType: string = '';

  @ApiProperty({ example: '018e1234-abcd-7000-a002-000000000001', description: 'Entity ID' })
  @IsString()
  @IsUUID()
  entityId: string = '';
}

export class TagSummaryDto {
  @ApiProperty({ type: 'string' })
  id: string = '';

  @ApiProperty({ type: 'string' })
  name: string = '';

  @ApiPropertyOptional({ type: 'string', nullable: true })
  color: string | null = null;

  @ApiProperty({ type: 'string' })
  module: string = '';
}

export class TagAssignmentResponseDto {
  @ApiProperty({ type: 'string' })
  id: string = '';

  @ApiProperty({ type: 'string' })
  tagId: string = '';

  @ApiProperty({ type: 'string' })
  entityType: string = '';

  @ApiProperty({ type: 'string' })
  entityId: string = '';

  @ApiProperty({ type: () => TagSummaryDto, description: 'The tag details' })
  tag: TagSummaryDto = new TagSummaryDto();

  @ApiProperty({ type: 'string', format: 'date-time' })
  createdAt: string = '';
}
