import {
  IsEmail,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  MinLength,
  Length,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMemberDto {
  @ApiProperty({ example: 'alice@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: '+250788123456' })
  @IsString()
  @IsNotEmpty()
  @Length(3, 100)
  phone!: string;

  @ApiProperty({ example: 'Alice Doe' })
  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @ApiProperty({
    description:
      'Initial password. The Admin communicates this to the new member out-of-band. The member may change it via PATCH /auth/change-password.',
    example: 'Temp@Pass123',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiPropertyOptional({ example: '1198012345678901' })
  @IsOptional()
  @IsString()
  nationalId?: string;

  @ApiPropertyOptional({ example: 'KG 123 St, Kigali' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    example: '2026-01-15',
    description:
      'ISO date string. Defaults to today if omitted. Must not be in the future.',
  })
  @IsOptional()
  @IsDateString()
  joinedDate?: string;
}
