import {
    IsString, IsNotEmpty, IsOptional, IsIn,
    IsDateString, IsInt, IsArray, ValidateNested, Min, IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OnboardingCompanyStepDto {
    @ApiProperty({ example: 'My Company' })
    @IsString() @IsNotEmpty()
    name: string = '';

    @ApiPropertyOptional()
    @IsOptional() @IsString()
    address?: string;

    @ApiPropertyOptional()
    @IsOptional() @IsString()
    phone?: string;

    @ApiProperty({ enum: ['en', 'ar', 'tr'], example: 'en' })
    @IsString() @IsIn(['en', 'ar', 'tr'])
    locale: string = 'en';

    @ApiProperty({ example: 'UTC' })
    @IsString() @IsNotEmpty()
    timezone: string = 'UTC';

    @ApiProperty({ enum: ['YYYY-MM-DD', 'DD/MM/YYYY', 'MM/DD/YYYY'], example: 'YYYY-MM-DD' })
    @IsString() @IsIn(['YYYY-MM-DD', 'DD/MM/YYYY', 'MM/DD/YYYY'])
    dateFormat: string = 'YYYY-MM-DD';

    @ApiProperty({ enum: ['1,234.56', '1.234,56'], example: '1,234.56' })
    @IsString() @IsIn(['1,234.56', '1.234,56'])
    numberFormat: string = '1,234.56';
}

export class OnboardingFiscalYearStepDto {
    @ApiProperty({ example: '2026-01-01' })
    @IsDateString()
    startDate: string = '';

    @ApiProperty({ example: '2026-12-31' })
    @IsDateString()
    endDate: string = '';

    @ApiPropertyOptional({ example: 'FY 2026' })
    @IsOptional() @IsString()
    name?: string;
}

export class OnboardingGlDefaultsStepDto {
    @ApiProperty()
    @IsUUID()
    defaultSalesAccountId: string = '';

    @ApiProperty()
    @IsUUID()
    defaultPurchaseAccountId: string = '';

    @ApiProperty()
    @IsUUID()
    defaultTaxAccountId: string = '';

    @ApiProperty()
    @IsUUID()
    defaultReceivableAccountId: string = '';

    @ApiProperty()
    @IsUUID()
    defaultPayableAccountId: string = '';
}

export class OnboardingSequenceItemDto {
    @ApiProperty({ example: 'SALES_INVOICE' })
    @IsString() @IsNotEmpty()
    type: string = '';

    @ApiProperty({ example: 'INV-' })
    @IsString() @IsNotEmpty()
    prefix: string = '';

    @ApiPropertyOptional({ example: 1 })
    @IsOptional() @IsInt() @Min(1)
    startNumber?: number;

    @ApiPropertyOptional({ example: 5 })
    @IsOptional() @IsInt() @Min(1)
    padLength?: number;
}

export class OnboardingDocumentSequencesStepDto {
    @ApiProperty({ type: [OnboardingSequenceItemDto] })
    @IsArray() @ValidateNested({ each: true }) @Type(() => OnboardingSequenceItemDto)
    sequences: OnboardingSequenceItemDto[] = [];
}
