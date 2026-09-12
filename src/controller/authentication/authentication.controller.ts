import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
} from '@nestjs/common';
import type { AuthenticationServiceInterface } from '../../application/authentication/authentication.service.interface';
import { AUTHENTICATION_SERVICE } from '../../application/authentication/authentication.service.interface';
import { LoginDto } from './authentication.dto';

@Controller('auth')
export class AuthenticationController {
  constructor(
    @Inject(AUTHENTICATION_SERVICE)
    private readonly authenticationService: AuthenticationServiceInterface,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    return this.authenticationService.login(dto.email, dto.password);
  }
}
