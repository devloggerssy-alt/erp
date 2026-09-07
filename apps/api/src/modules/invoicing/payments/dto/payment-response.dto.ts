import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PaymentAllocationResponseDto {
  @ApiProperty() id: string = '';
  @ApiProperty() invoiceId: string = '';
  @ApiPropertyOptional() invoiceNumber?: string;
  @ApiProperty() amount: number = 0;
  @ApiProperty() createdAt: string = '';
}

export class PaymentResponseDto {
  @ApiProperty() id: string = '';
  @ApiProperty() number: string = '';
  @ApiProperty({ enum: ['RECEIPT', 'PAYMENT', 'ADJUSTMENT'] }) type: string = '';
  @ApiProperty() date: string = '';
  @ApiProperty() status: string = 'DRAFT';
  @ApiProperty() cashboxId: string = '';
  @ApiPropertyOptional() cashboxName?: string;
  @ApiPropertyOptional() cashboxCode?: string;
  @ApiPropertyOptional({ type: 'string', nullable: true }) partyId: string | null = null;
  @ApiPropertyOptional() partyName?: string;
  @ApiProperty() currencyId: string = '';
  @ApiPropertyOptional() currencyCode?: string;
  @ApiPropertyOptional() currencySymbol?: string;
  @ApiProperty() fiscalPeriodId: string = '';
  @ApiProperty() amount: number = 0;
  @ApiProperty() exchangeRate: number = 1;
  @ApiProperty() unallocatedAmount: number = 0;
  @ApiProperty() allocatedAmount: number = 0;
  @ApiPropertyOptional({ type: 'string', nullable: true }) notes: string | null = null;
  @ApiPropertyOptional({ type: 'string', nullable: true }) postedAt: string | null = null;
  @ApiPropertyOptional({ type: 'string', nullable: true }) cancelledAt: string | null = null;
  @ApiProperty() createdAt: string = '';
  @ApiProperty() updatedAt: string = '';
  @ApiPropertyOptional({ type: [PaymentAllocationResponseDto] })
  allocations?: PaymentAllocationResponseDto[];
}
