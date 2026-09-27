import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, ArrayNotEmpty, Min, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class RecordOnBehalfDto {
  @ApiProperty({ description: 'Member ID' })
  @IsUUID()
  memberId!: string;

  @ApiProperty({ description: 'Target monthly obligation IDs' })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  obligationIds!: string[];

  @ApiProperty({ description: 'Total payment amount' })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiProperty({ description: 'Date payment was made' })
  @IsNotEmpty()
  paymentDate!: string;

  @ApiProperty({ description: 'Whether penalty is included' })
  @IsBoolean()
  withPenalty!: boolean;

  @ApiPropertyOptional({ description: 'Optional notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}