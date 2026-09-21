import { IsBoolean, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class BusinessSetupModulesDto {
    @ApiProperty({ example: true })
    @IsBoolean()
    inventory!: boolean;

    @ApiProperty({ example: true })
    @IsBoolean()
    sales!: boolean;

    @ApiProperty({ example: true })
    @IsBoolean()
    purchasing!: boolean;

    @ApiProperty({ example: true })
    @IsBoolean()
    accounting!: boolean;
}

export class SetBusinessSetupProfileDto {
    @ApiProperty({ type: BusinessSetupModulesDto })
    @ValidateNested()
    @Type(() => BusinessSetupModulesDto)
    modules!: BusinessSetupModulesDto;
}
