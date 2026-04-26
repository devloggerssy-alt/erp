import { Type } from 'class-transformer';
import {
    IsEnum,
    IsInt,
    IsObject,
    IsOptional,
    IsString,
    Min,
    ValidateNested,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export type SortOrder = 'asc' | 'desc';

export class PaginationOptionsDto {
    @ApiPropertyOptional({ example: 1, default: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @ApiPropertyOptional({ example: 10, default: 10 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit?: number = 10;
}

export class SortOptionsDto {
    @ApiPropertyOptional({ example: 'createdAt' })
    @IsOptional()
    @IsString()
    field?: string;

    @ApiPropertyOptional({ example: 'asc', enum: ['asc', 'desc'], default: 'asc' })
    @IsOptional()
    @IsEnum(['asc', 'desc'])
    order?: SortOrder = 'asc';
}

export class SearchOptionsDto {
    @ApiPropertyOptional({ example: 'keyword' })
    @IsOptional()
    @IsString()
    value?: string;

    @ApiPropertyOptional({ example: ['name', 'code'] })
    @IsOptional()
    keys?: string[];
}

export class ApiQueryOptionsDto {
    @ApiPropertyOptional({ type: () => PaginationOptionsDto })
    @IsOptional()
    @ValidateNested()
    @Type(() => PaginationOptionsDto)
    pagination?: PaginationOptionsDto;

    @ApiPropertyOptional({ type: () => SortOptionsDto })
    @IsOptional()
    @ValidateNested()
    @Type(() => SortOptionsDto)
    sort?: SortOptionsDto;

    @ApiPropertyOptional({ example: { status: 'POSTED' } })
    @IsOptional()
    @IsObject()
    filters?: Record<string, any>;

    @ApiPropertyOptional({ example: { lines: true } })
    @IsOptional()
    @IsObject()
    include?: Record<string, boolean>;

    @ApiPropertyOptional({ type: () => SearchOptionsDto })
    @IsOptional()
    @ValidateNested()
    @Type(() => SearchOptionsDto)
    search?: SearchOptionsDto;
}
