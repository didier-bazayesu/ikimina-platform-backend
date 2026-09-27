import { IsEnum, IsOptional, IsString, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateMemberStatusDto {
  @ApiProperty({ enum: ['ACTIVE', 'SUSPENDED', 'EXITED'] })
  @IsEnum(['ACTIVE', 'SUSPENDED', 'EXITED'], {
    message: 'status must be ACTIVE, SUSPENDED, or EXITED',
  })
  status!: 'ACTIVE' | 'SUSPENDED' | 'EXITED';

  @ApiPropertyOptional({
    description: 'Required when status is SUSPENDED or EXITED',
  })
  @ValidateIf((o) => o.status === 'SUSPENDED' || o.status === 'EXITED')
  @IsString()
  @IsOptional()
  reason?: string;
}
