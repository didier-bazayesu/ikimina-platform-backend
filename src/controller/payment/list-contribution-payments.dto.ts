import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import type { ContributionStatus } from '../../application/payment/contribution-status';

export class ListContributionPaymentsDto {
  @ApiPropertyOptional({ enum: ['PENDING', 'APPROVED', 'REJECTED'] })
  @IsOptional()
  @IsEnum(['PENDING', 'APPROVED', 'REJECTED'])
  status?: ContributionStatus;

  @ApiPropertyOptional({ description: 'Filter by member ID' })
  @IsOptional()
  @IsUUID()
  memberId?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;
}
