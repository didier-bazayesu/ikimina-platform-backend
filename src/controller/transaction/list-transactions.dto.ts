import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import type { TransactionType } from '../../application/transaction/transaction-type';

export class ListTransactionsDto {
  @ApiPropertyOptional({
    description: 'Filter by member. Ignored for MEMBER role.',
  })
  @IsOptional()
  @IsUUID()
  memberId?: string;

  @ApiPropertyOptional({ enum: ['CONTRIBUTION', 'PENALTY', 'WITHDRAWAL'] })
  @IsOptional()
  @IsEnum(['CONTRIBUTION', 'PENALTY', 'WITHDRAWAL'])
  type?: TransactionType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;
}
