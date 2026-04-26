import { IsString, IsNotEmpty, IsArray, IsNumber, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class OpeningBalanceItemDto {
    @ApiProperty({ example: '00000000-0000-4000-a900-000000000001', description: 'Item ID (Laptop 15")' })
    @IsString()
    @IsNotEmpty()
    itemId: string;

    @ApiProperty({ example: 10, description: 'Opening stock quantity' })
    @IsNumber()
    quantity: number;

    @ApiProperty({ example: 600000, description: 'Cost per unit in SYP' })
    @IsNumber()
    unitCost: number;
}

export class PostOpeningBalanceDto {
    @ApiProperty({ example: '00000000-0000-4000-ab00-000000000001', description: 'Warehouse ID (Main Warehouse)' })
    @IsString()
    @IsNotEmpty()
    warehouseId: string;

    @ApiProperty({ example: '00000000-0000-4000-a400-000000000001', description: 'Fiscal period ID (2026)' })
    @IsString()
    @IsNotEmpty()
    fiscalPeriodId: string;

    @ApiProperty({
        type: [OpeningBalanceItemDto],
        example: [
            { itemId: '00000000-0000-4000-a900-000000000001', quantity: 10, unitCost: 600000 },
            { itemId: '00000000-0000-4000-a900-000000000002', quantity: 20, unitCost: 280000 },
        ],
        description: 'Items with their opening quantities and costs',
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => OpeningBalanceItemDto)
    items: OpeningBalanceItemDto[];
}

export enum StockMovementTypeEnum {
    OPENING = 'OPENING',
    PURCHASE = 'PURCHASE',
    SALE = 'SALE',
    ADJUSTMENT = 'ADJUSTMENT',
    STOCK_COUNT = 'STOCK_COUNT',
    TRANSFER_IN = 'TRANSFER_IN',
    TRANSFER_OUT = 'TRANSFER_OUT',
}
