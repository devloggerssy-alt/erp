import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBrandDto {
  @ApiProperty({ example: 'Toyota', description: 'Brand display name' })
  @IsString()
  @IsNotEmpty()
  name: string = '';

  @ApiPropertyOptional({ example: 'https://cdn.example.com/toyota.png', description: 'Brand logo URL' })
  @IsOptional()
  @IsUrl()
  imageUrl?: string | null;
}

export class UpdateBrandDto {
  @ApiPropertyOptional({ example: 'Toyota (Updated)', description: 'Updated display name' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/toyota-new.png', description: 'Updated logo URL' })
  @IsOptional()
  @IsUrl()
  imageUrl?: string | null;

  @ApiPropertyOptional({ example: true, description: 'Whether the brand is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class BrandResponseDto {
  @ApiProperty({ example: '018e1234-abcd-7000-a001-000000000001' })
  id: string = '';

  @ApiProperty({ example: 'Toyota' })
  name: string = '';

  @ApiPropertyOptional({ example: 'https://cdn.example.com/toyota.png', nullable: true })
  imageUrl: string | null = null;

  @ApiProperty({ example: true })
  isActive: boolean = true;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  createdAt: string = '';

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  updatedAt: string = '';
}
