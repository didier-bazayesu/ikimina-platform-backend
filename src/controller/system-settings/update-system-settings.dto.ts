import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
  IsUppercase,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSystemSettingsDto {
  @ApiPropertyOptional({ description: 'Monthly share amount (> 0)' })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  monthlyShareAmount?: number;

  @ApiPropertyOptional({ description: 'Penalty percentage (0 - 100)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  penaltyPercentage?: number;

  @ApiPropertyOptional({ description: 'Due day of the month (1 - 28)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(28)
  dueDay?: number;

  @ApiPropertyOptional({ description: '3-letter currency code (e.g., RWF)' })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  @IsUppercase()
  currency?: string;
}
