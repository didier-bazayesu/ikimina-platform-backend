import { IsOptional, IsDateString, IsEnum, IsString } from 'class-validator';

export class ReportQueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsEnum(['json', 'csv', 'pdf'])
  format: 'json' | 'csv' | 'pdf' = 'json';
}
