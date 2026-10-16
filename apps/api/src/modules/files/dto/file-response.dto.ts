import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FileResponseDto {
    @ApiProperty({ type: 'string', example: '018e1234-abcd-7000-a300-000000000001' })
    id!: string;

    @ApiProperty({ type: 'string', example: '00000000-0000-4000-ae00-000000000001' })
    tenantId!: string;

    @ApiProperty({ type: 'string', example: 'product-photo.png' })
    originalName!: string;

    @ApiProperty({ type: 'string', example: 'image/png' })
    mimeType!: string;

    @ApiProperty({ type: 'number', example: 204800, description: 'Size in bytes' })
    size!: number;

    @ApiPropertyOptional({ type: 'string', nullable: true, example: 'png' })
    extension?: string | null;

    @ApiProperty({ type: 'string', example: 'items', description: 'Destination folder' })
    folder!: string;

    @ApiProperty({ type: 'string', example: '00000000-0000-4000-ae00-000000000001/items/product-photo.png' })
    path!: string;

    @ApiProperty({ type: 'string', example: '/uploads/items/product-photo.png' })
    url!: string;

    @ApiPropertyOptional({ type: 'string', nullable: true, description: 'SHA-256 of the file contents' })
    checksum?: string | null;

    @ApiProperty({ type: 'string', format: 'date-time', example: '2026-10-16T10:00:00.000Z' })
    createdAt!: string;

    @ApiProperty({ type: 'string', format: 'date-time', example: '2026-10-16T10:00:00.000Z' })
    updatedAt!: string;
}
