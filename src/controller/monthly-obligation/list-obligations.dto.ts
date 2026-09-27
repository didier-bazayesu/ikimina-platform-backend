import {
  IsOptional,
  IsString,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsBoolean,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListObligationsDto {
  @ApiPropertyOptional({ description: 'Filter by member ID' })
  @IsOptional()
  @IsString()
  memberId?: string;

  @ApiPropertyOptional({ enum: ['UNPAID', 'PAID'] })
  @IsOptional()
  @IsEnum(['UNPAID', 'PAID'])
  status?: 'UNPAID' | 'PAID';

  @ApiPropertyOptional({ description: 'Filter by month (1-12)' })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  @ApiPropertyOptional({ description: 'Filter by year (e.g. 2026)' })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  year?: number;

  @ApiPropertyOptional({
    description: 'Return only overdue unpaid obligations',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  overdue?: boolean;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}
