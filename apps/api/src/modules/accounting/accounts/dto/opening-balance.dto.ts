import { ApiProperty } from '@nestjs/swagger'
import { IsArray, IsNotEmpty, IsNumber, IsString, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'

export class AccountOpeningBalanceEntryDto {
  @ApiProperty({ type: 'string', example: '00000000-0000-4000-a601-000000000001' })
  @IsString()
  @IsNotEmpty()
  accountId: string = ''

  @ApiProperty({ type: 'number', example: 1500 })
  @IsNumber()
  amount: number = 0
}

export class PostAccountOpeningBalanceDto {
  @ApiProperty({ type: 'string', example: '00000000-0000-4000-a601-000000000010' })
  @IsString()
  @IsNotEmpty()
  fiscalPeriodId: string = ''

  @ApiProperty({ type: [AccountOpeningBalanceEntryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AccountOpeningBalanceEntryDto)
  entries: AccountOpeningBalanceEntryDto[] = []
}

export class AccountOpeningBalanceResponseDto {
  @ApiProperty({ type: 'string' })
  journalEntryId: string = ''

  @ApiProperty({ type: 'number' })
  entriesCount: number = 0
}
