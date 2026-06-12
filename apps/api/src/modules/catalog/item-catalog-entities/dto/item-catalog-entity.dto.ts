import { IsString, IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// Embedded in responses — not a separate endpoint
export type CatalogEntitySummary = {
  id: string;
  name: string;
  kind: string;
  parentId: string | null;
};

// ── Create DTO ────────────────────────────────────────────────────────────────

export class CreateItemCatalogEntityDto {
  @ApiProperty({ example: 'uuid-of-item' })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  itemId: string = '';

  @ApiProperty({ example: 'uuid-of-catalog-entity' })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  catalogEntityId: string = '';
}

// ── Update DTO ────────────────────────────────────────────────────────────────

// Junction records are immutable — no update fields
export class UpdateItemCatalogEntityDto {}

// ── Response DTO ──────────────────────────────────────────────────────────────

export class ItemCatalogEntityResponseDto {
  @ApiProperty()
  id: string = '';

  @ApiProperty()
  itemId: string = '';

  @ApiProperty()
  catalogEntityId: string = '';

  @ApiProperty({ type: () => Object })
  catalogEntity: CatalogEntitySummary = { id: '', name: '', kind: '', parentId: null };

  @ApiProperty()
  createdAt: string = '';
}
