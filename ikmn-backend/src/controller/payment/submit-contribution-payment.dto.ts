import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ArrayNotEmpty,
  Min,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import type { ContributionMethod } from '../../application/payment/contribution-method';

export class SubmitContributionPaymentDto {
  @ApiProperty({
    description: 'Target monthly obligation IDs covered by this payment',
    example: ['uuid-ob-1', 'uuid-ob-2'],
  })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value.split(',').map((s) => s.trim());
      }
    }
    return value;
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  obligationIds!: string[];

  @ApiProperty({
    description: 'Total payment amount in local currency',
    example: 40000,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiProperty({
    description: 'Date payment was made externally',
    example: '2026-09-05',
  })
  @IsNotEmpty()
  paymentDate!: string;

  @ApiProperty({ enum: ['MOMO', 'BANK', 'CASH'], example: 'MOMO' })
  @IsEnum(['MOMO', 'BANK', 'CASH'])
  method!: ContributionMethod;

  @ApiPropertyOptional({
    description: 'Reference number for MOMO or BANK',
    example: 'MOMO123456',
  })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional({
    description: 'URL of uploaded proof of payment image',
    example: 'http://localhost:3000/uploads/proof-123.jpg',
  })
  @IsOptional()
  @IsString()
  proofUrl?: string;

  @ApiPropertyOptional({
    description: 'Optional notes or description',
    example: 'Paid via MoMo',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
