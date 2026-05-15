import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StockMovementResponseDto {
    @ApiProperty({ example: '00000000-0000-4000-ac00-000000000001' })
    id: string = '';

    @ApiProperty({ example: '00000000-0000-4000-ab00-000000000001' })
    warehouseId: string = '';

    @ApiProperty({ example: 'Main Warehouse', nullable: true })
    warehouseName: string | null = null;

    @ApiProperty({ example: '00000000-0000-4000-a900-000000000001' })
    itemId: string = '';

    @ApiProperty({ example: 'Laptop 15"', nullable: true })
    itemName: string | null = null;

    @ApiProperty({ example: 'LP-001', nullable: true })
    itemCode: string | null = null;

    @ApiProperty({ example: '00000000-0000-4000-a400-000000000001' })
    fiscalPeriodId: string = '';

    @ApiPropertyOptional({ example: '2026' })
    fiscalPeriodName?: string;

    @ApiProperty({ example: 'PURCHASE', description: 'PURCHASE | SALE | STOCK_COUNT | OPENING_BALANCE | ADJUSTMENT' })
    movementType: string = '';

    @ApiProperty({ example: 5 })
    quantity: number = 0;

    @ApiProperty({ example: 600000 })
    unitCost: number = 0;

    @ApiPropertyOptional({ example: 'invoice', nullable: true })
    referenceType: string | null = null;

    @ApiPropertyOptional({ example: '00000000-0000-4000-ae00-000000000001', nullable: true })
    referenceId: string | null = null;

    @ApiPropertyOptional({ nullable: true })
    notes: string | null = null;

    @ApiProperty({ example: '2026-04-14T12:00:00.000Z' })
    createdAt: string = '';
}
