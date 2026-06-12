import { IsString, IsNotEmpty, IsOptional, IsIn, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { RelationType } from '@devloggers/api-contracts';

export class CreateItemRelationDto {
  @ApiProperty({ description: 'The source item ID' })
  @IsUUID()
  @IsNotEmpty()
  itemId: string = '';

  @ApiProperty({ description: 'The related item ID' })
  @IsUUID()
  @IsNotEmpty()
  relatedItemId: string = '';

  @ApiProperty({
    example: 'compatible_with',
    enum: ['compatible_with', 'replaces', 'requires'],
  })
  @IsString()
  @IsIn(['compatible_with', 'replaces', 'requires'])
  relationType: RelationType = 'compatible_with';

  @ApiPropertyOptional({ example: 'Fits model X and Y' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateItemRelationDto {
  @ApiPropertyOptional({
    example: 'replaces',
    enum: ['compatible_with', 'replaces', 'requires'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['compatible_with', 'replaces', 'requires'])
  relationType?: RelationType;

  @ApiPropertyOptional({ example: 'Updated notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class RelatedItemSummaryDto {
  @ApiProperty()
  id: string = '';

  @ApiProperty()
  name: string = '';

  @ApiProperty()
  code: string = '';
}

export class ItemRelationResponseDto {
  @ApiProperty()
  id: string = '';

  @ApiProperty()
  itemId: string = '';

  @ApiProperty()
  relatedItemId: string = '';

  @ApiProperty({ example: 'compatible_with', enum: ['compatible_with', 'replaces', 'requires'] })
  relationType: RelationType = 'compatible_with';

  @ApiProperty({ nullable: true })
  notes: string | null = null;

  @ApiProperty({ type: RelatedItemSummaryDto })
  relatedItem: RelatedItemSummaryDto = new RelatedItemSummaryDto();

  @ApiProperty()
  createdAt: string = '';

  @ApiProperty()
  updatedAt: string = '';
}
