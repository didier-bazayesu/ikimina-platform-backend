import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class FlagPaymentDto {
  @ApiProperty({
    description: 'Reason for flagging',
    example: 'Proof document is unreadable',
  })
  @IsString()
  @IsNotEmpty()
  reason!: string;

  @ApiProperty({
    description: 'Message to member',
    example: 'Please re-upload a clearer image.',
  })
  @IsString()
  @IsNotEmpty()
  message!: string;
}
