import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsEnum, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import type { WithdrawalCategory } from '../../application/withdrawal/withdrawal-category';

export class RecordWithdrawalDto {
  @ApiProperty({ description: 'Withdrawal amount', example: 50000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiProperty({ description: 'Date of withdrawal', example: '2026-09-10' })
  @IsNotEmpty()
  withdrawalDate!: string;

  @ApiProperty({ description: 'Beneficiary name or ID' })
  @IsString()
  @IsNotEmpty()
  beneficiary!: string;

  @ApiProperty({ enum: ['LOAN', 'PAYOUT', 'EXPENSE', 'OTHER'] })
  @IsEnum(['LOAN', 'PAYOUT', 'EXPENSE', 'OTHER'])
  category!: WithdrawalCategory;

  @ApiProperty({ description: 'Reason or description' })
  @IsString()
  @IsNotEmpty()
  description!: string;
}
