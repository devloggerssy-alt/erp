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

export type SortOrder = 'asc' | 'desc';

export class PaginationOptionsDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit?: number = 10;
}

export class SortOptionsDto {
    @IsOptional()
    @IsString()
    field?: string;

    @IsOptional()
    @IsEnum(['asc', 'desc'])
    order?: SortOrder = 'asc';
}

export class SearchOptionsDto {
    @IsOptional()
    @IsString()
    value?: string;

    @IsOptional()
    keys?: string[];
}

export class ApiQueryOptionsDto {
    @IsOptional()
    @ValidateNested()
    @Type(() => PaginationOptionsDto)
    pagination?: PaginationOptionsDto;

    @IsOptional()
    @ValidateNested()
    @Type(() => SortOptionsDto)
    sort?: SortOptionsDto;

    @IsOptional()
    @IsObject()
    filters?: Record<string, any>;

    @IsOptional()
    @IsObject()
    include?: Record<string, boolean>;

    @IsOptional()
    @ValidateNested()
    @Type(() => SearchOptionsDto)
    search?: SearchOptionsDto;
}


