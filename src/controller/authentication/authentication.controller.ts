import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthenticationServiceInterface } from '../../application/authentication/authentication.service.interface';
import { AUTHENTICATION_SERVICE } from '../../application/authentication/authentication.service.interface';
import {
  ChangePasswordDto,
  LoginDto,
  RefreshTokenDto,
  LogoutDto,
} from './authentication.dto';
import { JwtAuthGuard } from '../authentication.guard';
import type { AuthenticatedUser } from '../authentication.guard';
import { CurrentUser } from '../current-user.decorator';

@Controller('auth')
@ApiTags('authentication')
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

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange a refresh token for an access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed' })
  @ApiResponse({
    status: 400,
    description: 'Refresh token is missing or malformed',
  })
  @ApiResponse({
    status: 401,
    description: 'Refresh token is invalid or expired',
  })
  @ApiResponse({ status: 500, description: 'Unexpected application error' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return {
      data: await this.authenticationService.refresh(dto.refreshToken),
      message: 'Token refreshed',
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke a refresh token' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  @ApiResponse({
    status: 400,
    description: 'Refresh token is missing or malformed',
  })
  @ApiResponse({ status: 500, description: 'Unexpected application error' })
  async logout(@Body() dto: LogoutDto) {
    await this.authenticationService.logout(dto.refreshToken, dto.allDevices);
    return { data: null, message: 'Logged out successfully' };
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change the authenticated user password' })
  @ApiResponse({ status: 200, description: 'Password updated successfully' })
  @ApiResponse({ status: 400, description: 'Password fields are invalid' })
  @ApiResponse({
    status: 401,
    description: 'Authentication or current password failed',
  })
  @ApiResponse({ status: 500, description: 'Unexpected application error' })
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.authenticationService.changePassword(
      user.id,
      dto.currentPassword,
      dto.newPassword,
    );
    return { data: null, message: 'Password updated successfully' };
  }
}
