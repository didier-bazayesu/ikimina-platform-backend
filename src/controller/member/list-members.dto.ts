import { IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListMembersDto {
  @ApiPropertyOptional({ enum: ['ACTIVE', 'SUSPENDED', 'EXITED'] })
  @IsOptional()
  @IsEnum(['ACTIVE', 'SUSPENDED', 'EXITED'], {
    message: 'status must be ACTIVE, SUSPENDED, or EXITED',
  })
  status?: 'ACTIVE' | 'SUSPENDED' | 'EXITED';

  @ApiPropertyOptional({
    description: 'Search by name, email, or member number',
  })
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100, { message: 'limit cannot exceed 100' })
  limit?: number;
}
