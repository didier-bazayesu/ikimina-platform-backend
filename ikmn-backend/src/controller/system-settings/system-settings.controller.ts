import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  UseGuards,
  Inject,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../roles.decorator';
import { RolesGuard } from '../roles.guard';
import { JwtAuthGuard } from '../authentication.guard';
import { CurrentUser } from '../current-user.decorator';
import type { AuthenticatedUser } from '../authentication.guard';
import { UpdateSystemSettingsDto } from './update-system-settings.dto';
import type { SystemSettingsServiceInterface } from '../../application/system-settings/system-settings.service.interface';
import { SYSTEM_SETTINGS_SERVICE } from '../../application/system-settings/system-settings.service.interface';

@ApiTags('system-settings')
@ApiBearerAuth()
@Controller('system-settings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SystemSettingsController {
  constructor(
    @Inject(SYSTEM_SETTINGS_SERVICE)
    private readonly service: SystemSettingsServiceInterface,
  ) {}

  @Get()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Admin views current system settings' })
  @ApiResponse({ status: 200, description: 'Settings retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  async getSettings() {
    const settings = await this.service.getSettings();
    return { success: true, data: settings, message: 'Settings retrieved' };
  }

  @Patch()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Admin updates system settings' })
  @ApiResponse({ status: 200, description: 'Settings updated' })
  @ApiResponse({ status: 400, description: 'Empty body or validation error' })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  async updateSettings(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateSystemSettingsDto,
  ) {
    if (
      dto.monthlyShareAmount === undefined &&
      dto.penaltyPercentage === undefined &&
      dto.dueDay === undefined &&
      dto.currency === undefined
    ) {
      throw new BadRequestException(
        'At least one field must be provided to update settings',
      );
    }

    const settings = await this.service.updateSettings(user.id, dto);
    return { success: true, data: settings, message: 'Settings updated' };
  }
}
