import { IsOptional, IsEnum, IsISO8601 } from 'class-validator';

export enum StatementFormat {
  JSON = 'json',
  PDF = 'pdf',
}

export class StatementQueryDto {
  @IsOptional()
  @IsISO8601()
  startDate?: string;

  @IsOptional()
  @IsISO8601()
  endDate?: string;

  @IsOptional()
  @IsEnum(StatementFormat)
  format?: StatementFormat;
}
