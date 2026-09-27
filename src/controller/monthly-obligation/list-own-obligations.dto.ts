import { IsOptional, IsEnum, IsInt, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListOwnObligationsDto {
  @ApiPropertyOptional({ enum: ['UNPAID', 'PAID'] })
  @IsOptional()
  @IsEnum(['UNPAID', 'PAID'])
  status?: 'UNPAID' | 'PAID';

  @ApiPropertyOptional({ description: 'Filter by year' })
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
}
