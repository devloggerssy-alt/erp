import { IsString, IsNotEmpty, IsIn, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

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

export class TagAssignmentResponseDto {
  @ApiProperty()
  id: string = '';

  @ApiProperty()
  tagId: string = '';

  @ApiProperty()
  entityType: string = '';

  @ApiProperty()
  entityId: string = '';

  @ApiProperty({
    type: 'object',
    description: 'The tag details',
    additionalProperties: false,
    properties: {
      id: { type: 'string' },
      name: { type: 'string' },
      color: { type: 'string', nullable: true },
      module: { type: 'string' },
    },
  })
  tag: {
    id: string;
    name: string;
    color: string | null;
    module: string;
  } = { id: '', name: '', color: null, module: '' };

  @ApiProperty()
  createdAt: string = '';
}
