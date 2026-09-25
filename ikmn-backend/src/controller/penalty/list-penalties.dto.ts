import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import type { PenaltyStatus } from '../../application/penalty/penalty-status';

export class ListPenaltiesDto {
  @ApiPropertyOptional({ enum: ['UNPAID', 'PENDING', 'PAID', 'WAIVED'] })
  @IsOptional()
  @IsEnum(['UNPAID', 'PENDING', 'PAID', 'WAIVED'])
  status?: PenaltyStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  memberId?: string;

  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;
}
