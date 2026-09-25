import { IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePosSettingDto {
    @ApiPropertyOptional({ type: 'string', example: '00000000-0000-4000-ac00-000000000001', description: 'Till cashbox for POS receipts' })
    @IsOptional() @IsString()
    cashboxId?: string;

    @ApiPropertyOptional({ type: 'string', example: '00000000-0000-4000-ab00-000000000001', description: 'Warehouse POS sales issue stock from' })
    @IsOptional() @IsString()
    warehouseId?: string;
}

export class PosSettingResponseDto {
    @ApiProperty({ example: '00000000-0000-4000-f000-000000000001' })
    id: string = '';

    @ApiProperty({ example: '00000000-0000-4000-e100-000000000001' })
    defaultPartyId: string = '';

    @ApiProperty({ example: 'Walk-in Customer' })
    defaultPartyName: string = '';

    @ApiProperty({ example: '00000000-0000-4000-d100-000000000001' })
    invoiceTypeId: string = '';

    @ApiProperty({ example: 'POS Sales' })
    invoiceTypeName: string = '';

    @ApiProperty({ example: '00000000-0000-4000-ac00-000000000001' })
    cashboxId: string = '';

    @ApiProperty({ example: 'Main Till' })
    cashboxName: string = '';

    @ApiProperty({ example: '00000000-0000-4000-ab00-000000000001' })
    warehouseId: string = '';

    @ApiProperty({ example: 'Main Warehouse' })
    warehouseName: string = '';

    @ApiProperty({ example: '2026-09-25T10:00:00.000Z' })
    updatedAt: string = '';
}
