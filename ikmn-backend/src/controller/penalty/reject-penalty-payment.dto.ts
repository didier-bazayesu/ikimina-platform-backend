import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RejectPenaltyPaymentDto {
  @ApiProperty({
    description: 'Rejection reason',
    example: 'Invalid proof document',
  })
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
