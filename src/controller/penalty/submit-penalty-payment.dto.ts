import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import type { ContributionMethod } from '../../application/payment/contribution-method';

export class SubmitPenaltyPaymentDto {
  @ApiProperty({ description: 'ID of the penalty being paid' })
  @IsUUID()
  penaltyId!: string;

  @ApiProperty({ description: 'Payment amount', example: 2000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiProperty({ description: 'Date payment was made', example: '2026-09-10' })
  @IsNotEmpty()
  paymentDate!: string;

  @ApiProperty({ enum: ['MOMO', 'BANK', 'CASH'], example: 'MOMO' })
  @IsEnum(['MOMO', 'BANK', 'CASH'])
  method!: ContributionMethod;

  @ApiPropertyOptional({ description: 'Reference number' })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional({ description: 'Optional notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
