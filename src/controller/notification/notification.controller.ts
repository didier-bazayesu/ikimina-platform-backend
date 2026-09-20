import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
  DefaultValuePipe,
  ParseBoolPipe,
  ParseIntPipe,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { NOTIFICATION_SERVICE } from '../../application/notification/notification.service.interface';
import type { NotificationServiceInterface } from '../../application/notification/notification.service.interface';
import { JwtAuthGuard } from '../authentication.guard';
import type { AuthenticatedUser } from '../authentication.guard';
import { CurrentUser } from '../current-user.decorator';
import { Inject } from '@nestjs/common';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationController {
  constructor(
    @Inject(NOTIFICATION_SERVICE)
    private readonly notificationService: NotificationServiceInterface,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'List my notifications' })
  @ApiQuery({ name: 'unreadOnly', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async listMyNotifications(
    @CurrentUser() user: AuthenticatedUser,
    @Query('unreadOnly', new DefaultValuePipe(false), ParseBoolPipe)
    unreadOnly: boolean,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.notificationService.getUserNotifications(
      user.id,
      unreadOnly,
      page,
      limit,
    );
  }

  @Patch('me/:id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  async markAsRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    const notification = await this.notificationService.markAsRead(id, user.id);
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }
    return notification;
  }
}
